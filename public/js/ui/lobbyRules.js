// Custom Lobby Modifications in the room (shared/rules.js): the strip under the seats lists the rules in force and how a
// result will be labelled ("WITH CHEATS" for a cheat, "seeded" for a chosen map or chosen bans); the host's 调整 (others:
// 查看) opens the dialog, grouped by category:
//   作弊 (cheats)          +2 Deployment Limit, +2 Funds, untimed (co-op only)
//   盟约模组 (modules)      拉特兰 A / B, 维多利亚 A / C — A is the original effect
//   盟约调整 (rebalanced)   塑心 also in 迅捷 and 助力; 煌 in 凯瑟琳's shop slot
//   减少随机 (seeded)       the map (or random) and up to the difficulty's count of core / add-on bans (the rest random)
// Every change is one room.setRules partial update. Names of operators and alliances come from the game data (each
// language's official name). A room searching for teammates plays the original game (the server refuses rules then).

import { useState } from '../../vendor/hooks.module.js';
import { html, Button, Modal, Icon, MicroLabel, Tooltip } from './components.js';
import { BondGlyph } from './gameComponents.js';
import { data, useData } from '../data.js';
import { DEFAULT_RULES, RULE_EXTRA_DEPLOY, RULE_EXTRA_FUNDS, modeIdFor } from '../../../shared/constants.js';
import { rulesInForce, ruleLabels, ruleOf } from '../../../shared/rules.js';
import { VIRTUOSA, BLAZE } from '../../../shared/ruleData.js';
import { t } from '../../../shared/i18n.js';

const cx = (...p) => p.flat().filter(Boolean).join(' ');
const chessName = (id, fallback) => data.lookup('chess', id)?.name || fallback;
const bondName = (id) => data.lookup('bonds', id)?.name || id;

/** The short label of a rule in force (the strip, the result screen). */
export function ruleLabel(key, rules) {
  const v = rules?.[key];
  switch (key) {
    case 'extraDeploy': return t('部署上限 +{n}', { n: RULE_EXTRA_DEPLOY });
    case 'extraFunds': return t('每回合资金 +{n}', { n: RULE_EXTRA_FUNDS });
    case 'untimed': return t('行动阶段不限时');
    case 'lateranoMod': return t('{bond}模组 {m}', { bond: bondName('lateranoShip'), m: v });
    case 'victoriaMod': return t('{bond}模组 {m}', { bond: bondName('victoriaShip'), m: v });
    case 'virtuosaBonds': return t('{name}加入{a}与{b}', { name: chessName(VIRTUOSA.ids[0], '塑心'), a: bondName('swiftShip'), b: bondName('deputShip') });
    case 'blaze': return t('{name}代替{old}', { name: data.get('backups')?.units?.[BLAZE.charId]?.name || chessName(BLAZE.slot.a, '煌'), old: (data.lookupBase('chess', BLAZE.slot.a)?.name || '凯瑟琳') });
    case 'stage': return t('指定战场：{name}', { name: data.lookup('stages', v)?.name || v });
    case 'bans': return t('指定禁用盟约：{list}', { list: (v || []).map(bondName).join(t('、')) });
    default: return key;
  }
}

/** The result-title suffix and watermark of `rules`: `{ seeded, cheats }` texts (null when not labelled). */
export function ruleBadges(rules) {
  const l = ruleLabels(rules);
  return { seeded: l.seeded ? 'seeded' : null, cheats: l.cheats ? 'WITH CHEATS' : null };
}

/** The strip between the seats and the bottom bar: the rules in force, the labels, and the button to the dialog. */
export function RulesBar({ room, isHost, busy, onSet }) {
  const [open, setOpen] = useState(false);
  useData('chess', 'bonds', 'stages', 'backups');
  const rules = { ...DEFAULT_RULES, ...(room.rules || {}) };
  const on = rulesInForce(rules);
  const badges = ruleBadges(rules);
  return html`<div class="room-rules">
    <span class="room-bar__label">${t('自定义房间改动')}<${MicroLabel}>CUSTOM<//></span>
    <div class="rules-summary">
      ${on.length ? on.map((k) => html`<span key=${k} class=${cx('rules-chip', `rules-chip--${ruleOf(k).category}`)}>${ruleLabel(k, rules)}</span>`)
        : html`<span class="t-dim">${t('原版规则')}</span>`}
      ${badges.cheats ? html`<span class="rules-badge rules-badge--cheat">${badges.cheats}</span>` : null}
      ${badges.seeded ? html`<span class="rules-badge rules-badge--seeded">${badges.seeded}</span>` : null}
    </div>
    <${Button} variant="secondary" class="rules-open" onClick=${() => setOpen(true)}>${isHost ? t('调整') : t('查看')}<//>
    <${RulesDialog} open=${open} onClose=${() => setOpen(false)} room=${room} rules=${rules} editable=${isHost && !busy} onSet=${onSet} />
  </div>`;
}

