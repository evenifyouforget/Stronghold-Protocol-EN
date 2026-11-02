// (fork) SPA-CC Risk tag texts in the room's rules dialog (public/js/ui/lobbyRules.js).
//   GitHub #84: a stacking chain (Investor, Strategy, Junk) lists every level in force, as the sim applies them all.
//   GitHub #91: Last Line of Defense says it is once per round, also after the Unite Phase, past the cap.
//   GitHub #86: the rules in force as chips (the result screen and the in-game 本局信息 tab), a tag's effects as its tooltip.
//   GitHub #88: under Strategy 1 the Strategies' texts name their rounds one round later, highlighted (shared/ruleData.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RULES, ruleOf, DEFAULT_RULES } from '../../shared/rules.js';
import { CC, ruleDataPatch, rulesChangeData } from '../../shared/ruleData.js';
import { levelsInForce, riskText, RulesChips } from '../../public/js/ui/lobbyRules.js';

const json = (f) => JSON.parse(fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'));
const BANDS = json('data/bands.json');
/** The Strategies in `lang` as the client has them: the data overlaid with the language's texts. */
const bandsIn = (lang) => {
  const tr = json(`data/i18n/${lang}.json`).files.bands;
  return Object.fromEntries(Object.entries(BANDS).map(([k, v]) => [k, { ...v, ...(tr[k] || {}) }]));
};
const late = (bands, level = 1) => ruleDataPatch({ bands }, { ...DEFAULT_RULES, ccStrategyLate: level }).bands;
const first = (s) => s.split('\n')[0];

test('#84: Investor 2, Strategy 2 and Junk 2 include level 1; the other chains replace their lower levels', () => {
  assert.deepEqual(RULES.filter((r) => r.stacks).map((r) => r.key), ['ccInvestorBench', 'ccStrategyLate', 'ccJunk']);
  for (const k of ['ccInvestorBench', 'ccStrategyLate', 'ccJunk']) {
    assert.deepEqual(levelsInForce(ruleOf(k), 2), [1, 2], k);
    assert.deepEqual(levelsInForce(ruleOf(k), 1), [1], k);
    assert.deepEqual(levelsInForce(ruleOf(k), 0), [], k);
  }
  // one number per level: level 3 alone
  assert.deepEqual(levelsInForce(ruleOf('ccSpRecovery'), 3), [3]);
  assert.deepEqual(levelsInForce(ruleOf('ccBoss'), 2), [2]);
  // a tag group: its ancestors, as before
  assert.deepEqual(levelsInForce(ruleOf('ccVengeance'), 3), [1, 2, 3]);
});

test('#91: Last Line of Defense names the extra LP, the cap and the most a round can cost', () => {
  const { full } = riskText('ccLastLine', 1);
  assert.match(full, new RegExp(`扣除${CC.lastLineLp}点`));
  assert.match(full, /每回合一次/);
  assert.match(full, /每回合10点的扣除上限/);
  assert.match(full, new RegExp(`最多扣除${10 + CC.lastLineLp}点`));
  assert.doesNotMatch(full, /\{/);
});

test('#86: RulesChips lists the rules in force, a Risk tag with its effects (every level in force) as the tooltip', () => {
  const rules = { ...DEFAULT_RULES, extraFunds: true, ccInvestorBench: 2, ccLastLine: 1 };
  const ul = RulesChips({ rules });
  assert.equal(ul.props.class, 'rules-chips');
  const lis = [ul.props.children].flat(2);
  assert.deepEqual(lis.map((li) => li.key), ['extraFunds', 'ccInvestorBench', 'ccLastLine']);
  assert.equal(lis[0].props.class, 'rules-chip rules-chip--cheat');
  assert.equal(lis[0].props.title, undefined);
  assert.equal(lis[1].props.title, [riskText('ccInvestorBench', 1).full, riskText('ccInvestorBench', 2).full].join('\n'));
  assert.equal(lis[2].props.title, riskText('ccLastLine', 1).full);
  assert.deepEqual([RulesChips({ rules: DEFAULT_RULES }).props.children].flat(2), []);
});

test('#88: under Strategy 1, the 12 Strategies with named rounds say them one round later, highlighted', () => {
  assert.equal(rulesChangeData({ ...DEFAULT_RULES, ccStrategyLate: 1 }), true);
  const p = late(BANDS);
  assert.deepEqual(Object.keys(p).sort(), ['band_ducklord', 'band_dusk', 'band_fang', 'band_harold', 'band_jesica', 'band_justin',
    'band_lmlee', 'band_mlyss', 'band_orchid', 'band_pith', 'band_quintus', 'band_yu']);
  assert.equal(first(p.band_jesica.desc), '【集结指示】在第5、8、11、14回合进入休整期时获得1个<寻呼模块>');
  assert.match(p.band_jesica.descRaw, /第<@ba\.vup>5<\/>、<@ba\.vup>8<\/>、<@ba\.vup>11<\/>、<@ba\.vup>14<\/>回合/);
  // only rounds move: the tiers (2、4阶), the counts and "every 2 rounds" stay
  assert.equal(p.band_lmlee.desc, '【得闲饮茶】第2、3回合的资金暂存至第4回合发放；第4回合进入休整期时，获得2、4阶随机干员各1名');
  assert.equal(first(p.band_harold.desc), '【人才盲盒】从第5回合开始每2回合获得1名<维多利亚>干员');
  assert.match(p.band_yu.desc, /第9回合开始时.*增加36层.*增加12层/);
  // Strategy 2 includes it; no Strategy 1, no change
  assert.deepEqual(Object.keys(late(BANDS, 2)).length, 12);
  assert.deepEqual(ruleDataPatch({ bands: BANDS }, { ...DEFAULT_RULES, extraFunds: true }).bands, {});
});

test('#88: the Strategies by period keep their text (达马兹提, 杜宾, 松桐, 娜仁图亚), and so do those without rounds', () => {
  const p = late(BANDS);
  for (const id of ['band_damaztic', 'band_doberm', 'band_makiri', 'band_narant', 'band_duyaoy', 'band_sciurus']) assert.equal(p[id], undefined, id);
  // every handler with a `round` either moves (CC.strategyLate.keys) or is by period: a new one has to be sorted in
  const withRound = new Set(Object.values(BANDS).flatMap((b) => (b.buffs || []).filter((x) => Number.isInteger(x?.bb?.round)).map((x) => x.key)));
  const byPeriod = [...withRound].filter((k) => !CC.strategyLate.keys.includes(k)).sort();
  assert.deepEqual(byPeriod, ['preparation_start_add_special_goods_every_n_round', 'preparation_start_gain_chess_every_n_round',
    'round_start_gain_char_chess_in_shop_every_n_round']);
});

test('#88: the other languages: en, ja, ko, zh-TW', () => {
  const en = late(bandsIn('en'));
  assert.equal(first(en.band_jesica.desc), '[Rally Directive] Upon entering Rest Phase on Round 5, 8, 11, and 14, obtain 1 Dispatch Module');
  assert.match(en.band_lmlee.desc, /Rounds 2 and 3 .* Round 4; .*1 Tier 2 Operator and 1 Tier 4 Operator during Round 4's/);
  assert.match(first(en.band_harold.desc), /Round 5, .*every 2 rounds/);
  const ja = late(bandsIn('ja'));
  assert.match(first(ja.band_jesica.desc), /第5\/8\/11\/14ラウンド/);
  assert.match(first(ja.band_harold.desc), /第5ラウンド以降、2ラウンドごと/);
  const ko = late(bandsIn('ko'));
  assert.match(first(ko.band_fang.desc), /9\/11\/13\/15라운드/);
  assert.match(first(ko.band_harold.desc), /5라운드부터, 2라운드마다/);
  assert.match(first(late(bandsIn('zh-TW')).band_orchid.desc), /第11回合/);
});
