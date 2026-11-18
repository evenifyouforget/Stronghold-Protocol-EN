// server/match/autoAward.js — (fork, GitHub #125) the watchers behind the `autoAward` lobby rule (shared/autoAward.js):
// each one marks a condition broken (m._awardBroken) at the first event that shows its tag could have mattered. They
// run only while the rule is on, read the match and never change it, so a match plays the same with the rule on or off.
//
//   investor     PlayerRound.recompute: a player's 投资人 (investShip) active (the bench counts: the tag is off)
//   investorOps  PlayerAcquire.acquireChess / transformChess: a player gains 缪尔赛思, 耶拉 or 焰尾 (elites too)
//   swift        a real field's battle (Match: normal, boss, unite): a player's 迅捷 (swiftShip) active in its spec
//   foresight    the same battles: a deployed operator of 远见 (visiShip)
//   strategy1/2  at the end: a player's Strategy is on the tag's list
//
// AI seats (bots, 托管 at any time) are noted for the versions that need a lobby without them.

import { CC, strategyLateBandIds } from '../../shared/ruleData.js';
import { awardedTags, STRATEGY2_BANDS } from '../../shared/autoAward.js';

const on = (m) => m?.lobbyRules?.autoAward === true;
const broken = (m) => (m._awardBroken ||= new Set());

/** Mark condition `id` broken (no-op while the rule is off). */
export function breakAward(m, id) {
  if (on(m)) broken(m).add(id);
}

/** After a player's live bond recompute: 投资人 active breaks `investor`. */
export function noteBonds(m, ps) {
  if (on(m) && ps?.bonds?.investShip?.active) breakAward(m, 'investor');
}

const INVESTOR_OPS = new Set(CC.investorSold.ops);
/** A player gained `chessId` (bought, granted, transformed into): one of Investor 2's three breaks `investorOps`. */
export function noteGained(m, ps, chessId) {
  if (!on(m) || typeof chessId !== 'string') return;
  const base = ps?.gd?.baseIdOf ? ps.gd.baseIdOf(chessId) : chessId;
  if (INVESTOR_OPS.has(base) || INVESTOR_OPS.has(chessId)) breakAward(m, 'investorOps');
}

/**
 * A real field's battle options (not a preview, not a bot rehearsal): its players' specs show the active bonds and
 * the deployed operators.
 * @param {any} m @param {{ players?: any[] }} opts
 */
export function noteBattle(m, opts) {
  if (!on(m)) return;
  for (const pl of Array.isArray(opts?.players) ? opts.players : []) {
    if (pl?.bonds?.swiftShip?.active) breakAward(m, 'swift');
    for (const u of Array.isArray(pl?.units) ? pl.units : []) {
      const c = m.gd?.chess ? m.gd.chess(u?.chessId) : null;
      if (c && Array.isArray(c.bonds) && c.bonds.includes('visiShip')) breakAward(m, 'foresight');
    }
  }
}

/** A seat was played by the AI at some point (a bot, or 托管). */
export function noteAiSeat(m) {
  if (on(m)) m._awardAiSeat = true;
}

/** The tags to award at the end of the match (tag key → level); null when none. */
export function finishAwards(m) {
  if (!on(m)) return null;
  const b = new Set(broken(m));
  const late = new Set(strategyLateBandIds(m.gd?.raw?.bands ?? m.gd?.bands ?? {}));
  const players = [...(m.players?.values?.() ?? [])];
  for (const ps of players) {
    if (late.has(ps.bandId)) b.add('strategy1');
    if (STRATEGY2_BANDS.includes(ps.bandId)) b.add('strategy2');
  }
  const aiSeats = !!m._awardAiSeat || players.some((ps) => ps.isBot || ps.autoplay);
  const out = awardedTags(m.lobbyRules, b, { aiSeats });
  return Object.keys(out).length ? out : null;
}
