# SPA-CC: Risk tags (first batch) and the Patriot pilot

Target: `main`, after PR B (`wip/custom-lobby`), which this builds on. Branch `wip/spacc`.

ROADMAP "SPA-CC": a Contingency-Contract-style difficulty above Ultimate. Every tag is a Custom Lobby Modification in
the new **Risk** category; feasibility per tag is in `remove-before-merge/FINDINGS.md` §5.

## What the host gets

- **Risk grid** in the rules dialog (Contingency Contract layout): a column per tag, its levels top to bottom; a click
  picks a level, a second click turns the tag off. The total Risk and the full text of every active tag show under it.
- **Result title**: "Ultimate +6 seeded"; the strip shows "+6". With a cheat on, the Risk counts as 0.

## Tags

| Tag | Risk | Effect |
|---|---|---|
| Investor: no Bench | 1 | Bench Operators no longer count toward Investor |
| Swift nerf | 1 | 20 + 0.25 × stacks % (was 0.35) |
| Foresight ASPD −20 | 1 | every Foresight Operator, whether Foresight is active or not |
| Strategies delayed | 1 | named rounds one round later (Jessica 5/8/11/14, Lee's Funds held 2–3 and released on 4, Fang 15 …); even/odd and every-N Strategies, and Damazti ("every 5 rounds"), keep theirs |
| Tier I price up | 1 | from round 3, the first Tier I Operator bought each round costs +1 |
| Upgrade cost up | 1 / 2 | Dispatch Center 4→5 +2 / 4→5 and 5→6 +3 |
| SP recovery | 1 / 2 / 3 | automatic SP −0.2 / 0.5 / 0.8 per second |
| Final Leader up | 1 / 2 / 3 | final boss (Hidden Core too) HP pool +50 / 150 / 400 %, ATK +15 / 25 / 50 % |
| Leader DR | 1 / 2 | final bosses and leader-class bounty enemies take 50 / 90 % less Physical and Arts damage, except under an elemental burst |
| Famiglia Shadow Silencer | 1 | rounds 10–13: 5 for the Doctor with the fewest stacks (ties: the earliest seat), no bounty |
| Patriot (prototype) | 1 | round 9: one Patriot in every Doctor's battle — provisional, to playtest the pilot |

## Patriot pilot

- Data: `tools/build-data.mjs` `FORK_ENEMY_KEYS` builds him like any mode enemy (flagged `fork`, so the golden
  rosters leave him out); translations regenerated; his model and icon in `data/assets.json`.
- Kit (`server/sim/content/enemies/leaders.js` `kitPatriot`, from the official data and the wiki): +20 % ATK / +200 DEF
  to every other enemy; Marching Stance (+50 % ATK, +200 % DEF, +100 % RES, taunt, 4 hits per attack); a 60 s revive
  with a True-damage pulse; Ruination Stance (15 s invincible, ranged, faster and stronger, stun / freeze / levitate
  immune, the pulse, a telegraphed spear at the farthest high-ground unit every 20 s). Assumed: invulnerable through
  the revive (the wiki doesn't say).

## Tests

- New: `test/sim/risk-tags.test.js`, `test/match/risk-tags.test.js`, `test/content/patriot.test.js`,
  `test/render/patriot.browser.test.js` (opt-in, real model); `test/content/bands.test.js` covers the Strategy shift.
- Golden replays unchanged. `npm run ci`: all green except `test/ipv6-bind.test.js` (no IPv6 in our container).