/** One rule row: an on/off switch with its explanation. */
function Toggle({ k, rules, editable, onSet, label, desc }) {
  const v = rules[k] === true;
  return html`<div class="rules-row">
    <button type="button" role="switch" aria-checked=${v ? 'true' : 'false'} class=${cx('rules-pick__opt', v && 'is-active')}
      data-rule=${k} disabled=${!editable} onClick=${() => onSet({ [k]: !v })}>
      <${Icon} name=${v ? 'check' : 'plus'} />${label}
    </button>
    ${desc ? html`<p class="rules-row__desc">${desc}</p>` : null}
  </div>`;
}

/** A module choice (A = the original effect) and the text of the chosen one. */
function ModuleChoice({ k, bondId, rules, editable, onSet, texts }) {
  const rule = ruleOf(k);
  const v = rules[k];
  return html`<div class="rules-row">
    <div class="rules-mod">
      <${BondGlyph} bondId=${bondId} /><b>${bondName(bondId)}</b>
      <div class="rules-seg" role="radiogroup" aria-label=${bondName(bondId)}>
        ${rule.options.map((o) => html`<button key=${o} type="button" role="radio" aria-checked=${v === o ? 'true' : 'false'}
          class=${cx('rules-seg__opt', v === o && 'is-active')} data-rule=${k} data-value=${o} disabled=${!editable}
          onClick=${() => onSet({ [k]: o })}>${o === rule.options[0] ? t('模组 {m}（原版）', { m: o }) : t('模组 {m}', { m: o })}</button>`)}
      </div>
    </div>
    <p class="rules-row__desc">${texts[v] || ''}</p>
  </div>`;
}

function Section({ title, note, children }) {
  return html`<section class="rules-sec"><h3>${title}${note ? html`<span class="t-dim"> · ${note}</span>` : null}</h3>${children}</section>`;
}

