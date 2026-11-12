// (fork) Fish's Du Yaoye tactics (fish-edition/ai-players.md "# DYYBot", "Tactics that are likely to be consistent"),
// as tactics of botTactics.js. Each acts only for a seat playing 杜遥夜 (band_duyaoy) and passes for every other
// Strategy, so the profile plays like legacy elsewhere. Each acts through PlayerState's validated intents only.
//
// 杜遥夜: "每回合前2次主动刷新为特殊刷新：优先刷新出1名<炎>干员" — the first 2 manual refreshes of a round each bring a
// Yan operator. The tactics hunt Yan with those 2 refreshes, keep a Yan operator the seat can't afford by freezing,
// level on a fixed schedule, and keep 远见 (Foresight) / 奇迹 (Marvel) / 投资人 (Investor) active: Swire, Record Keeper
// and Swire the Elegant Wit are Yan members of those Alliances.
import { defineTactic, defineProfile, PASS } from './botTactics.js';
import { freeSlot, parseKey, tileKey, FIELD } from './board.js';
import { PLAN_ISO, CARRY_ISO, PLAN_ITEMS, listedItemsFirst } from './botTacticsResearch.js';

const DYY = 'band_duyaoy';
const YAN = 'yanShip';
const SIDE_BONDS = Object.freeze(['visiShip', 'miraShip', 'investShip']);

const ok = (fn) => { try { const r = fn(); return !!(r && r.ok); } catch { return false; } };
const gdOf = (m, ps) => ps.gd || m.gd;
const bondsOf = (gd, id) => gd.chess(id)?.bonds || [];
const isYan = (gd, id) => bondsOf(gd, id).includes(YAN);
const ownedBases = (gd, ps) => new Set(ps.allChess().map((p) => gd.baseIdOf(p.id)));
const openChess = (ps) => ps.shop.slots.map((s, i) => ({ s, i })).filter(({ s }) => s && !s.sold && s.kind === 'chess');

/** A shop operator the plan wants: a Yan operator not owned yet, or one whose copy completes a merge. */
function wantedYan(gd, ps, id, owned = ownedBases(gd, ps)) {
  return isYan(gd, id) && (!owned.has(gd.baseIdOf(id)) || ps.completesChessMerge(id));
}

/** A side-Alliance operator the plan wants: not owned, and of a 远见 / 奇迹 / 投资人 Alliance that isn't active. */
function wantedSide(gd, ps, id, owned = ownedBases(gd, ps)) {
  if (owned.has(gd.baseIdOf(id))) return false;
  return bondsOf(gd, id).some((b) => SIDE_BONDS.includes(b) && !ps.bonds[b]?.active);
}

/**
 * Fish's "unneeded" operator: on the Bench (not the board), below tier 6, not an unpromoted Yan operator, and not one
 * a 远见 / 奇迹 / 投资人 Alliance needs to stay active (it would drop below the threshold without it).
 */
function unneeded(m, ps, p) {
  const gd = gdOf(m, ps);
  if (!p || p.kind !== 'chess') return false;
  const c = gd.chess(p.id);
  if (!c || (c.tier || 0) >= 6) return false;
  if (isYan(gd, p.id) && !gd.isGolden(p.id)) return false;
  for (const b of bondsOf(gd, p.id)) {
    if (!SIDE_BONDS.includes(b) || !ps.bonds[b]?.active) continue;
    const need = gd.bond(b)?.activeCount || 1;
    const members = new Set(ps.allChess().filter((q) => bondsOf(gd, q.id).includes(b)).map((q) => gd.baseIdOf(q.id)));
    if (members.size - 1 < need) return false;
  }
  return true;
}

