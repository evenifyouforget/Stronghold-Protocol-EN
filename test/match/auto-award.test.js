// test/match/auto-award.test.js — (fork, GitHub #125) the autoAward lobby rule: Risk tags the room did not take are
// added at the end when the match shows they changed nothing (shared/autoAward.js, server/match/autoAward.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE } from '../../shared/constants.js';
import { ruleLabels, RULES } from '../../shared/rules.js';
import { strategyLateBandIds } from '../../shared/ruleData.js';
import { awardedTags, AWARDABLE, AWARD_CONDITIONS, isAwardable } from '../../shared/autoAward.js';
import { makeMatch } from './harness.js';
import fs from 'node:fs';

const ON = { autoAward: true };

test('awardedTags: only with the rule on; untaken tags; the highest level whose conditions all held', () => {
  const none = new Set();
  assert.deepEqual(awardedTags({}, none, { aiSeats: false }), {}, 'rule off: nothing');
  assert.deepEqual(awardedTags(ON, none, { aiSeats: false }),
    { ccInvestorBench: 2, ccSwift: 1, ccForesight: 1, ccStrategyLate: 2 }, 'nothing broken: every awardable tag, top level');
  assert.deepEqual(awardedTags({ ...ON, ccSwift: 1, ccStrategyLate: 1 }, none, { aiSeats: false }),
    { ccInvestorBench: 2, ccForesight: 1 }, 'a taken tag (any level) is not awarded or raised');
  assert.deepEqual(awardedTags(ON, new Set(['investorOps', 'strategy2', 'foresight']), { aiSeats: false }),
    { ccInvestorBench: 1, ccSwift: 1, ccStrategyLate: 1 }, 'a level drops to the one whose conditions held');
  assert.deepEqual(awardedTags(ON, new Set(['investor', 'strategy1', 'swift', 'foresight']), { aiSeats: false }), {},
    'a stacking tag needs its lower levels: no Investor 2 without Investor 1');
});

test('the awardable list: real tag versions, every condition has a text, ruleLabels counts awarded Risk', () => {
  const byKey = new Map(RULES.map((r) => [r.key, r]));
  for (const a of AWARDABLE) {
    const r = byKey.get(a.key);
    assert.ok(r && r.category === 'risk' && a.level < r.risk.length, `${a.key} ${a.level}`);
    for (const c of a.needs) assert.ok(AWARD_CONDITIONS[c], c);
  }
  assert.ok(isAwardable('ccSwift', 1) && !isAwardable('ccBoss', 1));
  assert.equal(byKey.get('autoAward')?.category, 'neutral', 'not a cheat');
  assert.deepEqual(ruleLabels({ ...ON, ccBoss: 2 }, { ccSwift: 1, ccInvestorBench: 2 }), { cheats: false, seeded: false, risk: 2 + 1 + 2 });
  assert.deepEqual(ruleLabels(ON), { cheats: false, seeded: false, risk: 0 });
});

test('Strategy 1 affects the 13 Strategies of the tag spec (named rounds, not the periodic one)', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('../../data/bands.json', import.meta.url)));
  const ids = strategyLateBandIds(raw.bands || raw);
  assert.equal(ids.length, 13);
  assert.ok(!ids.includes('band_damaztic'), 'by period: not affected');
});

/** A solo match driven to its end with nobody acting: the result and the awards. */
function idleMatch(lobbyRules) {
  const h = makeMatch({ mode: 'solo', seed: 5, lobbyRules }).start();
  h.drive(() => h.m.phase === PHASE.RESULT);
  const out = { outcome: { ...h.m.outcome }, rounds: h.m.round, awarded: h.m.awarded, pub: h.m.publicView(), result: h.m.lastResultMsg };
  h.m.dispose();
  return out;
}

test('a match plays the same with the rule on or off, and an idle game earns the tags it never touched', () => {
  const off = idleMatch({});
  const on = idleMatch(ON);
  assert.deepEqual(on.outcome, off.outcome, 'the watchers change nothing');
  assert.equal(on.rounds, off.rounds);
  assert.equal(off.awarded ?? null, null, 'rule off: no awards');
  assert.ok(on.awarded && on.awarded.ccSwift === 1, `Swift never active: awarded (${JSON.stringify(on.awarded)})`);
  assert.equal(on.awarded.ccForesight, 1, 'no Foresight operator fought');
  assert.deepEqual(on.pub.awarded, on.awarded, 'the end screen reads them from m.public');
  assert.deepEqual(on.result.awarded, on.awarded, 'and from m.result');
});

test('a real field with a Foresight operator and an active Swift breaks both', async () => {
  const { noteBattle, finishAwards } = await import('../../server/match/autoAward.js');
  const h = makeMatch({ mode: 'solo', seed: 5, lobbyRules: ON }).start();
  h.toPrep(1);
  const visi = Object.entries(h.m.gd.raw.chess).find(([, c]) => Array.isArray(c.bonds) && c.bonds.includes('visiShip'))[0];
  noteBattle(h.m, { players: [{ units: [{ chessId: visi }], bonds: { swiftShip: { active: true } } }] });
  const a = finishAwards(h.m) || {};
  assert.equal(a.ccForesight, undefined);
  assert.equal(a.ccSwift, undefined);
  h.m.dispose();
});
