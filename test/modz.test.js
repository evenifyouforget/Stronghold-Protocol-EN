// test/modz.test.js — (Fish Edition) Mod Z / W draft (shared/modZ.js, server/sim/content/modZ.js, the `modZ` cheat rule).
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { MODZ, modZOf, withModZ } from '../shared/modZ.js';
import { MODZ_INSTALLED, typhonBalance, zuoleDouble } from '../server/sim/content/modZ.js';
import { modZRulePicks, diyRecord, checkDiyPick, hasModZ } from '../shared/diy.js';
import { unitForm } from '../shared/standIn.js';
import { getDefaultSource } from '../server/sim/simdata.js';
import { RULES, isRuleValue, normalizeRules, ruleSet } from '../shared/rules.js';
import { makeBattle, enemyRec } from './helpers/battleHarness.js';

const ds = getDefaultSource();
const backups = ds.rawBackups();
const data = { backups, chess: JSON.parse(readFileSync(new URL('../data/chess.json', import.meta.url), 'utf8')) };

test('every Mod Z / W has battle effects, a unique id and an operator in the custom pool', () => {
  assert.deepEqual([...MODZ_INSTALLED].sort(), MODZ.map((m) => m.id).sort());
  assert.equal(new Set(MODZ.map((m) => m.id)).size, MODZ.length);
  for (const m of MODZ) {
    assert.ok(backups.units[m.charId], m.charId);
    assert.equal(modZOf(m.id), m);
  }
  const rule = RULES.find((r) => r.key === 'modZ');
  assert.equal(rule.category, 'cheat');
  assert.deepEqual(rule.options, MODZ.map((m) => m.id), 'one option per module');
  assert.ok(isRuleValue('modZ', ['uniequip_fishz_weedy']) && !isRuleValue('modZ', ['uniequip_002_siege']) && !isRuleValue('modZ', true));
  assert.ok(!isRuleValue('modZ', ['uniequip_fishz_typhon', 'uniequip_fishw_typhon']), 'one module per operator');
  assert.deepEqual(normalizeRules({ modZ: ['uniequip_fishw_typhon', 'uniequip_fishz_typhon'] }).modZ, ['uniequip_fishz_typhon'], 'the first in order is kept');
  assert.deepEqual(normalizeRules({ modZ: ['uniequip_fishz_weedy', 'bogus', 'uniequip_fishz_typhon'] }).modZ, ['uniequip_fishz_typhon', 'uniequip_fishz_weedy']);
  assert.ok(ruleSet('modZ', ['uniequip_fishz_weedy']) && !ruleSet('modZ', []));
});

test('withModZ appends to the elite forms only (forms with modules); the players\' lists never show them', () => {
  for (const m of MODZ) {
    assert.ok(hasModZ(m.charId), `${m.charId}: the "Mod Z available" tag`);
    for (const form of Object.values(backups.units[m.charId].forms)) {
      const out = withModZ(m.charId, form);
      if (!form.modules?.length) { assert.equal(out, form); continue; }
      assert.ok(out.modules.some((x) => x.uniEquipId === m.id && x.fishModZ === m.kind));
      assert.ok(!(form.modules ?? []).some((x) => x.fishModZ), 'the data form is untouched');
    }
  }
  const slot = backups.diy.slots[Object.keys(backups.diy.slots).find((id) => backups.diy.slots[id].tier === 6)];
  const elite = unitForm(backups, 'char_2012_typhon', data.chess[slot.goldenId].status);
  assert.ok(elite.modules.length > 0 && !elite.modules.some((x) => x.fishModZ), 'unitForm (the picker) has no Mod Z / W');
});

