// Lobby rules (Fish Edition, shared/constants.js RULE_KEYS): the host-set modifiers a match reads at start —
// extraDeploy (+2 deployment limit), extraFunds (+2 Funds every round start), untimed (no countdown outside battles).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE, DEFAULT_RULES, RULE_KEYS, RULE_EXTRA_DEPLOY, RULE_EXTRA_FUNDS, normalizeRules } from '../../shared/constants.js';
import { validateC2S } from '../../shared/protocol.js';
import { makeMatch } from './harness.js';

test('normalizeRules: known keys only, booleans only, missing keys from the base (default all off), frozen', () => {
  assert.deepEqual(normalizeRules(null), DEFAULT_RULES);
  assert.deepEqual(Object.keys(normalizeRules({})), RULE_KEYS);
  assert.ok(RULE_KEYS.every((k) => DEFAULT_RULES[k] === false), 'every rule is off by default');
  assert.deepEqual(normalizeRules({ extraFunds: true, bogus: true, untimed: 1 }), { extraDeploy: false, extraFunds: true, untimed: false });
  const base = normalizeRules({ extraDeploy: true });
  assert.deepEqual(normalizeRules({ untimed: true }, base), { extraDeploy: true, extraFunds: false, untimed: true });
  assert.deepEqual(normalizeRules({ extraDeploy: false }, base), DEFAULT_RULES);
  assert.ok(Object.isFrozen(base));
});

test('room.setRules: a non-empty partial map of known rule keys to booleans', () => {
  assert.equal(validateC2S({ t: 'room.setRules', rules: { extraDeploy: true } }), null);
  assert.equal(validateC2S({ t: 'room.setRules', rules: { extraDeploy: true, extraFunds: false, untimed: true } }), null);
  for (const rules of [undefined, null, {}, [], { extraDeploy: 1 }, { bogus: true }, { extraDeploy: 'yes' }]) {
    assert.notEqual(validateC2S({ t: 'room.setRules', rules }), null, JSON.stringify(rules));
  }
});

test('no rules: the match runs with every rule off and shows them in m.public', () => {
  const h = makeMatch({ mode: 'solo', seed: 2 }).start();
  h.toPrep(1);
  assert.deepEqual(h.m.rules, DEFAULT_RULES);
  assert.deepEqual(h.m.publicView().rules, DEFAULT_RULES);
  const ps = h.ps('p_0');
  assert.equal(ps.deployCap, 8);
  assert.equal(ps.funds, 4, 'R1 income 4');
  h.m.dispose();
});

test('extraFunds: +2 Funds at every round start, on top of the income', () => {
  const h = makeMatch({ mode: 'solo', seed: 2, rules: { extraFunds: true } }).start();
  h.toPrep(1);
  const ps = h.ps('p_0');
  assert.equal(ps.funds, 4 + RULE_EXTRA_FUNDS, 'R1: income 4 + 2');
  ps.funds = 3;
  h.drive(() => h.m.phase === PHASE.PREP && h.m.round === 2);
  assert.equal(ps.funds, 5 + RULE_EXTRA_FUNDS, 'R2: leftover lost, income 5 + 2');
  assert.deepEqual(h.m.publicView().rules, { ...DEFAULT_RULES, extraFunds: true });
  h.m.dispose();
});

test('extraDeploy: +2 deployment limit for every player, stacking with in-game bonuses', () => {
  const h = makeMatch({ mode: 'coop', humans: 1, bots: 1, seed: 3, rules: { extraDeploy: true } }).start();
  h.toPrep(1);
  for (const ps of h.m.players.values()) {
    assert.equal(ps.deployCap, 8 + RULE_EXTRA_DEPLOY, ps.playerId);
    assert.equal(ps.privateView().deployCap, 8 + RULE_EXTRA_DEPLOY);
  }
  const ps = h.ps('p_0');
  ps.deployCapBonus += 1; // e.g. an item's addDeployCap
  assert.equal(ps.deployCap, 8 + RULE_EXTRA_DEPLOY + 1);
  h.m.dispose();
});

test('untimed: a co-op match with two humans publishes no countdown outside battles and waits for Ready', () => {
  const timed = makeMatch({ mode: 'coop', humans: 2, seed: 5 }).start();
  timed.toPrep(1);
  assert.ok(timed.m.deadline > 0, 'without the rule, co-op prep has a countdown');
  timed.m.dispose();

  const h = makeMatch({ mode: 'coop', humans: 2, seed: 5, rules: { untimed: true } }).start();
  const m = h.m;
  m.handle('p_0', { t: 'g.infoReady' });
  m.handle('p_1', { t: 'g.infoReady' });
  h.sched.advance(1);
  assert.equal(m.phase, PHASE.BAND_DRAFT);
  assert.equal(m.publicView().draft.untimed, true, 'strategy draft untimed');
  assert.equal(m.publicView().draft.turnDeadline, 0);
  h.sched.advance(10 * 60 * 1000);
  assert.equal(m.phase, PHASE.BAND_DRAFT, 'no draft turn times out');
  // each human picks a strategy nobody holds yet (the harness's fixed pick would wait forever on the second turn)
  while (m.phase === PHASE.BAND_DRAFT) {
    const taken = new Set(Object.values(m.draft.picks));
    assert.deepEqual(m.handle(m.draftTurn(), { t: 'g.band', bandId: m.gd.bandIds().find((b) => !taken.has(b)) }), { ok: true });
    h.sched.advance(1);
  }
  h.toPrep(1);
  assert.equal(m.deadline, 0, 'no prep countdown');
  h.sched.advance(10 * 60 * 1000);
  assert.equal(m.phase, PHASE.PREP, 'prep does not time out');
  assert.equal(m.round, 1);
  m.handle('p_0', { t: 'g.ready', ready: true });
  m.handle('p_1', { t: 'g.ready', ready: true });
  h.sched.advance(1);
  assert.notEqual(m.phase, PHASE.PREP, 'prep ends once every player is ready');
  m.dispose();
});
