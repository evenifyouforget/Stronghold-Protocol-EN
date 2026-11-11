// (fork) The research tactics (server/match/botTacticsResearch.js), the evolution bench's building blocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TACTICS, profileFromData } from '../../server/match/botStrategies.js';
import { defineProfile, resolveParams } from '../../server/match/botTactics.js';
import { RESEARCH_TACTICS, BOUNTY_OPTIMISM, LP_HOLD_LEVEL } from '../../server/match/botTacticsResearch.js';
import { makeMatch, checkInvariants } from './harness.js';

const soloBot = (opts = {}) => makeMatch({ mode: 'solo', difficulty: 'NORMAL', fake: true,
  seats: [{ seat: 0, playerId: 'ai_0', name: 'AI', isBot: true, connected: true }], ...opts });

function playOut(botStrategy, seed) {
  const h = soloBot({ botStrategy, seed });
  try {
    h.start();
    const ended = h.runToEnd();
    const ps = h.m.order[0];
    checkInvariants(h.m);
    assert.deepEqual(h.logs.error, []);
    return JSON.stringify({ ended, round: h.m.round, lp: ps.lp, funds: ps.funds, level: ps.shop.level,
      units: ps.allChess().map((p) => `${p.id}@${p.area}:${p.key ?? ''}`).sort(), stats: ps.stats });
  } finally { h.m.dispose(); }
}

test('every research tactic is known to profile data, with defaults inside its bounds', () => {
  for (const t of RESEARCH_TACTICS) {
    assert.equal(TACTICS[t.id], t);
    resolveParams(t);
    const p = profileFromData({ id: `t-${t.id}`, tactics: [t.id] });
    assert.equal(typeof p.prepBegin === 'function' || typeof p.pickCard === 'function' || typeof p.bountyKillChance === 'function', true);
  }
});

test('bounty-optimism keeps a bounty legacy picked, and otherwise takes the best bounty only above minGain', () => {
  const at = BOUNTY_OPTIMISM.at.pickCard;
  const cards = [{ kind: 'item' }, { kind: 'bounty', coin: 0, count: 1 }];
  const ctx = (pick, minGain) => ({ match: { gd: { enemy: () => null } }, player: { lp: 30 }, params: { k: 2, minGain }, args: [cards, [0, 1]], next: () => pick });
  assert.equal(at(ctx(1, 100)), 1);
  // a bounty worth no coin only loses LP: below any positive minGain
  assert.equal(at(ctx(0, 2)), 0);
  assert.equal(at(ctx(0, -1000)), 1);
});

test('lp-hold-level hands on to legacy above the LP floor and holds at or below it', () => {
  let asked = 0;
  const ctx = (lp, round) => ({ match: { round }, player: { lp }, params: { lpBelow: 10, fromRound: 4 }, next: () => { asked++; return 'legacy'; } });
  assert.equal(LP_HOLD_LEVEL.at.levelUp(ctx(20, 6)), 'legacy');
  assert.equal(LP_HOLD_LEVEL.at.levelUp(ctx(10, 3)), 'legacy');
  assert.equal(LP_HOLD_LEVEL.at.levelUp(ctx(10, 6)), undefined);
  assert.equal(asked, 2);
});

test('each research tactic plays a whole match through the game\'s intents, the same on a replay', () => {
  for (const t of RESEARCH_TACTICS) {
    const p = defineProfile({ id: `research-${t.id}`, tactics: [t] });
    const a = playOut(p, 7);
    assert.equal(playOut(p, 7), a, `${t.id} is deterministic`);
  }
});

test("plan-bond adds its bond to legacy's own plan for the round, from its round on, and keeps legacy's focus", async () => {
  const { PLAN_BOND } = await import('../../server/match/botTacticsResearch.js');
  const at = PLAN_BOND.at.sellJunk;
  const focus = Object.freeze({ id: 'yanShip', priority: 5 });
  const run = (round, self) => {
    const ps = { isBot: true, autoplay: false, _botSelf: self };
    at({ match: { round }, player: ps, params: { bond: 'investShip', priority: 3, fromRound: 6 }, next: () => 'legacy' });
    return ps._botSelf;
  };
  assert.equal(run(5, null), null, 'before fromRound: untouched');
  assert.deepEqual(run(6, { round: 6, plan: { bonds: [focus] } }).plan.bonds, [focus, { id: 'investShip', priority: 3 }]);
  assert.deepEqual(run(7, null).plan.bonds, [{ id: 'investShip', priority: 3 }], 'no focus: the bond alone');
  const stale = { round: 6, plan: { bonds: [focus] } };
  assert.equal(run(7, stale), stale, "another round's plan: untouched");
});

test("plan-engines puts the position stack operators into legacy's buy list, keeps the owned ones, and stops buying new ones at max", async () => {
  const { PLAN_ENGINES } = await import('../../server/match/botTacticsResearch.js');
  const h = soloBot({ seed: 3 });
  h.start();
  const m = h.m;
  const params = { kinds: 'pos', fromRound: 4, toRound: 11, max: 1 };
  // the whole visible pool (a match bans some operators per seed: SharedPool `banned`)
  const pool = { entries: new Map(m.gd.visibleChess.map((id) => [id, {}])) };
  const run = (round, level, owned = []) => {
    const fake = { isBot: true, autoplay: false, _botSelf: { round, plan: Object.freeze({ bonds: [] }) }, gd: m.gd,
      shop: { level }, allChess: () => owned.map((id, i) => ({ uid: 900 + i, id })) };
    PLAN_ENGINES.at.sellJunk({ match: { round, pool, gd: m.gd }, player: fake, params, next: () => 'legacy' });
    return fake._botSelf.plan;
  };
  const p = run(6, 6);
  for (const id of ['chess_char_3_21_a', 'chess_char_3_02_a']) assert.ok(p.buy.includes(id), `${id} (position stacker) in the buy list`);
  assert.ok(!p.buy.includes('chess_char_2_04_a'), '小满 (an Alliance-named engine legacy already values) is not');
  assert.deepEqual(p.bonds, [], "legacy's own plan fields stay");
  assert.ok(!run(6, 2).buy.includes('chess_char_3_21_a'), 'above the shop level: not listed');
  const capped = run(6, 6, ['chess_char_3_21_b']);
  assert.deepEqual(capped.buy, ['chess_char_3_21_a'], 'max reached: only the owned one (its copies) stays a buy');
  assert.deepEqual(capped.keep, ['chess_char_3_21_b']);
  assert.equal(run(3, 6).buy, undefined, 'before fromRound: untouched');
  assert.equal(run(12, 6).buy, undefined, 'after toRound: untouched');
  assert.ok(TACTICS['plan-engines'] || TACTICS.get?.('plan-engines'), 'registered');
});
