// (fork) tools/scenario.mjs: scenario tests for the bot bench (fish-edition/TODO.md, Fish 2026-11-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScenario, applyScenario } from '../tools/scenario.mjs';
import { makeMatch } from './match/harness.js';

test('parseScenario refuses mistakes instead of running a plain bench', () => {
  assert.throws(() => parseScenario({ gifts: [] }));
  assert.throws(() => parseScenario({ gifts: [{ round: 7 }] }), /exactly one/);
  assert.throws(() => parseScenario({ gifts: [{ round: 0, chess: 'x' }] }), /bad round/);
  assert.throws(() => parseScenario({ gifts: [{ round: 3, funds: -1 }] }), /bad funds/);
  const s = parseScenario({ id: 'mu', gifts: [{ round: 7, chess: 'chess_char_6_11_a' }, { round: 3, funds: 5, seats: [0] }] });
  assert.equal(s.gifts.length, 2);
  assert.deepEqual(s.gifts[1].seats, [0]);
});

test('applyScenario gives Muelsyse at round 7 through the gain path: her on-gain Isomorph arrives too', () => {
  const h = makeMatch({ mode: 'solo', difficulty: 'NORMAL', fake: true, seed: 5,
    seats: [{ seat: 0, playerId: 'ai_0', name: 'AI', isBot: true, connected: true }] });
  try {
    assert.throws(() => parseScenario({ gifts: [{ round: 7, chess: 'chess_char_nope' }] }, h.m.gd), /unknown operator/);
    const log = applyScenario(h.m, parseScenario({ gifts: [{ round: 7, chess: 'chess_char_6_11_a' }, { round: 7, funds: 9 }] }));
    h.start();
    h.toPrep(6);
    const ps = h.m.order[0];
    assert.equal(log.length, 0, 'nothing before round 7');
    h.toPrep(7);
    assert.deepEqual(log.map((x) => [x.round, x.kind, x.ok]), [[7, 'chess', true], [7, 'funds', true]]);
    assert.ok(ps.allChess().some((q) => h.m.gd.baseIdOf(q.id) === 'chess_char_6_11_a'), 'Muelsyse owned');
    const items = [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item').map((q) => q.id);
    assert.ok(items.includes('chess_item_6_09_e_a'), `her on-gain Isomorph: ${items}`);
  } finally { h.m.dispose(); }
});
