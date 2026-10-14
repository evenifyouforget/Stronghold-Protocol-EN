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

import * as S from './support/index.js';
import { CC } from '../../../shared/ruleData.js';
import { BOSS_KEYS } from './bosses.js';
import { LEADER_KITS } from './enemies/leaders.js';

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
  const atk = CC.bossAtk[rules.ccBoss] || 0;
  if (atk > 0) {
    battle.on('enemySpawn', ({ enemy }) => {
      if (enemy && FINAL_BOSSES.has(enemy.def?.key ?? enemy.key)) S.passiveBuff(battle, enemy, 'risk:bossAtk', { atkPct: atk });
    });
  }
}

export function registerMeta() {}
