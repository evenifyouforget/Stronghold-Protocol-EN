// shared/ruleData.js — the game data changes of the Custom Lobby Modifications' rebalanced alliances (shared/rules.js):
// one pure function over raw data/*.json records, so the server (Match: its GameData), the sim (BattleSpec flags.rules:
// sim/spec.js createBattleFromSpec's data view) and the client (data.js, the match's rules) change exactly the same
// records. Data files are generated and never edited by hand: these records are made at run time.
//
//   virtuosaBonds  塑心 (Virtuosa, chess_char_6_09) is also in 迅捷 (Swift) and 助力 (Aid), besides 拉特兰
//   blaze          煌 (Blaze, char_017_huang) takes 凯瑟琳's shop slot (chess_char_4_11_a / _b): her tier, price, merge and
//                  training status, Blaze's own body and kit; the skill (and module) the player chose for 凯瑟琳 — the
//                  loadout belongs to the slot — by default S2 and the X module; in 炎 and 维多利亚; and her
//                  驻守 is "<售出时>获得1名【烛煌】" (an elite Blaze gives an elite one) instead of 凯瑟琳's. The record is
//                  composed like a 补位 stand-in's (shared/standIn.js) and marked `ruleBody`, so the sim takes its kit by
//                  charId (server/sim/content/index.js) without the stand-in's 「替补」 marks.

import { composeUnitRecord, unitForm } from './standIn.js';
import { N_ } from './i18n.js';
import { tagHas } from './rules.js';

export const VIRTUOSA = Object.freeze({ ids: Object.freeze(['chess_char_6_09_a', 'chess_char_6_09_b']), bonds: Object.freeze(['lateranoShip', 'swiftShip', 'deputShip']) });

export const BLAZE = Object.freeze({
  slot: Object.freeze({ a: 'chess_char_4_11_a', b: 'chess_char_4_11_b' }),
  charId: 'char_017_huang',
  bonds: Object.freeze(['yanShip', 'victoriaShip']),
  moduleId: 'uniequip_002_huang', // CEN-X, as 凯瑟琳's slot carries her X module
  /** 烛煌, what a sold Blaze gives (the elite for the elite). */
  product: Object.freeze({ a: 'chess_char_5_03_a', b: 'chess_char_5_03_b' }),
  garrison: Object.freeze({ a: 'fish_garrison_blaze_a', b: 'fish_garrison_blaze_b' }),
});

/** The effect key of Blaze's 驻守 (server/match/effectsMeta.js): when the piece is sold, gain bbStr.chessId. */
export const SOLD_GAIN_CHESS = 'FISH_SOLD_GAIN_CHESS';
/** msgids of Blaze's 驻守 (translated by the client's `text`; {name} = 烛煌's name in the data). */
export const BLAZE_GARRISON_DESC = N_('<售出时>获得1名【{name}】');
export const BLAZE_GARRISON_DESC_ELITE = N_('<售出时>获得1名精锐【{name}】');

const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null);

