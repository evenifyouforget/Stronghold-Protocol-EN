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
 * Investor repeats it), so every copy of her is an Isomorph. The clone is 画卷 (chess_item_6_02_m, a tier-6 Art): it
 * copies the operator on its tile, and the copy is a gain.
 * Legacy sells a normal 缪尔赛思 as she arrives (§37.42 sellMorphBringers: the Isomorph stays, she goes back to the pool),
 * so it never clones her. While fewer than `maxIso` Isomorphs are owned (hand, temp hand, worn), this tactic:
 *   - keeps her (plan.keep), with `keep: clone` only while a 画卷 is held or in the shop, with `keep: always` always;
 *   - lists 画卷 in items.buy and keeps it from legacy's own Art rule (which copies the most valuable operator);
 *   - uses a held 画卷 on her (moving her onto a free tile first if she's on the Bench and the board has room);
 *   - levels to 6 (`level6`): `clone` = Fish's rule (she is held and a 画卷 is held or shown), `held` = she is held,
 *     `off` = never. Tier 6 (画卷, more copies of her) only shows from shop level 6; legacy stops at 5.
 * From maxIso on, it does nothing: legacy sells her.
 * `dyyOnly` (default): only for a 杜遥夜 seat, like the other dyy tactics.
 */
const MUELSYSE = 'chess_char_6_11_a';
const SCROLL = 'chess_item_6_02_m';
const isoCount = (gd, ps) => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && gd.item(q.id)?.canGiveBond).length
  + ps.allChess().flatMap((q) => q.items || []).filter((it) => gd.item(it.id)?.canGiveBond).length;
const heldMuelsyse = (gd, ps) => ps.allChess().filter((q) => gd.baseIdOf(q.id) === MUELSYSE);
const heldScrolls = (ps) => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && q.id === SCROLL);
const shopShows = (ps, id) => ps.shop.slots.some((sl) => sl && !sl.sold && sl.id === id);

function muelsyseActive(m, ps, p) {
  if (!ps.isBot || ps.autoplay || (p.dyyOnly && ps.bandId !== DYY)) return false;
  const gd = gdOf(m, ps);
  return isoCount(gd, ps) < p.maxIso && heldMuelsyse(gd, ps).length > 0;
}

function muelsyseLevel(m, ps, p) {
  if (p.level6 === 'off' || ps.shop.level !== 5 || !muelsyseActive(m, ps, p)) return;
  if (p.level6 === 'clone' && !heldScrolls(ps).length && !shopShows(ps, SCROLL)) return;
  ok(() => ps.levelUp());
}

/** 画卷 on 缪尔赛思: her board tile, or a free tile she moves to first. */
function cloneMuelsyse(m, ps) {
  const gd = gdOf(m, ps);
  for (let guard = 0; guard < 2; guard++) {
    const scroll = heldScrolls(ps)[0];
    if (!scroll || freeSlot(ps.hand) < 0) return;
    let at = [...ps.board.entries()].find(([, q]) => q.kind === 'chess' && gd.baseIdOf(q.id) === MUELSYSE)?.[0];
    if (!at) {
      const mu = ps.hand.find((q) => q && q.kind === 'chess' && gd.baseIdOf(q.id) === MUELSYSE);
      if (!mu) return;
      for (let r = FIELD.r0; r <= FIELD.r1 && !at; r++) for (let c = FIELD.c0; c <= FIELD.c1 && !at; c++) {
        if (ps.board.has(tileKey(r, c))) continue;
        if (ok(() => ps.move(mu.uid, { area: 'board', row: r, col: c }))) at = [...ps.board.entries()].find(([, q]) => q.uid === mu.uid)?.[0];
      }
      if (!at) return;
    }
    const [r, c] = parseKey(at);
    if (!ok(() => ps.useArt(scroll.uid, r, c))) return;
  }
}

export const DYY_MUELSYSE = defineTactic({
  id: 'dyy-muelsyse',
  describe: 'Du Yaoye: keep 缪尔赛思 and copy her with 画卷 for more Isomorphs; level 6 for her; then legacy',
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
        const scroll = heldScrolls(ps).length > 0 || shopShows(ps, SCROLL);
        const plan = own?.plan || {};
        const items = plan.items || {};
        const merge = (a, b, n) => Object.freeze([...new Set([...(a || []), ...b])].slice(0, n));
        const keep = p.keep === 'always' || scroll ? heldMuelsyse(gd, ps).map((q) => q.id) : [];
        ps._botSelf = { round: m.round, plan: Object.freeze({ ...plan, keep: merge(plan.keep, keep, 32),
          items: Object.freeze({ ...items, buy: merge(items.buy, [SCROLL], 8), keep: merge(items.keep, [SCROLL], 32) }) }) };
      }
      return ctx.next();
    },
    levelUp(ctx) {
      muelsyseLevel(ctx.match, ctx.player, ctx.params);
      return ctx.next();
    },
    *buyLoopSteps(ctx) { return yield* listedItemsFirst(ctx); },
    equipItems(ctx) {
      if (muelsyseActive(ctx.match, ctx.player, ctx.params)) cloneMuelsyse(ctx.match, ctx.player);
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
