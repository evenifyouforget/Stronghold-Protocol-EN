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
import { bountyKillChance, gainCountLayers, acquireLayers, carryAndFocus, itemSlotFree } from './bot.js';
import { freeSlot, parseKey, tileKey, inField, pieceDir } from './board.js';

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

/**
 * Writes legacy's own plan, like plan-engines, for the trait combos the high-stacking humans build
 * (fish-edition/ai-players/08, "What the 200+ humans do differently"): a copier behind a stacker, both bought and kept.
 * Legacy places a copier behind its partner already (§37.37 positionTraitsOf `copy` / `trigger`); what it misses is
 * owning both halves (its buy score values each operator alone). Kinds, from the trait data:
 *   - start: SERVER_FRONT_SAME_EFFECT_PREP_START (白面鸮) behind a prep-start stacker (空弦 …): humans 59 % of 白面鸮's
 *     battles, bots 6 %;
 *   - fin: SERVER_FRONT_SAME_EFFECT_PREP_FIN (塞雷娅) behind a prep-end stacker (断崖, 山, 夕 …): humans 60 %, bots 0 %;
 *   - gain: SERVER_TRIGGER_ANOTHER of the front piece's SERVER_GAIN (铃兰) behind an on-obtain stacker (烛煌 …).
 * A stacker: a trait of that event whose effect adds stacks (an effectKey with ADD_BOND) and is strong (a position one, a
 * per-event engine, or +3 or more at once: not 刺玫's +1); the position stackers first.
 * Each prep from `fromRound` to `toRound`: a kind with one half owned puts the other half into the plan's `buy`; while
 * fewer than `max` kinds are complete and none is started, both halves of every kind go in (whatever the shop shows
 * first starts a pair). The owned halves of a started kind go into `keep` (+18 in the lineup, bench and sale scores).
 * `laterano`: 圣约送葬人 (Laterano +7 / Foresight +3 per 7 bullets in battle; humans 23 % of battles, bots 3 %) is
 * bought and kept once 2 Laterano operators are owned. Data only, never an action.
 */
function comboRoles(m) {
  if (m._tacticCombos) return m._tacticCombos;
  const gd = m.gd;
  const roles = { start: { copier: [], partner: [], pos: [] }, fin: { copier: [], partner: [], pos: [] }, gain: { copier: [], partner: [], pos: [] } };
  const EV = { start: 'SERVER_PREP_START', fin: 'SERVER_PREP_FIN', gain: 'SERVER_GAIN' };
  for (const id of m.pool?.entries?.keys?.() || []) {
    const c = gd.chess(id);
    if (!c || gd.isGolden(id) || c.isHidden) continue;
    for (const gid of c.garrisonIds || []) {
      const g = gd.garrison(gid);
      if (!g) continue;
      if (g.effectKey === 'SERVER_FRONT_SAME_EFFECT_PREP_START') roles.start.copier.push(id);
      else if (g.effectKey === 'SERVER_FRONT_SAME_EFFECT_PREP_FIN') roles.fin.copier.push(id);
      else if (g.effectKey === 'SERVER_TRIGGER_ANOTHER' && g.bbStr?.event === 'SERVER_GAIN') roles.gain.copier.push(id);
      for (const k of Object.keys(EV)) {
        if (g.eventType !== EV[k] || !/ADD_BOND/.test(g.effectKey || '')) continue;
        // a strong stacker only: a position one, a per-event engine (add_method), or +3 or more at once (not 刺玫's +1)
        const strong = g.effectKey === 'SERVER_ADD_BOND_POSITION' || !!g.bbStr?.add_method
          || Math.max(Number(g.bb?.count) || 0, ...String(g.bbStr?.count || '').split(',').map(Number).filter(Number.isFinite)) >= 3;
        if (!strong) continue;
        (g.effectKey === 'SERVER_ADD_BOND_POSITION' ? roles[k].pos : roles[k].partner).push(id);
      }
    }
  }
  const fz = (xs) => Object.freeze([...new Set(xs)].sort());
  for (const r of Object.values(roles)) { r.copier = fz(r.copier); r.pos = fz(r.pos); r.partner = fz([...r.pos, ...r.partner]); }
  const executor = [...(m.pool?.entries?.keys?.() || [])].find((id) => gd.baseIdOf(id) === 'chess_char_5_01_a' && !gd.isGolden(id)) || null;
  return (m._tacticCombos = Object.freeze({ roles, executor }));
}
const COMBO_KINDS = Object.freeze(['start', 'fin', 'gain']);
export const PLAN_COMBOS = defineTactic({
  id: 'plan-combos',
  describe: "writes legacy's plan: buys and keeps both halves of a trait combo (白面鸮 behind 空弦, 塞雷娅 behind 断崖 …) and 圣约送葬人 on Laterano boards",
  params: {
    fromRound: int(1, 14, 4),
    toRound: int(1, 14, 12),
    max: int(1, 3, 1),
    start: { type: 'bool', default: true },
    fin: { type: 'bool', default: true },
    gain: { type: 'bool', default: false },
    laterano: { type: 'bool', default: true },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (m.round >= p.fromRound && m.round <= p.toRound && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = ps.gd || m.gd;
        const { roles, executor } = comboRoles(m);
        const ownedBases = new Set(ps.allChess().map((q) => gd.baseIdOf(q.id)));
        const has = (ids) => ids.filter((id) => ownedBases.has(gd.baseIdOf(id)));
        const shows = (id) => (gd.chess(id)?.tier || 9) <= ps.shop.level;
        const buy = [], keepBases = new Set();
        const kinds = COMBO_KINDS.filter((k) => p[k] && roles[k].copier.length && roles[k].partner.length);
        let complete = 0, started = 0;
        for (const k of kinds) {
          const c = has(roles[k].copier), q = has(roles[k].partner);
          if (c.length && q.length) complete++;
          else if (c.length || q.length) started++;
        }
        for (const k of kinds) {
          const r = roles[k], c = has(r.copier), q = has(r.partner);
          if (c.length || q.length) for (const id of [...c, ...q]) keepBases.add(gd.baseIdOf(id));
          if (c.length && q.length) { buy.push(...c, ...q); continue; } // copies to merge
          if (c.length) buy.push(...c, ...(r.pos.length ? r.pos : r.partner));
          else if (q.length && complete < p.max) buy.push(...q, ...r.copier);
          else if (!started && complete < p.max) buy.push(...r.copier, ...(r.pos.length ? r.pos : r.partner));
        }
        if (p.laterano && executor) {
          const lat = ps.allChess().filter((x) => gd.chess(x.id)?.bonds?.includes('lateranoShip')).length;
          if (lat >= 2 || ownedBases.has(gd.baseIdOf(executor))) { buy.push(executor); keepBases.add(gd.baseIdOf(executor)); }
        }
        const keep = ps.allChess().filter((x) => keepBases.has(gd.baseIdOf(x.id))).map((x) => x.id);
        const plan = own?.plan || {};
        const merge = (a, b) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, 32));
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, buy: merge(plan.buy, buy.filter(shows)), keep: merge(plan.keep, keep) }) };
      }
      return ctx.next();
    },
  },
});

