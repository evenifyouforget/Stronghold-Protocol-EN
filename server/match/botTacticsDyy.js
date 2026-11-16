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
import { PLAN_ISO, CARRY_ISO, PLAN_ITEMS, listedItemsFirst, plannedCarry } from './botTacticsResearch.js';
import { itemSlotFree } from './bot.js';
import { tierFor } from './bondsMeta.js';

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
 * same with all the other same alliance printers. commercial packaging plan as well. mimic matter should work as well"):
 *   - 画卷 (Art): copies the operator on its tile — her, with her elite status;
 *   - 拟态物质: her third copy with 2 normal ones held, else a random operator of her Alliances (her), any tier;
 *   - 简易通讯机 / 寻呼模块 (an offer: she is picked) / 商业包装方案 (one of her Alliances every 8 (elite 7) sales, while it
 *     stays on her): operators of her Alliances up to the shop level, so only from level 6 (she is tier 6);
 * Not 博士投影: promoting her is no gain, so it brings no Isomorph (Fish: "better to put it on the carry dps",
 * carry-hologram below).
 * The printers need her own Alliances only: one wearing an Isomorph is not used for them.
 * While fewer than `maxIso` Isomorphs are owned (hand, temp hand, worn) and she is held, this tactic:
 *   - keeps her (`keep: clone`: while a clone item is held or shown, or the packaging plan is on her; `always`);
 *   - lists the clone items for buying and keeps them from legacy's own item rules;
 *   - uses the held ones on her (moving her onto the board first for 画卷);
 *   - levels to 6 (`level6`): `clone` = Fish's rule (she is held and a clone item is held or shown), `held` = she is held,
 *     `off` = never. Tier 6 only shows from shop level 6; legacy stops at 5.
 * From maxIso on, it does nothing: legacy sells her and uses the items its own way.
 * `dyyOnly` (default): only for a 杜遥夜 seat, like the other dyy tactics.
 *
 * What the human seats with 6+ Isomorphs did (7 of 131 clean HARD / ABYSS seats; the top three 11–12, all solo):
 *   - no 画卷 at all (0 uses in clean human seats): `scroll` is off by default, and legacy's own Art rule (copy the most
 *     valuable operator) keeps it; queue21's scenario: legacy with Muelsyse + 画卷 went 7 → 19 wins of 80;
 *   - the sell engine: 商业包装方案 on one Muelsyse, dozens of cheap operators sold (each 8 sales print her), every printed
 *     copy sold at once (her Isomorph stays; she goes back to the pool for the next print): `holder` keeps one
 *     Muelsyse (the packed one, else an elite, else the oldest) and sells the other normal copies; `cycle` buys and
 *     sells cheap operators while the plan is on her, up to that many sales a prep;
 *   - 简易通讯机 ×2 on Muelsyse from level 6 (the Du Yaoye seat, 9 Isomorphs).
 */
const MUELSYSE = 'chess_char_6_11_a';
const SCROLL = 'chess_item_6_02_m';
const MIMIC = ['chess_item_5_05_e_a', 'chess_item_5_05_e_b'];
const PRINTERS = ['chess_item_2_06_e_a', 'chess_item_2_06_e_b', 'chess_item_4_01_e_a', 'chess_item_4_01_e_b'];
const PACKAGING = ['chess_item_5_07_e_a', 'chess_item_5_07_e_b'];
const HOLOGRAM = ['chess_item_5_06_e_a', 'chess_item_5_06_e_b'];
const CLONE_ITEMS = Object.freeze([SCROLL, ...MIMIC, ...PRINTERS, ...PACKAGING]);
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
const clonesOf = (p) => (p.scroll ? CLONE_ITEMS : CLONE_ITEMS.filter((id) => id !== SCROLL));
const cloneSource = (ps, p) => loose(ps, clonesOf(p)).length > 0 || shopShows(ps, clonesOf(p));

