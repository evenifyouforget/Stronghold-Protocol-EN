// (fork) Research tactics (fish-edition/ai-players/02-architecture.md, Fish's "bot research" list): building blocks for
// the evolution bench (tools/evolve.mjs). None is in a registered profile: they are named in profile data
// (botStrategies.js profileFromData). Three kinds:
//   - simplifications: a simple rule instead of legacy's at a decision point (they don't hand on): does legacy's detail
//     pay for itself there?
//   - variations: legacy's decision reshaped (they hand on with changed inputs or change its result);
//   - supplements: an extra rule before or after legacy's, which still runs.
// Each acts through PlayerState's validated intents only, and stays cheap and deterministic: no RNG draw, no rehearsal,
// so a profile of them plays the same in the browser.
import { defineTactic, PASS } from './botTactics.js';
import { bountyKillChance } from './bot.js';
import { freeSlot } from './board.js';

const ok = (fn) => { try { const r = fn(); return !!(r && r.ok); } catch { return false; } };
const gdOf = (m, ps) => ps.gd || m.gd;
const int = (min, max, def) => ({ type: 'int', min, max, default: def });
const num = (min, max, def) => ({ type: 'number', min, max, default: def });

/** Copies of each base id the seat holds (board, hand, temp), elites apart. */
function copiesOf(m, ps) {
  const gd = gdOf(m, ps), out = new Map();
  for (const p of ps.allChess()) {
    if (gd.isGolden(p.id)) continue;
    const b = gd.baseIdOf(p.id);
    out.set(b, (out.get(b) || 0) + 1);
  }
  return out;
}

// ---- simplifications ------------------------------------------------------------------------------------------

/** Level whenever it can from `fromRound`, keeping `reserve` funds, up to `maxLevel`; with `boardFull`, only once the board is full. */
export const SIMPLE_LEVEL = defineTactic({
  id: 'simple-level',
  describe: 'simplification: level whenever affordable from a round on, keeping a reserve (no legacy curve)',
  params: { fromRound: int(0, 12, 2), reserve: int(0, 20, 0), maxLevel: int(2, 6, 5), boardFull: { type: 'bool', default: true } },
  at: {
    levelUp(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (m.round < p.fromRound || ps.offers.length) return undefined;
      if (p.boardFull && ps.deployCount < ps.deployCap) return undefined;
      const cap = Math.min(p.maxLevel, gdOf(m, ps).maxShopLevel);
      for (let guard = 0; guard < 6 && ps.shop.level < cap; guard++) {
        if (ps.funds - Math.max(0, ps.shop.upgradePrice) < p.reserve || !ok(() => ps.levelUp())) break;
      }
      return undefined;
    },
  },
});

/** Leftover funds: up to `refreshes` refreshes, stopping when the shop shows a copy that completes a merge. */
export const SIMPLE_SPEND = defineTactic({
  id: 'simple-spend',
  describe: 'simplification: spend the leftover on a fixed number of refreshes, keep a merge copy in view',
  params: { refreshes: int(0, 8, 2) },
  at: {
    spendDown(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const gd = gdOf(m, ps);
      if (gd.leftoverKeptBands.includes(ps.bandId)) return undefined;
      for (let i = 0; i < p.refreshes; i++) {
        if (ps.shop.frozen || ps.shop.slots.some((s) => s && !s.sold && s.kind === 'chess' && ps.completesChessMerge(s.id))) break;
        const cost = ps.shop.freeRefreshes > 0 ? 0 : gd.refreshPrice;
        if (ps.funds < cost || !ok(() => ps.refresh())) break;
      }
      return undefined;
    },
  },
});

/** Freeze: never, or only for a merge copy the seat can't pay (legacy also freezes for its plan's targets). */
export const SIMPLE_FREEZE = defineTactic({
  id: 'simple-freeze',
  describe: "simplification: freeze never, or only for an unaffordable merge copy",
  params: { mode: { type: 'choice', choices: ['never', 'merge'], default: 'merge' } },
  at: {
    maybeFreeze(ctx) {
      const { player: ps, params: p } = ctx;
      if (p.mode === 'never' || ps.shop.frozen) return undefined;
      if (ps.shop.slots.some((s) => s && !s.sold && s.kind === 'chess' && ps.priceOf(s) > ps.funds && ps.completesChessMerge(s.id))) ok(() => ps.freeze());
      return undefined;
    },
  },
});