/** The plan's listed shop items (items.buy) the shop shows, bought before legacy's buy loop (above params.reserve). */
export function* listedItemsFirst(ctx) {
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

/** The owned operators' distinct base ids per bond (board, bench and hand; golden copies count as their base). */
function ownedMembers(gd, ps, bond) {
  return new Set(ps.allChess().filter((q) => gd.chess(q.id)?.bonds?.includes(bond)).map((q) => gd.baseIdOf(q.id))).size;
}
/** Adds `adds` ({ id, priority }) to the seat's plan bonds (replacing the same ids) and `keep` ids to its keep list. */
function writePlan(m, ps, adds, keep = []) {
  const own = ps._botSelf;
  const plan = own?.plan || {};
  const ids = new Set(adds.map((b) => b.id));
  const bonds = Object.freeze([...(plan.bonds || []).filter((b) => !ids.has(b.id)), ...adds.map((b) => Object.freeze(b))]);
  const merge = (a, b) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, 32));
  ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, bonds, ...(keep.length ? { keep: merge(plan.keep, keep) } : {}) }) };
}
const OP = Object.freeze({ GLADIIA: 'chess_char_4_12_a', MOSTIMA: 'chess_char_4_02_a', EXECUTOR: 'chess_char_5_01_a', DUSK: 'chess_char_5_12_a',
  SILVERASH_ALTER: 'chess_char_5_14_a', YU: 'chess_char_6_03_a', SWIRE_ALTER: 'chess_char_3_04_a', INES: 'chess_char_4_04_a' });

/**
 * Fish's "small tweaks" (fish-edition/TODO.md, 2026-11-12): commit to an Alliance once its key operator is owned, by
 * writing the Alliance into legacy's plan bonds at `priority` (as plan-bond does) and keeping the key operator:
 *   - gladiia: 歌蕾蒂娅 → Ægir;
 *   - laterano: 莫斯提马 or 圣约送葬人 → Laterano;
 *   - dusk: 夕 → Yan or Arcane, whichever has more members owned (Yan on a tie);
 *   - silverash: 凛御银灰 with 3 Kjerag operators owned → Kjerag.
 * From `fromRound`; data only, never an action.
 */
export const PLAN_COMMIT = defineTactic({
  id: 'plan-commit',
  describe: "writes legacy's plan: commits to an Alliance once its key operator is owned (歌蕾蒂娅 → Ægir, 莫斯提马 / 圣约送葬人 → Laterano, 夕 → Yan / Arcane, 凛御银灰 + 3 → Kjerag)",
  params: {
    priority: int(1, 5, 4),
    fromRound: int(1, 14, 3),
    gladiia: { type: 'bool', default: true },
    laterano: { type: 'bool', default: true },
    dusk: { type: 'bool', default: true },
    silverash: { type: 'bool', default: true },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (m.round >= p.fromRound && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = gdOf(m, ps);
        const bases = new Set(ps.allChess().map((q) => gd.baseIdOf(q.id)));
        const adds = [], keep = [];
        const commit = (bond, key) => { adds.push({ id: bond, priority: p.priority }); keep.push(...ps.allChess().filter((q) => key.includes(gd.baseIdOf(q.id))).map((q) => q.id)); };
        if (p.gladiia && bases.has(OP.GLADIIA)) commit('egirShip', [OP.GLADIIA]);
        if (p.laterano && (bases.has(OP.MOSTIMA) || bases.has(OP.EXECUTOR))) commit('lateranoShip', [OP.MOSTIMA, OP.EXECUTOR]);
        if (p.dusk && bases.has(OP.DUSK)) commit(ownedMembers(gd, ps, 'arcaneShip') > ownedMembers(gd, ps, 'yanShip') ? 'arcaneShip' : 'yanShip', [OP.DUSK]);
        if (p.silverash && bases.has(OP.SILVERASH_ALTER) && ownedMembers(gd, ps, 'kjeragShip') >= 3) commit('kjeragShip', [OP.SILVERASH_ALTER]);
        if (adds.length) writePlan(m, ps, adds, keep);
      }
      return ctx.next();
    },
  },
});

