# zipFolder says why zipping failed; Windows uses its own tar (#28)

Target: `main`. Branch `wip/zip-diagnostics`, stacked on `wip/sync-yuri-0.3.1` (merge that one first; this PR's own
diff is the last commit). It's independent of #38, #41 and #42. It also applies unchanged to Yuri's `dev-0.2`, which has
the same `zipFolder` and the same flaky test.

Refs #28. It doesn't close it yet: the issue is done when the cause is known from a failing run's log, or the test
passes on Windows CI several runs in a row.

## What

In `tools/package.mjs` `zipFolder`, which `npm run package` and the zip-reader test use:
- **The error says why.** It names each tool's exit status (or spawn error) and output. Info-ZIP writes its errors to
  stdout and tar to stderr, so both are kept, up to the last 600 characters each. Before, it threw only "zipping failed:
  install `zip` (or a bsdtar `tar`)", and the tools' own messages never reached the test report.
- **Windows uses its own bsdtar,** `%SystemRoot%\System32\tar.exe`, when that file exists. Before, it used whatever
  `tar` came first on `PATH`, which can be Git for Windows' GNU tar. GNU tar has no `--format zip` (step 2 of the
  issue). Everywhere else nothing changes.
- **A partial archive is removed before tar runs.** If `zip` fails partway, it can leave a file behind, and `zip`
  appends to an existing archive.

The tools' output is no longer printed live. It only shows up in the error, and only when both tools fail.

Example, from a folder that doesn't exist (Linux, where tar is GNU tar):
`zipping failed: install `zip` (or a bsdtar `tar`). zip: exit 12 — zip error: Nothing to do! (…); tar: exit 2 — tar: zip: Invalid archive format | …`

## Tests

- `test/update-package.test.js` and `test/package.test.js`: 29 / 29 pass.
- Typecheck is clean and lint has no warnings in the file.
- Windows CI is the real test. The next time the flake happens, the log will name its cause.