// ---- variations -----------------------------------------------------------------------------------------------

/**
 * The 机变 pick with a more optimistic bounty estimate: legacy's kill chance p reshaped to 1 − (1 − p)^k, and a bounty
 * card taken over legacy's pick when its expected gain (legacy's bountyScore formula: coin won minus LP risked) is at
 * least `minGain`. #29 / ai-players 05: cards the bot rates 20–50 % are killed 94 % of the time.
 * Not the bountyKillChance hook: legacy's own pick calls its internal estimate, and the hook only feeds the digest.
 */
export const BOUNTY_OPTIMISM = defineTactic({
  id: 'bounty-optimism',
  describe: "variation: bounty cards scored with legacy's kill chance made more optimistic (k > 1)",
  params: { k: num(0.25, 6, 2), minGain: num(-5, 20, 2) },
  at: {
    pickCard(ctx) {
      const { match: m, player: ps, params: p, args: [cards, available] } = ctx;
      const legacyPick = ctx.next();
      if (!Array.isArray(available) || cards[legacyPick]?.kind === 'bounty') return legacyPick;
      let best = -1, bestGain = -Infinity;
      for (const i of available) {
        const c = cards[i];
        if (!c || c.kind !== 'bounty') continue;
        const g = bountyGain(m, ps, c, p.k);
        if (g > bestGain) { bestGain = g; best = i; }
      }
      return best >= 0 && bestGain >= p.minGain ? best : legacyPick;
    },
  },
});

/** Legacy's bounty value (bot.js bountyScore) with the kill chance reshaped by `k`. */
export function bountyGain(m, ps, card, k = 1) {
  const p0 = bountyKillChance(m, ps, card);
  const p = 1 - Math.pow(1 - Math.max(0, Math.min(1, Number.isFinite(p0) ? p0 : 0.5)), k);
  const n = Math.max(1, card.count || 1);
  const battles = Math.max(1, Math.min(3, card.rounds || 1));
  const lpCost = 2 + 20 / Math.max(1, ps.lp);
  const coin = Math.max(0, card.coin || 0);
  const gain = card.payout === 'perfect' ? p ** n * coin : p * n * coin;
  return battles * (gain - (1 - p) * n * lpCost);
}

/**
 * The 机变 pick without the bounty cards when the seat is low on LP or legacy rates the kill below `minChance`; legacy
 * then picks among the rest. With nothing else on offer, legacy's own pick.
 */
export const BOUNTY_GATE = defineTactic({
  id: 'bounty-gate',
  describe: 'variation: no bounty card under an LP floor or below a kill chance; legacy picks among the rest',
  params: { lpBelow: int(0, 40, 8), minChance: num(0, 1, 0.3) },
  at: {
    pickCard(ctx) {
      const { match: m, player: ps, params: p, args: [cards, available] } = ctx;
      if (!Array.isArray(available)) return PASS;
      const low = ps.lp <= p.lpBelow;
      const keep = available.filter((i) => {
        const c = cards[i];
        if (!c || c.kind !== 'bounty') return true;
        return !low && (p.minChance <= 0 || bountyKillChance(m, ps, c) >= p.minChance);
      });
      return keep.length && keep.length < available.length ? ctx.next(cards, keep) : PASS;
    },
  },
});

/** Levelling held while LP is at or below `lpBelow` from `fromRound` on: the funds go to units instead. */
export const LP_HOLD_LEVEL = defineTactic({
  id: 'lp-hold-level',
  describe: "variation: legacy's levelling, held while LP is low (units first)",
  params: { lpBelow: int(0, 40, 20), fromRound: int(0, 14, 4) },
  at: {
    levelUp(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      return m.round >= p.fromRound && ps.lp <= p.lpBelow ? undefined : ctx.next();
    },
  },
});

// ---- supplements ----------------------------------------------------------------------------------------------