/**
 * Fish's "small tweaks" (fish-edition/TODO.md, 2026-11-12) about single operators, written into legacy's plan:
 *   - yu: take 余 from a merge reward (tier 6: legacy's shop stops at level 5) and keep him (his row trait makes
 *     operators);
 *   - swire: keep 琳琅诗怀雅 (+1 fund every prep; from the Bench too with Yan / Investor active) until the boss round;
 *   - executor: with Foresight active (2 members owned) and both owned, keep 圣约送葬人, not 伊内丝, so the lineup
 *     prefers him.
 * Data only, apart from yu's reward pick.
 */
export const PLAN_KEEPERS = defineTactic({
  id: 'plan-keepers',
  describe: "writes legacy's plan: takes and keeps 余, keeps 琳琅诗怀雅 until the boss round, prefers 圣约送葬人 to 伊内丝 under Foresight",
  params: {
    yu: { type: 'bool', default: true },
    swire: { type: 'bool', default: true },
    executor: { type: 'bool', default: true },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = gdOf(m, ps);
        const keepBases = new Set();
        if (p.yu) keepBases.add(OP.YU);
        if (p.swire && !(m.round >= (gd.bossRound || 99))) keepBases.add(OP.SWIRE_ALTER);
        const bases = new Set(ps.allChess().map((q) => gd.baseIdOf(q.id)));
        if (p.executor && bases.has(OP.EXECUTOR) && bases.has(OP.INES) && ownedMembers(gd, ps, 'visiShip') >= 2) keepBases.add(OP.EXECUTOR);
        const keep = ps.allChess().filter((q) => keepBases.has(gd.baseIdOf(q.id))).map((q) => q.id);
        if (keep.length) {
          const plan = own?.plan || {};
          // 伊内丝 off the keep list while 圣约送葬人 is preferred
          const drop = keepBases.has(OP.EXECUTOR) ? new Set(ps.allChess().filter((q) => gd.baseIdOf(q.id) === OP.INES).map((q) => q.id)) : new Set();
          const merged = [...new Set([...(plan.keep || []).filter((id) => !drop.has(id)), ...keep])].slice(0, 32);
          ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, keep: Object.freeze(merged) }) };
        }
      }
      return ctx.next();
    },
    takeOffers(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (p.yu && ps.isBot && !ps.autoplay && ps.offers?.length) {
        const gd = gdOf(m, ps);
        const i = ps.offers[0].slots.findIndex((sl) => sl && !sl.sold && gd.baseIdOf(sl.id) === OP.YU);
        if (i >= 0 && freeSlot(ps.hand) >= 0) ok(() => ps.pickReward(i));
      }
      return ctx.next();
    },
  },
});

/**
 * 自选 (custom operators) for a bot seat (Fish 2026-11-12: "I thought I was already asking for bots to use custom
 * operators"; ai-players/05 "Chen the Dawnstreak and Shu on tier 5, nothing on tier 6"). The picks are made at match
 * setup (botTactics.js diyPicks → Match.js → PlayerState setDiy); legacy already buys a slotted piece (DIY_PIECE_BONUS).
 * Each choice is the human records' favourite skill and module (ai-players/08: tier 6 Togawa Sakiko S3 and Haruka S3,
 * tier 5 Ch'en the Dawnstreak S3, Kal'tsit S2, Wang S3). An owned operator fills one slot: a repeat is skipped.
 */