/** Sell unneeded Bench operators, cheapest first, until slot `i` is affordable with a free hand slot. */
function makeRoom(m, ps, i) {
  const gd = gdOf(m, ps);
  const slot = ps.shop.slots[i];
  const merges = ps.completesChessMerge(slot.id);
  const ready = () => ps.priceOf(slot) <= ps.funds && (merges || freeSlot(ps.hand) >= 0);
  if (ready()) return true;
  const spare = ps.hand.filter((p) => unneeded(m, ps, p))
    .sort((a, b) => (gd.chess(a.id)?.tier || 0) - (gd.chess(b.id)?.tier || 0) || a.uid - b.uid);
  const refund = spare.reduce((n, p) => n + (gd.chess(p.id)?.sellPrice || 0), 0);
  // sell nothing unless the sales get there: a half-made room only loses operators
  if (ps.funds + refund < ps.priceOf(slot)) return false;
  for (const p of spare) {
    if (ready()) break;
    ok(() => ps.sell(p.uid));
  }
  return ready();
}

/**
 * Level the 调度中心 on a fixed schedule (the round each level is reached) at the start of the prep and at legacy's
 * level-up points, then legacy's own level-ups.
 * 'fish': rounds 2, 4, 5, 7 (level 5 by round 7). 'human': rounds 2, 4, 6, 9 — the median of the human Du Yaoye seats
 * in Fish's match records of 2026-11-05.
 */
const SCHEDULES = Object.freeze({ fish: [2, 4, 5, 7], human: [2, 4, 6, 9] });

function levelTo({ match: m, player: ps, params: p }) {
  const target = Math.min(5, gdOf(m, ps).maxShopLevel, 1 + SCHEDULES[p.schedule].filter((r) => m.round >= r).length);
  for (let guard = 0; guard < 6 && ps.shop.level < target; guard++) if (!ok(() => ps.levelUp())) break;
}

export const DYY_LEVEL = defineTactic({
  id: 'dyy-level',
  describe: 'Du Yaoye: level on a fixed schedule of rounds; then legacy',
  params: {
    schedule: { type: 'choice', choices: Object.keys(SCHEDULES), default: 'fish' },
  },
  at: {
    // the prep's first economy point, so the level-up comes before legacy's buying fills the board
    sellJunk(ctx) {
      if (ctx.player.bandId !== DYY) return PASS;
      levelTo(ctx);
      return ctx.next();
    },
    levelUp(ctx) {
      if (ctx.player.bandId !== DYY) return PASS;
      levelTo(ctx);
      return ctx.next();
    },
  },
});

/**
 * The shopping list before legacy's buy loop: wanted Yan operators, then (`side`) a 远见 / 奇迹 / 投资人 operator for
 * an inactive Alliance, selling unneeded Bench operators for them (`sellToBuy`). `hunt`: while fewer than 2 manual
 * refreshes were made this round (the Strategy's special ones), the shop shows no Yan operator, and the funds are
 * exactly 1 or at least `huntFunds`, refresh and shop again. Then legacy's buy loop.
 */
export const DYY_SHOP = defineTactic({
  id: 'dyy-shop',
  describe: 'Du Yaoye: buy Yan and side-Alliance operators, sell for them, hunt Yan with the 2 special refreshes; then legacy',
  params: {
    side: { type: 'bool', default: true },
    sellToBuy: { type: 'bool', default: true },
    hunt: { type: 'bool', default: true },
    huntFunds: { type: 'int', min: 1, max: 20, default: 5 },
  },
  at: {
    *buyLoopSteps(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (ps.bandId !== DYY) return PASS;
      const [opts = {}] = ctx.args;
      const gd = gdOf(m, ps);
      for (let guard = 0; guard < 12; guard++) {
        let bought = false;
        for (const want of [wantedYan, ...(p.side ? [wantedSide] : [])]) {
          for (const { s, i } of openChess(ps)) {
            if (!want(gd, ps, s.id)) continue;
            if (p.sellToBuy ? !makeRoom(m, ps, i) : (ps.priceOf(s) > ps.funds || (freeSlot(ps.hand) < 0 && !ps.completesChessMerge(s.id)))) continue;
            if (ok(() => ps.buy(i))) { bought = true; yield; }
          }
        }
        if (bought) continue;
        if (!p.hunt || opts.fillOnly || ps.shop.frozen || (ps.round?.refreshes || 0) >= 2) break;
        if (openChess(ps).some(({ s }) => isYan(gd, s.id))) break;
        const cost = ps.shop.freeRefreshes > 0 ? 0 : gd.refreshPrice;
        if (!(ps.funds === cost || ps.funds >= p.huntFunds) || !ok(() => ps.refresh())) break;
        yield;
      }
      return yield* ctx.next();
    },
  },
});