function muelsyseLevel(m, ps, p) {
  if (p.level6 === 'off' || ps.shop.level !== 5 || !muelsyseActive(m, ps, p)) return;
  if (p.level6 === 'clone' && !cloneSource(ps, p)) return;
  ok(() => ps.levelUp());
}

/** Her piece for an item: the board one first (an elite before a normal one), else the Bench. */
function herPiece(gd, ps, { morphFree = false } = {}) {
  const all = heldMuelsyse(gd, ps).filter((q) => !morphFree || !(q.items || []).some((it) => gd.item(it.id)?.canGiveBond));
  const onBoard = new Set([...ps.board.values()]);
  return all.sort((a, b) => (onBoard.has(b) - onBoard.has(a)) || (gd.isGolden(b.id) - gd.isGolden(a.id)) || a.uid - b.uid)[0] || null;
}

/** Puts the clone items on her: the copies (画卷, 拟态物质), then the printers from shop level 6. */
function cloneMuelsyse(m, ps, p) {
  const gd = gdOf(m, ps);
  const stillActive = () => isoCount(gd, ps) < p.maxIso && heldMuelsyse(gd, ps).length > 0;
  for (let guard = 0; guard < 2 && p.scroll && stillActive(); guard++) {
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

/** `holder`: one Muelsyse stays (the packed one, else an elite, else the oldest); the other normal copies are sold. */
function sellExtraCopies(m, ps) {
  const gd = gdOf(m, ps);
  const all = heldMuelsyse(gd, ps);
  if (all.length < 2) return;
  const hold = all.find((q) => (q.items || []).some((it) => PACKAGING.includes(it.id)))
    || all.find((q) => gd.isGolden(q.id)) || [...all].sort((a, b) => a.uid - b.uid)[0];
  for (const q of all) if (q !== hold && !gd.isGolden(q.id) && !(q.items || []).length) ok(() => ps.sell(q.uid));
}

/**
 * `cycle`: while 商业包装方案 is on her, buy and sell the shop's operators of price ≤ `cyclePrice` (price 1: a free sale; a
 * tier-1 operator costs 2 and sells for 1), above `reserve` funds, up to `cycle` sales a prep.
 */
function* packagingCycle(m, ps, p) {
  const gd = gdOf(m, ps);
  ps._dyyCycle = ps._dyyCycle?.round === m.round ? ps._dyyCycle : { round: m.round, n: 0 };
  for (let guard = 0; guard < 4 * p.cycle && ps._dyyCycle.n < p.cycle && packed(gd, ps); guard++) {
    const i = ps.shop.slots.findIndex((sl) => sl && !sl.sold && sl.kind === 'chess' && ps.priceOf(sl) <= p.cyclePrice && !ps.completesChessMerge(sl.id));
    if (i < 0) break;
    if (freeSlot(ps.hand) < 0 || ps.funds - ps.priceOf(ps.shop.slots[i]) < p.reserve) break;
    const before = new Set(ps.allChess().map((q) => q.uid));
    if (!ok(() => ps.buy(i))) break;
    const fresh = ps.allChess().find((q) => !before.has(q.uid) && gd.baseIdOf(q.id) !== MUELSYSE);
    if (fresh) ok(() => ps.sell(fresh.uid));
    ps._dyyCycle.n++;
    sellExtraCopies(m, ps);
    yield;
  }
}

export const DYY_MUELSYSE = defineTactic({
  id: 'dyy-muelsyse',
  describe: 'Du Yaoye: keep 缪尔赛思 and clone her (画卷, 拟态物质, the same-Alliance printers) for more Isomorphs; level 6 for her; then legacy',
  params: {
    maxIso: { type: 'int', min: 1, max: 8, default: 6 },
    keep: { type: 'choice', choices: ['clone', 'always'], default: 'clone' },
    level6: { type: 'choice', choices: ['clone', 'held', 'off'], default: 'clone' },
    dyyOnly: { type: 'bool', default: true },
    scroll: { type: 'bool', default: false },
    holder: { type: 'bool', default: true },
    cycle: { type: 'int', min: 0, max: 60, default: 24 },
    cyclePrice: { type: 'int', min: 1, max: 3, default: 2 },
    reserve: { type: 'int', min: 0, max: 30, default: 2 },
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
        const keep = p.keep === 'always' || cloneSource(ps, p) || packed(gd, ps) ? heldMuelsyse(gd, ps).map((q) => q.id) : [];
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, keep: merge(plan.keep, keep, 32),
          items: Object.freeze({ ...items, buy: merge(items.buy, clonesOf(p).filter((id) => !id.endsWith('_b')), 8), keep: merge(items.keep, clonesOf(p), 32) }) }) };
      }
      return ctx.next();
    },
    levelUp(ctx) {
      muelsyseLevel(ctx.match, ctx.player, ctx.params);
      return ctx.next();
    },
    *buyLoopSteps(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (p.cycle > 0 && muelsyseActive(m, ps, p) && !ctx.args?.[0]?.fillOnly) yield* packagingCycle(m, ps, p);
      return yield* listedItemsFirst(ctx);
    },
    equipItems(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (muelsyseActive(m, ps, p)) {
        cloneMuelsyse(m, ps, p);
        if (p.holder) sellExtraCopies(m, ps);
      }
      return ctx.next();
    },
  },
});

