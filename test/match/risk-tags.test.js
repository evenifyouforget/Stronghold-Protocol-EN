// test/match/risk-tags.test.js — the match side of the SPA-CC Risk tags (shared/rules.js 'risk', numbers in
// shared/ruleData.js CC): the first tier-1 operator bought each round from round 3 costs +1, shop upgrade prices, the
// final bosses' HP pool, Famiglia Cleaner's Silencers for the player with the fewest stacks on rounds 10–13 (ties: the
// earliest seat), 投资人 counting the board only, the Patriot and Delegation groups' cards and sub-waves, and the round's LP
// (Last Line of Defense, a leaked Patriot).

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

test('ccFamiglia Cleaner: rounds 10–13, the fewest stacks; a tie goes to the earliest seat; none on round 9 or without the tag', () => {
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 4, rules: { ccFamiglia: 1 } });
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

test('ccPatriot Undying 1: a round-9 card worth 0 Funds; nobody taking it → the final boss +200 % HP (Undying 2: +100 % ATK)', () => {
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 4, rules: { ccPatriot: 1 } });
  try {
    h.m.round = 9;
    const c = h.m.riskPatriotCard();
    assert.equal(c.kind, 'bounty');
    assert.equal(c.enemyKey, CC.patriot.key);
    assert.equal(c.coin, 0);
    assert.ok(!c.skipAtk, 'Undying 1 only: no ATK in its text');
    assert.equal(h.m.riskBounties(h.ps('p_0')).length, 0, 'no Patriot without the card');
    h.m.round = 10;
    assert.equal(h.m.riskPatriotCard(), null, 'round 9 only');
    assert.equal(h.m.riskPatriotSkipped(), false, 'never offered: no penalty');
    h.m.ccPatriotOffered = true;
    assert.equal(h.m.riskPatriotSkipped(), true, 'nobody took him');
    h.m.ccPatriotTaken = true;
    assert.equal(h.m.riskPatriotSkipped(), false);
    const base = bossPoolHp(h.m.gd, h.m.bossId, 2, h.m.rules);
    assert.equal(bossPoolHp(h.m.gd, h.m.bossId, 2, h.m.rules, { patriotSkipped: true }), Math.round(base * (1 + CC.patriot.skipHp)));
  } finally { h.m.dispose(); }
  const two = makeMatch({ mode: 'coop', humans: 2, seed: 4, rules: { ccPatriot: 2 } });
  try { two.m.round = 9; assert.equal(two.m.riskPatriotCard().skipAtk, true); } finally { two.m.dispose(); }
});

test('ccPatriot Undying 1: the round-9 Improv shows the card (in place of the 6th in co-op), and taking it brings him', () => {
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 4, rules: { ccPatriot: 1 } });
  try {
    h.m.round = 9;
    h.m.enterSpDraft();
    const cards = h.m.sp.cards;
    assert.ok(cards.length <= 6);
    const idx = cards.findIndex((c) => c.risk);
    assert.ok(idx >= 0, 'the Patriot card is offered');
    assert.equal(cards[idx].idx, idx);
    const who = h.m.spTurn();
    assert.equal(h.m.pickCard(h.ps(who), idx).ok !== false, true);
    assert.equal(h.m.ccPatriotTaken, true);
    assert.equal(h.m.ccPatriotOffered, true);
    assert.equal(h.m.riskPatriotSkipped(), false);
    assert.ok(h.ps(who).bounties.some((b) => b.card.enemyKey === CC.patriot.key && b.card.coin === 0));
  } finally { h.m.dispose(); }
});

test('ccPatriot Support / Rampage 3: 5 Shieldguards with the Patriot taken on round 9; the sub-wave again on every half of the final rounds', () => {
  const h = makeMatch({ mode: 'coop', humans: 2, seed: 4, rules: { ccPatriot: 3 } });
  try {
    h.m.round = 9;
    const [p0, p1] = [h.ps('p_0'), h.ps('p_1')];
    h.m.addBounty(p0, h.m.riskPatriotCard());
    const escort = (ps, o) => h.m.riskBounties(ps, o).filter((b) => b.card.enemyKey === CC.patriot.escort.key);
    assert.equal(escort(p0)[0].card.count, CC.patriot.escort.count);
    assert.equal(escort(p1).length, 0, 'only with the one who took him');
    for (const ps of [p0, p1]) {
      const keys = h.m.riskBounties(ps, { boss: true }).map((b) => b.card.enemyKey);
      assert.ok(keys.includes(CC.patriot.key) && keys.includes(CC.patriot.escort.key), ps.playerId);
    }
  } finally { h.m.dispose(); }
});

