// test/match/risk-tags.test.js — the match side of the SPA-CC Risk tags (shared/rules.js 'risk', numbers in
// shared/ruleData.js CC): the first tier-1 operator bought each round from round 3 costs +1, shop upgrade prices, the
// final bosses' HP pool, the Silencers for the player with the fewest stacks on rounds 10–13 (ties: the earliest seat),
// and 投资人 counting the board only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMatch } from './harness.js';
import { bossPoolHp } from '../../server/match/finalAssault.js';
import { CC } from '../../shared/ruleData.js';

const tier1 = (gd) => gd.visibleChess.find((id) => gd.tierOf(id) === 1 && !gd.chess(id).isGolden);

test('ccTier1Price: +1 on the first tier-1 operator of a round from round 3, not after one is bought, not before round 3', () => {
  const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccTier1Price: 1 } }).start();
  try {
    const ps = h.ps('p_0');
    const id = tier1(ps.gd);
    const slot = { kind: 'chess', id, basePrice: ps.gd.chessPrice(id) };
    h.m.round = 2;
    assert.equal(ps.priceOf(slot), slot.basePrice, 'round 2');
    h.m.round = 3;
    assert.equal(ps.priceOf(slot), slot.basePrice + 1);
    ps.round.tier1Bought = true;
    assert.equal(ps.priceOf(slot), slot.basePrice, 'only the first');
    const other = ps.gd.visibleChess.find((x) => ps.gd.tierOf(x) === 2);
    ps.round.tier1Bought = false;
    assert.equal(ps.priceOf({ kind: 'chess', id: other, basePrice: 2 }), 2, 'tier 2 unchanged');
  } finally { h.m.dispose(); }
});

test('ccUpgrade: leaving shop level 4 costs +2 (level 2: +3, and level 5 too)', () => {
  for (const [lv, want] of [[0, { 4: 0, 5: 0 }], [1, { 4: 2, 5: 0 }], [2, { 4: 3, 5: 3 }]]) {
    const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccUpgrade: lv } });
    try {
      const ps = h.ps('p_0');
      for (const level of [3, 4, 5]) assert.equal(ps.upgradeBaseOf(level), (ps.gd.upgradeBase(level) ?? 0) + (want[level] ?? 0), `tag ${lv}, level ${level}`);
    } finally { h.m.dispose(); }
  }
});

test('ccBoss: the final boss pool +50 / 150 / 400 %', () => {
  const h = makeMatch({ mode: 'solo', seed: 3 });
  try {
    const base = bossPoolHp(h.m.gd, h.m.bossId, 1);
    for (const lv of [1, 2, 3]) assert.equal(bossPoolHp(h.m.gd, h.m.bossId, 1, { ccBoss: lv }), Math.round(base * (1 + CC.bossHp[lv])));
  } finally { h.m.dispose(); }
});

test('ccSilencers: rounds 10–13, the fewest stacks; a tie goes to the earliest seat; none on round 9 or without the tag', () => {
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 4, rules: { ccSilencers: 1 } });
  try {
    const [p0, p1] = [h.ps('p_0'), h.ps('p_1')];
    h.m.round = 10;
    p0.layers = { yanShip: 30 }; p1.layers = { yanShip: 10, kjeragShip: 5 };
    assert.deepEqual(h.m.riskBounties(p0), []);
    const [b] = h.m.riskBounties(p1);
    assert.equal(b.card.enemyKey, CC.silencers.key);
    assert.equal(b.card.count, CC.silencers.count);
    assert.equal(b.card.coin, 0);
    assert.equal(h.m.waveBounties(p1).length, p1.bounties.length + 1);
    p1.layers = { yanShip: 30 };
    assert.equal(h.m.riskBounties(p0).length, 1, 'tie: the earliest seat');
    assert.equal(h.m.riskBounties(p1).length, 0);
    h.m.round = 9;
    assert.equal(h.m.riskBounties(p0).length, 0, 'round 9');
  } finally { h.m.dispose(); }
  const off = makeMatch({ mode: 'coop', humans: 2, seed: 4 });
  try { off.m.round = 10; assert.equal(off.m.riskBounties(off.ps('p_0')).length, 0); } finally { off.m.dispose(); }
});

test('ccInvestorBench: 投资人 counts the board only', () => {
  const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccInvestorBench: 1 } });
  const plain = makeMatch({ mode: 'solo', seed: 3 });
  try {
    assert.equal(h.m.gd.bond('investShip').countMode, 'BOARD');
    assert.equal(plain.m.gd.bond('investShip').countMode, 'BOARD_AND_DECK');
  } finally { h.m.dispose(); plain.m.dispose(); }
});