/** SPA-CC Risk tags' numbers (shared/rules.js; remove-before-merge/FINDINGS.md §5). */
export const CC = Object.freeze({
  swiftPerStack: 0.0025,                       // 迅捷 20 + 0.25 × stacks % (data: 0.0035)
  foresightAspd: -20,                          // 远见 operators, active or not
  tier1Extra: 1, tier1FromRound: 3,            // the first tier-1 operator bought each round from round 3
  upgradeExtra: Object.freeze([null, Object.freeze({ 4: 2 }), Object.freeze({ 4: 3, 5: 3 })]), // shop level → +Funds
  spRecovery: Object.freeze([0, 0.2, 0.5, 0.8]), // time SP slower by … per s
  bossHp: Object.freeze([0, 0.5, 1.5, 4]), bossAtk: Object.freeze([0, 0.15, 0.25, 0.5]),
  leaderDr: Object.freeze([0, 0.5, 0.9]),
  dpPerSecMul: 0.5,                            // Deep Infiltration
  redeployMul: 1.75,                           // Low Efficiency
  lastLineLp: 2,                               // Last Line of Defense: the first leak each round, past lpCapPerRound
  ozArts: Object.freeze({ share: 0.5, res: 50 }),     // the final boss, once 50 % of its pool is taken as Arts
  ozPhys: Object.freeze({ share: 0.5, def: 5000 }),   // … as Physical
  lockout: Object.freeze({ every: Object.freeze([0, 0.68, 0.28, 0.18]), seconds: 10 }), // invulnerable 10 game s per step
  // Famiglia: Cleaner — rounds 10–13, the fewest stacks
  silencers: Object.freeze({ key: 'enemy_1283_sgkill_2', count: 5, rounds: Object.freeze([10, 11, 12, 13]) }),
  // Famiglia Unending / Seasonal — the Blood Ledger (血债账款) of every battle (arknights.wiki.gg Blood_Ledger): it fills
  // perSec per game second (+zaaroPerSec while Zaaro lives, + his Furious Howl, data skill WildCalling), and at max an
  // Asset Liquidation (清算时刻): every enemy ATK +atkPct, DEF +defPct; the Silencers also their data Passive (ATK / DEF
  // +15 %, +50 ASPD) per Liquidation so far in the battle, up to 5; one Shadow Silencer comes (Seasonal); the gauge drains
  // over drainSeconds and does not fill meanwhile. Unending: the whole battle is a Liquidation (no Silencer comes).
  // Seasonal: fresh every battle, it starts at startShare of max, from round lateFrom at lateShare (Fish 2026-10-15). Tier 3: Zaaro joins Cleaner's sub-wave and
  // costs zaaro.leakLp when he leaks.
  // Junk 1: every player gets a Cursed Hammer at the start (a Fish Edition item, made by ruleDataPatch): it cannot be
  // destroyed — not sold, not destroyed by the player, never replaced away, never expiring in the temporary hand; its carrier ATK −50 %; no 变形同构体 pairing. Junk 2:
  // a round's income −1 while it is not equipped (Fish's spec 2026-10-15)
  junk: Object.freeze({ itemId: 'fish_item_cursed_hammer', atkPct: -0.5, incomeLoss: 1, iconId: 'trap_1041_acarm041' }),
  // Vengeance: Reid, "Hateful Avenger" (enemy_1539_reid, the leader; Fish 2026-10-15). Invincible Blade 1: 1 per 300
  // total stacks of the player in every normal battle; the final boss rounds: by the stacks of all players, once per
  // field. 2: +150 % HP, +50 % ATK, Status Resistance, 30 % less Physical / Arts damage below 50 % HP, 15 s invulnerable
  // after his revive. 3: twice as many, +100 ASPD, below 50 % HP 60 % less damage and immune to the listed statuses.
  vengeance: Object.freeze({
    key: 'enemy_1539_reid', perStacks: 300, hpPct: 1.5, atkPct: 0.5, lowHp: 0.5, lowDr2: 0.3, lowDr3: 0.6,
    reviveInvincible: 15, aspd: 100,
    immune: Object.freeze(['slow', 'sluggish', 'stun', 'bind', 'cold', 'freeze', 'tremble', 'sleep', 'fear', 'levitate', 'attract']),
  }),
  famiglia: Object.freeze({
    max: 500, perSec: 3, zaaroPerSec: 1, drainSeconds: 35, startShare: 0.25, lateFrom: 10, lateShare: 0.75,
    atkPct: 0.2, defPct: 0.15,
    silencerKeys: Object.freeze(['enemy_1283_sgkill', 'enemy_1283_sgkill_2']),
    silencer: Object.freeze({ atkPct: 0.15, defPct: 0.15, aspd: 50, maxStacks: 5 }),
    summonKey: 'enemy_1283_sgkill_2',
    zaaro: Object.freeze({ key: 'enemy_1535_wlfmster', leakLp: 5 }),
    // Furious Howl (WildCalling: cooldown 40 s, the first 5 s after his second form starts, duration 5.5 s, sp 35): the
    // data's numbers when his record has them; +35 per s while it lasts, outside a Liquidation only
    howl: Object.freeze({ icd: 5, cd: 40, duration: 5.5, perSec: 35 }),
  }),
  // Patriot: Undying 1 — the round-9 Improv always offers him (no bounty); nobody taking him: the final boss +200 % HP
  // (Undying 2: also +100 % ATK); he costs leakLp when he leaks. Undying 2 — Marching Stance: 90 % less Physical / Arts
  // damage from operators not blocking him, +200 % HP, the listed statuses cannot touch him, never slower than his base
  // speed. Undying 3 — 5 Guerrilla Shieldguards join him, the sub-wave comes again in the final boss rounds (once per
  // field), and every enemy +40 % move speed and +40 ASPD while he lives (Fish's playtest nerf, 2026-10-15: Support 3 /
  // Rampage 3 became this one level).
  patriot: Object.freeze({
    key: 'enemy_1506_patrt', round: 9, leakLp: 5, skipHp: 2, skipAtk: 1, // Level 1 stats (data enemies.json level1)
    marchDr: 0.9, hpPct: 2,
    // the sim's status keys of Slow, Stun, Bind, Cold, Frozen, Frighten (战栗 tremble), Sleep, Fear, Levitate, Lure (attract)
    marchImmune: Object.freeze(['slow', 'sluggish', 'stun', 'bind', 'cold', 'freeze', 'tremble', 'sleep', 'fear', 'levitate', 'attract']),
    escort: Object.freeze({ key: 'enemy_1081_sotisd', count: 5 }),
    rampage: Object.freeze({ movePct: 0.4, aspd: 40 }),
  }),
  // Delegation: the sub-wave of the final boss round(s), once per field; United 2 — the final boss cannot die while a
  // Degenbrecher lives, and she charges: move speed +up to chargePct while unblocked, reached after chargeSeconds, reset
  // when blocked or unable to move; United 3 — Momentum Murder every 9 % with a hard HP gate (Fish's playtest nerf, 2026-10-15: HP 200 /
  // 300 / 500 %, Cloned 3 gone)
  delegation: Object.freeze({
    wave: Object.freeze([
      Object.freeze({ key: 'enemy_1525_blkswb', count: 1 }),
      Object.freeze({ key: 'enemy_1387_winshd', count: 5 }),
      Object.freeze({ key: 'enemy_1389_winbab_2', count: 5 }),
    ]),
    degen: 'enemy_1525_blkswb', // the sub-wave's Degenbrecher uses her Level 1 stats (enemies.json level1)
    hpMul: Object.freeze({ united1: 2, united2: 3, united3: 5 }), atkMul: Object.freeze({ united2: 1.5 }),
    chargePct: 3, chargeSeconds: 10,
    gateRatio: 0.09, castSeconds: 1, // [ASSUMED] Momentum Murder's cast: no HP lost meanwhile, the burst at its end
  }),
});

