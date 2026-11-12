// server/sim/content/modZ.js — (Fish Edition) the battle effects of Mod Z / W (shared/modZ.js; Fish's designs in
// fish-edition/operator-mod-z/*.md). The stats and granted bonds come with the module record; everything else is here,
// installed per unit by Battle._setupUnit (battle/players.js) after the kit, keyed by the active module's id.
//
// DRAFT (2026-11-13): written for the code-compatibility check — every effect is wired with the engine's existing hooks
// and helpers, and each [DRAFT] note marks an approximation or a number Fish's text leaves open. Nothing here runs unless
// the room has the `modZ` rule (a pick naming a Mod Z / W is swapped for the first official module otherwise).

import { modZOf } from '../../../shared/modZ.js';
import { up, skillBusy, isMainHit, holdProtect, PROTECT_TICK_HOLD, enemyInRange } from './kits/shared/tier1.js';
import { installLordArtsAddition } from './kits/shared/lord.js';

const KEY = 'fishModZ';
const isBursting = (e) => e.buffs.some((b) => typeof b.key === 'string' && b.key.endsWith('Burst'));
/** ATK above base, as a fraction (0.25 = +25 %). */
const atkGain = (u) => (u.base.atk > 0 ? Math.max(0, u.s.atk / u.base.atk - 1) : 0);

/** Keep buff `key` on `unit` with `mods()` while `cond()` holds, re-evaluated every tick (mods may change). */
function liveBuff(battle, unit, key, cond, mods, extra = {}) {
  const check = () => {
    if (!up(unit) || !cond()) { if (unit.findBuff(key)) battle.removeBuff(unit, key); return; }
    const m = mods();
    const cur = unit.findBuff(key);
    if (cur && JSON.stringify(cur.mods) === JSON.stringify(m)) return;
    battle.addBuff(unit, { key, mods: m, tags: ['module'], ...extra });
  };
  battle.on('tick', check, { owner: unit });
  battle.on('battleStart', check, { owner: unit });
}

/** Extra natural SP recovery of `perSec()` per second (hooks the per-tick 'time' SP gain). */
function spTime(battle, unit, perSec) {
  battle.on('spGain', (ctx) => {
    if (ctx.unit !== unit || ctx.reason !== 'time') return;
    const v = perSec();
    if (v > 0) ctx.amount += v * battle.dt;
  }, { owner: unit });
}

/** Redeploy timers of `ownerId`'s waiting operators run `rate()` faster (+0.5 = +50 %) while `cond()` holds. */
function fasterRedeploy(battle, unit, rate, cond = () => up(unit)) {
  battle.on('tick', () => {
    if (!cond()) return;
    const r = rate();
    if (!(r > 0)) return;
    for (const a of battle.units) {
      if (a.kind !== 'op' || a.ownerId !== unit.ownerId || a.deployed || !(a.respawnAt > battle.time)) continue;
      a.respawnAt = Math.max(battle.time, a.respawnAt - r * battle.dt);
    }
  }, { owner: unit });
}

/** The skill index (0-based) the loadout picked. */
const skillIndex = (u) => {
  const i = u.def?.raw?.skill?.index ?? u.def?.loadout?.skillIndex;
  return Number.isInteger(i) ? i : null;
};