test('the lobby rule equips the module: every pick of that operator fields it, others keep theirs', () => {
  const slot = Object.keys(backups.diy.slots).find((id) => backups.diy.slots[id].tier === 6);
  const slot2 = Object.keys(backups.diy.slots).filter((id) => backups.diy.slots[id].tier === 6)[1];
  const hel = { charId: 'char_188_helage', skillIndex: 2, uniEquipId: 'uniequip_002_helage' };
  const siege = { charId: 'char_112_siege', skillIndex: 2, uniEquipId: null };
  const picks = { [slot]: hel, [slot2]: siege };
  assert.equal(modZRulePicks(picks, {}, data), picks, 'no rule: unchanged');
  const on = modZRulePicks(picks, { modZ: ['uniequip_fishz_helage', 'uniequip_fishz_siege'] }, data);
  assert.deepEqual(on[slot], { ...hel, uniEquipId: 'uniequip_fishz_helage' }, 'replaces the chosen module');
  assert.deepEqual(on[slot2], { ...siege, uniEquipId: 'uniequip_fishz_siege' }, 'and "no module" too');
  const only = modZRulePicks(picks, { modZ: ['uniequip_fishz_siege'] }, data);
  assert.equal(only[slot], hel, 'an operator without its module on is untouched');
  const stale = modZRulePicks({ [slot]: { ...hel, uniEquipId: 'uniequip_fishz_helage' } }, {}, data)[slot];
  assert.ok(stale.uniEquipId === null || /^uniequip_\d{3}_/.test(stale.uniEquipId), `a stale Mod Z pick falls back: ${stale.uniEquipId}`);
  assert.ok('ok' in checkDiyPick(slot, on[slot], data), 'the equipped pick is legal');
  const rec = diyRecord(slot, on[slot], { elite: true, data });
  assert.equal(rec.module.id, 'uniequip_fishz_helage');
  assert.ok(rec.module.active && rec.bonds.includes('raidShip'), 'Hellagur Z grants Raid');
  assert.ok(!diyRecord(slot, on[slot], { elite: false, data }).bonds.includes('raidShip'), 'only on the elite');
});

test('battle smoke: every Mod Z / W fights 60 s without a handler error', () => {
  const DEFS = { enemies: { enemy_walk: enemyRec({ key: 'enemy_walk', hp: 9000, atk: 300, def: 200, res: 20, speed: 0.4 }) } };
  for (const m of MODZ) {
    const h = makeBattle({ seed: 3, defs: DEFS, autoFinish: false, timeLimit: 60, hooks: [],
      units: [{ diy: { slot: 6, charId: m.charId, skillIndex: 2, uniEquipId: m.id }, elite: true, row: 9, col: 4, dir: 'RIGHT' }],
      enemies: [{ key: 'enemy_walk', time: 1, count: 20, interval: 1.5 }] });
    assert.equal(h.b.allyUnits[0].def.raw.module?.id, m.id);
    h.run(60);
    assert.deepEqual(h.b.errors.map((e) => `${e.label}: ${e.message}`), [], m.id);
  }
});

test('Saileach Z: block 0, Invisible, allied redeploy timers +50 %', () => {
  const h = makeBattle({ seed: 3, autoFinish: false, timeLimit: 60, hooks: [],
    units: [{ diy: { slot: 6, charId: 'char_479_sleach', skillIndex: 0, uniEquipId: 'uniequip_fishz_sleach' }, elite: true, row: 9, col: 4, dir: 'RIGHT' },
      { diy: { slot: 6, charId: 'char_293_thorns', skillIndex: 0, uniEquipId: null }, elite: true, row: 9, col: 5, dir: 'RIGHT' }] });
  h.step();
  const [s, t] = h.b.allyUnits.filter((a) => a.kind === 'op');
  assert.equal(s.s.blockCnt, 0);
  assert.equal(s.s.flags.stealth, true);
  h.b.retreat(t);
  const left = t.respawnAt - h.b.time;
  h.run(4);
  assert.ok(Math.abs((t.respawnAt - h.b.time) - (left - 6)) < 0.2, `${t.respawnAt - h.b.time} vs ${left - 6}`);
});

test('in a match: the lobby rule equips Mod Z on a player\'s pick, without it the pick stays as chosen', async () => {
  const { makeMatch } = await import('./match/harness.js');
  const slot = Object.keys(backups.diy.slots).find((id) => backups.diy.slots[id].tier === 6);
  const pick = { charId: 'char_188_helage', skillIndex: 2, uniEquipId: 'uniequip_002_helage' };
  for (const [modZ, want] of [[['uniequip_fishz_helage'], 'uniequip_fishz_helage'], [[], 'uniequip_002_helage']]) {
    const h = makeMatch({ mode: 'solo', seed: 21, lobbyRules: { modZ } }).start();
    h.toPrep(1);
    const p0 = h.ps('p_0');
    assert.equal(p0.setDiy({ [slot]: pick }), true);
    assert.equal(p0.diy[slot].uniEquipId, want);
    const golden = backups.diy.slots[slot].goldenId;
    assert.equal(p0.gd.chess(golden)?.module?.id ?? null, want, 'the elite record carries it');
  }
});