/** The map choice and the ban picks of the room's difficulty. */
function Seeded({ room, rules, editable, onSet }) {
  useData('config', 'stages', 'bonds');
  const config = data.get('config');
  const mode = config?.modes?.[modeIdFor(room.mode, room.difficulty)] || null;
  const stages = Array.isArray(mode?.stages) ? mode.stages : [];
  const counts = config?.bans?.[room.difficulty] || { core: 0, addon: 0 };
  const inactive = new Set(Array.isArray(mode?.inactiveBondIds) ? mode.inactiveBondIds : []);
  const bonds = (data.list('bonds') || []).filter((b) => b && Number(b.weight) > 0 && !inactive.has(b.bondId));
  const picks = new Set(rules.bans || []);
  const group = (isCore, max) => {
    const list = bonds.filter((b) => !!b.isCore === isCore);
    const n = list.filter((b) => picks.has(b.bondId)).length;
    const toggle = (id) => {
      const next = new Set(picks);
      if (next.has(id)) next.delete(id);
      else if (n < max) next.add(id);
      else return;
      onSet({ bans: [...next].sort() });
    };
    return html`<div class="rules-bans">
      <div class="rules-bans__head"><b>${isCore ? t('核心盟约') : t('附加盟约')}</b>
        <span class="t-dim">${t('已选 {n}/{max}，其余随机', { n, max })}</span></div>
      <div class="rules-bans__grid">
        ${list.map((b) => html`<${Tooltip} key=${b.bondId} text=${b.name}>
          <button type="button" class=${cx('rules-ban', picks.has(b.bondId) && 'is-active')} aria-pressed=${picks.has(b.bondId) ? 'true' : 'false'}
            data-ban=${b.bondId} disabled=${!editable || (!picks.has(b.bondId) && n >= max)} onClick=${() => toggle(b.bondId)}>
            <${BondGlyph} bondId=${b.bondId} /><span>${b.name}</span>
          </button>
        <//>`)}
      </div>
    </div>`;
  };
  return html`
    <div class="rules-row">
      <b>${t('战场')}</b>
      <div class="rules-seg rules-seg--wrap" role="radiogroup" aria-label=${t('战场')}>
        <button type="button" role="radio" aria-checked=${rules.stage == null ? 'true' : 'false'} class=${cx('rules-seg__opt', rules.stage == null && 'is-active')}
          data-stage="" disabled=${!editable} onClick=${() => onSet({ stage: null })}>${t('随机')}</button>
        ${stages.map((id) => html`<button key=${id} type="button" role="radio" aria-checked=${rules.stage === id ? 'true' : 'false'}
          class=${cx('rules-seg__opt', rules.stage === id && 'is-active')} data-stage=${id} disabled=${!editable}
          onClick=${() => onSet({ stage: id })}>${data.lookup('stages', id)?.name || id}</button>`)}
      </div>
    </div>
    ${counts.core > 0 ? group(true, counts.core) : null}
    ${counts.addon > 0 ? group(false, counts.addon) : null}`;
}

/** The dialog: every rule, grouped by category; read-only for everybody but the host. */
export function RulesDialog({ open, onClose, room, rules, editable, onSet }) {
  useData('chess', 'bonds', 'backups');
  const lat = bondName('lateranoShip'), vic = bondName('victoriaShip');
  const blazeName = data.get('backups')?.units?.[BLAZE.charId]?.name || '煌';
  const spark = chessName(BLAZE.product.a, '烛煌');
  const lateranoTexts = {
    A: t('原版效果'),
    B: t('【{bond}】干员开启技能获得的弹药量提升min(5 + 1×层数, 75 + 0.3×层数)%（原版：5 + 1.5×层数）。<达到100层>【{bond}】干员造成的伤害提升至200%，“每消耗X发弹药”的特质对其每发弹药计数两次。<在场6名不同【{bond}】干员>与原版相同', { bond: lat }),
  };
  const victoriaTexts = {
    A: t('原版效果'),
    C: t('【{bond}】干员每携带1件维式重锤，技能结束时回复8点技力；【{bond}】激活时调度中心的维式重锤为进阶版且免费。<休整期结束时>携带维式重锤的【{bond}】干员使【{bond}】层数+其阶级。<在场6名不同【{bond}】干员>上述干员还使自身其他已激活盟约的层数+2×其阶级；战斗开始时【{bond}】干员攻击力+(200 + 1.2×层数)%，获得最大生命值200%的屏障与抵抗。不再每25层获得维式重锤', { bond: vic }),
  };
  return html`<${Modal} open=${open} onClose=${onClose} title=${t('自定义房间改动')} micro="CUSTOM" width="13rem" class="rules-dialog"
    actions=${html`<${Button} variant="secondary" onClick=${onClose}>${t('关闭')}<//>`}>
    ${room.searching ? html`<p class="rules-note">${t('搜寻队友时使用原版规则')}</p>` : null}
    ${editable ? null : html`<p class="rules-note">${t('由创建者设置')}</p>`}
    <${Section} title=${t('作弊')} note=${t('结算画面将显示「{mark}」', { mark: 'WITH CHEATS' })}>
      <${Toggle} k="extraDeploy" rules=${rules} editable=${editable} onSet=${onSet} label=${ruleLabel('extraDeploy', rules)} desc=${t('所有博士的部署上限 +{n}', { n: RULE_EXTRA_DEPLOY })} />
      <${Toggle} k="extraFunds" rules=${rules} editable=${editable} onSet=${onSet} label=${ruleLabel('extraFunds', rules)} desc=${t('每回合开始时额外获得 {n} 资金', { n: RULE_EXTRA_FUNDS })} />
      ${room.mode === 'solo' ? null : html`<${Toggle} k="untimed" rules=${rules} editable=${editable} onSet=${onSet} label=${ruleLabel('untimed', rules)} desc=${t('选择策略、机变阶段与休整期不限时（作战仍有时间限制）')} />`}
    <//>
    <${Section} title=${t('盟约模组')} note=${t('不影响结算标签')}>
      <${ModuleChoice} k="lateranoMod" bondId="lateranoShip" rules=${rules} editable=${editable} onSet=${onSet} texts=${lateranoTexts} />
      <${ModuleChoice} k="victoriaMod" bondId="victoriaShip" rules=${rules} editable=${editable} onSet=${onSet} texts=${victoriaTexts} />
    <//>
    <${Section} title=${t('盟约调整')} note=${t('不影响结算标签')}>
      <${Toggle} k="virtuosaBonds" rules=${rules} editable=${editable} onSet=${onSet} label=${ruleLabel('virtuosaBonds', rules)}
        desc=${t('{name}同时属于【{a}】【{b}】【{c}】', { name: chessName(VIRTUOSA.ids[0], '塑心'), a: lat, b: bondName('swiftShip'), c: bondName('deputShip') })} />
      <${Toggle} k="blaze" rules=${rules} editable=${editable} onSet=${onSet} label=${ruleLabel('blaze', rules)}
        desc=${t('{name}占据{old}在调度中心的位置（相同的阶级、价格与技能位），属于【{a}】【{b}】；<售出时>获得1名【{spark}】', { name: blazeName, old: (data.lookupBase('chess', BLAZE.slot.a)?.name || '凯瑟琳'), a: bondName('yanShip'), b: vic, spark })} />
    <//>
    <${Section} title=${t('减少随机')} note=${t('结算标题将带有「{mark}」', { mark: 'seeded' })}>
      <${Seeded} room=${room} rules=${rules} editable=${editable} onSet=${onSet} />
    <//>
  <//>`;
}