/** Freeze the shop when it shows a wanted Yan operator the seat can't afford (Fish: "freeze at 0 funds"); else legacy. */
export const DYY_FREEZE = defineTactic({
  id: 'dyy-freeze',
  describe: "Du Yaoye: freeze a Yan operator the seat can't afford; else legacy",
  at: {
    maybeFreeze(ctx) {
      const { match: m, player: ps } = ctx;
      if (ps.bandId !== DYY) return PASS;
      if (ps.shop.frozen) return undefined;
      const gd = gdOf(m, ps);
      if (openChess(ps).some(({ s }) => wantedYan(gd, ps, s.id) && ps.priceOf(s) > ps.funds)) {
        ok(() => ps.freeze());
        return undefined;
      }
      return ctx.next();
    },
  },
});

/**
 * The Muelsyse engine (fish-edition/ai-players/05 "Tactics that are likely to be consistent": "Can upgrade barge to level
 * 6 AND Muelsyse in inventory AND less than 6 Damazti Isomorph owned in total AND (cloning item in inventory OR cloning
 * item in shop): Upgrade barge"; "Can clone Muelsyse AND less than 6 …: Clone Muelsyse"; "Muelsyse in inventory and 6
 * or more Damazti Isomorph owned in total: Sell Muelsyse"). 缪尔赛思 brings 1 变形同构体 when gained (2 as an elite;
 * Investor repeats it), so every copy of her is an Isomorph. Legacy sells a normal one as she arrives (§37.42
 * sellMorphBringers: the Isomorph stays, she goes back to the pool), so it never clones her.
 * The clones (Fish 2026-11-13: "simple communicator always gives muelsyse since she's the only harmony alliance operator.
 * same with all the other same alliance printers. commercial packaging plan as well. mimic matter should work as well.
 * doctor hologram technically isn't cloning but it gets a similar effect"):
 *   - 画卷 (Art): copies the operator on its tile — her, with her elite status;
 *   - 拟态物质: her third copy with 2 normal ones held, else a random operator of her Alliances (her), any tier;
 *   - 简易通讯机 / 寻呼模块 (an offer: she is picked) / 商业包装方案 (one of her Alliances every 8 (elite 7) sales, while it
 *     stays on her): operators of her Alliances up to the shop level, so only from level 6 (she is tier 6);
 *   - 博士投影: promotes her; the next copies of an elite are elite (2 Isomorphs each). Used first.
 * The printers need her own Alliances only: one wearing an Isomorph is not used for them.
 * While fewer than `maxIso` Isomorphs are owned (hand, temp hand, worn) and she is held, this tactic:
 *   - keeps her (`keep: clone`: while a clone item is held or shown, or the packaging plan is on her; `always`);
 *   - lists the clone items for buying and keeps them from legacy's own item rules;
 *   - uses the held ones on her (moving her onto the board first for 画卷);
 *   - levels to 6 (`level6`): `clone` = Fish's rule (she is held and a clone item is held or shown), `held` = she is held,
 *     `off` = never. Tier 6 only shows from shop level 6; legacy stops at 5.
 * From maxIso on, it does nothing: legacy sells her and uses the items its own way.
 * `dyyOnly` (default): only for a 杜遥夜 seat, like the other dyy tactics.
 */
const MUELSYSE = 'chess_char_6_11_a';
const SCROLL = 'chess_item_6_02_m';
const MIMIC = ['chess_item_5_05_e_a', 'chess_item_5_05_e_b'];
const PRINTERS = ['chess_item_2_06_e_a', 'chess_item_2_06_e_b', 'chess_item_4_01_e_a', 'chess_item_4_01_e_b'];
const PACKAGING = ['chess_item_5_07_e_a', 'chess_item_5_07_e_b'];
const HOLOGRAM = ['chess_item_5_06_e_a', 'chess_item_5_06_e_b'];
const CLONE_ITEMS = Object.freeze([SCROLL, ...MIMIC, ...PRINTERS, ...PACKAGING, ...HOLOGRAM]);
const isoCount = (gd, ps) => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && gd.item(q.id)?.canGiveBond).length
  + ps.allChess().flatMap((q) => q.items || []).filter((it) => gd.item(it.id)?.canGiveBond).length;
