// (fork) Fish's Du Yaoye tactics (server/match/botTacticsDyy.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOT_STRATEGIES } from '../../server/match/botStrategies.js';
import { PASS, profileOf, resolveParams } from '../../server/match/botTactics.js';
import { DYY_LEVEL, DYY_SHOP, DYY_FREEZE } from '../../server/match/botTacticsDyy.js';
import { makeMatch, checkInvariants } from './harness.js';

const YAN_T1 = 'chess_char_1_03_a'; // 惊蛰 / Leizi: 炎, tier 1
const soloBot = (opts = {}) => makeMatch({ mode: 'solo', difficulty: 'NORMAL', fake: true,
  seats: [{ seat: 0, playerId: 'ai_0', name: 'AI', isBot: true, connected: true }], ...opts });

/** A prep of round `round` on a 杜遥夜 seat (or `band`) with `funds`. */
function prep({ round = 2, funds = 50, band = 'band_duyaoy' } = {}) {
  const h = soloBot({ botStrategy: 'fish-dyy' }).start().toPrep();
  const { m } = h, ps = m.order[0];
  m.round = round;
  ps.bandId = band;
  ps.funds = funds;
  return { m, ps };
}
const ctxOf = (tactic, m, ps, args = [], next = () => 'next') => ({ match: m, player: ps, args, params: resolveParams(tactic), state: () => ({}), next });
const drain = (gen) => { let r; do r = gen.next(); while (!r.done); return r.value; };
const chessSlot = (m, id) => ({ kind: 'chess', id, basePrice: m.gd.chessPrice(id), sold: false });

test('fish-dyy: registered, opt-in, its tactics in the economy slot', () => {
  assert.ok(Object.hasOwn(BOT_STRATEGIES, 'fish-dyy'));
  assert.deepEqual(profileOf('fish-dyy').slots, { draft: [], economy: ['dyy-shop', 'dyy-freeze', 'dyy-level'], placement: [] });
});

test('every tactic passes for a seat of another Strategy', () => {
  const { m, ps } = prep({ band: 'band_cannot' });
  try {
    const level = ps.shop.level;
    assert.equal(DYY_LEVEL.at.sellJunk(ctxOf(DYY_LEVEL, m, ps)), PASS);
    assert.equal(DYY_LEVEL.at.levelUp(ctxOf(DYY_LEVEL, m, ps)), PASS);
    assert.equal(DYY_FREEZE.at.maybeFreeze(ctxOf(DYY_FREEZE, m, ps)), PASS);
    assert.equal(drain(DYY_SHOP.at.buyLoopSteps(ctxOf(DYY_SHOP, m, ps, [{}]))), PASS);
    assert.equal(ps.shop.level, level);
  } finally { m.dispose(); }
});

test('dyy-level: level 2 on round 2 and level 5 by round 7, at the start of the prep, then legacy', () => {
  for (const [round, want] of [[2, 2], [4, 3], [5, 4], [7, 5], [12, 5]]) {
    const { m, ps } = prep({ round, funds: 200 });
    try {
      let handed = false;
      DYY_LEVEL.at.sellJunk(ctxOf(DYY_LEVEL, m, ps, [], () => { handed = true; }));
      assert.equal(ps.shop.level, want, `round ${round}`);
      assert.ok(handed);
      checkInvariants(m);
    } finally { m.dispose(); }
  }
});

test('dyy-freeze: a Yan operator the seat cannot afford is frozen; otherwise legacy decides', () => {
  const { m, ps } = prep({ funds: 0 });
  try {
    ps.shop.slots[0] = chessSlot(m, YAN_T1);
    ps.shop.frozen = false;
    let handed = false;
    DYY_FREEZE.at.maybeFreeze(ctxOf(DYY_FREEZE, m, ps, [], () => { handed = true; }));
    assert.ok(ps.shop.frozen);
    assert.ok(!handed);
    ps.freeze();
    ps.funds = 50;
    DYY_FREEZE.at.maybeFreeze(ctxOf(DYY_FREEZE, m, ps, [], () => { handed = true; }));
    assert.ok(!ps.shop.frozen && handed, 'affordable: legacy decides');
  } finally { m.dispose(); }
});

test('dyy-shop: buys an unowned Yan operator, hunts with at most the 2 special refreshes, then legacy', () => {
  const { m, ps } = prep({ funds: 30 });
  try {
    ps.shop.frozen = false;
    ps.shop.slots = ps.shop.slots.map((s) => (s && s.kind === 'chess' ? { ...s, sold: true } : s));
    ps.shop.slots[0] = chessSlot(m, YAN_T1);
    const refreshes = ps.round.refreshes;
    let handed = false;
    // eslint-disable-next-line require-yield
    drain(DYY_SHOP.at.buyLoopSteps(ctxOf(DYY_SHOP, m, ps, [{ fillOnly: false }], function* () { handed = true; })));
    assert.ok(ps.allChess().some((p) => m.gd.baseIdOf(p.id) === m.gd.baseIdOf(YAN_T1)), 'Leizi bought');
    assert.ok(ps.round.refreshes - refreshes <= 2 && ps.round.refreshes <= 2, `refreshes ${ps.round.refreshes}`);
    assert.ok(handed, "legacy's buy loop follows");
    checkInvariants(m);
  } finally { m.dispose(); }
});