export const DIY_CHOICES = Object.freeze({
  chen: Object.freeze({ charId: 'char_1050_chen3', skillIndex: 2, uniEquipId: 'uniequip_002_chen3' }),
  shu: Object.freeze({ charId: 'char_2025_shu', skillIndex: 2, uniEquipId: 'uniequip_002_shu' }),
  wang: Object.freeze({ charId: 'char_2027_wang', skillIndex: 2, uniEquipId: 'uniequip_002_wang' }),
  kaltsit: Object.freeze({ charId: 'char_1052_kalts2', skillIndex: 1, uniEquipId: null }),
  logos: Object.freeze({ charId: 'char_4133_logos', skillIndex: 2, uniEquipId: 'uniequip_002_logos' }),
  sakiko: Object.freeze({ charId: 'char_4182_oblvns', skillIndex: 2, uniEquipId: 'uniequip_002_oblvns' }),
  haruka: Object.freeze({ charId: 'char_4202_haruka', skillIndex: 2, uniEquipId: 'uniequip_002_haruka' }),
  goldenglow: Object.freeze({ charId: 'char_377_gdglow', skillIndex: 2, uniEquipId: 'uniequip_002_gdglow' }),
  // Fish's TODO: "Kjerag: take Ascalon as custom operator with skill 2, give her Kjerag Nevermeltice to trigger a lot of
  // Frozen" (tier 6; while she is owned, the Nevermeltice goes into legacy's items.buy / keep)
  ascalon: Object.freeze({ charId: 'char_4132_ascln', skillIndex: 1, uniEquipId: null, items: Object.freeze(['chess_item_5_02_e_a']) }),
});
const DIY_OPTIONS = ['none', ...Object.keys(DIY_CHOICES)];
export const DIY_PICKS = defineTactic({
  id: 'diy-picks',
  describe: 'fills the custom operator (自选) slots at match setup: two picks per tier 5 and 6',
  params: {
    t5a: { type: 'choice', choices: DIY_OPTIONS, default: 'chen' },
    t5b: { type: 'choice', choices: DIY_OPTIONS, default: 'shu' },
    t6a: { type: 'choice', choices: DIY_OPTIONS, default: 'none' },
    t6b: { type: 'choice', choices: DIY_OPTIONS, default: 'none' },
    // legacy buys a new operator for a full board only when the lineup gains, which a lone custom piece seldom does
    // (smoke: shown R10-R14, never bought): the slotted pieces go into legacy's plan to buy, and the owned ones to keep
    buy: { type: 'bool', default: true },
    keep: { type: 'bool', default: true },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (ps.isBot && !ps.autoplay && ps.diyStock?.entries.size && (p.buy || p.keep) && (!own || own.round === m.round)) {
        const gd = gdOf(m, ps);
        const slots = new Set(ps.diyStock.entries.keys());
        const owned = ps.allChess().filter((q) => slots.has(gd.baseIdOf(q.id)));
        const buy = p.buy ? [...ps.diyStock.entries].filter(([id, e]) => e.left > 0 && !owned.some((q) => gd.isGolden(q.id) && gd.baseIdOf(q.id) === id)).map(([id]) => id) : [];
        const keep = p.keep ? owned.map((q) => q.id) : [];
        // a choice's paired items (Ascalon: the Nevermeltice) while that operator is owned
        const ownedChars = new Set(owned.map((q) => ps.diy?.[gd.baseIdOf(q.id)]?.charId));
        const pair = Object.values(DIY_CHOICES).filter((c) => c.items && ownedChars.has(c.charId)).flatMap((c) => c.items);
        const held = new Set([...ps.hand, ...ps.temp].filter((q) => q?.kind === 'item').map((q) => q.id));
        const worn = new Set(ps.allChess().flatMap((q) => (q.items || []).map((it) => it.id)));
        const itemBuy = pair.filter((id) => !held.has(id) && !worn.has(id)), itemKeep = pair.filter((id) => held.has(id));
        if (buy.length || keep.length || itemBuy.length || itemKeep.length) {
          const plan = own?.plan || {};
          const merge = (a, b, n = 32) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, n));
          const items = plan.items || {};
          ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, ...(buy.length ? { buy: merge(plan.buy, buy) } : {}), ...(keep.length ? { keep: merge(plan.keep, keep) } : {}),
            ...(itemBuy.length || itemKeep.length ? { items: Object.freeze({ ...items, buy: merge(items.buy, itemBuy, 8), keep: merge(items.keep, itemKeep) }) } : {}) }) };
        }
      }
      return ctx.next();
    },
  },
  diyPicks(p) {
    const out = {};
    const used = new Set();
    for (const [slot, key] of [['chess_char_5_diy1_a', p.t5a], ['chess_char_5_diy2_a', p.t5b], ['chess_char_6_diy1_a', p.t6a], ['chess_char_6_diy2_a', p.t6b]]) {
      if (key === 'none' || used.has(key)) continue;
      used.add(key);
      const { items: _paired, ...pick } = DIY_CHOICES[key];
      out[slot] = pick;
    }
    return Object.keys(out).length ? out : null;
  },
});

/**
 * Cycling for the economy (fish-edition/ai-players/08 "The economy gap": human seats buy and sell 25.6 operators a game
 * in the same prep, bots 3.1). Buy an operator whose 获得时 / 售出时 trait pays back more than its net cost (price − sale)
 * and sell it at once. Legacy's own trade (bot.js tradeOnce) counts layers only, at TRADE_MIN layers per fund; this
 * counts the economy traits in funds:
 *   - refresh: a free refresh (普罗旺斯 on gain, 德克萨斯 on sale) is worth the refresh price;
 *   - gold: SERVER_ONCE_GOLD (能天使 +1 on gain, 泥岩 +2 on sale);
 *   - recruit: 松果's sale recruits a tier-1 operator (worth its sale, and one more gain);
 *   - coin: SERVER_GAIN_EQUIP of 盟约之币 (诗怀雅: equipped, it is destroyed for 1 fund);
 * plus `layerGold` funds per layer the cycle feeds: the deployed round-gain stackers for every operator gained (小满 / 山 / 夕,
 * bot.js gainCountLayers), the deployed spend stackers for every fund spent (溯光星源, Astgenne the Lightchaser — SERVER_ADD_BOND_ROUND_COIN_COST,
 * +2 灵巧 / 奥术 per 3 funds; bot.js has no counterpart), and the operator's own 获得时 layer traits on active Alliances
 * (bot.js acquireLayers). Humans cycle where these engines are deployed (08: 13.4 cycles a round with a spend stacker,
 * 8.8 with a gain stacker, 0.7 with none); 极简 / 葡萄 (price 1, sale 1) cycle for free. On the economy traits alone a
 * cycle breaks even at best (a refresh costs 1). 获得时 effects count ×2 under an active
 * 投资人 (×3 from 100 layers), as the dispatcher runs them (effectsMeta.js investRepeat).
 * Runs before legacy's buy loop and again with the leftover (spendDown), from `fromRound`, keeping `reserve` funds,
 * at most `maxPerRound` cycles. An operator the seat already owns a copy of is never cycled (a merge copy).
 */
