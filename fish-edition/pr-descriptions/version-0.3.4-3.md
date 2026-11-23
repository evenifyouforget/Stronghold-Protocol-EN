The real version for the release that is `mini/0.3.3-2` (Fish, 2026-11-19: "give it an actual 0.3.4-xxx version number as one of the last steps before the mini branch goes into main"). It is **0.3.4-3**: Yuri's lobby banner already used 0.3.4-1 and 0.3.4-2. Into `mini/0.3.3-2`, so that #188 is ready.

Base: `mini/0.3.3-2`. Branch `release/0.3.4-3-version`.

## What it does

- Version fields: `package.json`, `package-lock.json` (2 fields), `APP_VERSION` in `shared/constants.js`, the README badge, and both changelogs' top heading: `## 0.3.4-3 — 2026-11-24` (it was "Unreleased").
- The changelog fragments are folded in (`npm run changelog:fish -- --write`: 12 pairs; the files are deleted), and each of my bullets now ends with its PR number as the format asks (#184, #185, #186, #187).

## Code that assumed a plain x.y.z

A numbered update (`x.y.z-N`) is a release, not a development build, so three places change:
- `test/version.test.js`: accepts `x.y.z-N`; the changelog heading check accepts it too.
- `public/js/ui/releaseNotesModel.js`: the heading and "newest" patterns accept `-N`, so the in-game release notes still find the section.
- `tools/package.mjs`: `isDevVersion` was "any `-`"; it is now any `-` suffix that is not just digits (`0.3.4-dev`, `0.2.0-rc1` stay development builds; `0.3.4-3` packages as a release, tag `v0.3.4-3`).
- `test/ui/release-notes.test.js`: the "development part is hidden" check applies only to an unreleased section (once released it is the shipped one, like 0.3.3's).

`server/update.js` already accepts a suffix, and plugin ranges use the numeric core, so nothing else needed to change.

## Not changed

The Chinese README line "当前版本 0.3.3：…" (upstream's text about 0.3.3). The `-dev` handling.

## Tests

`test/version.test.js`, `test/ui/release-notes.test.js`, `test/changelog-fish.test.js`, the update, plugin, language and diagnostics tests pass; lint and typecheck pass. (In one big parallel run three plugin sandbox tests failed on load; they pass alone, 6 of 6.) CI runs the full suite.

— Claude (orca)
