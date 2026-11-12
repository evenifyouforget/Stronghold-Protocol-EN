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

test("plan-items puts the shop consumables into legacy's items.buy before the Final Assault, the early doll only with 5 rounds left", async () => {
  const { PLAN_ITEMS } = await import('../../server/match/botTacticsResearch.js');
  const gd = { bossRound: 14 };
  const run = (round, set, plan = { bonds: [] }) => {
    const ps = { isBot: true, autoplay: false, gd, _botSelf: { round, plan } };
    PLAN_ITEMS.at.sellJunk({ match: { round, gd }, player: ps, params: { set, fromRound: 4, reserve: 0 }, next: () => 'legacy' });
    return ps._botSelf.plan;
  };
  assert.deepEqual(run(5, 'stack').items.buy, ['chess_item_1_04_e_a', 'chess_item_2_06_e_a', 'chess_item_4_01_e_a']);
  assert.deepEqual(run(5, 'coin').items.buy, ['chess_item_2_07_e_a', 'chess_item_3_12_e_a', 'chess_item_2_05_e_a']);
  assert.deepEqual(run(10, 'coin').items.buy, ['chess_item_2_07_e_a', 'chess_item_3_12_e_a'], '4 rounds left: no 精打细算玩偶');
  assert.equal(run(5, 'both').items.buy.length, 6);
  const kept = run(5, 'stack', { bonds: [], items: { keep: ['x'], buy: ['y'] } }).items;
  assert.deepEqual([kept.keep, kept.buy[0]], [['x'], 'y'], "legacy's own item lists stay");
  assert.equal(run(3, 'both').items, undefined, 'before fromRound');
  assert.equal(run(14, 'both').items, undefined, 'not in the Final Assault prep');
});

test("plan-iso lists 缪尔赛思 and the Isomorph from its shop level, then the bond items one Isomorph completes", async () => {
  const { PLAN_ISO } = await import('../../server/match/botTacticsResearch.js');
  const h = soloBot({ seed: 3 });
  h.start();
  const gd = h.m.gd;
  const run = (level, { hand = [], chess = [] } = {}) => {
    const ps = { isBot: true, autoplay: false, gd, _botSelf: { round: 9, plan: Object.freeze({ bonds: [] }) }, shop: { level },
      hand, temp: [], allChess: () => chess };
    PLAN_ISO.at.sellJunk({ match: { round: 9, gd }, player: ps, params: { fromLevel: 6, maxIso: 6, bondItems: true, reserve: 0 }, next: () => 'legacy' });
    return ps._botSelf.plan;
  };
  assert.equal(run(5).buy, undefined, 'below fromLevel: untouched');
  const p6 = run(6);
  assert.deepEqual([p6.buy, p6.items.buy], [['chess_char_6_11_a'], ['chess_item_6_09_e_a']], 'no Isomorph yet: no bond items');
  // one Isomorph held; one 突袭 (raid, first threshold 2) member owned → its bond item 突袭手雷 is wanted
  const raidOp = Object.values(gd.raw.chess).find((c) => !c.isGolden && (c.bonds || []).includes('raidShip'));
  const iso = { kind: 'item', uid: 50, id: 'chess_item_6_09_e_a' };
  const p = run(6, { hand: [iso], chess: [{ uid: 1, id: raidOp.chessId }] });
  const raidItem = Object.values(gd.shopItemsByTier).flat().find((id) => gd.item(id).giveBondId === 'raidShip' && !gd.item(id).isGolden);
  assert.ok(p.items.buy.includes(raidItem), 'the raid bond item is listed');
  assert.deepEqual(p.items.keep, ['chess_item_6_09_e_a']);
  const full = run(6, { hand: Array.from({ length: 6 }, (_, i) => ({ ...iso, uid: 60 + i })) });
  assert.deepEqual([full.buy, full.items.buy], [[], []], 'maxIso reached: 缪尔赛思 and the Isomorph no longer listed');
});