const RECRUIT_GOLD = 1;
export const CYCLE_ECON = defineTactic({
  id: 'cycle-econ',
  describe: 'buy and sell at once the operators whose gain or sale trait pays back more than price − sale (refreshes, funds, recruits, coins, per-gain layers)',
  params: {
    fromRound: int(1, 14, 5),
    minProfit: num(-2, 3, 0),
    layerGold: num(0, 1, 0.5),
    reserve: int(0, 20, 2),
    maxPerRound: int(1, 20, 8),
    refresh: { type: 'bool', default: true },
    gold: { type: 'bool', default: true },
    recruit: { type: 'bool', default: true },
    coin: { type: 'bool', default: true },
  },
  at: {
    *buyLoopSteps(ctx) {
      yield* cycleSteps(ctx);
      return yield* ctx.next();
    },
    spendDown(ctx) {
      const it = cycleSteps(ctx);
      while (!it.next().done);
      return ctx.next();
    },
  },
});
/** The funds one gain-and-sale of chess `id` brings, net of its cost (price − sale); null: not a cycle. */
export function cycleProfit(m, ps, slot, p) {
  const gd = gdOf(m, ps);
  const c = gd.chess(slot.id);
  if (!c || gd.isGolden(slot.id)) return null;
  const inv = ps.bonds?.investShip?.active ? ((ps.layers?.investShip || ps.bonds.investShip.layers || 0) >= 100 ? 3 : 2) : 1;
  const active = (b) => !!ps.bonds?.[b]?.active;
  let gold = 0;
  let gains = 1;
  for (const gid of c.garrisonIds || []) {
    const g = gd.garrison(gid);
    if (!g) continue;
    const onGain = g.eventType === 'SERVER_GAIN', onSale = g.eventType === 'SERVER_CHESS_SOLD';
    if (!onGain && !onSale) continue;
    const k = onGain ? inv : 1;
    const n = Number(g.bb?.count) || 1;
    if (p.refresh && g.effectKey === 'SERVER_GAIN_FREE_REFRESH_COUNT') gold += k * n * gd.refreshPrice;
    else if (p.gold && g.effectKey === 'SERVER_ONCE_GOLD') gold += k * n;
    else if (p.recruit && g.effectKey === 'SERVER_SELL_CHESS_GAIN_SPECIAL_GOODS') { gold += RECRUIT_GOLD; gains += 1; }
    else if (p.coin && g.effectKey === 'SERVER_GAIN_EQUIP' && gd.item(g.bbStr?.chess)?.giveBondId == null
      && /1_03_e/.test(String(g.bbStr?.chess))) gold += k * n;
  }
  let layers = 0;
  for (const [b, n] of acquireLayers(m, ps, c)) if (active(b)) layers += inv * n;
  layers += gains * gainCountLayers(m, ps) + ps.priceOf(slot) * spendLayersPerGold(m, ps);
  gold += layers * p.layerGold;
  const net = ps.priceOf(slot) - gd.sellPrice(slot.id);
  return gold - net;
}
/** Layers per fund spent this prep from the deployed spend stackers (SERVER_ADD_BOND_ROUND_COIN_COST), active Alliances only. */
export function spendLayersPerGold(m, ps) {
  const gd = gdOf(m, ps);
  let n = 0;
  for (const q of ps.board.values()) {
    if (q.kind !== 'chess') continue;
    for (const gid of gd.chess(q.id)?.garrisonIds || []) {
      const g = gd.garrison(gid);
      if (g?.effectKey !== 'SERVER_ADD_BOND_ROUND_COIN_COST') continue;
      const per = (Number(g.bb?.layer) || 0) / (Number(g.bb?.count) || 1);
      for (const b of String(g.bbStr?.bond || '').split(',')) if (ps.bonds?.[b.trim()]?.active) n += per;
    }
  }
  return n;
}
function* cycleSteps(ctx) {
  const { match: m, player: ps, params: p, args: [opts] } = ctx;
  if (opts?.fillOnly || !ps.isBot || ps.autoplay || m.round < p.fromRound) return;
  const gd = gdOf(m, ps);
  if (gd.leftoverKeptBands?.includes(ps.bandId)) return;
  const done = ps._botCycles?.round === m.round ? ps._botCycles : (ps._botCycles = { round: m.round, n: 0 });
  for (let guard = 0; guard < 12 && done.n < p.maxPerRound; guard++) {
    if (freeSlot(ps.hand) < 0) return;
    const owned = copiesOf(m, ps);
    let best = -1, bestV = -Infinity;
    ps.shop.slots.forEach((sl, i) => {
      if (!sl || sl.sold || sl.kind !== 'chess' || owned.has(gd.baseIdOf(sl.id))) return;
      if (ps.funds - ps.priceOf(sl) < p.reserve) return;
      const v = cycleProfit(m, ps, sl, p);
      if (v != null && v >= p.minProfit && v > bestV) { bestV = v; best = i; }
    });
    if (best < 0) return;
    const before = new Set(ps.allChess().map((q) => q.uid));
    const id = ps.shop.slots[best].id;
    if (!ok(() => ps.buy(best))) return;
    const fresh = ps.allChess().find((q) => !before.has(q.uid) && q.id === id);
    if (fresh) ok(() => ps.sell(fresh.uid));
    done.n++;
    yield;
  }
}

/**
 * The copy combos, placed (fish-edition/ai-players/08): a copier takes the trait of the piece in front of it — 白面鸮
 * Ptilopsis (SERVER_FRONT_SAME_EFFECT_PREP_START) a 进入休整期时 one, 塞雷娅 Saria (…_PREP_FIN) a 休整期结束时 one. Bots
 * that own both rarely put the copier behind the partner (records: Ptilopsis 2–5 % of her battles, Saria 15–25 %;
 * humans about half), and legacy-arrange's prep tie-break does not change that: the rehearsal can't see a copied
 * prep-time trait. So after the rehearsed layout is on the board (finishLayout), each deployed copier with no partner in
 * front moves onto the tile behind a deployed partner (facing it), swapping with that tile's piece if needed — never
 * breaking another copier's pair. From `fromRound`; in the final boss rounds only with `boss`.
 */
