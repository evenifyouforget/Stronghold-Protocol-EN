# SPA-CC: Famiglia Unending / Seasonal (the Blood Ledger), Level 1 stats

Target: `main`. Branch `wip/famiglia`. Custom lobbies only. The tags and the readings I made are in
`remove-before-merge/spacc/working-spec.md` (its §16, "Readings" 4 and 8); that file also carries Fish's own edits.

## What's in it

- **Famiglia: Unending 2 / 3, Seasonal 2 / 3** (arknights.wiki.gg Blood_Ledger, Fish's answers):
  - Unending: every battle is an Asset Liquidation from start to end (enemies +20 % ATK, +15 % DEF; the Silencers
    their data Passive too). No Silencer comes from it.
  - Seasonal: a Blood Ledger in every battle, fresh each time: 3 per game second, +1 per living Zaaro, +35 per second
    during his Furious Howl. At 500, an Asset Liquidation with one Shadow Silencer; it empties over 35 game seconds
    without filling. From round 10 it starts at 250.
  - Tier 3: Zaaro joins Cleaner's sub-wave and costs 5 LP when he leaks.
  - Every battle: normal, Unite and the final boss rounds.
- **A Ledger gauge** in the battle screen's phase capsule: the count while it fills, "Asset Liquidation" and a pulse while
  one lasts.
- **Level 1 stats** (Fish's note): Patriot under ccPatriot and the Delegation sub-wave's Degenbrecher use the stronger
  stat set hard stages use. The data build keeps it from the game data (`level1` in `data/enemies.json`, for these two
  enemies only); it matches the wiki.

- **Fix (Fish's playtest): a leaked Patriot cost only 1 LP** in two places, now 5 (and tier-3 Zaaro 5):
  - after the Unite Phase: the survivors a leaker is charged for were counted 1 each (`unite.js uniteSurvivors` now takes
    a weight);
  - in the live pending LP during the battle (the own HUD and the teammates' view): `spec.js battleProgress` counted each
    leak as 1 until the result reached the server.
  One rule for all of them: `shared/ruleData.js riskLeakWeight` (the settlement's `Match.riskLoss` uses it too).

## How it works

- `shared/rules.js`: `ccFamiglia` gets four levels in its tree (Unending and Seasonal are sibling paths over Cleaner).
- `server/sim/content/risk.js installFamiglia`: `battle.ledger`; the snapshot carries it as `bl` (`battle/events.js`);
  `ui/gameLogic/format.js snapHud` → `ui/hud.js LedgerBar`.
- Furious Howl reads Zaaro's `WildCalling` skill from the data (every 40 s, the first 5 s into his second form, 5.5 s
  long, 35 per second).
- `tools/build-data.mjs LEVEL1_ENEMY_KEYS`; `risk.js installLevel1` scales the base stats by Level 1 / Level 0, so the
  round's and the tag's multipliers stay on top.
- Docs: `docs/SIM.md`, `docs/design/network.md`.

## Tests

- New: `test/sim/risk-famiglia.test.js` (Unending, Seasonal's fill / Liquidation / Silencer / drain / round-10 start,
  Zaaro and his Howl, the snapshot, Level 1), `test/ui/ledger-hud.test.js`; extended: `test/match/risk-tags.test.js`
  (Zaaro in the sub-wave, his leak cost; a Patriot surviving the Unite Phase; the live leak count).
- Golden replays unchanged (tags off).
- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container).
- Checked in headless Chromium: the Risk grid with Seasonal 3 chosen.