/** Before legacy's buying: every shop copy that completes a merge, tier `minTier` and up, while funds stay ≥ `reserve`. */
export const MERGE_FIRST = defineTactic({
  id: 'merge-first',
  describe: 'supplement: buy the copies that complete a merge first; then legacy buys',
  params: { minTier: int(1, 6, 1), reserve: int(0, 20, 0) },
  at: {
    *buyLoopSteps(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const gd = gdOf(m, ps);
      for (let i = 0; i < ps.shop.slots.length; i++) {
        const s = ps.shop.slots[i];
        if (!s || s.sold || s.kind !== 'chess' || (gd.tierOf(s.id) || 0) < p.minTier) continue;
        if (!ps.completesChessMerge(s.id) || ps.priceOf(s) > ps.funds - p.reserve) continue;
        if (ok(() => ps.buy(i))) yield;
      }
      return yield* ctx.next();
    },
  },
});

/** After legacy's selling, from `fromRound`: the hand's single copies of tier `maxTier` and below are sold. */
export const SELL_SINGLES = defineTactic({
  id: 'sell-singles',
  describe: "supplement: after legacy's selling, sell the hand's low-tier single copies",
  params: { fromRound: int(0, 14, 6), maxTier: int(1, 5, 2) },
  at: {
    sellJunk(ctx) {
      const r = ctx.next();
      const { match: m, player: ps, params: p } = ctx;
      if (m.round < p.fromRound) return r;
      const gd = gdOf(m, ps), copies = copiesOf(m, ps);
      for (const piece of ps.hand) {
        if (!piece || piece.kind !== 'chess' || gd.isGolden(piece.id)) continue;
        if ((gd.tierOf(piece.id) || 0) > p.maxTier || (copies.get(gd.baseIdOf(piece.id)) || 0) >= 2) continue;
        ok(() => ps.sell(piece.uid));
      }
      return r;
    },
  },
});

/** Before legacy's buying, from `fromRound`: one or more extra refreshes while funds stay ≥ `reserve` and the hand has room. */
export const EARLY_ROLL = defineTactic({
  id: 'early-roll',
  describe: 'supplement: extra refreshes before legacy buys, from a round on, above a reserve',
  params: { fromRound: int(0, 14, 8), rolls: int(1, 6, 1), reserve: int(0, 30, 10) },
  at: {
    *buyLoopSteps(ctx) {
      const { match: m, player: ps, params: p, args: [opts] } = ctx;
      if (opts?.fillOnly || m.round < p.fromRound) return yield* ctx.next();
      const gd = gdOf(m, ps);
      for (let i = 0; i < p.rolls; i++) {
        const cost = ps.shop.freeRefreshes > 0 ? 0 : gd.refreshPrice;
        if (ps.funds - cost < p.reserve || freeSlot(ps.hand) < 0 || ps.shop.frozen) break;
        if (!ok(() => ps.refresh())) break;
        yield* ctx.next();
      }
      return yield* ctx.next();
    },
  },
});

/**
 * Writes legacy's own plan (bot.js selfPlan, aiPlan.js advisorPlan): from `fromRound`, add `bond` at `priority` to the
 * bonds of the seat's plan for the round, next to legacy's focus. Legacy reads the plan's bonds itself:
 *   - buying: a member it doesn't own yet scores + priority × 6 (planUnitWeight, planCopyUseful);
 *   - the lineup: the same weight;
 *   - its sales: a member is kept while selling it would lower the bond's active tier (planProtected).
 * So the tactic changes data only, never an action. A Bench-counted bond (投资人) is the case legacy misses most
 * (fish-edition/ai-players/08). No effect on a seat with an external advisor's plan naming its own bonds.
 */
const PLAN_BONDS = Object.freeze(['investShip', 'yanShip', 'sargonShip', 'victoriaShip', 'kjeragShip', 'lateranoShip', 'egirShip',
  'siracusaShip', 'kazimierzShip', 'preciShip', 'swiftShip', 'skillfulShip', 'arcaneShip', 'steadShip', 'deputShip', 'visiShip',
  'miraShip', 'raidShip', 'indomShip', 'soloShip', 'suntShip']);