test('ccDelegation: the sub-wave of the final rounds per player, HP × 5 / 10 / 15, ATK × 1.5 from United 2, Cloned 3: 3 Degenbrecher', () => {
  const wave = (level) => {
    const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccDelegation: level } });
    try { return h.m.riskBounties(h.ps('p_0'), { boss: true }); } finally { h.m.dispose(); }
  };
  const dg = CC.delegation;
  const byKey = (list) => Object.fromEntries(list.map((b) => [b.card.enemyKey, b.card]));
  const u1 = byKey(wave(1));
  assert.equal(u1[dg.degen].count, 1);
  assert.equal(u1[dg.wave[1].key].count, 10);
  assert.equal(u1[dg.wave[2].key].count, 10);
  assert.deepEqual(u1[dg.degen].riskMods, { hpMul: 5, atkMul: 1 });
  assert.deepEqual(byKey(wave(2))[dg.degen].riskMods, { hpMul: 10, atkMul: 1.5 });
  assert.equal(byKey(wave(3))[dg.degen].count, 3, 'Cloned 3');
  assert.deepEqual(byKey(wave(3))[dg.degen].riskMods, { hpMul: 10, atkMul: 1.5 });
  assert.deepEqual(byKey(wave(4))[dg.degen].riskMods, { hpMul: 15, atkMul: 1.5 }, 'Resilient 3');
  assert.equal(byKey(wave(4))[dg.degen].count, 1);
  const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccDelegation: 1 } });
  try { assert.equal(h.m.riskBounties(h.ps('p_0')).length, 0, 'not in a normal round'); } finally { h.m.dispose(); }
});

test('a sub-wave riskMods multiply the round spawn mods', async () => {
  const { bountySpawns } = await import('../../server/match/waves.js');
  const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccDelegation: 2 } });
  try {
    const ps = h.ps('p_0');
    const list = h.m.riskBounties(ps, { boss: true });
    const plain = list.map((b) => ({ ...b, card: { ...b.card, riskMods: undefined } }));
    const a = bountySpawns(h.m.gd, h.m.round, h.m.wave, list, ps.playerId);
    const b = bountySpawns(h.m.gd, h.m.round, h.m.wave, plain, ps.playerId);
    assert.ok(a.length > 0 && a.length === b.length);
    for (let i = 0; i < a.length; i++) {
      assert.ok(Math.abs(a[i].mods.hpMul - b[i].mods.hpMul * 10) < 1e-9);
      assert.ok(Math.abs(a[i].mods.atkMul - b[i].mods.atkMul * 1.5) < 1e-9);
    }
  } finally { h.m.dispose(); }
});

test('round LP: ccLastLine +2 past the cap when the own battle leaked; a leaked Patriot costs 5 (within the cap)', () => {
  const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccLastLine: 1, ccPatriot: 1 } });
  try {
    const cap = h.m.gd.lpCapPerRound;
    assert.equal(h.m.riskLoss([], 0), 0);
    assert.equal(h.m.riskLoss([{ enemyKey: 'x', counted: true }], 1), 1 + CC.lastLineLp);
    assert.equal(h.m.riskLoss(Array(12).fill({ enemyKey: 'x', counted: true }), cap), cap + CC.lastLineLp, 'past the cap');
    assert.equal(h.m.riskLoss([{ enemyKey: 'x', counted: false }], 0), 0, 'an uncounted leak');
    assert.equal(h.m.riskLoss([{ enemyKey: CC.patriot.key, counted: true }], 1), CC.patriot.leakLp + CC.lastLineLp);
    assert.equal(h.m.riskLoss([{ enemyKey: 'x', counted: true }], 0, false), CC.lastLineLp, '联防 caught it: still +2');
  } finally { h.m.dispose(); }
  const off = makeMatch({ mode: 'solo', seed: 3 });
  try { assert.equal(off.m.riskLoss([{ enemyKey: CC.patriot.key, counted: true }], 1), 1); } finally { off.m.dispose(); }
});

test('ccFamiglia tier 3: Zaaro joins Cleaner\'s sub-wave and costs 5 LP when he leaks; tier 2 adds no one', () => {
  const z = CC.famiglia.zaaro.key;
  for (const [level, want] of [[2, false], [3, true], [4, false], [5, true]]) {
    const h = makeMatch({ mode: 'solo', seed: 3, rules: { ccFamiglia: level } });
    try {
      h.m.round = 10;
      const keys = h.m.riskBounties(h.ps('p_0')).map((b) => b.card.enemyKey);
      assert.ok(keys.includes(CC.silencers.key), `level ${level}: Cleaner is included`);
      assert.equal(keys.includes(z), want, `level ${level}`);
      if (want) assert.equal(h.m.riskLoss([{ enemyKey: z, counted: true }], 1), CC.famiglia.zaaro.leakLp);
      else assert.equal(h.m.riskLoss([{ enemyKey: z, counted: true }], 1), 1);
    } finally { h.m.dispose(); }
  }
});
