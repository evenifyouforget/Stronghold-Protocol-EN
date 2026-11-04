# CI: the Python 3.8 syntax check runs on ubuntu-24.04

Base: `mini/0.3.1-4`. Branch `fix/py38-ci-ubuntu-2404`. PR #112.

`ubuntu-latest` became Ubuntu 26.04 (first seen 2026-11-02), and `actions/setup-python` has no Python 3.8 build for
it. Every run's `local-extract (Python 3.8 syntax)` check now fails:

> The version '3.8' with architecture 'x64' was not found for Ubuntu 26.04.

It's failing on #108 (mini → main) and on every PR. This takes upstream's fix (sganggs 1fa4d9f0): the job runs on
`ubuntu-24.04`, the test pins it, and `docs/CI.md` says why. Upstream's `docs/history/0.3.4.md` lines and an
unrelated `docs/CI.md` paragraph (#881) are left out; #111 brings them with the rest of sganggs `dev`.

## Tests

- `test/local-extract-python-ci.test.js` passes locally.
- This PR's own `local-extract` check is the real test.