export const PLAN_BOND = defineTactic({
  id: 'plan-bond',
  describe: "writes legacy's plan: adds a bond (default 投资人) to the seat's plan bonds from a round on; legacy's buying, lineup and sales follow it",
  params: {
    bond: { type: 'choice', choices: PLAN_BONDS, default: 'investShip' },
    priority: int(1, 5, 3),
    fromRound: int(1, 14, 6),
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (m.round >= p.fromRound && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const bonds = (own?.plan?.bonds || []).filter((b) => b.id !== p.bond);
        const add = Object.freeze({ id: p.bond, priority: p.priority });
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...(own?.plan || {}), bonds: Object.freeze([...bonds, add]) }) };
      }
      return ctx.next();
    },
  },
});

/**
 * Writes legacy's own plan, like plan-bond: from `fromRound` to `toRound`, the stack operators that feed whichever
 * Alliances are active go into the plan's `buy` (bought outright above the reserve, bot.js planSpendSteps; copies to
 * merge too) and the owned ones into its `keep` (+18 in the bench and sale scores). Legacy's engine bonus (engineFor)
 * only sees traits naming the focus Alliance or "自身所属／自身已激活的盟约", so it misses the position stackers:
 *   - pos: SERVER_ADD_BOND_POSITION, the active Alliances of itself and the piece in front / behind +n each prep
 *     (空弦, 断崖, 引星棘刺, 见行者). Humans deploy 空弦 and 断崖 7× and 19× as often as the bots in rounds 7–13
 *     (fish-edition/ai-players/08); legacy already places them (§37.37 positionTraitsOf).
 *   - own (kinds 'pos+own'): a prep-start / prep-end SERVER_ADD_BOND_CHESS_ALL, its own active Alliances +n (伊内丝, 赫默,
 *     莱恩哈特, 蒂比).
 * Buying stops once `max` different ones are owned (merging the owned ones goes on). Data only, never an action.
 */
const ENGINE_KINDS = Object.freeze(['pos', 'pos+own']);
function stackerBases(m, kinds) {
  const cache = m._tacticStackers || (m._tacticStackers = new Map());
  if (cache.has(kinds)) return cache.get(kinds);
  const gd = m.gd;
  const out = [];
  for (const id of m.pool?.entries?.keys?.() || []) { // the shop pool: what the shop can show
    const c = gd.chess(id);
    if (!c || gd.isGolden(id) || c.isHidden) continue;
    const yes = (c.garrisonIds || []).some((gid) => {
      const g = gd.garrison(gid);
      if (!g || (g.eventType !== 'SERVER_PREP_FIN' && g.eventType !== 'SERVER_PREP_START')) return false;
      return g.effectKey === 'SERVER_ADD_BOND_POSITION' || (kinds === 'pos+own' && g.effectKey === 'SERVER_ADD_BOND_CHESS_ALL');
    });
    if (yes) out.push(id);
  }
  const list = Object.freeze(out.sort());
  cache.set(kinds, list);
  return list;
}
export const PLAN_ENGINES = defineTactic({
  id: 'plan-engines',
  describe: "writes legacy's plan: the position stack operators (空弦, 断崖 …) into its buy and keep lists from a round on",
  params: {
    kinds: { type: 'choice', choices: ENGINE_KINDS, default: 'pos' },
    fromRound: int(1, 14, 4),
    toRound: int(1, 14, 11),
    max: int(1, 4, 2),
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (m.round >= p.fromRound && m.round <= p.toRound && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = ps.gd || m.gd;
        const bases = stackerBases(m, p.kinds);
        const ownedBases = new Set(ps.allChess().map((q) => gd.baseIdOf(q.id)));
        const owned = bases.filter((id) => ownedBases.has(gd.baseIdOf(id)));
        const buy = owned.length >= p.max ? owned : bases.filter((id) => (gd.chess(id)?.tier || 9) <= ps.shop.level);
        const keep = ps.allChess().filter((q) => bases.some((id) => gd.baseIdOf(id) === gd.baseIdOf(q.id))).map((q) => q.id);
        const plan = own?.plan || {};
        const merge = (a, b) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, 32));
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, buy: merge(plan.buy, buy), keep: merge(plan.keep, keep) }) };
      }
      return ctx.next();
    },
  },
});

