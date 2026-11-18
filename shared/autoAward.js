// shared/autoAward.js — (fork, GitHub #125) the "auto-award free Risk tags" lobby rule (`autoAward`, shared/rules.js):
// at the end of a match, a Risk tag the room did not take is added to the result's Risk when the match shows it would
// have changed nothing: replaying the match with the tag on gives the same match. Not a cheat.
//
// Each awardable tag version names the conditions it needs (`needs`); a condition is "broken" by the first event that
// shows the tag could have mattered (server/match/autoAward.js watches them). A higher level needs its lower levels'
// conditions too when the tag stacks (Investor 2 includes Investor 1). A version marked `aiOk: false` is awarded only
// in a lobby without AI seats (bots and 托管): a bot reads prices, free slots, LP and rehearsal battles, so the tag can
// change what a bot does even when the condition held (the conditions and why: the analysis comment on #125).
//
// Only tags the room did not take at all are awarded (a tag taken at level 1 is not raised to 2).

import { N_ } from './i18n.js';

/** The conditions, by id: their text (msgid) for the room dialog's list. */
export const AWARD_CONDITIONS = Object.freeze({
  investor: N_('没有博士的【投资人】生效过（候补区计入，任何时刻）'),
  investorOps: N_('没有博士获得过缪尔赛思、耶拉或焰尾（含精锐）'),
  swift: N_('没有博士的【迅捷】在任何作战中生效过'),
  foresight: N_('没有【远见】干员参加过任何作战'),
  strategy1: N_('没有博士选择受影响的策略（策略在第N回合生效的那些）'),
  strategy2: N_('也没有博士选择伊奥莱塔·罗素、杜遥夜或阿米娅'),
});

/**
 * The awardable tag versions, in RULES order. `needs`: condition ids (all must hold); `aiOk`: also with AI seats.
 * @type {ReadonlyArray<Readonly<{ key: string, level: number, needs: readonly string[], aiOk: boolean }>>}
 */
export const AWARDABLE = Object.freeze([
  { key: 'ccInvestorBench', level: 1, needs: ['investor'], aiOk: true },
  { key: 'ccInvestorBench', level: 2, needs: ['investor', 'investorOps'], aiOk: true },
  { key: 'ccSwift', level: 1, needs: ['swift'], aiOk: true },
  { key: 'ccForesight', level: 1, needs: ['foresight'], aiOk: true },
  { key: 'ccStrategyLate', level: 1, needs: ['strategy1'], aiOk: true },
  { key: 'ccStrategyLate', level: 2, needs: ['strategy1', 'strategy2'], aiOk: true },
].map((a) => Object.freeze({ ...a, needs: Object.freeze(a.needs) })));

/** The Strategies Strategy 2 adds to Strategy 1's (shared/ruleData.js CC.strategy2: their own changes). */
export const STRATEGY2_BANDS = Object.freeze(['band_ioleta', 'band_duyaoy', 'band_amiya']);

/** Whether a Risk tag version can be awarded at all (the room's Risk grid marks those). */
export const isAwardable = (key, level) => AWARDABLE.some((a) => a.key === key && a.level === level);

/**
 * The tags to award: for each tag the room did not take, the highest awardable level whose conditions all held.
 * @param {Record<string, any>} rules the lobby rules (autoAward must be on)
 * @param {Set<string>} broken the condition ids some event broke
 * @param {{ aiSeats: boolean }} opts whether the lobby had AI seats (bots, 托管)
 * @returns {Record<string, number>} tag key → level; empty when none (or the rule is off)
 */
export function awardedTags(rules, broken, { aiSeats }) {
  /** @type {Record<string, number>} */
  const out = {};
  if (rules?.autoAward !== true) return out;
  for (const a of AWARDABLE) {
    if ((Number(rules[a.key]) || 0) > 0) continue;
    if (!a.aiOk && aiSeats) continue;
    if (a.needs.some((c) => broken.has(c))) continue;
    if (!(out[a.key] >= a.level)) out[a.key] = a.level;
  }
  return out;
}
