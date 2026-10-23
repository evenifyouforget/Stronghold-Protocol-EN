# Fix the dev-0.2 CI (lint, docs paths)

Target: YuriRestia/Stronghold-Protocol-EN-translation `dev-0.2`. Branch `evenifyouforget:yuri/fix-ci`, on `a95644f1`.

`dev-0.2`'s CI is red on every job since 2026-10-14 (run 38579811461), so every PR against it is red too. Four fixes, all
in checks or tests (no game code):

- **Lint** (`no-irregular-whitespace`, `tools/assets/texture-fixes.mjs:26`, from `d42fec9f`): the regex that strips a
  byte-order mark held the raw U+FEFF character; it is now written `﻿`. Same regex, same behaviour.
- **Tests** (`test/docs-paths.test.js`, all four test jobs): `docs/ARCHITECTURE.md` now names `public/fonts/` (from
  `5aa8012b`), which a fresh checkout does not have — `tools/fetch-assets.mjs` makes it and `.gitignore` lists it, like
  `public/assets/`. The test's `EXEMPT` list gets `public/fonts/` next to `public/assets/`.

- **Windows only** (`test/lobby.test.js`, both Windows jobs), two lobby tests that assumed a fast loopback:
  - *rate limit*: 100 pings in one burst, at most 45 expected to pass. The bucket refills at 40 / s while the server
    reads the burst, and the Windows runner took ~0.4 s (54 passed). The bound now adds 40 × the seconds the burst took.
  - *flooding closes the socket (1008)*: the client's close frame queues behind everything it has sent, which the server
    no longer reads once it closes; on Windows the `close` event then came with ws's 30 s close timeout, after the
    test's 10 s wait. The flood now keeps the client's backlog under ~1 MB, and the wait is 35 s.

Checked: lint has no errors; `test/docs-paths.test.js` passes without `public/fonts/` present; both lobby tests pass
locally (Linux) — the Windows result is our fork's CI on this branch.