/**
 * 博士投影 on the carry (Fish 2026-11-13: "better to put it on the carry dps so they don't hit the 300k ceiling": a
 * promoted operator ignores the 300,000 damage cap, #131). From `fromRound`, a held 博士投影 goes on carry-iso's planned
 * carry (the operator wearing the Isomorph, else the main damage dealer) while it is a normal operator with a free item
 * slot; it is kept from legacy's own rule (which takes any deployed normal tier-5+ operator) until then. Any band.
 * `target` (Fish: "or certain stack generators like executor alter are also a good candidate"): `carry`; `stacker` = the
 * deployed normal stack generator of highest tier (a trait that adds Alliance layers, "层数+", e.g. 圣约送葬人: Laterano
 * +7 → +14 per 7 bullets as an elite); `stacker-first` = a stacker if one is deployed, else the carry.
 * (In this file, not the research list, so the weekend race's pool stays as it was; it moves there after the race.)
 */
const STACKS = /层数\+\d/;
const isStacker = (gd, id) => (gd.chess(id)?.garrisonIds || []).some((gid) => STACKS.test(gd.garrison(gid)?.desc || ''));
/** The deployed normal stack generator of highest tier that `fits`, or null. */
function stackerOnBoard(gd, ps, fits) {
  return [...ps.board.values()].filter((q) => q.kind === 'chess' && isStacker(gd, q.id) && fits(q))
    .sort((a, b) => (gd.tierOf(b.id) - gd.tierOf(a.id)) || a.uid - b.uid)[0] || null;
}
export const CARRY_HOLOGRAM = defineTactic({
  id: 'carry-hologram',
  describe: '博士投影 on the planned carry (a promoted operator ignores the damage cap); then legacy',
  params: {
    fromRound: { type: 'int', min: 1, max: 14, default: 4 },
    target: { type: 'choice', choices: ['carry', 'stacker', 'stacker-first'], default: 'carry' },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      const own = ps._botSelf;
      if (ps.isBot && !ps.autoplay && m.round >= p.fromRound && loose(ps, HOLOGRAM).length && (!own || own.round === m.round)) {
        const plan = own?.plan || {};
        const items = plan.items || {};
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan,
          items: Object.freeze({ ...items, keep: Object.freeze([...new Set([...(items.keep || []), ...HOLOGRAM])].slice(0, 32)) }) }) };
      }
      return ctx.next();
    },
    equipItems(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (ps.isBot && !ps.autoplay && m.round >= p.fromRound) {
        const gd = gdOf(m, ps);
        const it = loose(ps, HOLOGRAM)[0];
        const fits = (q) => !!q && !gd.isGolden(q.id) && itemSlotFree(m, ps, q, gd.item(it.id));
        const stacker = it && p.target !== 'carry' ? stackerOnBoard(gd, ps, fits) : null;
        const carry = it && p.target !== 'stacker' && !stacker ? plannedCarry(m, ps).carry : null;
        const to = stacker || (fits(carry) ? carry : null);
        if (to && ok(() => ps.equip(it.uid, to.uid)) && to === carry) ps._botCarry = carry.uid;
      }
      return ctx.next();
    },
  },
});