/** The plan's listed shop items (items.buy) the shop shows, bought before legacy's buy loop (above params.reserve). */
function* listedItemsFirst(ctx) {
  const { match: m, player: ps, params: p, args: [opts] } = ctx;
  const want = ps._botSelf?.round === m.round ? ps._botSelf.plan?.items?.buy : null;
  if (!opts?.fillOnly && want?.length && ps.isBot && !ps.autoplay) {
    for (let guard = 0; guard < 4; guard++) {
      const i = ps.shop.slots.findIndex((sl) => sl && !sl.sold && sl.kind === 'item' && want.includes(sl.id)
        && ps.funds - ps.priceOf(sl) >= (p.reserve || 0));
      if (i < 0 || freeSlot(ps.hand) < 0 || !ok(() => ps.buy(i))) break;
      yield;
    }
  }
  return yield* ctx.next();
}

/**
 * Writes legacy's own plan: from `fromRound` to the Final Assault prep, shop consumables into the plan's `items.buy`.
 * The tactic buys the listed items the shop shows before legacy's buy loop; legacy's own plan step (planSpendSteps) buys
 * them too, and legacy equips them (equipItems). §37.39 stopped legacy buying shop equipment; it never buys these
 * (fish-edition/ai-players/08: per human seat 1.5 简易通讯机, 1.0 寻呼模块, 1.4 见钱眼开玩偶, 1.3 骑士储蓄罐 and 0.5
 * 精打细算玩偶 against ≤ 0.02 per bot seat).
 *   - stack: 随身身份牌 (1: +3 stacks), 简易通讯机 (2: an operator of the bearer's Alliances), 寻呼模块 (4: a free pick of 3);
 *   - coin: 见钱眼开玩偶 (1: +2 funds next round), 骑士储蓄罐 (3: 1–6 funds), and 精打细算玩偶 (3: +1 fund every later round)
 *     while 5 rounds or more remain before the Final Assault (legacy's own solo doll rule, §37.41).
 * Data, plus that one buy step.
 */
const ITEM_SETS = Object.freeze(['stack', 'coin', 'both']);
const STACK_ITEMS = Object.freeze(['chess_item_1_04_e_a', 'chess_item_2_06_e_a', 'chess_item_4_01_e_a']);
const COIN_ITEMS = Object.freeze(['chess_item_2_07_e_a', 'chess_item_3_12_e_a']);
const EARLY_DOLL = 'chess_item_2_05_e_a';
export const PLAN_ITEMS = defineTactic({
  id: 'plan-items',
  describe: "writes legacy's plan: shop consumables (stack items, funds dolls) into its items.buy list from a round on",
  params: {
    set: { type: 'choice', choices: ITEM_SETS, default: 'both' },
    fromRound: int(1, 14, 4),
    reserve: int(0, 30, 0),
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      const boss = (ps.gd || m.gd).bossRound;
      if (m.round >= p.fromRound && m.round < boss && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const add = [];
        if (p.set !== 'coin') add.push(...STACK_ITEMS);
        if (p.set !== 'stack') add.push(...COIN_ITEMS, ...(boss - m.round >= 5 ? [EARLY_DOLL] : []));
        const plan = own?.plan || {};
        const items = plan.items || {};
        const buy = Object.freeze([...new Set([...(items.buy || []), ...add])].slice(0, 8));
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, items: Object.freeze({ ...items, buy }) }) };
      }
      return ctx.next();
    },
    // Legacy's buy loop spends on operators and refreshes before a listed item wins a step, so the shop's listed items
    // are bought first (above `reserve`, with a free hand slot); legacy's equipItems uses them later in the prep.
    *buyLoopSteps(ctx) { return yield* listedItemsFirst(ctx); },
  },
});

/**
 * The Isomorph engine (fish-edition/ai-players/05, DYYBot step 3; Fish's draft "Muelsyse/Damazti Isomorph" and "up to 5
 * more Isomorph-compatible items"). Writes legacy's plan from shop level `fromLevel`, while fewer than `maxIso`
 * 变形同构体 are owned (hand, temp hand, worn):
 *   - buy: 缪尔赛思 (获得时: 1 变形同构体, 2 as an elite; Investor doubles it);
 *   - items.buy: the 变形同构体 itself (a tier-6 shop item);
 *   - items.buy (bondItems): the bond item of an Alliance one Isomorph can complete: first threshold ≤ 3 and the owned
 *     members one short of it (Fish: "if the Alliance needs N members and there are at least N-1 …"), while fewer such
 *     items are held loose than Isomorphs owned;
 *   - items.keep: the Isomorphs and those bond items.
 * Legacy equips them itself: morphPlan puts a 变形同构体 with a bond item on the lineup operator that gains most. The
 * listed items the shop shows are bought before legacy's buy loop, and a merge reward offering 缪尔赛思 or a 变形同构体 is
 * taken (takeOffers).
 */