const INSTALL = {
  // ATK +1 % counts as ASPD +1; ASPD +100 from 10 s after each deployment
  uniequip_fishz_typhon(battle, u) {
    let since = Infinity;
    battle.on('deploy', (c) => { if (c.unit === u) since = battle.time; }, { owner: u });
    liveBuff(battle, u, `${KEY}:typhonZ`, () => true,
      () => ({ aspd: Math.round(atkGain(u) * 100) + (battle.time - since >= 10 ? 100 : 0) }));
  },

  // attacks inflict Cold; on a Frozen target, shatter every enemy within 1 tile: Freeze removed, Stun 4 s, physical
  // damage taken +40 % for 4 s. [DRAFT: Cold lasts 3 s — the text names no duration.]
  uniequip_fishw_typhon(battle, u) {
    battle.on('hit', (c) => {
      if (c.source !== u || c.target?.side !== 'enemy' || !isMainHit(c.dmg)) return;
      const t = c.target;
      if (!t.findBuff('freeze')) { battle.applyStatus(t, 'cold', { duration: 3, source: u }); return; }
      for (const e of battle.foesInRadius(t.x, t.y, 1)) {
        battle.removeStatus(e, 'freeze');
        battle.applyStatus(e, 'stun', { duration: 4, source: u });
        battle.addBuff(e, { key: `${KEY}:shatter`, duration: 4, mods: { physTakenMul: 1.4 }, source: u, tags: ['module'] });
      }
    }, { owner: u });
  },

  // enemies she damages are marked; at the end of a skill, 17 SP per marked enemy that fell during it
  uniequip_fishz_poca(battle, u) {
    const marked = new WeakSet();
    let during = false, fell = 0;
    battle.on('hit', (c) => { if (c.source === u && c.target?.side === 'enemy') marked.add(c.target); }, { owner: u });
    battle.on('skillStart', (c) => { if (c.unit === u) { during = true; fell = 0; } }, { owner: u });
    battle.on('death', (c) => { if (during && c.unit?.side === 'enemy' && marked.has(c.unit)) fell++; }, { owner: u });
    battle.on('skillEnd', (c) => {
      if (c.unit !== u) return;
      during = false;
      if (fell > 0 && u.skill && !u.skill.noSkill) u.skill.gainSp(17 * fell, 'module');
      fell = 0;
    }, { owner: u });
  },

  // 3×3 range; SP +1/s while an enemy is in range; skill start lures every enemy in range to her until it ends;
  // DEF + the ATK she gains (at most +5000)
  uniequip_fishz_zumama(battle, u) {
    u.rangeGrid = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]];
    if (u.deployed) battle._refreshRange(u);
    spTime(battle, u, () => (up(u) && !skillBusy(u) && enemyInRange(battle, u) ? 1 : 0));
    let lured = [];
    battle.on('skillStart', (c) => {
      if (c.unit !== u) return;
      lured = battle.enemiesInKeys(u.rangeKeys, u, { canHitFly: true });
      for (const e of lured) battle.applyStatus(e, 'attract', { duration: 60, source: u, point: { x: u.x, y: u.y } });
    }, { owner: u });
    battle.on('skillEnd', (c) => {
      if (c.unit !== u) return;
      for (const e of lured) if (e.alive) battle.removeStatus(e, 'attract');
      lured = [];
    }, { owner: u });
    liveBuff(battle, u, `${KEY}:zumama`, () => true, () => ({ defFlat: Math.min(5000, Math.max(0, Math.round(u.s.atk - u.base.atk))) }));
  },

  // every skill an ammo skill (18 / 3 / 100 attacks); during it, ASPD +50 and max HP +100 %
  uniequip_fishz_phenxi(battle, u) {
    const sk = u.skill;
    const i = skillIndex(u);
    const ammo = [18, 3, 100][i ?? -1];
    if (sk && !sk.noSkill && ammo && sk.kind !== 'passive') {
      sk.kind = 'ammo';
      sk.ammo = ammo;
      sk.duration = 0;   // no time cap: the skill ends when the ammo runs out [DRAFT]
    }
    liveBuff(battle, u, `${KEY}:phenxi`, () => !!(u.skill && u.skill.active), () => ({ aspd: 50, hpMul: 2 }));
  },

  // per attack: max HP +50 and 庇护 +1 % (80 stacks, kept through retreats); per deployment: one Waxing stack (10 at
  // most): healing received +20 %, ASPD +20, and Corrosion of 1 % ATK on each hit, per stack
  uniequip_fishz_helage(battle, u) {
    const p = (u.persist[KEY] ??= { stacks: 0, wax: 0 });
    const apply = () => {
      battle.addBuff(u, {
        key: `${KEY}:helage`, persist: true, allowDead: true, tags: ['module'],
        mods: { hpFlat: 50 * p.stacks, healingTakenMul: 1 + 0.2 * p.wax, aspd: 20 * p.wax },
      });
    };
    battle.on('attack', (c) => { if (c.attacker === u && p.stacks < 80) { p.stacks++; apply(); } }, { owner: u });
    battle.on('deploy', (c) => { if (c.unit === u && !c.move) { p.wax = Math.min(10, p.wax + 1); apply(); } }, { owner: u });
    battle.on('tick', () => { if (up(u) && p.stacks > 0) holdProtect(battle, u, p.stacks * 0.01, PROTECT_TICK_HOLD, u); }, { owner: u });
    battle.on('hit', (c) => {
      if (c.source !== u || c.target?.side !== 'enemy' || c.dmg.type === 'element' || !(p.wax > 0)) return;
      battle.dealElementDamage({ source: u, target: c.target, element: 'erosion', amount: u.s.atk * 0.01 * p.wax, tags: ['module'] });
    }, { owner: u });
  },

  // Raid treats his skill as ready (bonds/addon/battle.js reads `fishRaidReady`)
  uniequip_fishz_phatom(battle, u) {
    u.fishRaidReady = true;
  },

  // block 0, always Invisible; DP she earns ×2; while she is on the field, her player's redeploy timers run +50 %
  // faster (+300 % during her skill)
  uniequip_fishz_sleach(battle, u) {
    battle.addBuff(u, { key: `${KEY}:sleach`, persist: true, allowDead: true, mods: { blockCnt: -999 }, flags: { stealth: true }, tags: ['module'] });
    u.fishDpMul = 2;
    fasterRedeploy(battle, u, () => (skillBusy(u) ? 3 : 0.5));
  },

  // healing an ally grants Immortal for 8 s (HP can't drop below 1; no stacking); the grant's cooldown starts at 0 s
  // and grows by 5 s each time an Immortal actually saves someone
  uniequip_fishz_shining(battle, u) {
    const key = `${KEY}:immortal`;
    let cd = 0, readyAt = 0;
    battle.on('heal', (c) => {
      if (c.source !== u || !c.target || c.target.side === 'enemy' || battle.time < readyAt || c.target.findBuff(key)) return;
      battle.addBuff(c.target, { key, duration: 8, source: u, visible: true, tags: ['module'] });
      readyAt = battle.time + cd;
    }, { owner: u });
    battle.on('fatal', (c) => {
      const b = c.unit?.findBuff?.(key);
      if (c.prevented || !b || b.source !== u) return;
      c.prevented = true;
      cd += 5;
    }, { owner: u, priority: -10 });
  },

  // DP he earns ×2; DP above 90 is drained, each 1 DP giving 1 SP to every ally of his player [DRAFT: drained at once
  // every 0.5 s; "持续消耗" names no rate]
  uniequip_fishz_siege(battle, u) {
    u.fishDpMul = 2;
    battle.every(0.5, () => {
      if (!up(u)) return;
      const ps = battle.getPlayer(u.ownerId);
      const extra = Math.floor((ps?.dp ?? 0) - 90);
      if (!(extra > 0)) return;
      battle.addDp(u.ownerId, -extra);
      for (const a of battle.allies(u.ownerId)) if (a.skill && !a.skill.noSkill && !skillBusy(a)) a.skill.gainSp(extra, 'module');
    }, { owner: u });
  },

  // range +1; during the skill range +1 more, +1 target and Invisible; attacks also deal 10 % ATK Arts and 5 % ATK
  // Nervous Impairment
  uniequip_fishz_thorns(battle, u) {
    battle.addBuff(u, { key: `${KEY}:thorns`, persist: true, allowDead: true, mods: { rangeExtend: 1 }, tags: ['module'] });
    liveBuff(battle, u, `${KEY}:thornsSkill`, () => skillBusy(u), () => ({ rangeExtend: 1, maxTargets: 1 }), { flags: { stealth: true } });
    installLordArtsAddition(battle, u, (c) => (isMainHit(c.dmg) ? 0.1 : 0), ['module', 'addition']);
    battle.on('damageCalculate', (c) => {
      if (c.source !== u || !c.target?.alive || c.target.side !== 'enemy' || !isMainHit(c.dmg)) return;
      battle.dealElementDamage({ source: u, target: c.target, element: 'neural', amount: u.s.atk * 0.05, tags: ['module'] });
    }, { owner: u });
  },

  // while she lives, every enemy's weight −2; her damage to an enemy not in an element burst becomes Corrosion; per
  // +10 % ATK (99 at most): SP +0.02/s [DRAFT: the cannon's redeploy −1 % per step is not wired — no cannon timer hook]
  uniequip_fishz_weedy(battle, u) {
    battle.every(0.5, () => {
      if (!u.alive || !u.deployed) return;
      for (const e of battle.aliveEnemies()) battle.addBuff(e, { key: `${KEY}:weedyMass`, duration: 0.6, mods: { massFlat: -2 }, source: u, tags: ['module'] });
    }, { owner: u, immediate: true });
    battle.on('hit', (c) => {
      if (c.source !== u || c.target?.side !== 'enemy' || c.dmg.type === 'element' || c.dmg.cancel || isBursting(c.target)) return;
      c.dmg.cancel = true;
      battle.dealElementDamage({ source: u, target: c.target, element: 'erosion', amount: c.dmg.amount, tags: ['module'] });
    }, { owner: u, priority: -10 });
    spTime(battle, u, () => (up(u) && !skillBusy(u) ? 0.02 * Math.min(99, Math.floor(atkGain(u) * 10)) : 0));
  },
};

/** Install the Mod Z / W effects of `u`'s active module, if it has one. */
export function installModZ(battle, u) {
  const mod = u?.def?.raw?.module;
  if (!mod || mod.active === false) return;
  const def = modZOf(mod.id);
  if (!def) return;
  const fn = INSTALL[def.id];
  if (fn) fn(battle, u);
}

/** The module ids with an installer (tests check every Mod Z / W has one). */
export const MODZ_INSTALLED = Object.freeze(Object.keys(INSTALL));