/**
 * The LP one leak of `enemyKey` costs in a normal round or a 联防 under `rules` (1; the SPA-CC tags' heavier leaks: a
 * Patriot under ccPatriot, Zaaro under ccFamiglia tier 3). One rule for the match's settlement (Match.riskLoss,
 * uniteSurvivors) and the battle's live count (server/sim/spec.js battleProgress `leaks`, the HUD's pending LP).
 */
export function riskLeakWeight(rules, enemyKey) {
  if (!rules || typeof enemyKey !== 'string') return 1;
  if (enemyKey === CC.patriot.key && tagHas(rules, 'ccPatriot', 'undying1')) return CC.patriot.leakLp;
  if (enemyKey === CC.famiglia.zaaro.key && (tagHas(rules, 'ccFamiglia', 'unending3') || tagHas(rules, 'ccFamiglia', 'seasonal3'))) return CC.famiglia.zaaro.leakLp;
  return 1;
}

/** msgid of the note added to 投资人's text when the bench no longer counts. */
export const INVESTOR_BENCH_NOTE = N_('（风险：整备区的干员不再计入）');


/** msgids of the Cursed Hammer (Junk; translated by the client's `text`). */
export const CURSED_HAMMER_NAME = N_('诅咒重锤');
export const CURSED_HAMMER_DESC = N_('攻击力-50%。无法被销毁');
export const CURSED_HAMMER_DESC_2 = N_('攻击力-50%。无法被销毁；未装备时每回合收入-1');

