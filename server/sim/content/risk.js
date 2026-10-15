// server/sim/content/risk.js — the battle side of the SPA-CC Risk tags (Custom Lobby Modifications, shared/rules.js,
// category 'risk'; numbers: shared/ruleData.js CC; remove-before-merge/FINDINGS.md §5). The rules come with the battle
// (BattleSpec flags.rules). Prep-side tags (prices, shop upgrades, bench counting, Strategy rounds, extra enemies) live
// with the match.
//   ccForesight   every 远见 operator −20 ASPD, whether 远见 is active or not (Fish, 2026-10-15)
//   ccSpRecovery  every operator's time-based SP recovers 0.2 / 0.5 / 0.8 SP/s slower (spRecoveryFlat)
//   ccLeaderDr    leaders — the Final Assault / Hidden Core bosses and the leader-class enemies (bosses.js BOSS_KEYS,
//                 enemies/leaders.js LEADER_KITS) — take 50 / 90 % less Physical and Arts damage, except while under an
//                 elemental burst (爆发: the burstLock flag)
//   ccBoss        the final bosses' ATK +15 / 25 / 50 % (their HP: the match sizes the shared pool, finalAssault.js)
//   ccDeepInfiltration  DP generation × 0.5 (flags.dpPerSec)
//   ccLowEfficiency     every operator's redeployment time × 1.75
//   ccOzArts / ccOzPhys / ccLockout, ccDelegation United 2 — the final boss's pool decides (server/sim/bossRisk.js); every
//                 field applies its view: +50 RES, +5000 DEF, 无敌 during a lockout; a field with a living Degenbrecher
//                 holds the pool (sharedBoss.setHold)
//   ccPatriot     Undying 1: Patriot's leak costs CC.patriot.leakLp; nobody took him (flags.ccPatriotSkipped) and Undying
//                 2: the final bosses' ATK +100 % more. Undying 2: in Marching Stance (his 'ab:patriotMarch' buff) 90 % less
//                 Physical / Arts damage from units not blocking him and immune to CC.patriot.marchImmune; +200 % HP and
//                 never slower than his base speed (both forms). Rampage 3: every enemy +40 % move speed, +40 ASPD while
//                 he lives. (Support 3's spear: his kit, enemies/leaders.js)

import * as S from './support/index.js';
import { CC } from '../../../shared/ruleData.js';
import { BOSS_KEYS } from './bosses.js';
import { LEADER_KITS } from './enemies/leaders.js';
import { tagLevel, tagHas } from '../../../shared/rules.js';

const LEADERS = new Set([...BOSS_KEYS, ...Object.keys(LEADER_KITS)]);
const FINAL_BOSSES = new Set(BOSS_KEYS);

/** Whether an enemy unit is a leader for ccLeaderDr (its record's key). */
export const isLeaderEnemy = (u) => !!u && u.side === 'enemy' && LEADERS.has(u.def?.key ?? u.key);

export function install(battle) {
  const rules = battle.flags?.rules;
  if (!rules) return;
  const foresight = rules.ccForesight > 0, sp = CC.spRecovery[rules.ccSpRecovery] || 0;
  if (foresight || sp > 0) {
    battle.on('deploy', ({ unit }) => {
      if (!S.isOp(unit)) return;
      if (foresight && S.unitBonds(unit).includes('visiShip')) S.passiveBuff(battle, unit, 'risk:foresight', { aspd: CC.foresightAspd });
      if (sp > 0) S.passiveBuff(battle, unit, 'risk:spRecovery', { spRecoveryFlat: -sp });
    });
  }
  const dr = CC.leaderDr[rules.ccLeaderDr] || 0;
  if (dr > 0) {
    battle.on('hit', (c) => {
      const t = c.target;
      if (!isLeaderEnemy(t) || !c.dmg || (c.dmg.type !== 'phys' && c.dmg.type !== 'arts')) return;
      if (t.s.flags.burstLock) return;
      c.dmg.mul *= 1 - dr;
    });
  }
  // ccPatriot Undying 2: nobody took the round-9 Patriot → +100 % ATK on top
  const atk = (CC.bossAtk[rules.ccBoss] || 0) + (battle.flags.ccPatriotSkipped && tagHas(rules, 'ccPatriot', 'undying2') ? CC.patriot.skipAtk : 0);
  if (atk > 0) {
    battle.on('enemySpawn', ({ enemy }) => {
      if (enemy && FINAL_BOSSES.has(enemy.def?.key ?? enemy.key)) S.passiveBuff(battle, enemy, 'risk:bossAtk', { atkPct: atk });
    });
  }
  if (tagLevel(rules, 'ccDeepInfiltration') > 0) battle.flags.dpPerSec *= CC.dpPerSecMul;
  if (tagLevel(rules, 'ccLowEfficiency') > 0) {
    battle.on('deploy', ({ unit }) => { if (S.isOp(unit)) S.passiveBuff(battle, unit, 'risk:lowEfficiency', { redeployMul: CC.redeployMul }); });
  }
  installBossPool(battle, rules);
  installPatriot(battle, rules);
}