const COPY_EVENTS = Object.freeze({ SERVER_FRONT_SAME_EFFECT_PREP_START: 'SERVER_PREP_START', SERVER_FRONT_SAME_EFFECT_PREP_FIN: 'SERVER_PREP_FIN' });
const DIRS = Object.freeze({ UP: [-1, 0], RIGHT: [0, 1], DOWN: [1, 0], LEFT: [0, -1] });
export const PLACE_COPIERS = defineTactic({
  id: 'place-copiers',
  describe: 'after the rehearsed layout, moves Ptilopsis / Saria behind a deployed piece whose prep trait they copy',
  params: { fromRound: int(1, 14, 4), boss: { type: 'bool', default: false } },
  at: {
    finishLayout(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (ps.isBot && !ps.autoplay && m.round >= p.fromRound && (p.boss || m.wave)) placeCopiers(m, ps);
      return ctx.next();
    },
  },
});
/** The prep event a piece's trait copies (a copier), or null. */
function copiedEvent(gd, id) {
  for (const gid of gd.chess(id)?.garrisonIds || []) { const e = COPY_EVENTS[gd.garrison(gid)?.effectKey]; if (e) return e; }
  return null;
}
const hasEvent = (gd, id, ev) => (gd.chess(id)?.garrisonIds || []).some((gid) => {
  const g = gd.garrison(gid);
  return g && g.eventType === ev && !COPY_EVENTS[g.effectKey];
});
export function placeCopiers(m, ps) {
  const gd = gdOf(m, ps);
  const front = (key, dir) => { const [r, c] = parseKey(key); const [dr, dc] = DIRS[dir] || [0, 0]; return tileKey(r + dr, c + dc); };
  const pieces = () => [...ps.board.entries()].filter(([, q]) => q.kind === 'chess');
  const paired = (key, q, ev) => { const f = ps.board.get(front(key, pieceDir(q))); return !!f && f.kind === 'chess' && hasEvent(gd, f.id, ev); };
  let moved = 0;
  for (const [key, q] of pieces()) {
    const ev = copiedEvent(gd, q.id);
    if (!ev || paired(key, q, ev)) continue;
    // tiles whose occupant must stay: every partner, and every copier already paired
    const keep = new Set(pieces().filter(([k, x]) => hasEvent(gd, x.id, ev) || (copiedEvent(gd, x.id) && paired(k, x, copiedEvent(gd, x.id)))).map(([k]) => k));
    let done = false;
    for (const [pk, partner] of pieces()) {
      if (done || partner === q || !hasEvent(gd, partner.id, ev)) continue;
      const [pr, pc] = parseKey(pk);
      for (const dir of [pieceDir(q), ...Object.keys(DIRS).filter((d) => d !== pieceDir(q))]) {
        const [dr, dc] = DIRS[dir];
        const tr = pr - dr, tc = pc - dc, tk = tileKey(tr, tc);
        if (!inField(tr, tc) || (keep.has(tk) && tk !== key)) continue;
        if (ok(() => ps.move(q.uid, { area: 'board', row: tr, col: tc }, dir))) { moved++; done = true; break; }
      }
    }
  }
  return moved;
}

/**
 * The Isomorph on the carry (fish-edition/ai-players/08, "The Isomorph gap"; Fish 2026-11-12: "it's to give a huge buff
 * to a core dps operator who is at the start of the snake. like, buff pramanix alter or sakiko to deal tons of damage").
 * In clean human games 37 of 62 seats wore an Isomorph with an Alliance item (bots 16 of 111), mostly Victoria, Kjerag
 * and Ægir on a top attacker. From `fromRound`:
 *   - the carry is planned and kept: once one of the two items is on an operator, that operator stays the carry while it
 *     is deployed (ps._botCarry); before that, carryAndFocus's main damage dealer;
 *   - the Alliance item is the focus Alliance's (`bond: focus`), else, with `bond: any`, one for an active Alliance the
 *     carry is not in;
 *   - `order: either` (default; Fish 2026-11-12: "humans may equip either item first to reduce inventory pressure, but
 *     this still requires planning to know who you want your carry dps to be"): whichever of the two is held goes on
 *     the carry now, if the carry has room for both;
 *   - `order: hold`: both go on together; until the Alliance item comes, the Isomorph waits in the hand (the plan's
 *     items.hold, skipped by legacy's equip loops; queue16's version without it never fired, as legacy's morph rule
 *     equipped the Isomorph the prep it arrived);
 *   - sellJunk: while the carry still lacks the Alliance item and an Isomorph is held or on the carry, that item goes
 *     into items.buy; the held pieces into items.keep.
 * The order the two are worn in doesn't matter to the game: the Isomorph grants the Alliance of a bond item worn with it.
 */