const heldMuelsyse = (gd, ps) => ps.allChess().filter((q) => gd.baseIdOf(q.id) === MUELSYSE);
const loose = (ps, ids) => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && ids.includes(q.id));
const shopShows = (ps, ids) => ps.shop.slots.some((sl) => sl && !sl.sold && ids.includes(sl.id));
const packed = (gd, ps) => heldMuelsyse(gd, ps).some((q) => (q.items || []).some((it) => PACKAGING.includes(it.id)));

function muelsyseActive(m, ps, p) {
  if (!ps.isBot || ps.autoplay || (p.dyyOnly && ps.bandId !== DYY)) return false;
  const gd = gdOf(m, ps);
  return isoCount(gd, ps) < p.maxIso && heldMuelsyse(gd, ps).length > 0;
}
const cloneSource = (ps) => loose(ps, CLONE_ITEMS).length > 0 || shopShows(ps, CLONE_ITEMS);

function muelsyseLevel(m, ps, p) {
  if (p.level6 === 'off' || ps.shop.level !== 5 || !muelsyseActive(m, ps, p)) return;
  if (p.level6 === 'clone' && !cloneSource(ps)) return;
  ok(() => ps.levelUp());
}

/** Her piece for an item: the board one first (an elite before a normal one), else the Bench. */
function herPiece(gd, ps, { morphFree = false } = {}) {
  const all = heldMuelsyse(gd, ps).filter((q) => !morphFree || !(q.items || []).some((it) => gd.item(it.id)?.canGiveBond));
  const onBoard = new Set([...ps.board.values()]);
  return all.sort((a, b) => (onBoard.has(b) - onBoard.has(a)) || (gd.isGolden(b.id) - gd.isGolden(a.id)) || a.uid - b.uid)[0] || null;
}

/** Puts the clone items on her: 博士投影, then the copies (画卷, 拟态物质), then the printers from shop level 6. */
function cloneMuelsyse(m, ps, p) {
  const gd = gdOf(m, ps);
  const stillActive = () => isoCount(gd, ps) < p.maxIso && heldMuelsyse(gd, ps).length > 0;
  // 博士投影 on a normal her (not while an elite is held already)
  for (const it of loose(ps, HOLOGRAM)) {
    const her = herPiece(gd, ps);
    if (!her || gd.isGolden(her.id) || heldMuelsyse(gd, ps).some((q) => gd.isGolden(q.id))) break;
    ok(() => ps.equip(it.uid, her.uid));
  }
  for (let guard = 0; guard < 2 && stillActive(); guard++) {
    const scroll = loose(ps, [SCROLL])[0];
    if (!scroll || freeSlot(ps.hand) < 0) break;
    let at = [...ps.board.entries()].filter(([, q]) => q.kind === 'chess' && gd.baseIdOf(q.id) === MUELSYSE)
      .sort(([, a], [, b]) => gd.isGolden(b.id) - gd.isGolden(a.id))[0]?.[0];
    if (!at) {
      const mu = herPiece(gd, ps);
      if (!mu) break;
      for (let r = FIELD.r0; r <= FIELD.r1 && !at; r++) for (let c = FIELD.c0; c <= FIELD.c1 && !at; c++) {
        if (ps.board.has(tileKey(r, c))) continue;
        if (ok(() => ps.move(mu.uid, { area: 'board', row: r, col: c }))) at = [...ps.board.entries()].find(([, q]) => q.uid === mu.uid)?.[0];
      }
      if (!at) break;
    }
    const [r, c] = parseKey(at);
    if (!ok(() => ps.useArt(scroll.uid, r, c))) break;
  }
  for (const it of loose(ps, MIMIC)) {
    const her = stillActive() && freeSlot(ps.hand) >= 0 ? herPiece(gd, ps, { morphFree: true }) : null;
    if (!her) break;
    ok(() => ps.equip(it.uid, her.uid));
  }
  if (ps.shop.level < 6) return;
  for (const it of loose(ps, PRINTERS)) {
    const her = stillActive() && freeSlot(ps.hand) >= 0 ? herPiece(gd, ps, { morphFree: true }) : null;
    if (!her || !ok(() => ps.equip(it.uid, her.uid))) continue;
    // 寻呼模块: the offer of her Alliances — take her
    for (let g2 = 0; g2 < 2 && ps.offers?.length; g2++) {
      const i = ps.offers[0].slots.findIndex((sl) => sl && !sl.sold && gd.baseIdOf(sl.id) === MUELSYSE);
      if (i < 0 || !ok(() => ps.pickReward(i))) break;
    }
  }
  if (!packed(gd, ps)) {
    const it = loose(ps, PACKAGING)[0];
    const her = it && stillActive() ? herPiece(gd, ps, { morphFree: true }) : null;
    if (her) ok(() => ps.equip(it.uid, her.uid));
  }
}