test('Typhon Z balances ATK % and ASPD both ways (ASPD share at most +500); Zuo Le Z doubles buffed ATK', () => {
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  let r = typhonBalance({ atk: 1500, aspd: 100, baseAtk: 1000, baseAspd: 100 });   // +50 % ATK → +25 % / +25
  assert.ok(near(r.atk, 1250) && near(r.aspd, 125), JSON.stringify(r));
  r = typhonBalance({ atk: 1000, aspd: 200, baseAtk: 1000, baseAspd: 100 });         // +100 ASPD → +50 % / +50
  assert.ok(near(r.atk, 1500) && near(r.aspd, 150), JSON.stringify(r));
  r = typhonBalance({ atk: 13000, aspd: 100, baseAtk: 1000, baseAspd: 100 });        // +1200 % → ASPD +500, ATK +700 %
  assert.ok(near(r.atk, 8000) && near(r.aspd, 600), JSON.stringify(r));
  r = zuoleDouble({ atk: 1300, aspd: 100, baseAtk: 1000 });
  assert.equal(r.atk, 1600);
  assert.equal(zuoleDouble({ atk: 800, aspd: 100, baseAtk: 1000 }).atk, 800, 'a debuff is not doubled');
});

test('Typhon Z in battle: ATK and ASPD bonuses end up equal', () => {
  const h = makeBattle({ seed: 3, autoFinish: false, timeLimit: 30, hooks: [],
    units: [{ diy: { slot: 6, charId: 'char_2012_typhon', skillIndex: 0, uniEquipId: 'uniequip_fishz_typhon' }, elite: true, row: 9, col: 4, dir: 'RIGHT' }] });
  h.step();
  const u = h.b.allyUnits[0];
  h.b.addBuff(u, { key: 'test:atk', mods: { atkPct: 0.6 } });
  h.run(12);
  const atkPct = (u.s.atk / (u.base.atk * (u.cultMul?.atk ?? 1)) - 1) * 100;
  assert.ok(Math.abs(atkPct - (u.s.aspd - u.base.aspd)) < 0.5, `ATK +${atkPct} %, ASPD +${u.s.aspd - u.base.aspd}`);
  assert.ok(Math.abs(atkPct - 80) < 0.5, `+60 % ATK and +100 ASPD → +80 / +80 (got ${atkPct})`);
});

test('Zuo Le Z: one more skill charge; Viviana Z: the RES shred stays after she falls', () => {
  const DEFS = { enemies: { enemy_walk: enemyRec({ key: 'enemy_walk', hp: 90000, atk: 0, def: 0, res: 20, speed: 0.1 }) } };
  const h = makeBattle({ seed: 3, defs: DEFS, autoFinish: false, timeLimit: 60, hooks: [],
    units: [{ diy: { slot: 6, charId: 'char_4121_zuole', skillIndex: 2, uniEquipId: 'uniequip_fishz_zuole' }, elite: true, row: 9, col: 4, dir: 'RIGHT' },
      { diy: { slot: 6, charId: 'char_4098_vvana', skillIndex: 2, uniEquipId: 'uniequip_fishz_vvana' }, elite: true, row: 9, col: 6, dir: 'RIGHT' }],
    enemies: [{ key: 'enemy_walk', time: 1, count: 3, interval: 1 }] });
  h.step();
  const [z, v] = h.b.allyUnits.filter((a) => a.kind === 'op');
  const base = makeBattle({ seed: 3, autoFinish: false, timeLimit: 5, hooks: [],
    units: [{ diy: { slot: 6, charId: 'char_4121_zuole', skillIndex: 2, uniEquipId: null }, elite: true, row: 9, col: 4, dir: 'RIGHT' }] });
  base.step();
  assert.equal(z.skill.maxCharges, base.b.allyUnits[0].skill.maxCharges + 1);
  h.run(3);
  const e = h.b.aliveEnemies()[0];
  assert.ok(e, 'an enemy on the field');
  h.b.dealElementDamage({ source: v, target: e, element: 'burn', amount: 99999 });
  assert.equal(e.findBuff('fishModZ:vvanaRes')?.mods?.resFlat, -2);
  h.b.retreat(v, { dying: true });
  assert.equal(e.findBuff('fishModZ:vvanaRes')?.mods?.resFlat, -2, 'kept after she falls');
  h.run(20);
  assert.deepEqual(h.b.errors.map((x) => `${x.label}: ${x.message}`), []);
});
