// test/match/rebalance.test.js — the rebalanced alliances of the Custom Lobby Modifications (shared/rules.js
// virtuosaBonds / blaze; shared/ruleData.js): 塑心 also in 迅捷 and 助力; 煌 in 凯瑟琳's shop slot (her tier, price, skill
// slot and module, Blaze's body and kit, 炎 + 维多利亚, "<售出时>获得1名【烛煌】"). The match changes only its own records;
// a battle built from a spec carrying the rules (the browser's) fields the same operators (sim/simdata.js withRuleData).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMatch } from './harness.js';
import { ruleDataPatch, BLAZE, VIRTUOSA } from '../../shared/ruleData.js';
import { buildBattleSpec, createBattleFromSpec } from '../../server/sim/spec.js';
import { getDefaultSource, withRuleData } from '../../server/sim/simdata.js';
import { kitOf } from '../../server/sim/content/index.js';
import { KITS } from '../../server/sim/content/kits/index.js';

const BOTH = { blaze: true, virtuosaBonds: true };

test('the match\'s records change; a match without the rules (and the shared data) keep the original ones', () => {
  const h = makeMatch({ mode: 'solo', seed: 3, rules: BOTH });
  const plain = makeMatch({ mode: 'solo', seed: 3 });
  try {
    const blaze = h.m.gd.chess(BLAZE.slot.a), cath = plain.m.gd.chess(BLAZE.slot.a);
    assert.equal(blaze.charId, BLAZE.charId);
    assert.deepEqual(blaze.bonds, BLAZE.bonds);
    assert.equal(blaze.tier, cath.tier);
    assert.equal(blaze.price, cath.price);
    assert.deepEqual(blaze.status, cath.status, 'her training status');
    assert.deepEqual(blaze.garrisonIds, [BLAZE.garrison.a]);
    assert.equal(h.m.gd.garrison(BLAZE.garrison.a).eventType, 'SERVER_CHESS_SOLD');
    assert.equal(cath.charId, 'char_4162_cathy', 'the other match still has 凯瑟琳');
    assert.deepEqual(h.m.gd.chess(VIRTUOSA.ids[0]).bonds, VIRTUOSA.bonds);
    assert.deepEqual(plain.m.gd.chess(VIRTUOSA.ids[0]).bonds, ['lateranoShip']);
    // only one of the two rules: only its records
    const only = ruleDataPatch(h.m.data, { blaze: false, virtuosaBonds: true });
    assert.deepEqual(Object.keys(only.chess).sort(), [...VIRTUOSA.ids].sort());
    assert.deepEqual(Object.keys(only.garrisons), []);
  } finally { h.m.dispose(); plain.m.dispose(); }
});

test('selling 煌 gives one 烛煌; an elite 煌 an elite one', () => {
  for (const form of ['a', 'b']) {
    const h = makeMatch({ mode: 'solo', seed: 5, rules: { blaze: true } }).start();
    try {
      h.toPrep(1);
      const ps = h.ps('p_0');
      const piece = ps.acquireChess(BLAZE.slot[form], { source: 'test', fromPool: false });
      assert.ok(piece, 'got 煌');
      assert.deepEqual(ps.sell(piece.uid), { ok: true });
      const ids = [...ps.hand, ...ps.temp].filter(Boolean).map((p) => p.id);
      assert.ok(ids.includes(BLAZE.product[form]), `${form}: ${ids.join(', ')}`);
    } finally { h.m.dispose(); }
  }
});

test('a battle from a spec with the rules fields Blaze (her body, S2, her own kit) and 塑心 in three alliances', () => {
  const spec = buildBattleSpec({
    battleId: 'r', fieldId: 'n:p', kind: 'normal', round: 3, stageId: 'act2autochess_m01', timeLimit: 60,
    players: [{ playerId: 'p', units: [
      { uid: 1, kind: 'chess', chessId: BLAZE.slot.a, row: 10, col: 3 },
      { uid: 2, kind: 'chess', chessId: VIRTUOSA.ids[0], row: 10, col: 5 },
    ] }],
    spawns: [], flags: { layerGainsEnabled: true, rules: BOTH },
  });
  const b = createBattleFromSpec(spec);
  const [blaze, virt] = [1, 2].map((uid) => b.units.find((u) => u.uid === uid));
  assert.equal(blaze.def.charId, BLAZE.charId);
  assert.equal(blaze.def.skill?.id ?? blaze.def.skill?.skillId, 'skchr_huang_2');
  assert.equal(kitOf(blaze.def, KITS), KITS[BLAZE.charId], 'Blaze\'s kit, not 凯瑟琳\'s');
  assert.deepEqual([...virt.def.bonds], VIRTUOSA.bonds);
  // the same view without the rules is the plain source
  assert.equal(withRuleData(getDefaultSource(), { blaze: false, virtuosaBonds: false }), getDefaultSource());
  const plain = createBattleFromSpec({ ...spec, flags: { layerGainsEnabled: true } });
  assert.equal(plain.units.find((u) => u.uid === 1).def.charId, 'char_4162_cathy');
});
