// (fork) Fish's Du Yaoye tactics (server/match/botTacticsDyy.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOT_STRATEGIES } from '../../server/match/botStrategies.js';
import { PASS, profileOf, resolveParams } from '../../server/match/botTactics.js';
import { DYY_LEVEL, DYY_SHOP, DYY_FREEZE, DYY_MUELSYSE, CARRY_HOLOGRAM } from '../../server/match/botTacticsDyy.js';
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

test('dyy-muelsyse: keeps 缪尔赛思 while a 画卷 is held, copies her with it (one more Isomorph), levels to 6; stops at maxIso', () => {
  const { m, ps } = prep({ round: 9, funds: 60 });
  const gd = m.gd;
  const isos = () => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && gd.item(q.id)?.canGiveBond).length
    + ps.allChess().flatMap((q) => q.items || []).filter((it) => gd.item(it.id)?.canGiveBond).length;
  const mus = () => ps.allChess().filter((q) => gd.baseIdOf(q.id) === 'chess_char_6_11_a').length;
  for (let k = 0; k < 4 && ps.shop.level < 5; k++) { ps.funds = 60; ps.levelUp(); }
  assert.equal(ps.shop.level, 5);
  ps.funds = 60;
  assert.ok(ps.acquireChess('chess_char_6_11_a', { source: 'test' }));
  const iso0 = isos();
  assert.ok(iso0 >= 1, 'she brings an Isomorph');
  // no clone item held or shown: nothing kept (keep: clone), no level 6
  for (const sl of ps.shop.slots) if (sl && sl.kind === 'item') sl.sold = true;
  const own0 = ps._botSelf;
  DYY_MUELSYSE.at.sellJunk(ctxOf(DYY_MUELSYSE, m, ps));
  assert.equal(ps.shop.level, 5, 'no 画卷: no level 6');
  assert.ok(!(ps._botSelf?.plan?.keep || []).includes('chess_char_6_11_a'), 'not kept without a clone');
  ps._botSelf = own0;
  assert.ok(ps.acquireItem('chess_item_6_02_m', { source: 'test', requirePool: false }));
  DYY_MUELSYSE.at.sellJunk(ctxOf(DYY_MUELSYSE, m, ps));
  assert.equal(ps.shop.level, 6, 'Fish\'s rule: level 6 with her and a 画卷');
  assert.ok(ps._botSelf.plan.keep.includes('chess_char_6_11_a'));
  assert.ok(ps._botSelf.plan.items.keep.includes('chess_item_6_02_m'));
  assert.ok(ps._botSelf.plan.items.buy.includes('chess_item_6_02_m'));
  assert.ok(ps._botSelf.plan.items.buy.length <= 8);
  const mu0 = mus();
  DYY_MUELSYSE.at.equipItems(ctxOf(DYY_MUELSYSE, m, ps));
  assert.ok(mus() > mu0 || isos() > iso0, `copied: ${mu0} → ${mus()} Muelsyse, ${iso0} → ${isos()} Isomorphs`);
  assert.ok(isos() > iso0, 'the copy brought an Isomorph');
  assert.equal([...ps.hand, ...ps.temp].filter((q) => q?.id === 'chess_item_6_02_m').length, 0, 'the 画卷 is used');
  checkInvariants(m);
  // at maxIso: passes everything to legacy
  const p1 = { ...resolveParams(DYY_MUELSYSE), maxIso: isos() };
  ps._botSelf = null;
  DYY_MUELSYSE.at.sellJunk({ ...ctxOf(DYY_MUELSYSE, m, ps), params: p1 });
  assert.equal(ps._botSelf, null, 'at maxIso: no plan written');
});

