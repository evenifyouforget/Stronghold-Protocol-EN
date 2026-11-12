// test/modz.test.js — (Fish Edition) Mod Z / W draft (shared/modZ.js, server/sim/content/modZ.js, the `modZ` cheat rule).
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { MODZ, modZOf, withModZ } from '../shared/modZ.js';
import { MODZ_INSTALLED } from '../server/sim/content/modZ.js';
import { modZFallbackPicks, diyRecord } from '../shared/diy.js';
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
  assert.deepEqual(normalizeRules({ modZ: ['uniequip_fishz_weedy', 'bogus', 'uniequip_fishz_typhon'] }).modZ, ['uniequip_fishz_typhon', 'uniequip_fishz_weedy']);
  assert.ok(ruleSet('modZ', ['uniequip_fishz_weedy']) && !ruleSet('modZ', []));
});

test('withModZ appends to the elite forms only (forms with modules)', () => {
  for (const m of MODZ) {
    for (const form of Object.values(backups.units[m.charId].forms)) {
      const out = withModZ(m.charId, form);
      if (!form.modules?.length) { assert.equal(out, form); continue; }
      assert.equal(out.modules.length, form.modules.length + MODZ.filter((x) => x.charId === m.charId).length);
      assert.ok(out.modules.some((x) => x.uniEquipId === m.id && x.fishModZ === m.kind));
    }
  }
});

test('the rule is per module: a Mod Z pick the room does not allow falls back to an official module', () => {
  const slot = Object.keys(backups.diy.slots).find((id) => backups.diy.slots[id].tier === 6);
  const pick = { charId: 'char_188_helage', skillIndex: 2, uniEquipId: 'uniequip_fishz_helage' };
  const off = modZFallbackPicks({ [slot]: pick }, {}, data)[slot];
  assert.ok(off.uniEquipId === null || /^uniequip_\d{3}_/.test(off.uniEquipId), String(off.uniEquipId));
  assert.deepEqual(modZFallbackPicks({ [slot]: pick }, { modZ: ['uniequip_fishz_helage'] }, data)[slot], pick, 'allowed');
  const other = modZFallbackPicks({ [slot]: pick }, { modZ: ['uniequip_fishz_typhon'] }, data)[slot];
  assert.notEqual(other.uniEquipId, pick.uniEquipId, 'another operator\'s module allowed: this one falls back');
  const rec = diyRecord(slot, pick, { elite: true, data });
  assert.ok(rec.bonds.includes('raidShip'), 'Hellagur Z grants Raid');
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