test('plan-combos buys and keeps both halves of a trait combo, then 圣约送葬人 on a Laterano board', async () => {
  const { PLAN_COMBOS } = await import('../../server/match/botTacticsResearch.js');
  const h = soloBot({ seed: 3 });
  h.start();
  const m = h.m;
  const params = { fromRound: 4, toRound: 12, max: 1, start: true, fin: true, gain: false, laterano: true };
  const pool = { entries: new Map(m.gd.visibleChess.map((id) => [id, {}])) };
  const fm = { pool, gd: m.gd };
  const run = (round, level, owned = []) => {
    const fake = { isBot: true, autoplay: false, _botSelf: { round, plan: Object.freeze({ bonds: [] }) }, gd: m.gd,
      shop: { level }, allChess: () => owned.map((id, i) => ({ uid: 900 + i, id })) };
    PLAN_COMBOS.at.sellJunk({ match: { ...fm, round }, player: fake, params, next: () => 'legacy' });
    return fake._botSelf.plan;
  };
  const OWL = 'chess_char_4_21_a', KONGXIAN = 'chess_char_3_21_a', SARIA = 'chess_char_5_11_a', DUANYA = 'chess_char_3_02_a';
  const empty = run(6, 6);
  for (const id of [OWL, KONGXIAN, SARIA, DUANYA]) assert.ok(empty.buy.includes(id), `${id}: both halves while nothing is started`);
  assert.ok(!empty.buy.includes('chess_char_1_06_a'), '刺玫 (+1) is no partner');
  const half = run(6, 6, ['chess_char_3_21_b']);
  assert.ok(half.buy.includes(OWL), '空弦 owned: its copier 白面鸮 is bought');
  assert.ok(!half.buy.includes(SARIA), 'one kind started: no second kind');
  assert.deepEqual(half.keep, ['chess_char_3_21_b']);
  const done = run(6, 6, [OWL, KONGXIAN]);
  assert.ok(!done.buy.includes(SARIA) && !done.buy.includes(DUANYA), 'max 1 complete: no new kind');
  assert.deepEqual([...done.keep].sort(), [KONGXIAN, OWL].sort());
  assert.ok(!run(6, 4).buy.includes(SARIA), 'above the shop level: not listed');
  const lat = run(8, 6, [KONGXIAN, 'chess_char_3_01_a']);
  assert.ok(lat.buy.includes('chess_char_5_01_a'), '2 Laterano owned: 圣约送葬人 is bought');
  assert.equal(run(3, 6).buy, undefined, 'before fromRound: untouched');
  assert.ok(TACTICS['plan-combos'], 'registered');
});

test("plan-commit writes the key operator's Alliance into legacy's plan bonds and keeps the operator", async () => {
  const { PLAN_COMMIT, PLAN_KEEPERS } = await import('../../server/match/botTacticsResearch.js');
  const h = soloBot({ seed: 3 });
  h.start();
  const m = h.m;
  const run = (tactic, params, round, owned, extra = {}) => {
    const fake = { isBot: true, autoplay: false, _botSelf: { round, plan: Object.freeze({ bonds: [{ id: 'swiftShip', priority: 3 }] }) }, gd: m.gd,
      shop: { level: 5 }, allChess: () => owned.map((id, i) => ({ uid: 900 + i, id })), ...extra };
    tactic.at.sellJunk({ match: { round, gd: m.gd }, player: fake, params, next: () => 'legacy' });
    return fake._botSelf.plan;
  };
  const P = { priority: 4, fromRound: 3, gladiia: true, laterano: true, dusk: true, silverash: true };
  const g = run(PLAN_COMMIT, P, 6, ['chess_char_4_12_b']);
  assert.deepEqual(g.bonds.map((b) => b.id), ['swiftShip', 'egirShip'], "歌蕾蒂娅 → Ægir, legacy's own bond kept");
  assert.deepEqual(g.keep, ['chess_char_4_12_b']);
  assert.ok(run(PLAN_COMMIT, P, 6, ['chess_char_5_01_a']).bonds.some((b) => b.id === 'lateranoShip'), '圣约送葬人 → Laterano');
  assert.ok(run(PLAN_COMMIT, P, 6, ['chess_char_5_12_a']).bonds.some((b) => b.id === 'yanShip'), '夕 → Yan on a tie');
  assert.ok(!run(PLAN_COMMIT, P, 6, ['chess_char_5_14_a']).bonds.some((b) => b.id === 'kjeragShip'), '凛御银灰 alone: no Kjerag');
  assert.equal(run(PLAN_COMMIT, P, 2, ['chess_char_4_12_a']).bonds.length, 1, 'before fromRound: untouched');
  assert.equal(run(PLAN_COMMIT, { ...P, gladiia: false }, 6, ['chess_char_4_12_a']).bonds.length, 1, 'rule off');
  // plan-keepers: Swire kept until the boss round; 圣约送葬人 kept over 伊内丝 with Foresight
  const K = { yu: true, swire: true, executor: true };
  assert.deepEqual(run(PLAN_KEEPERS, K, 5, ['chess_char_3_04_a']).keep, ['chess_char_3_04_a']);
  assert.equal(run(PLAN_KEEPERS, K, m.gd.bossRound, ['chess_char_3_04_a']).keep, undefined, 'the boss round: Swire may go');
  const ex = run(PLAN_KEEPERS, K, 8, ['chess_char_5_01_a', 'chess_char_4_04_a']);
  assert.deepEqual(ex.keep, ['chess_char_5_01_a'], 'Foresight (2 members) active: 圣约送葬人 kept, not 伊内丝');
  assert.ok(TACTICS['plan-commit'] && TACTICS['plan-keepers'], 'registered');
});