const keyOf = (u) => u.def?.key ?? u.key;

/** The final boss pool's Risk view on this field's boss units, and United 2's hold (server/sim/bossRisk.js). */
function installBossPool(battle, rules) {
  const pool = battle.sharedBoss;
  if (!pool || typeof pool.riskView !== 'function') return;
  const hold = tagHas(rules, 'ccDelegation', 'united2');
  let held = false, acc = 0;
  battle.on('tick', ({ dt }) => {
    acc += dt;
    if (acc < 0.1 - 1e-9) return;
    acc = 0;
    if (hold && typeof pool.setHold === 'function') {
      const on = battle.aliveEnemies().some((e) => keyOf(e) === CC.delegation.degen);
      if (on !== held) { held = on; pool.setHold(battle.fieldId, on); }
    }
    const v = pool.riskView();
    if (!v) return;
    for (const e of battle.aliveEnemies()) {
      if (!e.bossPool) continue;
      toggle(battle, e, 'risk:ozArts', !!v.res, { mods: { resFlat: CC.ozArts.res } });
      toggle(battle, e, 'risk:ozPhys', !!v.def, { mods: { defFlat: CC.ozPhys.def } });
      toggle(battle, e, 'risk:lockout', !!v.inv, { flags: { invulnerable: true } });
    }
  });
}

function toggle(battle, e, key, on, buff) {
  const has = !!e.findBuff(key);
  if (on && !has) battle.addBuff(e, { key, persist: true, visible: true, ...buff });
  else if (!on && has) battle.removeBuff(e, key);
}

function installPatriot(battle, rules) {
  if (!tagHas(rules, 'ccPatriot', 'undying1')) return;
  const pt = CC.patriot;
  const isPatriot = (u) => !!u && u.side === 'enemy' && keyOf(u) === pt.key;
  const undying2 = tagHas(rules, 'ccPatriot', 'undying2'), rampage = tagHas(rules, 'ccPatriot', 'rampage3');
  battle.on('enemySpawn', ({ enemy }) => {
    if (!isPatriot(enemy)) return;
    enemy.lpr = pt.leakLp;
    if (undying2) S.passiveBuff(battle, enemy, 'risk:patriotUndying', { hpPct: pt.hpPct }, { flags: { moveFloor: true } });
  });
  if (undying2) {
    const marching = (u) => isPatriot(u) && !!u.findBuff('ab:patriotMarch');
    const immune = new Set(pt.marchImmune);
    battle.on('beforeStatus', (c) => { if (marching(c.target) && immune.has(c.status)) c.cancel = true; });
    battle.on('hit', (c) => {
      const t = c.target;
      if (!marching(t) || !c.dmg || (c.dmg.type !== 'phys' && c.dmg.type !== 'arts')) return;
      const src = c.source;
      if (!src || src.side !== 'ally' || t.blockedBy === src) return;
      c.dmg.mul *= 1 - pt.marchDr;
    });
  }
  if (rampage) {
    let acc = 0;
    battle.on('tick', ({ dt }) => {
      acc += dt;
      if (acc < 0.1 - 1e-9) return;
      acc = 0;
      const enemies = battle.aliveEnemies();
      if (!enemies.some(isPatriot)) return;
      for (const e of enemies) battle.addBuff(e, { key: 'risk:patriotRampage', duration: 0.2, refresh: 'replace', mods: { moveMul: 1 + pt.rampage.movePct, aspd: pt.rampage.aspd } });
    });
  }
}

export function registerMeta() {}