const isIsoItem = (gd, it) => !!gd.item(it?.id)?.canGiveBond;
const isBondGift = (gd, it) => { const r = gd.item(it?.id); return !!r && !r.canGiveBond && !!r.giveBondId; };
/** The planned carry: the one already given a carry item (still deployed), else the main damage dealer. */
export function plannedCarry(m, ps) {
  const gd = gdOf(m, ps);
  const { carry, focus } = carryAndFocus(m, ps);
  const kept = ps._botCarry != null ? [...ps.board.values()].find((q) => q.uid === ps._botCarry && q.kind === 'chess') : null;
  const wearing = kept || [...ps.board.values()].find((q) => q.kind === 'chess' && gd.baseIdOf(q.id) !== MUELSYSE && (q.items || []).some((it) => isIsoItem(gd, it))
    && !(q.items || []).some((it) => isBondGift(gd, it)));
  return { carry: wearing || carry, focus };
}
export const CARRY_ISO = defineTactic({
  id: 'carry-iso',
  describe: 'puts an Isomorph and an Alliance item (the focus one) on a planned main damage dealer, either one first',
  params: {
    fromRound: int(1, 14, 4),
    bond: { type: 'choice', choices: ['focus', 'any'], default: 'focus' },
    buy: { type: 'bool', default: true },
    order: { type: 'choice', choices: ['either', 'hold'], default: 'either' },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (p.buy && m.round >= p.fromRound && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = gdOf(m, ps);
        const loose = [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item');
        const iso = loose.filter((q) => isIsoItem(gd, q));
        const { carry, focus } = plannedCarry(m, ps);
        const worn = carry?.items || [];
        const needsItem = !worn.some((it) => isBondGift(gd, it));
        if (focus && needsItem && (iso.length || worn.some((it) => isIsoItem(gd, it)))) {
          const mine = loose.filter((q) => isBondGift(gd, q) && gd.item(q.id).giveBondId === focus);
          const want = mine.length ? [] : Object.values(gd.shopItemsByTier || {}).flat()
            .filter((id) => { const r = gd.item(id); return r && !r.isGolden && !r.canGiveBond && r.giveBondId === focus; });
          const plan = own?.plan || {};
          const items = plan.items || {};
          const merge = (a, b, n) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, n));
          const hold = p.order === 'hold' && !mine.length && m.round < (gd.bossRound || 99) ? iso.map((q) => q.id) : [];
          ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, items: Object.freeze({ ...items,
            buy: merge(items.buy, want, 8), keep: merge(items.keep, [...iso, ...mine].map((q) => q.id), 32),
            ...(hold.length ? { hold: merge(items.hold, hold, 8) } : {}) }) }) };
        }
      }
      return ctx.next();
    },
    *buyLoopSteps(ctx) { return yield* listedItemsFirst(ctx); },
    equipItems(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (m.round >= p.fromRound && ps.isBot && !ps.autoplay) equipCarry(m, ps, p);
      return ctx.next();
    },
  },
});
/** carry-iso's equip step; returns how many items went on. */
const ANY_BOND_ITEM = 'chess_item_1_01_e_a'; // stands in for "an Alliance item" in the room check (each takes one slot)
export function equipCarry(m, ps, p) {
  const gd = gdOf(m, ps);
  const loose = [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item');
  const { carry, focus } = plannedCarry(m, ps);
  if (!carry) return 0;
  const worn = carry.items || [];
  const hasIso = worn.some((it) => isIsoItem(gd, it)), hasItem = worn.some((it) => isBondGift(gd, it));
  if (hasIso && hasItem) return 0;
  const morph = hasIso ? null : loose.find((q) => isIsoItem(gd, q)) || null;
  const bonds = new Set(gd.chess(carry.id)?.bonds || []);
  const cand = hasItem ? [] : loose.filter((q) => isBondGift(gd, q) && !bonds.has(gd.item(q.id).giveBondId));
  const X = cand.find((q) => gd.item(q.id).giveBondId === focus)
    || (p.bond === 'any' ? cand.find((q) => ps.bonds?.[gd.item(q.id).giveBondId]?.active) : null) || null;
  if (!morph && !X) return 0;
  // hold: both together (or the missing one onto a carry that already wears the other)
  if (p.order === 'hold' && !(hasIso || hasItem) && !(morph && X)) return 0;
  // a lone Isomorph waits for an Alliance item: only with a focus whose item sellJunk can buy (or bond: any)
  if (morph && !X && !hasItem && !focus && p.bond !== 'any') return 0;
  // room for both: what goes on now and what is still to come
  const toCome = [...(hasIso ? [] : [morph?.id || ISOMORPH]), ...(hasItem ? [] : [X?.id || ANY_BOND_ITEM])];
  let cur = carry;
  for (const id of toCome) {
    if (!itemSlotFree(m, ps, cur, gd.item(id))) return 0;
    cur = { ...cur, items: [...(cur.items || []), { id, uid: -1 }] };
  }
  let n = 0;
  if (X && ok(() => ps.equip(X.uid, carry.uid))) n++;
  if (morph && ok(() => ps.equip(morph.uid, carry.uid))) n++;
  if (n) ps._botCarry = carry.uid;
  return n;
}

/**
 * Always buy Minimalist (至简; Fish's TODO: "He costs 1 and sells for 1, so there's basically no downside … that already
 * adds 1 buy counter for buy triggers and 1 sell counter for sell triggers"). Before legacy's buy loop, from `fromRound`,
 * every Minimalist the shop shows is bought (above `reserve`, with hand room):
 *   - mode cycle: sold again at once (a free gain + sale for the on-gain / on-spend stackers; cycle-econ does the same
 *     only for a first copy, and only when its own valuation says so);
 *   - mode merge: kept (legacy's plan keeps them) until a merge, for the merge reward; past a pair the extra one is sold.
 */
const MINIMALIST = 'chess_char_3_13_a';
export const BUY_MINIMALIST = defineTactic({
  id: 'buy-minimalist',
  describe: 'buys every Minimalist the shop shows (he costs what he sells for); sells him at once or keeps him for merges',
  params: {
    fromRound: int(1, 14, 2),
    mode: { type: 'choice', choices: ['cycle', 'merge'], default: 'cycle' },
    reserve: int(0, 30, 0),
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (p.mode === 'merge' && m.round >= p.fromRound && ps.isBot && !ps.autoplay && (!own || own.round === m.round)) {
        const gd = gdOf(m, ps);
        const mine = ps.allChess().filter((q) => gd.baseIdOf(q.id) === MINIMALIST && !gd.isGolden(q.id)).map((q) => q.id);
        if (mine.length) {
          const plan = own?.plan || {};
          ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, keep: Object.freeze([...new Set([...(plan.keep || []), ...mine])].slice(0, 32)) }) };
        }
      }
      return ctx.next();
    },
    *buyLoopSteps(ctx) {
      const { match: m, player: ps, params: p, args: [opts] } = ctx;
      if (!opts?.fillOnly && ps.isBot && !ps.autoplay && m.round >= p.fromRound) {
        const gd = gdOf(m, ps);
        for (let guard = 0; guard < 6; guard++) {
          const i = ps.shop.slots.findIndex((sl) => sl && !sl.sold && sl.kind === 'chess' && gd.baseIdOf(sl.id) === MINIMALIST
            && ps.funds - ps.priceOf(sl) >= p.reserve);
          if (i < 0 || freeSlot(ps.hand) < 0) break;
          const before = new Set(ps.allChess().map((q) => q.uid));
          if (!ok(() => ps.buy(i))) break;
          const fresh = ps.allChess().find((q) => !before.has(q.uid) && gd.baseIdOf(q.id) === MINIMALIST && !gd.isGolden(q.id));
          const normals = ps.allChess().filter((q) => gd.baseIdOf(q.id) === MINIMALIST && !gd.isGolden(q.id)).length;
          // cycle: straight back; merge: only a copy past what a merge needs (a merge already happened on the buy)
          if (fresh && (p.mode === 'cycle' || normals > 2)) ok(() => ps.sell(fresh.uid));
          yield;
        }
      }
      return yield* ctx.next();
    },
  },
});