/**
 * No Isomorph on 缪尔赛思 (Fish 2026-11-13: "you're not supposed to isomorph muelsyse yourself. you use it to gain
 * alliance membership for other operators, activate more alliances overall, and give key operators membership in
 * alliances useful for them"). Switches off legacy's §37.41 / §37.43 conversion (bot.js MORPH_ON_MUELSYSE: her bond item
 * and the 变形同构体 on her for "9 炎 with 8 deployed", her value as two focus members) and keeps morphPlan and the
 * general item loop from choosing her. Any band. (In this file for the same reason as carry-hologram.)
 */
export const ISO_NOT_MUELSYSE = defineTactic({
  id: 'iso-not-muelsyse',
  describe: "no Isomorph on 缪尔赛思: legacy's conversion of her off (it goes on other operators)",
  params: { morphHer: { type: 'bool', default: false } },
  at: { sellJunk: (ctx) => ctx.next() },
  tunables: (p) => ({ MORPH_ON_MUELSYSE: p.morphHer }),
});

/**
 * Isomorphs paired with an Alliance item (ai-players/05, 2026-11-13). A 变形同构体 grants the Alliance of another item
 * worn beside it (an item with giveBondId: 维式重锤 → Victoria, and 35 more), and nothing alone. Clean HARD / ABYSS human
 * seats wore 79 % of their Isomorphs with one (114 of 144) and gained 6.8 Alliance items a seat (5.4 bought); legacy with
 * the Muelsyse clone (mu-scroll scenario, 10 games) 23 % (5 of 22) and 1.1, because §37.39 keeps it from buying shop
 * equipment and an Isomorph with no partner goes on alone (itemTarget).
 * While the seat has more Isomorphs that grant nothing (loose, or worn with no Alliance item) than useful Alliance items
 * in the hand, every shop the buy loop sees (after each refresh too) is searched for an Alliance item worth it
 * (memberGain > 0; `reserve` funds kept), and the held ones are kept from legacy's sales and lone equips. Then each goes
 * on a deployed operator wearing a lone Isomorph (not already of that Alliance; the biggest gain first). Loose Isomorphs
 * are left to legacy's morphPlan, which pairs them with a held Alliance item; with `hold`, a loose Isomorph waits in the
 * hand while there is none. Any band.
 */
const isIso = (gd, id) => !!gd.item(id)?.canGiveBond;
const grantOf = (gd, id) => { const r = gd.item(id); return r && !r.canGiveBond && r.giveBondId ? r.giveBondId : null; };
const looseItems = (ps) => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item');
/**
 * What one more deployed member of Alliance `b` is worth: 1 when it is active (the member gets its effect), plus 2 per tier
 * it adds (4 for a core Alliance); 0 when it would lose a tier (独行), the mode has no such Alliance, or no deployed
 * operator could join it (all already members, or wearing an Isomorph: a 杜遥夜 board is mostly Yan, so a Yan item is
 * worth nothing there). Two copies of an Alliance item merge into its + version, so an Alliance gains one member this
 * way (Victoria: one per item kind).
 */
