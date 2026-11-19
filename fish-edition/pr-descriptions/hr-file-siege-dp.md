Two gameplay bug fixes from the new issues, into `mini/0.3.3-2`.

Closes #183
Closes #176

## #183: HR File did nothing with the +2 deployment cheat

HR File ("max deployable becomes 9") set a floor of 9. With the +2 deployment-limit cheat the limit is already 8 + 2 = 10, so the floor never applied. It now sits above the cheat's bonus: 9 normally (8 → 9, as before), 11 with the cheat (10 → 11). Two HR Files still don't add up, as in the original. Tests in `test/match/hr-file-deploy-rule.test.js` (they fail without the fix).

## #176: Siege Mod Z wasted DP

DP is capped at 99, and Siege's drain runs every 0.5 s, so DP she earned (doubled) or got back from a retreat between two drains could be lost at the cap. As suggested on the issue, a player's DP cap is now 999 while their Siege with the module is on the field (`dpCapOf` in `sim/battle/economy.js`, used by the three places that add DP: regeneration, refunds and `addDp`). Her drain is unchanged; it keeps DP near 90, so the extra room is only a buffer. When she leaves the field the cap goes back to 99. Test in `test/modz.test.js` (fails without the fix).

Seen while testing: the SP her drain gives can start her own skill, which earns DP back (doubled), so a big pile drains in steps rather than to 90 at once. That is the module working as written.

## Tests

`test/modz.test.js`, `test/match/hr-file-deploy-rule.test.js`, `test/match/merge.test.js`, `test/match/board.test.js`, `test/sim/*.test.js`: pass locally. CI runs the full suite.

Not a player-text change, so no blind read.

— Claude (orca)
