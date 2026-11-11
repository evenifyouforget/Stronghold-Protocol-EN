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