test('diy-picks fills a bot seat\'s custom operator slots at setup; legacy and a repeat pick stay empty', async () => {
  const { DIY_PICKS } = await import('../../server/match/botTacticsResearch.js');
  assert.deepEqual(Object.keys(DIY_PICKS.diyPicks(resolveParams(DIY_PICKS))), ['chess_char_5_diy1_a', 'chess_char_5_diy2_a']);
  assert.equal(DIY_PICKS.diyPicks(resolveParams(DIY_PICKS, { t5a: 'none', t5b: 'none' })), null);
  // an owned operator fills one slot: the repeat is skipped
  assert.deepEqual(Object.keys(DIY_PICKS.diyPicks(resolveParams(DIY_PICKS, { t5b: 'chen', t6a: 'chen', t6b: 'sakiko' }))), ['chess_char_5_diy1_a', 'chess_char_6_diy2_a']);
  const bot = profileFromData({ id: 't-diy-setup', tactics: [{ tactic: 'diy-picks', params: { t6a: 'sakiko' } }] });
  for (const [strategy, slots] of [[bot, ['chess_char_5_diy1_a', 'chess_char_5_diy2_a', 'chess_char_6_diy1_a']], ['legacy', []]]) {
    const h = soloBot({ botStrategy: strategy, seed: 7 });
    try {
      h.start();
      const ps = h.m.order[0];
      assert.deepEqual(Object.keys(ps.diy || {}).sort(), slots);
      assert.equal([...(ps.diyStock?.entries.keys() ?? [])].length, slots.length);
      assert.equal(ps.gd !== h.m.gd, slots.length > 0, 'the picks give the seat its own data view');
      h.runToEnd();
      checkInvariants(h.m);
      assert.deepEqual(h.logs.error, []);
    } finally { h.m.dispose(); }
  }
});

test('cycle-econ values a cycle in funds: economy traits break even, engines on the board make it pay', async () => {
  const { cycleProfit, spendLayersPerGold, CYCLE_ECON } = await import('../../server/match/botTacticsResearch.js');
  const p = resolveParams(CYCLE_ECON);
  const h = soloBot({ seed: 3 });
  try {
    h.start();
    const ps = h.m.order[0];
    const slot = (id) => ({ kind: 'chess', id, basePrice: h.m.gd.chessPrice(id), frozen: false, sold: false });
    // Provence: a free refresh (1) for price 2 − sale 1; Mudrock: +2 next prep for 3 − 1; Exusiai: +1 for 3 − 1
    assert.equal(cycleProfit(h.m, ps, slot('chess_char_1_07_a'), p), 0);
    assert.equal(cycleProfit(h.m, ps, slot('chess_char_4_18_a'), p), 0);
    assert.equal(cycleProfit(h.m, ps, slot('chess_char_3_01_a'), p), -1);
    assert.equal(cycleProfit(h.m, ps, slot('chess_char_1_07_a'), { ...p, refresh: false }), -1);
    assert.equal(spendLayersPerGold(h.m, ps), 0, 'no spend stacker deployed');
    // under an active Investor a gain trait pays twice
    ps.bonds = { ...ps.bonds, investShip: { active: true, layers: 0 } };
    assert.equal(cycleProfit(h.m, ps, slot('chess_char_1_07_a'), p), 1);
  } finally { h.m.dispose(); }
});

