// test/sim/risk-tags.test.js — the battle side of the SPA-CC Risk tags (server/sim/content/risk.js, the Swift override in
// content/bonds/addon/battle.js): 远见 operators −20 ASPD whether 远见 is active or not, slower time SP, leaders' damage
// reduction outside a burst, the final bosses' ATK, 迅捷's chance per stack. Rules arrive in BattleSpec flags.rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBattle, enemyRec } from '../helpers/battleHarness.js';
import { isLeaderEnemy } from '../../server/sim/content/risk.js';
import { CC } from '../../shared/ruleData.js';

const DEFS = { enemies: { enemy_dummy: enemyRec({ key: 'enemy_dummy', hp: 1e7, speed: 0 }) } };
const battle = (rules, units, enemies = [{ key: 'enemy_dummy', pos: [10, 7] }], bonds = undefined) => {
  const h = makeBattle({ defs: DEFS, autoFinish: false, timeLimit: 100, seed: 2, units, enemies, bonds, flags: { rules } });
  h.step(1);
  return h;
};

test('远见 operators −20 ASPD with the tag, even with 远见 inactive; others unchanged', () => {
  // 风笛 is 维多利亚 / 远见 / 不屈; 远见 needs 2 members to activate and she is alone
  const on = battle({ ccForesight: 1 }, [{ chessId: 'chess_char_4_07_a', row: 10, col: 3 }]);
  const off = battle({}, [{ chessId: 'chess_char_4_07_a', row: 10, col: 3 }]);
  assert.equal(on.allies()[0].s.aspd - off.allies()[0].s.aspd, CC.foresightAspd);
  const other = battle({ ccForesight: 1 }, [{ chessId: 'chess_char_3_08_a', row: 10, col: 3 }]);
  assert.ok(!other.allies()[0].buffs.some((b) => b.key === 'risk:foresight'), '薄绿 is not 远见');
});

test('time SP recovers 0.2 / 0.5 / 0.8 SP/s slower per level', () => {
  const rec = (lv) => battle({ ccSpRecovery: lv }, [{ chessId: 'chess_char_3_08_a', row: 10, col: 3 }]).allies()[0].s.spRecovery;
  const base = rec(0);
  for (const lv of [1, 2, 3]) assert.ok(Math.abs(base - rec(lv) - CC.spRecovery[lv]) < 1e-9, `level ${lv}`);
});

test('leaders take 50 / 90 % less Physical and Arts damage, not True damage, and none while under a burst', () => {
  const h = battle({ ccLeaderDr: 2 }, [{ chessId: 'chess_char_3_08_a', row: 10, col: 3 }], [{ key: 'enemy_1535_wlfmster', pos: [10, 7] }]);
  const zaaro = h.enemies()[0];
  assert.equal(isLeaderEnemy(zaaro), true);
  const hit = (type) => { const c = { target: zaaro, dmg: { type, mul: 1 } }; h.b.emit('hit', c); return c.dmg.mul; };
  assert.ok(Math.abs(hit('phys') - 0.1) < 1e-9);
  assert.ok(Math.abs(hit('arts') - 0.1) < 1e-9);
  assert.equal(hit('true'), 1);
  h.b.addBuff(zaaro, { key: 'test:burst', duration: 5, flags: { burstLock: true } });
  assert.equal(hit('phys'), 1, 'under a burst');
  const plain = battle({ ccLeaderDr: 2 }, [{ chessId: 'chess_char_3_08_a', row: 10, col: 3 }]);
  assert.equal(isLeaderEnemy(plain.enemies()[0]), false, 'an ordinary enemy');
});

test('迅捷 at 100 stacks: 20 + 0.25 × stacks % with the tag (55 % → 45 %), fixed seeds', () => {
  // 异客 is a 迅捷 member; each skill end rolls the chance once (40+ stacks: a second roll for the power part)
  const procs = (rules) => {
    let n = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const h = makeBattle({ defs: DEFS, autoFinish: false, timeLimit: 100, seed, units: [{ chessId: 'chess_char_6_05_a', row: 10, col: 3 }],
        enemies: [{ key: 'enemy_dummy', pos: [10, 7] }], bonds: { swiftShip: { count: 2, active: true, tier: 1, layers: 100 } }, flags: { rules } });
      h.step(1);
      const u = h.allies()[0];
      h.b.on('spGain', (c) => { if (c.unit === u && c.reason === 'bond') n++; });
      h.b.emit('skillEnd', { unit: u, skill: u.skill, reason: 'end' });
    }
    return n / 240;
  };
  const base = procs({}), nerf = procs({ ccSwift: 1 });
  assert.ok(Math.abs(base - 0.55) < 0.08, `base ${base}`);
  assert.ok(Math.abs(nerf - 0.45) < 0.08, `nerf ${nerf}`);
  assert.ok(nerf < base);
});
