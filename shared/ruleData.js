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

/** The Alliance Modules' texts (the rules dialog, and the alliance's own text while the module is on): {bond} = the
 *  alliance's name, {list} = the names of LATERANO_B_LIST. */
export const LATERANO_B_TEXT = N_('【{bond}】干员开启技能获得的弹药量提升min(5 + 1×层数, 75 + 0.3×层数)%（原版：5 + 1.5×层数）。<达到100层>【{bond}】干员造成的伤害提升至200%；消耗弹药时触发的特质（{list}）触发两次，两次均计入该特质每场战斗的触发次数上限。<在场6名不同【{bond}】干员>与原版相同（不会触发两次）');
export const LATERANO_B_LIST = Object.freeze(['chess_char_4_02_a', 'chess_char_5_01_a', 'chess_char_6_01_a']);
export const VICTORIA_C_TEXT = N_('【{bond}】干员技能结束时，每携带1件维式重锤回复8点技力；【{bond}】激活时调度中心的维式重锤为进阶版且免费。<休整期结束时>携带维式重锤的【{bond}】干员使【{bond}】层数+其阶级。<在场6名不同【{bond}】干员>上述干员还使自身其他已激活盟约的层数+2×其阶级；战斗开始时【{bond}】干员攻击力+(200 + 1.2×层数)%，获得最大生命值200%的屏障与抵抗。不再每25层获得维式重锤');

/** Whether `rules` change any data record (the callers can skip the patch). */
export const rulesChangeData = (rules) => !!(rules && (rules.virtuosaBonds === true || rules.blaze === true
  || rules.lateranoMod === 'B' || rules.victoriaMod === 'C'));

/**
 * The records `rules` change: `{ chess: { [id]: record }, garrisons: { [id]: record } }` — new objects, the inputs are not
 * touched; empty maps when nothing changes (or the data lacks what a change needs).
 * @param {{ chess?: object, garrisons?: object, backups?: object, bonds?: object }} raw the raw data maps (id → record)
 * @param {object} rules a shared/rules.js rules object
 * @param {{ text?: (msgid: string, params?: object) => string }} [opts] translates the made-up texts (the client passes t)
 */
export function ruleDataPatch(raw, rules, { text = (s, p) => s.replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? String(p[k]) : m)) } = {}) {
  const chess = {}, garrisons = {}, bonds = {};
  if (!rulesChangeData(rules) || !raw) return { chess, garrisons, bonds };
  // the Alliance Modules: the alliance's text is the module's (its "current effect" line, Mod A's numbers, goes)
  const listNames = LATERANO_B_LIST.map((id) => own(raw.chess, id)?.name ?? id).join(text('、'));
  for (const [key, bondId, msg, params] of [
    ['lateranoMod', 'lateranoShip', LATERANO_B_TEXT, { list: listNames }],
    ['victoriaMod', 'victoriaShip', VICTORIA_C_TEXT, {}],
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
  return { chess, garrisons, bonds };
}
