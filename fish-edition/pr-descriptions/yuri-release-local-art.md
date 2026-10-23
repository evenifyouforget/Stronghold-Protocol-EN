> [!IMPORTANT]
> Pick one type of change and fill in everything below. Write "None" where there is nothing to say and "N/A" where it does not apply.

## Type of change

- [ ] fix: bug fix
- [x] feature: new feature
- [ ] docs: documentation
- [ ] refactor: refactoring
- [ ] test: tests
- [ ] chore: maintenance

## What changed

> [!NOTE]
> Say clearly what the problem was, why it happened and what the change covers.

- What changed: an install without an Arknights client (a Linux server running from source or from the lite package, say) has no `public/assets/local/`, so it misses the official board, the scenes, and the enemy and summon models. DEPLOY.md §6 said to copy that folder and `data/local-assets.json` by hand from the full release zip of the same version. This adds a script that does it:

  ```
  npm run assets:release-local        # = node tools/fetch-release-local.mjs
  ```

  - **It reads only what it needs.** It reads the zip's central directory (a few MB), then the local-art entries, with HTTP range requests: about 200 MB of the ~800 MB v0.3.1 zip. Nothing is unpacked by hand.
  - **Same version by default:** `v<package.json version>`, as DEPLOY.md asks. `--tag v0.3.1` picks another release, `--latest` the newest, `--repo` another GitHub repository (default `sganggs/Stronghold-Protocol`), and `--url` any full-package zip on a server that answers range requests. `--dry-run` lists what it would fetch.
  - **It touches nothing else.** It writes only `public/assets/local/` and `data/local-*.json`, which are git-ignored. The code, the data, the other assets and any local changes stay as they are.
  - **It's safe to run:** every file is CRC-checked; files are staged in `.cache/release-local/<tag>/`, so an interrupted run resumes; the current local art is moved to `.cache/release-local/previous-<time>/`, never deleted; a failed run swaps nothing in; re-running with the same release changes nothing.
  - **Node only** (no Python, no unzip), so it works the same on Linux, macOS and Windows.
  - GitHub's release storage refuses suffix ranges (`bytes=-N`, HTTP 501), so the script reads the file size from a 1-byte read first.

  The places that told admins to copy the local art by hand now name the script first, with copying by hand as the fallback: README, the `.github/README.md` mirror, setup and doctor's local-art hint (`tools/setup.mjs`), the update warning (`server/update.js`) and DEPLOY §6. Those hints also used to leave out `data/local-fx.json`.
- Expected result: one command gives a client-less install the same local art as the full package of its version.
- Related issues / PRs: from our fork (evenifyouforget/Stronghold-Protocol-EN), where the hosts run Linux servers without a client.

## Sources and assumptions

> [!NOTE]
> For game rules, cite the official data fields, PRTS or your own measurements. Write any detail you could not confirm, and how you handled it, under [ASSUMED], and mark it the same way in the code.

- Sources: None (tooling).
- [ASSUMED]: None.

## Verification

> [!NOTE]
> Run the related tests, `npm run ci` and `npm run golden`, and record the results honestly, with the reason for anything not run or skipped. For golden changes, name the scenarios and why they changed; a refactor must not change results, and when an expected result changes on purpose, run `npm run golden:update` and commit it with the change. Attach screenshots for UI changes.

- How it was verified: new unit tests; real runs in our fork. One against v0.2.5 installed 1,707 files in 56 s, after which `node tools/doctor.mjs` reports "本地客户端美术 1658 项，3D 棋盘可用，已提取各战场官方场景". A dry run against v0.3.1 listed 14,323 files, 200.6 MB.
- Related tests: new `test/fetch-release-local.test.js`: an in-memory zip behind a fake fetch that refuses suffix ranges. It covers installing only the two targets, moving the previous files aside, a re-run that changes nothing, resuming (good staged files kept, a bad one fetched again), a CRC mismatch or a zip without the manifest swapping nothing in, a server without range support, entry selection and range grouping. `test/setup-local-freshness.test.js` follows the new hint. `node --test test/fetch-release-local.test.js test/setup-local-freshness.test.js test/docs-consistency.test.js test/ci.test.js`: 53 pass, 0 fail.
- npm run ci: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,840, of which 8,757 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none.
- npm run golden: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 141 scenarios all match.
- Golden changes: None.
- Screenshots / recordings: N/A (no UI).

## Not applicable

- Items that do not apply: the docs checks for rules, the Fidelity checklist, screenshots.
- Why: tooling and deployment docs only; no game code, no rules, no UI.

## Checklist

> [!IMPORTANT]
> Last step: look over your answers and tick only what you have done.

- [x] This PR handles one topic only
- [x] I ran the related tests, `npm run ci` and `npm run golden`, and filled in the results honestly
- [ ] For rule changes, I updated the docs and ran the docs checks
- [ ] For an Operator kit, it covers one Operator only and includes the Fidelity checklist with every item ticked
