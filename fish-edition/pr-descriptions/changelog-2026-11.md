The in-game changelog for what reached main since 0.3.3: #136 and #138 didn't add any. Fish: "we really should be
updating the changelog anytime anything goes into main".

Base: `main` (ab9a3d19, #138). Branch: `docs/changelog-spacc-2026-11`.

## Changelog

**Release notes**

- `CHANGELOG.md` / `CHANGELOG.en.md` get a **Fish Edition** section at the top of 0.3.4 (Unreleased): the SPA-CC
  balance update (#138), one line per tag family, with the α levels; the sub-wave fix and the 300k leader-hit limit
  (#136, #131); the `fish-patriot` bot profile. The section says its numbers are this fork's PRs (the rest of the file
  uses upstream's).
- **The Release Notes panel now shows the unreleased section first.** Before, it started at the running version (0.3.3),
  so nothing written under 0.3.4 ever reached players, though this server runs main. Now its first page is
  "0.3.4 — Unreleased", then 0.3.3 and older, as before. The section's "In development (not released with the
  version)" part is left out of the panel, since that code isn't on the server.
  (`public/js/ui/releaseNotesModel.js` `forkReleaseSections`; upstream's `releaseSections` is unchanged.)

## Tests

- `test/ui/release-notes.test.js`: the unreleased section comes first without its In development part; a released newer
  section is not shown; both real changelogs open on a page with the Fish Edition section.
- `test/ui/release-notes.e2e.test.js` (browser, `SP_E2E=1`): the panel opens on 0.3.4 with Fish Edition, then 0.3.3,
  then 0.3.2. Passed here with Chromium.
- Full suite: CI.

## Known issues

- The lobby's update banner (Yuri's "Update 0.3.4-2", coming with the next sync) doesn't list Fish Edition changes. The
  Release Notes button on the title screen is where they show.
