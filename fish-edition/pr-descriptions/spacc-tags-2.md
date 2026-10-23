Fish's SPA-CC spec updates of 2026-10-23 (`remove-before-merge/spacc/working-spec.md`): two new levels, Famiglia Seasonal 2's Ledger and Vengeance's spawns.

Base: `main` (75c57d5c). Branch `wip/spacc-tags-2`. Gameplay only behind the Risk tags: without them nothing changes.

## What changed

### Objective: Investor 2 (new, Risk 2, includes Investor 1)

Muelsyse's, Kjera's and Flametail's "When obtained" Attributes trigger when the operator is **sold** instead:
- Muelsyse: the Damazti Isomorph;
- Kjera: the Kjeragandr ice;
- Flametail: a Pinus Sylvestris operator;
- elites: 2 of each, as before.

Their texts read "<When sold> …", in every language: the leading trigger tag is swapped for a translated one.

- **Investor's ×2 / ×3 no longer applies to them.** It multiplies "When obtained" effects only (the dispatcher's rule), and these aren't any more. I think that's the point of the tag; say if it should multiply the sell trigger instead.
- How: `ruleDataPatch` turns the six garrisons (`CC.investorSold`) into `SERVER_CHESS_SOLD` ones, so the existing grant handlers run on sell. The client now passes its localized garrisons file to the patch.

### Objective: Strategy 2 (new, Risk 2, includes Strategy 1)

- Ioleta Russell's ATK and HP bonus is at most **+50 %** each (5 elites reach it).
- Only the **first** manual refresh each round is Du Yaoye's special refresh (the data: the first 2).
- Amiya's tiers need **4 / 5 / 6** active alliances (the data: 3 / 4 / 5).

The Strategies' own texts in the draft are unchanged; the tag's text in the Risk grid says what it does.

### Famiglia: Seasonal 2

- An Asset Liquidation at **200** points instead of 500.
- The Ledger starts **empty**, and from round 10 it starts **50 % full** (100). Before: 25 % full, 75 % from round 10.
- Fill rates, Zaaro, the drain over 35 s and Unending are unchanged.

### Vengeance: Invincible Blade 1 / 3

- **Blade 1:** 1 Reid in a normal battle when the player has an **active alliance at 200 stacks or more**. In the final boss rounds: **always 1**, once per field. Before: 1 per 300 total stacks.
- **Blade 3:** 1 more Reid per 200 stacks above 200 of the player's **highest stacked active alliance**: 400 → 2, 600 → 3, at most 20. In the final boss rounds, the highest of any alive player's. Before: twice as many.
- **Inactive alliances don't count.**

### Texts

- New tile names: "Objective: Investor 1 / 2" and "Strategy 1 / 2". The changed texts are in English.
- ja / ko / zh-TW fall back to the Chinese source strings, as for the other SPA-CC texts on `main`. Their translations are in 801a9c64 on `wip/3`, which hasn't reached `main` yet.

## Readings I made (correct me)

- **Seasonal 2 before round 10:** the spec dropped "starts 25 % full", so the Ledger starts empty.
- **"50 % full"** is of the new 200, so 100.
- **Investor 2:** Investor no longer doubles these grants (above).

## Tests

- **New: Investor 2.** At level 1, buying Kjera gives the ice. At level 2 buying gives nothing and selling gives it. The six garrisons read "<售出时>".
- **New: Strategy 2.** Amiya at 3–6 active alliances; Ioleta with 6 elites: +60 % without the tag or at Strategy 1, +50 % at Strategy 2; Du Yaoye's 2nd refresh is a normal one.
- **Rewritten: the Vengeance test.** It now covers the highest active alliance (650 → 1 / 3), an inactive 500 that doesn't count, 399 → 1, below 200 → 0, and the final rounds always at least 1.
- **Adjusted: the Zaaro gauge test.** With a 200 cap, it now resets the Ledger before its last measurement, as it already did before the Howl.
- `test/match/risk-tags.test.js`, `test/content/bands.test.js`, `test/sim/risk-famiglia.test.js`, `test/sim/risk-junk-vengeance.test.js`, `test/content/spacc-untargetable.test.js`: all pass.
- UI, i18n and lobby-rule tests (1,085): all pass. `node tools/i18n.mjs check en`: 100 %, 0 missing.
- Lint: no new warnings (the same 151 as `main`); typecheck clean.
- `npm run ci`: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,950, of which 8,867 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none.
- `npm run golden`: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 141 scenarios all match. No golden changes.

The working spec on this branch is Fish's edited copy, with its implementation notes updated to match.