test('place-copiers moves Ptilopsis onto the tile behind a deployed prep-start partner, facing it', async () => {
  const { placeCopiers } = await import('../../server/match/botTacticsResearch.js');
  const { tileKey, parseKey, pieceDir, inField } = await import('../../server/match/board.js');
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(2);
    const ps = h.m.order[0];
    ps.ready = false;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const copier = ps.newPiece('chess', 'chess_char_4_21_a'), partner = ps.newPiece('chess', 'chess_char_2_02_a');
    // two tiles where both may stand: the partner's with a free legal tile beside it, and a far one for the copier
    const tiles = [];
    for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(copier, r, c) && ps._legal(partner, r, c)) tiles.push([r, c]);
    const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
    const P = tiles.find((t) => tiles.some((u) => near(t, u)));
    const far = tiles.find((t) => Math.abs(t[0] - P[0]) + Math.abs(t[1] - P[1]) > 2);
    assert.ok(P && far, 'the deploy map has the tiles');
    ps.board.set(tileKey(...P), partner);
    copier.dir = 'RIGHT';
    ps.board.set(tileKey(...far), copier);
    ps.recompute();
    assert.equal(placeCopiers(h.m, ps), 1);
    const at = [...ps.board].find(([, q]) => q === copier)[0];
    const [r, c] = parseKey(at), d = { UP: [-1, 0], RIGHT: [0, 1], DOWN: [1, 0], LEFT: [0, -1] }[pieceDir(copier)];
    assert.equal(tileKey(r + d[0], c + d[1]), tileKey(...P), 'the partner is in front');
    assert.equal(placeCopiers(h.m, ps), 0, 'already paired: no move');
  } finally { h.m.dispose(); }
});

test('carry-iso puts a loose Isomorph and an Alliance item on the main attacker, from fromRound on', async () => {
  const { CARRY_ISO } = await import('../../server/match/botTacticsResearch.js');
  const { carryAndFocus } = await import('../../server/match/bot.js');
  const { tileKey, inField } = await import('../../server/match/board.js');
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(4);
    const ps = h.m.order[0];
    ps.ready = false;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const gd = h.m.gd;
    const carry = ps.newPiece('chess', 'chess_char_1_07_a');
    const tiles = [];
    for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(carry, r, c)) tiles.push([r, c]);
    ps.board.set(tileKey(...tiles[0]), carry);
    ps.hand.fill(null);
    const iso = ps.newPiece('item', 'chess_item_6_09_e_a'), vic = ps.newPiece('item', 'chess_item_1_01_e_a');
    ps.hand[0] = iso; ps.hand[1] = vic;
    ps.recompute();
    ps.bonds = { ...ps.bonds, victoriaShip: { active: true, layers: 0 } };
    assert.equal(carryAndFocus(h.m, ps).carry, carry);
    const params = { ...resolveParams(CARRY_ISO), bond: 'any' };
    const run = (round) => CARRY_ISO.at.equipItems({ match: { ...h.m, round, gd, rules: h.m.rules }, player: ps, params, next: () => null });
    run(2);
    assert.equal((carry.items || []).length, 0, 'before fromRound: nothing');
    run(4);
    assert.deepEqual((carry.items || []).map((it) => it.id).sort(), ['chess_item_1_01_e_a', 'chess_item_6_09_e_a']);
    assert.ok(gd.item(iso.id).canGiveBond);
  } finally { h.m.dispose(); }
});

