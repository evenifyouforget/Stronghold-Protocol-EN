// Mod Z / W v2: the stacks a module adds in battle are allowed by the server's check of a battle result
// (server/match/fields.js layerAllowanceOf; shared/modZ.js `layerAllow`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerAllowanceOf } from '../../server/match/fields.js';

const gd = { garrison: () => null, chess: () => ({ bonds: ['steadShip'], garrisonIds: [] }), bond: () => true };
const player = (uniEquipId) => ({ units: [{ kind: 'chess', chessId: 'chess_diy_x', diy: { charId: 'c', skillIndex: 0, uniEquipId } }], bonds: { steadShip: {}, kjeragShip: {} } });

test('Eunectes Z (+3 x 20), Phantom Z (+3 x 10), Siege W (50 Marvel) and Saileach W (no limit) add to the allowance', () => {
  assert.equal(layerAllowanceOf(player('uniequip_fishz_zumama'), gd).get('kjeragShip'), 60);
  assert.equal(layerAllowanceOf(player('uniequip_fishz_phatom'), gd).get('steadShip'), 30);
  assert.equal(layerAllowanceOf(player('uniequip_fishw_siege'), gd).get('miraShip'), 50);
  assert.equal(layerAllowanceOf(player('uniequip_fishw_sleach'), gd).get('kjeragShip'), Infinity);
});

test('a module without stack gains, an official module and no module add nothing', () => {
  for (const id of ['uniequip_fishz_typhon', 'uniequip_002_helage', null]) assert.equal(layerAllowanceOf(player(id), gd).size, 0, String(id));
});
