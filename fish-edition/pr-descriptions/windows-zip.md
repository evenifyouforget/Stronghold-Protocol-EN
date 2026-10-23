The intermittent Windows CI failure is the zip-reader test: Windows' own `tar.exe` crashes on the GitHub runners. `zipFolder` now falls back to a built-in zip writer, and CI reports failed tests as annotations.

Base: `mini/0.3.1-2`. Branch `wip/ci-annotations`. Unblocks #66, whose Windows shard 2/3 failed four times out of four on node 22 and 24.

Closes #28

## What failed

The job logs can't be downloaded from the dev container, so the first commit makes the failures readable another way. Run on `mini/0.3.1-2`, it showed:

```
test/update-package.test.js:299 test failed: the zip reader: stored and deflated entries, zip64, UTF-8 names; damaged and foreign zips are refused
Error: zipping failed: install `zip` (or a bsdtar `tar`). zip: spawnSync zip ENOENT; C:\Windows\System32\tar.exe: exit 3221225477
    at zipFolder (tools/package.mjs:666:11)
```

- 3221225477 is 0xC0000005, an access violation: `tar.exe` itself crashed.
- The runners have no Info-ZIP `zip`, so nothing else could write the zip.
- The failure only looked random because test files are dealt to shards by their place in the sorted list. Adding a test file moves `update-package.test.js` to another shard, so the failure seemed to jump around.

## Changes

- **`tools/test-tier.mjs`:** on a runner, each failed test is also printed as a GitHub `::error` annotation, with its file, line, name and the error's first 12 lines. A parent that fails only because of its subtests is skipped. The API serves annotations (`check-runs/<id>/annotations`) even when the log can't be fetched.
- **`tools/package.mjs` `zipFolder`:** Info-ZIP `zip`, else bsdtar, else the built-in writer.
  - The built-in writer is `writeZip` from `tools/preload-pack.mjs`, which already wrote the preload pack. It writes UTF-8 names and deflates everything except already-compressed media.
  - It needs `zlib.crc32` (Node ≥ 22.2). Without it, the old error stays.
  - If all three fail, the error names all three.
  - On a user's Windows machine, packaging now also works when `tar.exe` fails.
- **New test** in `test/update-package.test.js`: `zipFolder` with nothing on PATH. The built-in zip reads back with the right files, contents and the UTF-8 name 卫戍.

## Tests

- `node --test test/update-package.test.js test/package*.test.js test/fetch-release-local.test.js test/plugin-package.test.js`: 43 of 44 pass, including the new one. The one failure is `plugin-package.test.js`. It also fails without this change, because my scratch worktree borrows a `node_modules` that lacks `@endo/cache-map`.
- `test/ci.test.js`: 11 of 11 pass. ESLint shows no new warnings, and the import check passes.
- Full CI, started by hand on this branch ([run 40018097366](https://github.com/evenifyouforget/Stronghold-Protocol-EN/actions/runs/40018097366)): all 12 test jobs and tooling pass, including the three Windows shards on node 22 and 24.