test('buy-minimalist buys every Minimalist shown; cycle sells him back at once, merge keeps a pair', async () => {
  const { BUY_MINIMALIST } = await import('../../server/match/botTacticsResearch.js');
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(3);
    const ps = h.m.order[0];
    ps.ready = false;
    const gd = h.m.gd, id = 'chess_char_3_13_a';
    const slot = () => ({ kind: 'chess', id, basePrice: gd.chessPrice(id), frozen: false, sold: false });
    const count = () => ps.allChess().filter((q) => gd.baseIdOf(q.id) === id).length;
    const run = (mode) => {
      const gen = BUY_MINIMALIST.at.buyLoopSteps({ match: h.m, player: ps, params: { ...resolveParams(BUY_MINIMALIST), mode }, args: [{}], next: function* () {} });
      for (let g = gen.next(); !g.done; g = gen.next());
    };
    ps.hand.fill(null);
    ps.funds = 10;
    ps.shop.slots[0] = slot(); ps.shop.slots[1] = slot();
    assert.equal(ps.priceOf(ps.shop.slots[0]), 1, 'Minimalist costs 1');
    run('cycle');
    assert.equal(count(), 0, 'cycle: both sold back');
    assert.equal(ps.funds, 10, 'cycle: no funds lost');
    ps.shop.slots[0] = slot(); ps.shop.slots[1] = slot();
    run('merge');
    assert.equal(count(), 2, 'merge: a pair kept');
  } finally { h.m.dispose(); }
});

test('place-ammo moves Mostima next to a deployed ammo user, keeping her facing', async () => {
  const { placeAmmo } = await import('../../server/match/botTacticsResearch.js');
  const { tileKey, parseKey, inField } = await import('../../server/match/board.js');
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(2);
    const ps = h.m.order[0];
    ps.ready = false;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const most = ps.newPiece('chess', 'chess_char_4_02_a'), gun = ps.newPiece('chess', 'chess_char_4_01_a');
    assert.equal(h.m.gd.chess(gun.id).skill.durationType, 'AMMO');
    const tiles = [];
    for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(most, r, c) && ps._legal(gun, r, c)) tiles.push([r, c]);
    const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
    const G = tiles.find((t) => tiles.some((u) => near(t, u)));
    const far = tiles.find((t) => Math.abs(t[0] - G[0]) + Math.abs(t[1] - G[1]) > 2);
    assert.ok(G && far, 'the deploy map has the tiles');
    ps.board.set(tileKey(...G), gun);
    most.dir = 'LEFT';
    ps.board.set(tileKey(...far), most);
    ps.recompute();
    assert.equal(placeAmmo(h.m, ps), 1);
    const at = parseKey([...ps.board].find(([, q]) => q === most)[0]);
    assert.ok(near(at, G), 'next to the ammo user');
    assert.equal(ps.board.get(tileKey(...G)), gun, 'the ammo user stays');
    assert.equal((await import('../../server/match/board.js')).pieceDir(most), 'LEFT', 'facing kept');
    assert.equal(placeAmmo(h.m, ps), 0, 'already beside one: no move');
  } finally { h.m.dispose(); }
});

test('diy-picks: Ascalon takes a tier-6 slot, and while she is owned the Nevermeltice goes into the item plan', async () => {
  const { DIY_PICKS } = await import('../../server/match/botTacticsResearch.js');
  const bot = profileFromData({ id: 't-diy-ascalon', tactics: [{ tactic: 'diy-picks', params: { t6a: 'ascalon' } }] });
  const h = soloBot({ botStrategy: bot, seed: 7 });
  try {
    h.start();
    const ps = h.m.order[0];
    assert.equal(ps.diy?.chess_char_6_diy1_a?.charId, 'char_4132_ascln', JSON.stringify(ps.diy));
    h.toPrep(3);
    const run = () => DIY_PICKS.at.sellJunk({ match: h.m, player: ps, params: resolveParams(DIY_PICKS, { t6a: 'ascalon' }), next: () => null });
    ps._botSelf = null; run();
    assert.ok(!(ps._botSelf?.plan?.items?.buy || []).includes('chess_item_5_02_e_a'), 'not before she is owned');
    const her = ps.newPiece('chess', 'chess_char_6_diy1_a');
    ps.hand[ps.hand.findIndex((x) => !x)] = her;
    ps._botSelf = null; run();
    assert.ok(ps._botSelf.plan.items.buy.includes('chess_item_5_02_e_a'));
  } finally { h.m.dispose(); }
});