const ISOMORPH = 'chess_item_6_09_e_a';
const MUELSYSE = 'chess_char_6_11_a';
export const PLAN_ISO = defineTactic({
  id: 'plan-iso',
  describe: "writes legacy's plan: 缪尔赛思, 变形同构体 and the bond items one Isomorph completes, from a shop level on",
  params: {
    fromLevel: int(1, 6, 6),
    maxIso: int(1, 8, 6),
    bondItems: { type: 'bool', default: true },
    reserve: int(0, 30, 0),
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (ps.shop.level >= p.fromLevel && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = gdOf(m, ps);
        const loose = [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item');
        const worn = ps.allChess().flatMap((q) => q.items || []);
        const isIso = (it) => !!gd.item(it.id)?.canGiveBond;
        const isoOwned = loose.filter(isIso).length + worn.filter(isIso).length;
        const plan = own?.plan || {};
        const items = plan.items || {};
        const buy = [], itemBuy = [], keep = [];
        if (isoOwned < p.maxIso) { buy.push(MUELSYSE); itemBuy.push(ISOMORPH); }
        for (const q of loose) if (isIso(q)) keep.push(q.id);
        if (p.bondItems && isoOwned > 0) {
          const counts = new Map();
          for (const q of ps.allChess()) for (const b of new Set(gd.chess(q.id)?.bonds || [])) counts.set(b, (counts.get(b) || 0) + 1);
          const looseBond = loose.filter((q) => gd.item(q.id)?.giveBondId && !isIso(q));
          for (const q of looseBond) keep.push(q.id);
          if (looseBond.length < isoOwned) {
            for (const id of Object.values(gd.shopItemsByTier || {}).flat()) {
              const rec = gd.item(id);
              if (!rec || rec.isGolden || rec.canGiveBond || !rec.giveBondId) continue;
              const th = gd.bond(rec.giveBondId)?.thresholds || [];
              if (th[0] && th[0] <= 3 && (counts.get(rec.giveBondId) || 0) === th[0] - 1) itemBuy.push(id);
            }
          }
        }
        const merge = (a, b, n) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, n));
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, buy: merge(plan.buy, buy, 32),
          items: Object.freeze({ ...items, buy: merge(items.buy, itemBuy, 8), keep: merge(items.keep, keep, 32) }) }) };
      }
      return ctx.next();
    },
    *buyLoopSteps(ctx) { return yield* listedItemsFirst(ctx); },
    // most human Isomorphs come from merge rewards (54 of 97 in the records; 缪尔赛思 56 of 76): a reward offering one
    // is taken, at any level, while fewer than maxIso are owned (legacy's takeOffers picks the rest)
    takeOffers(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const gd = gdOf(m, ps);
      for (let guard = 0; guard < 4 && ps.isBot && !ps.autoplay && ps.offers?.length; guard++) {
        const isoOwned = [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && gd.item(q.id)?.canGiveBond).length
          + ps.allChess().flatMap((q) => q.items || []).filter((it) => gd.item(it.id)?.canGiveBond).length;
        const i = isoOwned >= p.maxIso ? -1 : ps.offers[0].slots.findIndex((sl) => sl && !sl.sold
          && (sl.id === ISOMORPH || gd.baseIdOf(sl.id) === MUELSYSE));
        if (i < 0 || freeSlot(ps.hand) < 0 || !ok(() => ps.pickReward(i))) break;
      }
      return ctx.next();
    },
  },
});

export const RESEARCH_TACTICS = Object.freeze([SIMPLE_LEVEL, SIMPLE_SPEND, SIMPLE_FREEZE, BOUNTY_OPTIMISM, BOUNTY_GATE,
  LP_HOLD_LEVEL, MERGE_FIRST, SELL_SINGLES, EARLY_ROLL, PLAN_BOND, PLAN_ENGINES, PLAN_ITEMS, PLAN_ISO]);
