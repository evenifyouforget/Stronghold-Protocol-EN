Closes #43.

CI now runs in two tiers.
- The full suite still runs before anything reaches `main`, but split over 3 runners per OS × Node pair.
- Pull requests into any other branch, such as a `mini/*` branch or the branch below in a stack, get a quick tier on one runner.
- A push to a PR branch no longer starts a second, identical run.

## ⚠️ Rulesets: before you merge this

This PR's own run reports the new check names, so `main`'s current required checks (`test (ubuntu-latest, node 22)` and the other three) will never report on it, and the merge stays blocked until the ruleset changes.

1. **`main` ruleset ("no push to main branch"):** replace the four required `test (…)` checks with the one check **`full CI`**. It passes only when all 12 test shards and the tooling job passed.
2. **New ruleset for `mini/*`:** require the check **`quick CI`**, and a pull request if you want one.

Don't add `full CI` to the `mini/*` ruleset, or `quick CI` to `main`'s. On the other tier's PRs those jobs are skipped, and GitHub counts a skipped required check as passing, so they'd pass without checking anything.

## Where the time went (measured 2026-10-21/22)

**Duplicate runs.** CI ran on both `push` and `pull_request`. With different concurrency groups (`refs/heads/…` vs `refs/pull/…`), every push to a PR branch started 2 × 5 jobs. Several open PRs filled the runner limit: on 2026-10-21, jobs waited **9–23 min in the queue** before starting.

**One long test step.** The test step took 16–36 min per job and sometimes hit the 40 min limit.
- I timed each of the 908 test files on its own. 55 files of 10 s or more take ~75 % of the time.
- The four full-match files take about a quarter of it. `fullmatch-coop.test.js` alone takes ~5½ min.

## What changed

- **Triggers:** `push` runs only for `main`. PR branches get their run from `pull_request`. A branch without a PR gets no automatic run, but can be run by hand from the Actions tab (`workflow_dispatch`).
- **Full tier** (pushes to `main`, PRs into `main`, manual runs): job `test`, the same Ubuntu/Windows × Node 22/24 matrix with a `shard: [1, 2, 3]` dimension. Each runner runs a third of the files (`node tools/test-tier.mjs --shard k/3`), plus the setup check and the smoke test. The job limit drops from 40 to 30 min. `full CI` sums the tier up.
  - **Shard balance:** Node splits the sorted file list round-robin. That puts the four full-match files on different shards. By per-file times the slowest shard carries ~1.15× the mean.
  - **Why 3 shards:** a fourth would only cut the slowest shard from ~1,145 to ~970 s of CPU, for 4 more jobs.
  - **Measured locally:** the three shards took 10–12½ min each, run side by side on one machine. On separate runners I'd expect about a third of today's 16–36 min, plus ~1 min of install each.
- **Quick tier** (PRs into any branch but `main`): job `quick`, one Ubuntu runner with Node 22.
  - It runs the setup check, `npm run test:quick` and the smoke test. `quick CI` sums the tier up, with tooling.
  - It leaves out `SLOW_TEST_FILES`, listed in `tools/test-tier.mjs`.
  - Locally it ran 8,159 of the 8,930 tests (91 %) in **82 s**, against 6½–9 min for the full suite on the same machine.
  - `tooling` (lint, imports, typecheck) runs in both tiers, as before.
- **`tools/test-tier.mjs`** is the new test-step runner.
  - It drives Node's own test runner (`run()`, one child process per file, as `node --test` does) over the same `TEST_FILES` globs as `npm test`.
  - **Why not `npm test -- --test-shard=k/n`:** npm appends arguments after the globs, and `node --test` ignores `--test-shard` there, so that would quietly run every file. I checked this.
  - Handing over the file list in-process also keeps ~900 paths off a Windows command line.
  - With `--quick`, it prints a warning (a GitHub annotation on a runner) for any unlisted file whose tests took over 20 s, so the list keeps up with new slow tests. The warning never fails the run, because timings vary between machines.
- **Why a list instead of marking the files:** the slow files are a list in our own tool, not marks inside the test files. Most of them come from upstream, so marking them would conflict on every sync.
- **`tools/ci.mjs`** (`npm run ci`) mirrors both tiers. `npm run ci` runs the full suite unsharded; `npm run ci -- --quick` runs the quick tier. `test/ci.test.js` keeps it and `ci.yml` in step:
  - steps shared by two jobs must be identical in both;
  - the shard argument is the matrix's;
  - the tier conditions and the summary jobs are pinned;
  - every `SLOW_TEST_FILES` entry must exist and be sorted.
- **Docs:** CONTRIBUTING (zh + en), README (zh), ARCHITECTURE, AGENTS.

## Tests
- `test/ci.test.js`: 11 pass, including 2 new tests (the workflow's tiers; `test-tier.mjs` arguments, file selection, the slow-file warning).
- The runner against `npm test`, full suite, same tree: **identical results**. Both had 8,930 tests, 8,847 pass, 82 skipped and 1 fail. The fail is the IPv6 dual-stack bind test, which needs IPv6 and fails on `main` in this container too.
- A deliberately failing test file makes the runner exit 1. A bad `--shard` exits 2.
- `npm run ci -- --quick`: every step passes except that same IPv6 test.
- Lint, import boundaries and typecheck are clean. The workflow parses as YAML into the intended jobs, conditions and matrix.
- Not tested: a real GitHub run of either tier. This PR's run will be the first full-tier run, and the first PR into a `mini/*` branch will be the first quick-tier run.