test('legacy equipItems leaves an item the plan holds (items.hold) in the hand', async () => {
  const { equipItems } = await import('../../server/match/bot.js');
  const { tileKey, inField } = await import('../../server/match/board.js');
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(6);
    const ps = h.m.order[0];
    ps.ready = false;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const carry = ps.newPiece('chess', 'chess_char_1_07_a');
    let t = null;
    for (let r = -5; r <= 20 && !t; r++) for (let c = -5; c <= 20 && !t; c++) if (inField(r, c) && ps._legal(carry, r, c)) t = [r, c];
    ps.board.set(tileKey(...t), carry);
    ps.hand.fill(null);
    const iso = ps.newPiece('item', 'chess_item_6_09_e_a');
    ps.hand[0] = iso;
    ps.recompute();
    ps._botSelf = { round: h.m.round, plan: Object.freeze({ items: Object.freeze({ hold: Object.freeze([iso.id]) }) }) };
    equipItems(h.m, ps);
    assert.equal(ps.hand[0], iso, 'held');
    ps._botSelf = null;
    equipItems(h.m, ps);
    assert.notEqual(ps.hand[0], iso, 'without the hold, legacy equips it');
  } finally { h.m.dispose(); }
});

test('carry-iso order either: the Isomorph goes on first, the Alliance item later joins the same carry; hold waits', async () => {
  const { CARRY_ISO, equipCarry } = await import('../../server/match/botTacticsResearch.js');
  const { tileKey, inField } = await import('../../server/match/board.js');
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(4);
    const ps = h.m.order[0];
    ps.ready = false;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const carry = ps.newPiece('chess', 'chess_char_1_07_a');
    const tiles = [];
    for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(carry, r, c)) tiles.push([r, c]);
    ps.board.set(tileKey(...tiles[0]), carry);
    ps.hand.fill(null);
    const iso = ps.newPiece('item', 'chess_item_6_09_e_a');
    ps.hand[0] = iso;
    ps.recompute();
    const params = (o) => ({ ...resolveParams(CARRY_ISO), bond: 'any', ...o });
    assert.equal(equipCarry(h.m, ps, params({ order: 'hold' })), 0, 'hold: a lone Isomorph waits');
    assert.equal(equipCarry(h.m, ps, params()), 1, 'either: it goes on now');
    assert.deepEqual((carry.items || []).map((it) => it.id), ['chess_item_6_09_e_a']);
    // a stronger attacker arrives; the item still joins the planned carry
    const big = ps.newPiece('chess', 'chess_char_6_13_a');
    const t2 = tiles.find((t) => ps._legal(big, t[0], t[1]) && !ps.board.has(tileKey(...t)));
    ps.board.set(tileKey(...t2), big);
    const vic = ps.newPiece('item', 'chess_item_1_01_e_a');
    ps.hand[1] = vic;
    ps.recompute();
    ps.bonds = { ...ps.bonds, victoriaShip: { active: true, layers: 0 } };
    assert.equal(equipCarry(h.m, ps, params()), 1);
    assert.deepEqual((carry.items || []).map((it) => it.id).sort(), ['chess_item_1_01_e_a', 'chess_item_6_09_e_a']);
    assert.equal((big.items || []).length, 0);
    assert.equal(equipCarry(h.m, ps, params()), 0, 'done: both worn');
  } finally { h.m.dispose(); }
});