export const DYY_MUELSYSE = defineTactic({
  id: 'dyy-muelsyse',
  describe: 'Du Yaoye: keep 缪尔赛思 and clone her (画卷, 拟态物质, the same-Alliance printers, 博士投影) for more Isomorphs; level 6 for her; then legacy',
  params: {
    maxIso: { type: 'int', min: 1, max: 8, default: 6 },
    keep: { type: 'choice', choices: ['clone', 'always'], default: 'clone' },
    level6: { type: 'choice', choices: ['clone', 'held', 'off'], default: 'clone' },
    dyyOnly: { type: 'bool', default: true },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (muelsyseActive(m, ps, p) && (!own || own.round === m.round)) {
        muelsyseLevel(m, ps, p);
        const gd = gdOf(m, ps);
        const plan = own?.plan || {};
        const items = plan.items || {};
        const merge = (a, b, n) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, n));
        const keep = p.keep === 'always' || cloneSource(ps) || packed(gd, ps) ? heldMuelsyse(gd, ps).map((q) => q.id) : [];
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, keep: merge(plan.keep, keep, 32),
          items: Object.freeze({ ...items, buy: merge(items.buy, CLONE_ITEMS.filter((id) => !id.endsWith('_b')), 8), keep: merge(items.keep, CLONE_ITEMS, 32) }) }) };
      }
      return ctx.next();
    },
    levelUp(ctx) {
      muelsyseLevel(ctx.match, ctx.player, ctx.params);
      return ctx.next();
    },
    *buyLoopSteps(ctx) { return yield* listedItemsFirst(ctx); },
    equipItems(ctx) {
      if (muelsyseActive(ctx.match, ctx.player, ctx.params)) cloneMuelsyse(ctx.match, ctx.player, ctx.params);
      return ctx.next();
    },
  },
});

export const DYY_TACTICS = Object.freeze([DYY_LEVEL, DYY_SHOP, DYY_FREEZE, DYY_MUELSYSE]);

/** Opt-in: Fish's Du Yaoye list, legacy below. Plays as legacy for every other Strategy. */
export const DYY_PROFILES = Object.freeze([
  defineProfile({ id: 'fish-dyy', tactics: [DYY_SHOP, DYY_FREEZE, DYY_LEVEL] }),
  // DYYBot, the draft of step 3 (ai-players/05): the economy list (human schedule), the Isomorph engine (plan-iso from
  // level 5, the Muelsyse clone, the carry), and the stack items (简易通讯机 and co.)
  defineProfile({ id: 'dyybot', tactics: [DYY_MUELSYSE, DYY_SHOP, DYY_FREEZE, { tactic: DYY_LEVEL, params: { schedule: 'human' } },
    { tactic: PLAN_ISO, params: { fromLevel: 5 } }, CARRY_ISO, { tactic: PLAN_ITEMS, params: { set: 'stack' } }] }),
]);
