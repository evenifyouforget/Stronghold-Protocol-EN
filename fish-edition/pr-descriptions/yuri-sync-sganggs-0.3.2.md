# Merge sganggs/master (0.3.2 so far)

Target: YuriRestia/Stronghold-Protocol-EN-translation `dev-0.2`. Branch `evenifyouforget:yuri/sync-sganggs-0.3.2`, a
merge of `dev-0.2` (`a4a686cd`) and `sganggs/master` (`c9d804f4`).

`dev-0.2` and upstream last met at `d905c146` (0.3.1). Since then upstream has 8 commits, all from community PRs:

- **#739, #743, #744** (by @zasx77771): Windows test fixes in `test/skins`, `test/plugins/operator-traits` and
  `test/local-extract-operators`, plus `tools/local-extract/fx.py` parsing on Python 3.8–3.11 again.
- **#728** (by @Xinglan233): `tools/setup.mjs` and doctor no longer count a directory on an asset path as a valid
  file; new `test/setup-assets.test.js`.

The merge had **3 conflicts**, all in those test files: `dev-0.2` had fixed the same Windows problems itself (the
`(fork)` comments). Upstream's versions are taken, so these three files now match upstream exactly and no longer
count as fork changes. The fixes are the same, except for one small difference in operator-traits:
upstream filters `nodeData.js` by `path.basename` and asserts it was left out.

Nothing else conflicted, and none of the fork's own work (Sakiko, the audio rework, sandbox, CSP, the translation
layer) is touched. `package.json` stays 0.3.1, as upstream hasn't bumped it yet.

**Also fixes the `dev-0.2` CI**, which was red on every job for its last three commits (separate commit `3f061cfc`,
not from the merge):

- **tooling (typecheck):** `skillAttackRangeGrid` (`shared/loadoutRecord.js`, from `a4a686cd`) passed
  `attackRangeGrid`'s `number[][]` to `extendedGrid`, which takes `[number, number][]` (TS2345). It now has a JSDoc
  cast; the code itself is unchanged.
- **every test job:** `test/e2e/client-wait.test.js` requires that a wait as long as the protocol timeout (90 s) in a
  browser suite use `waitForFunctionLong`, and `test/ui/dev-sandbox.e2e.test.js` had three plain 90 s
  `page.waitForFunction` calls. They now use `waitForFunctionLong`, with the same timeout and polling.
- **every test job (`aa6f2a9f`):** `sharp`, an optional dependency since the outfit system (`50f72d28`), lists its
  per-platform builds (`@img/sharp-darwin-arm64`, …) in `package-lock.json`, and npm installs only the current
  platform's. `test/plugin-package.test.js` ("offline release stage …") copied every production lock entry and
  asserted it was installed, so it failed on every runner. It now skips an optional entry that isn't installed.
- Not fixed, because it's not ours: on the Windows node 22 runner only, `test/update-package.test.js` once failed with
  "zipping failed: install `zip` (or a bsdtar `tar`)". That's the runner's archiver, and Windows node 24 passed the
  same test.

Checked:
- The four touched test files pass locally (Linux, 93 tests). Typecheck and lint are clean, and the guard test passes.
- The full `npm test` run and the Windows jobs are covered by CI on this branch.

This merge was small because it came soon after 0.3.1. At upstream's current pace, merging on each upstream release keeps
it that way, and sending generic fixes (like these Windows ones) upstream first removes the conflicts altogether.