/** The Cursed Hammer's item record (ccJunk) in data/items.json's shape. */
function cursedHammerRecord(level, text) {
  const J = CC.junk;
  const desc = text(level >= 2 ? CURSED_HAMMER_DESC_2 : CURSED_HAMMER_DESC);
  return {
    id: J.itemId, baseId: J.itemId, goldenId: null, isGolden: false, trapId: J.iconId, iconId: J.iconId, identifier: null,
    name: text(CURSED_HAMMER_NAME), itemType: 'EQUIP', tier: 1, shopSortId: 999, price: 0, hideInShop: true, shopExcluded: true,
    shopExcludedBy: null, mergeable: false, upgradeNum: 0, upgradeChessId: null, duration: -1, giveBondId: null, givePowerId: null,
    canGiveBond: false, requiresBondId: null, effectId: null, effectName: null, desc, descRaw: desc, buffs: [], params: {},
    category: 'STAT', kind: 'passive', family: null, implFormula: 'ATK% += −0.5 (server/sim/content/risk.js)', fork: true,
  };
}

/** The Alliance Modules' texts (the rules dialog, and the alliance's own text while the module is on): {bond} = the
 *  alliance's name, {list} = the names of LATERANO_B_LIST. */
export const LATERANO_B_TEXT = N_('【{bond}】干员开启技能获得的弹药量提升min(5 + 1×层数, 75 + 0.3×层数)%（原版：5 + 1.5×层数）。<达到100层>【{bond}】干员造成的伤害提升至200%；消耗弹药时触发的特质（{list}）触发两次，两次均计入该特质每场战斗的触发次数上限。<在场6名不同【{bond}】干员>与原版相同（不会触发两次）');
export const LATERANO_B_LIST = Object.freeze(['chess_char_4_02_a', 'chess_char_5_01_a', 'chess_char_6_01_a']);
export const VICTORIA_C_TEXT = N_('【{bond}】干员技能结束时，每携带1件维式重锤回复8点技力；【{bond}】激活时调度中心的维式重锤为进阶版且免费。<休整期结束时>携带维式重锤的【{bond}】干员使【{bond}】层数+其阶级。<在场6名不同【{bond}】干员>上述干员还使自身其他已激活盟约的层数+2×其阶级；战斗开始时【{bond}】干员攻击力+(200 + 1.2×层数)%，获得最大生命值200%的屏障与抵抗。不再每25层获得维式重锤');

/** Whether `rules` change any data record (the callers can skip the patch). */
export const rulesChangeData = (rules) => !!(rules && (rules.virtuosaBonds === true || rules.blaze === true
  || rules.lateranoMod === 'B' || rules.victoriaMod === 'C' || rules.ccInvestorBench > 0 || rules.ccSwift > 0 || rules.ccJunk > 0));

/**
 * The records `rules` change: `{ chess, garrisons, bonds, items: { [id]: record } }` — new objects, the inputs are not
 * touched; empty maps when nothing changes (or the data lacks what a change needs).
 * @param {{ chess?: object, garrisons?: object, backups?: object, bonds?: object }} raw the raw data maps (id → record)
 * @param {object} rules a shared/rules.js rules object
 * @param {{ text?: (msgid: string, params?: object) => string }} [opts] translates the made-up texts (the client passes t)
 */