test('place-civilight puts Civilight Eterna behind Mostima, facing her; place-fartooth makes Degenbrecher the rightmost of her row', async () => {
  const { placeCivilight, placeFartooth } = await import('../../server/match/botTacticsResearch.js');
  const { tileKey, parseKey, inField, pieceDir } = await import('../../server/match/board.js');
  const DIRS = { UP: [-1, 0], RIGHT: [0, 1], DOWN: [1, 0], LEFT: [0, -1] };
  const h = soloBot({ seed: 5 });
  try {
    h.start();
    h.toPrep(2);
    const ps = h.m.order[0];
    ps.ready = false;
    for (const [k] of [...ps.board]) ps.board.delete(k);
    const most = ps.newPiece('chess', 'chess_char_4_02_a'), civ = ps.newPiece('chess', 'chess_char_4_25_a');
    const tiles = [];
    for (let r = -5; r <= 20; r++) for (let c = -5; c <= 20; c++) if (inField(r, c) && ps._legal(most, r, c) && ps._legal(civ, r, c)) tiles.push([r, c]);
    const M = tiles.find(([r, c]) => tiles.some(([r2, c2]) => Math.abs(r - r2) + Math.abs(c - c2) === 1));
    const far = tiles.find(([r, c]) => Math.abs(r - M[0]) + Math.abs(c - M[1]) > 2);
    ps.board.set(tileKey(...M), most);
    ps.board.set(tileKey(...far), civ);
    ps.recompute();
    assert.equal(placeCivilight(h.m, ps), 1);
    const [cr, cc] = parseKey([...ps.board].find(([, q]) => q === civ)[0]);
    const [dr, dc] = DIRS[pieceDir(civ)];
    assert.deepEqual([cr + dr, cc + dc], M, 'Mostima is in front of her');
    assert.equal(placeCivilight(h.m, ps), 0, 'already behind her');

    for (const [k] of [...ps.board]) ps.board.delete(k);
    const ft = ps.newPiece('chess', 'chess_char_4_20_a'), dg = ps.newPiece('chess', 'chess_char_6_19_a'), other = ps.newPiece('chess', 'chess_char_1_03_a');
    const ok3 = (r, c) => inField(r, c) && ps._legal(ft, r, c) && ps._legal(dg, r, c) && ps._legal(other, r, c);
    let row = null;
    for (let r = -5; r <= 20 && row == null; r++) { const cs = []; for (let c = -5; c <= 20; c++) if (ok3(r, c)) cs.push(c); if (cs.length >= 4) row = { r, cs }; }
    assert.ok(row, 'a row with 4 tiles');
    const elsewhere = tiles.find(([r]) => r !== row.r && ps._legal(dg, ...[r, tiles.find((t) => t[0] === r)[1]]));
    ps.board.set(tileKey(row.r, row.cs[0]), ft);
    ps.board.set(tileKey(row.r, row.cs[row.cs.length - 1]), other);
    ps.board.set(tileKey(...(elsewhere || [row.r, row.cs[1]])), dg);
    ps.recompute();
    placeFartooth(h.m, ps);
    const inRow = [...ps.board].filter(([k, q]) => q.kind === 'chess' && parseKey(k)[0] === row.r).sort(([a], [b]) => parseKey(b)[1] - parseKey(a)[1]);
    assert.equal(inRow[0][1], dg, `Degenbrecher rightmost of row ${row.r}`);
  } finally { h.m.dispose(); }
});

test('diy-picks: while Ascalon is owned without a Nevermeltice, Kjera (who brings one) goes into the buy plan', async () => {
  const { DIY_PICKS } = await import('../../server/match/botTacticsResearch.js');
  const bot = profileFromData({ id: 't-diy-kjera', tactics: [{ tactic: 'diy-picks', params: { t5a: 'ascalon' } }] });
  const h = soloBot({ botStrategy: bot, seed: 7 });
  try {
    h.start();
    const ps = h.m.order[0];
    assert.equal(ps.diy?.chess_char_5_diy1_a?.charId, 'char_4132_ascln', 'Ascalon on tier 5');
    h.toPrep(3);
    ps.ready = false;
    assert.ok(ps.acquireChess('chess_char_5_diy1_a', { source: 'test' }));
    ps._botSelf = null;
    DIY_PICKS.at.sellJunk({ match: h.m, player: ps, params: resolveParams(DIY_PICKS, { t5a: 'ascalon' }), next: () => null });
    assert.ok(ps._botSelf.plan.buy.includes('chess_char_3_20_a') && ps._botSelf.plan.buy.includes('chess_char_4_03_a'), JSON.stringify(ps._botSelf.plan.buy));
  } finally { h.m.dispose(); }
});
