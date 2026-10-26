# Show the official definition of a status keyword when it is tapped

Target: YuriRestia/Stronghold-Protocol-EN-translation `dev-0.2` (PR #7). Rebased onto `9588c00e` (2026-10-14).

Status keywords in descriptions (Cold, Stun, Fragile, …) are already highlighted, but nothing explains them. Tapping one
now opens its official definition.

## What players get

- Tap, click, or Enter / Space on a highlighted keyword in any operator, alliance, item or enemy text: a small popup
  shows the keyword's official definition, below the keyword (above it near the bottom of the screen).
- A definition can mention other keywords (e.g. Elemental Damage lists the five kinds); those are tappable in the
  popup too.
- The tap does not also select, buy or close the card the keyword sits in. The popup closes on Esc, a tap elsewhere,
  scroll or resize.
- Text follows the Text Size setting.

## Where the texts come from

- `data/terms.json` (55 keywords) is built by `tools/build-data.mjs` from the game data's `termDescriptionDict`
  (`excel/gamedata_const.json`): every keyword the other built files tag, plus the ones their definitions mention.
- Translations come from each official client's own `termDescriptionDict` (`tools/build-i18n.mjs`, `data/i18n/*.json`
  regenerated).
- Keywords a client does not have yet fall back to `tools/i18n/fallback-remake.json` (English) and the new optional
  `fallback-remake.<lang>.json` for ja / ko / zh-TW, then to the Chinese. An official text always takes precedence once
  the client has one.

## Changes

- `public/js/ui/termTip.js` (new): the popup and its document-level listener.
- `public/js/ui/richText.js`, `gameComponents.js`: keyword spans carry their term id; `terms` is in `GAME_FILES`.
- `public/css/screens/game-panels.css`: popup styles, font sizes on `--t`.
- `tools/build-data.mjs`, `tools/build-i18n.mjs`: build `terms` and its translations (alongside the outfits data).
- Docs: `docs/DATA.md` §19, `docs/I18N.md` §2.

## Tests

- `test/ui/term-tip.test.js` (new): placement, the overlays translate the glossary, fallbacks apply.
- `test/ui/richText.test.js`: keyword spans keep their id.
- `npm run ci`: all green except `test/ipv6-bind.test.js`, which needs IPv6 (unavailable in our container); it passes
  on GitHub Actions.
