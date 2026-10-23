Four fixes reported for the next mini release: match records, the README, the Booster Pack's icon and the invulnerability ribbons.

Base: `mini/0.3.1-2` (= `main` 75c57d5c). Branch `wip/mini-fixes`. No gameplay change: the goldens all match.

Closes #57
Closes #58
Closes #59
Closes #62

## #59: match records miss the final round

A round that ends without a SETTLE got no row:
- the round the match ends in already had one (the `final: true` row from #55; the 2026-10-21 logs predate it);
- but a Final Assault won goes straight to the Hidden Core (`bossRounds.js` calls `startRound(hiddenRound)` with no SETTLE), so that round had none.

Now when a round starts and the previous round has no row, the record adds one for it, marked `noSettle: true`.

- Every round from 1 to the last now has exactly one row.
- `tools/records.mjs` doesn't read the rows, so nothing else changes. DEPLOY §11 (en and zh) says so.

## #58: the README has no match-recording instructions

Both READMEs (`.github/README.md` and the Chinese `README.md`) now have:
- an `SP_RECORDS` row in the environment-variable table;
- a short paragraph: how to turn recording on, where the files go, `node tools/records.mjs` (`--json`, `--verify`), sharing a day's folder, and a link to DEPLOY §11 for the service, systemd and what a record holds.

## #62: the Booster Pack has no sprite

The client never made the Booster Pack's item record:
- `setRules` in `public/js/data.js` copies the lobby rules it passes to `ruleDataPatch`, and that copy left out `boosterPack`;
- so the client had no record for `fish_item_booster_pack`, and therefore no icon (商业包装方案's) and no name or text.

`boosterPack` is now passed through. The server always had the record, which is why the pack worked.

## #57: an enemy shows both the official invulnerable effect and our ribbons

On a 重生 enemy's stand-up, the official effects play the talent's 无敌 loop for its blackboard time (`talentfx.js`, `U.inv`). Our ribbons showed as well, because the sim sets `UF.INVULN` then.

Now the two are mutually exclusive, and the choice is made in one place:
- `TalentFx.sync` marks a view `officialInvuln` while that loop is actually playing on it;
- `render/units.js` draws the ribbons only for `UF.INVULN` without that mark.
- With official effects off, or if the loop's effect fails to load, the ribbons come back.

They don't share drawing code: the official loop is a prefab and the ribbons are procedural. What they share is the one decision. The 重生 无敌 window is the only official invulnerability loop I found that plays alongside `UF.INVULN`. If you saw both on an enemy that doesn't 重生, tell me which one.

## Tests

- `test/match/records.test.js`:
  - the full-match test now also checks that there are no gaps in the rows;
  - new test: a round that is followed by `startRound` without a SETTLE gets one `noSettle` row, and the next settled round gets a normal one.
- `test/match/rebalance.test.js`, new: the client's data store has the Booster Pack's record with its English name and icon while `boosterPack` is on (alone, and with another data-changing rule), and none after.
- `test/render/vfx-talents.test.js`, the 重生 test: `officialInvuln` is true while the 无敌 loop plays, false with official effects off, and false once the window is over.
- Each new test fails without its fix.
- `node --test test/match/records.test.js test/match/rebalance.test.js test/render/vfx-talents.test.js test/render/forms.test.js test/docs-paths.test.js test/version.test.js`: all pass.
- Not checked on screen: there are no game assets in this container, so neither the Booster Pack's icon nor the ribbons giving way have been looked at.

## CI

`npm run ci` on `wip/item-booster` (this branch plus the Equipment Booster Pack commit):
- setup, smoke, lint (0 errors; the same 151 warnings as `main`), imports and typecheck pass;
- tests: 8,953, of which 8,870 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none;
- `npm run golden`: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 141 scenarios all match.

The first CI run on this branch alone also had 13 sandbox and Worker test failures. The cause was my worktree's symlinked `node_modules` (Node's `--permission` child can't read through it). After a real `npm ci`, those 103 tests all pass.