export function ruleDataPatch(raw, rules, { text = (s, p) => s.replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? String(p[k]) : m)) } = {}) {
  const chess = {}, garrisons = {}, bonds = {}, items = {};
  if (!rulesChangeData(rules) || !raw) return { chess, garrisons, bonds, items };
  // SPA-CC Junk: the Cursed Hammer
  if (rules.ccJunk > 0) items[CC.junk.itemId] = cursedHammerRecord(rules.ccJunk, text);
  // SPA-CC: 投资人 counts the board only; 迅捷's chance per stack (the popup's number; the sim reads the rule itself)
  const investor = rules.ccInvestorBench > 0 ? own(raw.bonds, 'investShip') : null;
  if (investor) {
    const note = text(INVESTOR_BENCH_NOTE);
    bonds.investShip = { ...investor, countMode: 'BOARD', countsHand: false, desc: `${investor.desc ?? ''}${note}`, descRaw: `${investor.descRaw ?? investor.desc ?? ''}${note}` };
  }
  const swift = rules.ccSwift > 0 ? own(raw.bonds, 'swiftShip') : null;
  if (swift) {
    const bb = (o) => (o && typeof o === 'object' ? { ...o, prob_per_stack: CC.swiftPerStack } : o);
    bonds.swiftShip = { ...swift, bb: bb(swift.bb), buffs: Array.isArray(swift.buffs) ? swift.buffs.map((x) => ({ ...x, bb: bb(x.bb) })) : swift.buffs };
  }
  // the Alliance Modules: the alliance's text is the module's (its "current effect" line, Mod A's numbers, goes)
  const listNames = LATERANO_B_LIST.map((id) => own(raw.chess, id)?.name ?? id).join(text('、'));
  for (const { key, bondId, msg, params } of [
    { key: 'lateranoMod', bondId: 'lateranoShip', msg: LATERANO_B_TEXT, params: { list: listNames } },
    { key: 'victoriaMod', bondId: 'victoriaShip', msg: VICTORIA_C_TEXT, params: {} },
  ]) {
    const rec = rules[key] && rules[key] !== 'A' ? own(raw.bonds, bondId) : null;
    if (!rec) continue;
    const desc = text(msg, { bond: rec.name ?? bondId, ...params });
    const { effectDesc, effectDescRaw, effectDescParams, ...rest } = rec;
    bonds[bondId] = { ...rest, desc, descRaw: desc };
  }
  if (rules.virtuosaBonds === true) {
    for (const id of VIRTUOSA.ids) {
      const rec = own(raw.chess, id);
      if (rec) chess[id] = { ...rec, bonds: [...VIRTUOSA.bonds] };
    }
  }
  if (rules.blaze === true) {
    const unit = raw.backups?.units?.[BLAZE.charId];
    for (const form of ['a', 'b']) {
      const slot = own(raw.chess, BLAZE.slot[form]);
      const body = slot && unit ? unitForm(raw.backups, BLAZE.charId, slot.status) : null;
      if (!body) continue;
      const skillIndex = Number.isInteger(slot.backup?.skillIndex) ? slot.backup.skillIndex : 1;
      const identity = {
        ...slot,
        garrisonIds: [BLAZE.garrison[form]],
        backup: { charId: BLAZE.charId, tmplId: null, skillIndex, uniEquipId: BLAZE.moduleId, potRank: 0 },
      };
      const rec = composeUnitRecord(identity, unit, body, { skillIndex, moduleId: slot.status?.equipLevel ? BLAZE.moduleId : null, bonds: [...BLAZE.bonds] });
      if (!rec) continue;
      chess[BLAZE.slot[form]] = { ...rec, ruleBody: 'blaze' };
      const desc = text(form === 'b' ? BLAZE_GARRISON_DESC_ELITE : BLAZE_GARRISON_DESC, { name: own(raw.chess, BLAZE.product[form])?.name ?? BLAZE.product[form] });
      garrisons[BLAZE.garrison[form]] = {
        garrisonId: BLAZE.garrison[form],
        desc,
        descRaw: desc,
        eventType: 'SERVER_CHESS_SOLD', eventTypeDesc: text(N_('整备能力')), eventTypeIcon: 'icon_gold',
        effectType: SOLD_GAIN_CHESS, effectKey: SOLD_GAIN_CHESS, battleRuneKey: null, charLevel: 0,
        bb: {}, bbStr: { chessId: BLAZE.product[form] },
      };
    }
  }
  return { chess, garrisons, bonds, items };
}