function memberGain(gd, ps, b) {
  const bond = gd.bond(b), st = ps.bonds?.[b];
  if (!bond || !st) return 0;
  if (![...ps.board.values()].some((q) => q.kind === 'chess' && gd.baseIdOf(q.id) !== MUELSYSE && !bondsOf(gd, q.id).includes(b)
    && !(q.items || []).some((it) => isIso(gd, it.id)))) return 0;
  const up = tierFor(bond, st.count + 1) - st.tier;
  if (up < 0) return 0;
  return (st.active ? 1 : 0) + up * (bond.isCore ? 4 : 2);
}
/** Deployed operators wearing an Isomorph with no Alliance item beside it. */
const loneIsoCarriers = (gd, ps) => [...ps.board.values()].filter((q) => q.kind === 'chess'
  && (q.items || []).some((it) => isIso(gd, it.id)) && !(q.items || []).some((it) => grantOf(gd, it.id)));
/** Isomorphs granting nothing, minus the useful Alliance items held for them. */
function partnersNeeded(gd, ps) {
  const unpaired = looseItems(ps).filter((q) => isIso(gd, q.id)).length + loneIsoCarriers(gd, ps).length;
  const held = looseItems(ps).filter((q) => grantOf(gd, q.id) && memberGain(gd, ps, grantOf(gd, q.id)) > 0).length;
  return unpaired - held;
}
function* buyPartners(m, ps, p) {
  const gd = gdOf(m, ps);
  for (let guard = 0; guard < 4 && partnersNeeded(gd, ps) > 0; guard++) {
    const best = ps.shop.slots.map((sl, i) => ({ sl, i })).filter(({ sl }) => sl && !sl.sold && sl.kind === 'item' && grantOf(gd, sl.id))
      .map((x) => ({ ...x, g: memberGain(gd, ps, grantOf(gd, x.sl.id)) })).filter((x) => x.g > 0 && ps.funds - ps.priceOf(x.sl) >= p.reserve)
      .sort((a, b) => b.g - a.g)[0];
    if (!best || freeSlot(ps.hand) < 0 || !ok(() => ps.buy(best.i))) return;
    keepPartners(m, ps);
    yield;
  }
}
/** The plan keeps the held Alliance items (legacy neither sells them nor equips them alone) while Isomorphs need them. */
function keepPartners(m, ps) {
  const gd = gdOf(m, ps);
  const own = ps._botSelf;
  if (own && own.round !== m.round) return;
  // both versions: two copies of an item merge into its + version
  const ids = looseItems(ps).filter((q) => grantOf(gd, q.id)).flatMap((q) => [q.id.replace(/_b$/, '_a'), q.id.replace(/_a$/, '_b')]);
  if (!ids.length) return;
  const plan = own?.plan || {};
  const items = plan.items || {};
  if (ids.every((id) => (items.keep || []).includes(id))) return;
  ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan,
    items: Object.freeze({ ...items, keep: Object.freeze([...new Set([...(items.keep || []), ...ids])].slice(0, 32)) }) }) };
}
const pairing = (m, ps, p) => ps.isBot && !ps.autoplay && m.round >= p.fromRound;
export const ISO_PAIR = defineTactic({
  id: 'iso-pair',
  describe: 'Isomorphs paired with an Alliance item: buy Alliance items for lone Isomorphs (after every refresh), put them beside them; then legacy',
  params: {
    fromRound: { type: 'int', min: 1, max: 14, default: 1 },
    reserve: { type: 'int', min: 0, max: 30, default: 2 },
    hold: { type: 'bool', default: true },
  },
  at: {
    sellJunk(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (pairing(m, ps, p) && partnersNeeded(gdOf(m, ps), ps) >= 0) keepPartners(m, ps);
      return ctx.next();
    },
    *buyLoopSteps(ctx) {
      const { match: m, player: ps, params: p, args: [opts] } = ctx;
      if (!pairing(m, ps, p) || opts?.fillOnly) return yield* ctx.next();
      yield* buyPartners(m, ps, p);
      // legacy's loop, with the shop searched again after each of its steps (a refresh brings new items)
      const it = ctx.next();
      for (;;) {
        const r = it.next();
        if (r.done) return r.value;
        yield r.value;
        yield* buyPartners(m, ps, p);
      }
    },
    equipItems(ctx) {
      const { match: m, player: ps, params: p } = ctx;
      if (pairing(m, ps, p)) {
        const gd = gdOf(m, ps);
        for (const P of loneIsoCarriers(gd, ps)) {
          const mine = new Set(bondsOf(gd, P.id));
          const X = looseItems(ps).filter((q) => grantOf(gd, q.id) && !mine.has(grantOf(gd, q.id)) && itemSlotFree(m, ps, P, gd.item(q.id)))
            .map((q) => ({ q, g: memberGain(gd, ps, grantOf(gd, q.id)) })).filter((x) => x.g > 0).sort((a, b) => b.g - a.g)[0];
          if (X) ok(() => ps.equip(X.q.uid, P.uid));
        }
        // a loose Isomorph with a held Alliance item: both on a deployed operator not of that Alliance (the planned carry
        // first, then elites and higher tiers; never 缪尔赛思), the item first
        const carry = plannedCarry(m, ps).carry;
        for (const iso of looseItems(ps).filter((q) => isIso(gd, q.id))) {
          const Xs = looseItems(ps).filter((q) => grantOf(gd, q.id)).map((q) => ({ q, b: grantOf(gd, q.id), g: memberGain(gd, ps, grantOf(gd, q.id)) }))
            .filter((x) => x.g > 0).sort((x, y) => y.g - x.g);
          const X = Xs[0];
          if (!X) break;
          const P = [...ps.board.values()].filter((q) => q.kind === 'chess' && gd.baseIdOf(q.id) !== MUELSYSE && !bondsOf(gd, q.id).includes(X.b)
            && !(q.items || []).some((it) => isIso(gd, it.id)) && (gd.equipPerChess || 0) - (q.items || []).length >= 2)
            .sort((x, y) => ((y === carry) - (x === carry)) || (gd.isGolden(y.id) - gd.isGolden(x.id)) || ((gd.tierOf(y.id) || 0) - (gd.tierOf(x.id) || 0)) || (x.uid - y.uid))[0];
          if (!P || !ok(() => ps.equip(X.q.uid, P.uid))) break;
          ok(() => ps.equip(iso.uid, P.uid));
        }
        const isos = looseItems(ps).filter((q) => isIso(gd, q.id));
        const own = ps._botSelf;
        if (p.hold && isos.length && m.round < gd.bossRound && !looseItems(ps).some((q) => grantOf(gd, q.id)) && (!own || own.round === m.round)) {
          const plan = own?.plan || {};
          const items = plan.items || {};
          ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan,
            items: Object.freeze({ ...items, hold: Object.freeze([...new Set([...(items.hold || []), ...isos.map((q) => q.id)])]) }) }) };
        }
      }
      return ctx.next();
    },
  },
});

