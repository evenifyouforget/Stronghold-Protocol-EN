// shared/ruleData.js — the game data changes of the Custom Lobby Modifications' rebalanced alliances (shared/rules.js):
// one pure function over raw data/*.json records, so the server (Match: its GameData), the sim (BattleSpec flags.rules:
// sim/spec.js createBattleFromSpec's data view) and the client (data.js, the match's rules) change exactly the same
// records. Data files are generated and never edited by hand: these records are made at run time.
//
//   virtuosaBonds  塑心 (Virtuosa, chess_char_6_09) is also in 迅捷 (Swift) and 助力 (Aid), besides 拉特兰
//   blaze          煌 (Blaze, char_017_huang) takes 凯瑟琳's shop slot (chess_char_4_11_a / _b): her tier, price, merge,
//                  training status and skill slot (S2; module X), Blaze's own body and kit; in 炎 and 维多利亚; and her
//                  驻守 is "<售出时>获得1名【烛煌】" (an elite Blaze gives an elite one) instead of 凯瑟琳's. The record is
//                  composed like a 补位 stand-in's (shared/standIn.js) and marked `ruleBody`, so the sim takes its kit by
//                  charId (server/sim/content/index.js) without the stand-in's 「替补」 marks.

import { composeUnitRecord, unitForm } from './standIn.js';

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
/** msgid of Blaze's 驻守 (translated by the client's `text`). */
export const BLAZE_GARRISON_DESC = '<售出时>获得1名【烛煌】';
export const BLAZE_GARRISON_DESC_ELITE = '<售出时>获得1名精锐【烛煌】';

const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null);

/** Whether `rules` change any data record (the callers can skip the patch). */
export const rulesChangeData = (rules) => !!(rules && (rules.virtuosaBonds === true || rules.blaze === true));

/**
 * The records `rules` change: `{ chess: { [id]: record }, garrisons: { [id]: record } }` — new objects, the inputs are not
 * touched; empty maps when nothing changes (or the data lacks what a change needs).
 * @param {{ chess?: object, garrisons?: object, backups?: object }} raw the raw data maps (id → record)
 * @param {object} rules a shared/rules.js rules object
 * @param {{ text?: (msgid: string) => string }} [opts] translates the made-up texts (the client passes t)
 */
export function ruleDataPatch(raw, rules, { text = (s) => s } = {}) {
  const chess = {}, garrisons = {};
  if (!rulesChangeData(rules) || !raw) return { chess, garrisons };
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
      garrisons[BLAZE.garrison[form]] = {
        garrisonId: BLAZE.garrison[form],
        desc: text(form === 'b' ? BLAZE_GARRISON_DESC_ELITE : BLAZE_GARRISON_DESC),
        descRaw: text(form === 'b' ? BLAZE_GARRISON_DESC_ELITE : BLAZE_GARRISON_DESC),
        eventType: 'SERVER_CHESS_SOLD', eventTypeDesc: text('整备能力'), eventTypeIcon: 'icon_gold',
        effectType: SOLD_GAIN_CHESS, effectKey: SOLD_GAIN_CHESS, battleRuneKey: null, charLevel: 0,
        bb: {}, bbStr: { chessId: BLAZE.product[form] },
      };
    }
  }
  return { chess, garrisons };
}
