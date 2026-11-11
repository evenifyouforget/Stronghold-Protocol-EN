// (fork) Fish's Du Yaoye tactics (fish-edition/ai-players.md "# DYYBot", "Tactics that are likely to be consistent"),
// as tactics of botTactics.js. Each acts only for a seat playing 杜遥夜 (band_duyaoy) and passes for every other
// Strategy, so the profile plays like legacy elsewhere. Each acts through PlayerState's validated intents only.
//
// 杜遥夜: "每回合前2次主动刷新为特殊刷新：优先刷新出1名<炎>干员" — the first 2 manual refreshes of a round each bring a
// Yan operator. The tactics hunt Yan with those 2 refreshes, keep a Yan operator the seat can't afford by freezing,
// level on a fixed schedule, and keep 远见 (Foresight) / 奇迹 (Marvel) / 投资人 (Investor) active: Swire, Record Keeper
// and Swire the Elegant Wit are Yan members of those Alliances.
import { defineTactic, defineProfile, PASS } from './botTactics.js';
import { freeSlot } from './board.js';

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

export const DYY_TACTICS = Object.freeze([DYY_LEVEL, DYY_SHOP, DYY_FREEZE]);

/** Opt-in: Fish's Du Yaoye list, legacy below. Plays as legacy for every other Strategy. */
export const DYY_PROFILES = Object.freeze([
  defineProfile({ id: 'fish-dyy', tactics: [DYY_SHOP, DYY_FREEZE, DYY_LEVEL] }),
  // BENCH-MUTANTS
  defineProfile({ id: 'dyy-m-level', tactics: [DYY_LEVEL] }),
  defineProfile({ id: 'dyy-m-levelh', tactics: [{ tactic: DYY_LEVEL, params: { schedule: 'human' } }] }),
  defineProfile({ id: 'dyy-m-shop', tactics: [DYY_SHOP] }),
  defineProfile({ id: 'dyy-m-hunt', tactics: [{ tactic: DYY_SHOP, params: { side: false, sellToBuy: false } }] }),
  defineProfile({ id: 'dyy-m-nosell', tactics: [{ tactic: DYY_SHOP, params: { sellToBuy: false } }, DYY_FREEZE] }),
  defineProfile({ id: 'dyy-m-freeze', tactics: [DYY_FREEZE] }),
  defineProfile({ id: 'dyy-m-noside', tactics: [{ tactic: DYY_SHOP, params: { side: false } }, DYY_FREEZE] }),
  defineProfile({ id: 'dyy-m-all-h', tactics: [DYY_SHOP, DYY_FREEZE, { tactic: DYY_LEVEL, params: { schedule: 'human' } }] }),
  // END-BENCH-MUTANTS
]);