export const DYY_TACTICS = Object.freeze([DYY_LEVEL, DYY_SHOP, DYY_FREEZE, DYY_MUELSYSE, CARRY_HOLOGRAM, ISO_NOT_MUELSYSE, ISO_PAIR]);

/** Opt-in: Fish's Du Yaoye list, legacy below. Plays as legacy for every other Strategy. */
export const DYY_PROFILES = Object.freeze([
  defineProfile({ id: 'fish-dyy', tactics: [DYY_SHOP, DYY_FREEZE, DYY_LEVEL] }),
  // DYYBot, the draft of step 3 (ai-players/05): the economy list (human schedule), the Isomorph engine (plan-iso from
  // level 5, the Muelsyse clone, the carry), and the stack items (简易通讯机 and co.). No dyy-shop (queues 25–28: without
  // it 33 wins of 160 against 17 with it and legacy's 20; its buying of every unowned Yan operator costs merges)
  defineProfile({ id: 'dyybot', tactics: [DYY_MUELSYSE, DYY_FREEZE, { tactic: DYY_LEVEL, params: { schedule: 'human' } },
    { tactic: PLAN_ISO, params: { fromLevel: 5 } }, CARRY_ISO, CARRY_HOLOGRAM, ISO_NOT_MUELSYSE, { tactic: PLAN_ITEMS, params: { set: 'stack' } }] }),
]);