/**
 * Mostima next to an ammo user (Fish's TODO "Laterano specific: put Mostima next to an ammo user"). Her trait (ADD_BOND
 * act1autochess_gar_event_consume_ammo, range x-5) adds Laterano stacks for the bullets spent by the operators on the four
 * tiles next to her; legacy's layout scores position traits but not this battle-time one. After the rehearsed layout
 * (finishLayout), each deployed piece with such a trait and no ammo user (selected skill durationType AMMO) beside it
 * moves to the free or swappable tile beside the most ammo users, keeping its facing. A tile whose piece has an ammo
 * skill or such a trait itself is never taken. From `fromRound`; in the final boss rounds only with `boss`.
 */
const AMMO_EVENT = 'act1autochess_gar_event_consume_ammo';
export const PLACE_AMMO = defineTactic({
  id: 'place-ammo',
  describe: 'after the rehearsed layout, moves Mostima next to the operators with ammo skills',
  params: { fromRound: int(1, 14, 4), boss: { type: 'bool', default: false } },
  at: {
    finishLayout(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (ps.isBot && !ps.autoplay && m.round >= p.fromRound && (p.boss || m.wave)) placeAmmo(m, ps);
      return ctx.next();
    },
  },
});
const usesAmmo = (gd, id) => gd.chess(id)?.skill?.durationType === 'AMMO';
const countsAmmo = (gd, id) => (gd.chess(id)?.garrisonIds || []).some((gid) => {
  const g = gd.garrison(gid);
  return g?.bbStr?.key === AMMO_EVENT && g.bbStr.range_id === 'x-5';
});
export function placeAmmo(m, ps) {
  const gd = gdOf(m, ps);
  const near = (k) => { const [r, c] = parseKey(k); return Object.values(DIRS).map(([dr, dc]) => tileKey(r + dr, c + dc)); };
  const users = (k, self) => near(k).filter((t) => { const q = ps.board.get(t); return q && q !== self && q.kind === 'chess' && usesAmmo(gd, q.id); }).length;
  let moved = 0;
  for (const [key, q] of [...ps.board.entries()]) {
    if (q.kind !== 'chess' || !countsAmmo(gd, q.id) || users(key, q) > 0) continue;
    const cands = new Map();
    for (const [uk, u] of ps.board.entries()) {
      if (u.kind !== 'chess' || !usesAmmo(gd, u.id)) continue;
      for (const t of near(uk)) {
        const [r, c] = parseKey(t), o = ps.board.get(t);
        if (!inField(r, c) || (o && (o.kind !== 'chess' || usesAmmo(gd, o.id) || countsAmmo(gd, o.id)))) continue;
        cands.set(t, users(t, q));
      }
    }
    const order = [...cands].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
    for (const [t] of order) {
      const [r, c] = parseKey(t);
      if (ok(() => ps.move(q.uid, { area: 'board', row: r, col: c }, pieceDir(q)))) { moved++; break; }
    }
  }
  return moved;
}

export const RESEARCH_TACTICS = Object.freeze([SIMPLE_LEVEL, SIMPLE_SPEND, SIMPLE_FREEZE, BOUNTY_OPTIMISM, BOUNTY_GATE,
  LP_HOLD_LEVEL, MERGE_FIRST, SELL_SINGLES, EARLY_ROLL, PLAN_BOND, PLAN_ENGINES, PLAN_ITEMS, PLAN_ISO, PLAN_COMBOS, PLAN_COMMIT, PLAN_KEEPERS, DIY_PICKS, CYCLE_ECON, PLACE_COPIERS, CARRY_ISO, BUY_MINIMALIST, PLACE_AMMO]);