test('dyy-muelsyse: 拟态物质 and, from shop level 6, 简易通讯机 print her again (her only Alliance); 博士投影 is not for her', () => {
  const { m, ps } = prep({ round: 10, funds: 80 });
  const gd = m.gd;
  const isos = () => [...ps.hand, ...ps.temp].filter((q) => q && q.kind === 'item' && gd.item(q.id)?.canGiveBond).length
    + ps.allChess().flatMap((q) => q.items || []).filter((it) => gd.item(it.id)?.canGiveBond).length;
  const mus = () => ps.allChess().filter((q) => gd.baseIdOf(q.id) === 'chess_char_6_11_a');
  for (let k = 0; k < 6 && ps.shop.level < 6; k++) { ps.funds = 80; ps.levelUp(); }
  assert.equal(ps.shop.level, 6);
  assert.ok(ps.acquireChess('chess_char_6_11_a', { source: 'test' }));
  for (const id of ['chess_item_5_06_e_b', 'chess_item_5_05_e_a', 'chess_item_2_06_e_a']) assert.ok(ps.acquireItem(id, { source: 'test', requirePool: false }), id);
  const iso0 = isos();
  DYY_MUELSYSE.at.equipItems(ctxOf(DYY_MUELSYSE, m, ps));
  assert.ok(mus().length >= 3 || mus().some((q) => gd.isGolden(q.id)), `printed twice (3 copies merge): ${mus().map((q) => q.id)}`);
  assert.ok(isos() >= iso0 + 2, `${iso0} → ${isos()} Isomorphs`);
  assert.equal([...ps.hand, ...ps.temp].filter((q) => q?.kind === 'item' && ['chess_item_5_05_e_a', 'chess_item_2_06_e_a'].includes(q.id)).length, 0, 'both used');
  assert.equal([...ps.hand, ...ps.temp].filter((q) => q?.id === 'chess_item_5_06_e_b').length, 1, 'the 博士投影 stays');
  checkInvariants(m);
});

test('carry-hologram: 博士投影 on the planned carry, or (target stacker) on a deployed stack generator like 圣约送葬人', async () => {
  const { tileKey, inField } = await import('../../server/match/board.js');
  for (const target of ['carry', 'stacker']) {
    const { m, ps } = prep({ round: 8, funds: 30 });
    try {
      const gd = m.gd;
      for (const [k] of [...ps.board]) ps.board.delete(k);
      const exe = ps.newPiece('chess', 'chess_char_5_01_a'), dusk = ps.newPiece('chess', 'chess_char_5_12_a');
      const tiles = [];
      for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(exe, r, c) && ps._legal(dusk, r, c)) tiles.push([r, c]);
      ps.board.set(tileKey(...tiles[0]), exe);
      ps.board.set(tileKey(...tiles[tiles.length - 1]), dusk);
      ps.recompute();
      ps._botCarry = dusk.uid;
      assert.ok(ps.acquireItem('chess_item_5_06_e_b', { source: 'test', requirePool: false }));
      const params = { ...resolveParams(CARRY_HOLOGRAM), target };
      CARRY_HOLOGRAM.at.sellJunk({ ...ctxOf(CARRY_HOLOGRAM, m, ps), params });
      assert.ok(ps._botSelf.plan.items.keep.includes('chess_item_5_06_e_b'), 'kept from legacy');
      CARRY_HOLOGRAM.at.equipItems({ ...ctxOf(CARRY_HOLOGRAM, m, ps), params });
      const promoted = target === 'carry' ? dusk : exe, other = target === 'carry' ? exe : dusk;
      assert.ok(gd.isGolden(promoted.id), `${target}: ${promoted.id} promoted`);
      assert.ok(!gd.isGolden(other.id), `${target}: ${other.id} not`);
      checkInvariants(m);
    } finally { m.dispose(); }
  }
});

test('iso-not-muelsyse: legacy equips a loose Isomorph anywhere but on 缪尔赛思; carry-iso never takes her as the carry', async () => {
  const { equipItems, withLegacyTunables, carryAndFocus } = await import('../../server/match/bot.js');
  const { tileKey, inField } = await import('../../server/match/board.js');
  const { ISO_NOT_MUELSYSE } = await import('../../server/match/botTacticsDyy.js');
  assert.deepEqual(ISO_NOT_MUELSYSE.tunables(resolveParams(ISO_NOT_MUELSYSE)), { MORPH_ON_MUELSYSE: false });
  const { m, ps } = prep({ round: 9, funds: 0 });
  try {
    const gd = m.gd;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const mu = ps.newPiece('chess', 'chess_char_6_11_a');
    const tiles = [];
    for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(mu, r, c)) tiles.push([r, c]);
    ps.board.set(tileKey(...tiles[0]), mu);
    ps.recompute();
    assert.equal(carryAndFocus(m, ps).carry, null, 'she is never the carry');
    assert.ok(ps.acquireItem('chess_item_6_09_e_a', { source: 'test', requirePool: false }));
    withLegacyTunables({ MORPH_ON_MUELSYSE: false }, () => equipItems(m, ps));
    assert.ok(!(mu.items || []).some((it) => gd.item(it.id)?.canGiveBond), 'no Isomorph on her');
    assert.ok([...ps.hand, ...ps.temp].some((q) => q?.id === 'chess_item_6_09_e_a'), 'it waits in the hand');
    checkInvariants(m);
  } finally { m.dispose(); }
});
