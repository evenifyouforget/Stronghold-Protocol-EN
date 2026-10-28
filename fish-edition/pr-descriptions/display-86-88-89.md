Three display changes: the room's rules in the in-game Match Info tab, the Strategies' texts under Strategy 1, and the AI players named in the host's language.

Base: `mini/0.3.1-3`. Branch `wip/display-86-88-89`.

Closes #86
Closes #88
Closes #89

## #86: the rules in the Match Info tab

The in-game 本局信息 (Match Info) tab (`public/js/ui/enemyDrawer.js`) lists the room's rules in force under the stage line, when there are any:
- the risk total ("Risk N") and WITH CHEATS in its heading;
- a chip per rule, coloured by category. A Risk tag's chip shows its effects as a tooltip, every level in force.

The chips are a new `RulesChips` (`public/js/ui/lobbyRules.js`). The end screen's list uses it too, so it gains the same tooltips.

## #88: the Strategies' texts under Strategy 1

Under Strategy 1 the game moves a Strategy's named rounds one round later, but the texts kept the old numbers. Jessica still said rounds 4/7/10/13 while the Dispatch Modules came on 5/8/11/14.

Now the 12 Strategies whose rounds move say the new ones, highlighted like a changed alliance number (`<@ba.vup>`):
- Jessica, Justin Jr., Lee, Harold, Quintus, Yu, Pith, Dusk, Duck Lord, Orchid, Muelsyse, Fang;
- Fang's 15 is the Hidden Core round, as in the game.

How (`shared/ruleData.js`):
- `CC.strategyLate.keys`: the Strategy handlers whose `round` moves. `server/sim/content/bands/meta.js` now reads `CC.strategyLate.periodic` (the Damazti Cluster) from there too.
- `ruleDataPatch` returns `bands` under Strategy 1. The client adds `bands` to its patched files (`public/js/data.js`).
- In the text, it finds each group of round numbers next to the word for "round", in every language (第4、7回合, "Rounds 4, 7 and 10", 第4/7ラウンド, 4/7라운드). Only the numbers that are that Strategy's own named rounds move. Tiers ("2、4阶"), counts and "every 2 rounds" stay.

The Strategies by period keep their text: Dobermann, Matsukiri, Narantuya, the Damazti Cluster.

## #89: the AI players' names in the host's language

The names were six fixed Chinese strings on the server ("AI·华法琳" …), sent to everyone and used in the ticker too. Now the host's client sends its language with `room.addBot` and `queue.ai` (`lang`, optional). The server names the AI from `BOT_NAMES_BY_LANG`:
- en: AI·Warfarin, AI·Amiya, AI·Leizi, AI·Dobermann, AI·Kal'tsit, AI·Closure;
- also ja, ko and zh-TW, with the official names;
- any other language, or no `lang`: Chinese as before.

Everyone in the room sees the same name, and the server's messages carry it as they are.

## Known issues

- An AI's name stays in the host's language: someone in the room with another language sees the host's names.
- Strategy 2 also changes three Strategies (Ioleta's cap, Du Yaoye's one special refresh, Amiya's extra alliance), and their texts don't say so yet.
- Not looked at in a browser.

## Tests

- `test/ui/risk-text.test.js`, new tests:
  - #86: `RulesChips`: the chips, their order and classes, a tag's tooltip;
  - #88: the 12 Strategies and their new rounds; Lee's tiers, Harold's "every 2 rounds" and Yu's stacks unchanged; the Strategies by period untouched;
  - #88: every handler with a `round` is either moving or by period, so a new one has to be sorted in;
  - #88: en, ja, ko and zh-TW.
- The #88 tests fail without the `shared/ruleData.js` change.
- `test/lobby.test.js`: an AI added with `lang: 'en'` is AI·Warfarin, `ja-JP` the Japanese name, none the Chinese; `botNames` falls back by language.
- `test/lobby-soloqueue.test.js`: `queue.ai` accepts `lang`.
- `npm test`: 8,902 of 8,985 pass, 82 skipped. The one failure is `test/ipv6-bind.test.js`, which needs IPv6, unavailable in our container.
- Typecheck is clean, lint has 0 errors, and `node tools/i18n.mjs extract` finds no untranslated Chinese in the changed files.
