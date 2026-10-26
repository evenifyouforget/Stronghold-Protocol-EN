# Sync main with Yuri's latest dev-0.2 (c05aa7e2)

Closes #51: it brings in the English issue and PR templates.

Target: `main`. Branch `wip/sync-yuri-templates`.

This brings in Yuri's `dev-0.2` from `aa6f2a9f`, the commit #39 synced, to its current head `c05aa7e2` (2026-10-21). Yuri's version is still 0.3.1.

## What's in it

The only new content is **Yuri #17, English issue and PR templates**:
- `.github/ISSUE_TEMPLATE/BugReport.en.yml` and `FeatureRequest.en.yml`: English forms next to the Chinese ones;
- `.github/PULL_REQUEST_TEMPLATE/en.md`: an English PR template, opened by adding `?template=en.md` to the new-PR page's URL;
- `.github/pull_request_template.md`: a one-line pointer to it at the top of the Chinese template;
- `test/issue-templates.test.js`: tests for the new files.

The range also holds Yuri #14's two CI fixes, but `aa6f2a9f` already contained them, so their diff is empty.

I checked Yuri's other branches. Each is either already in `dev-0.2` or an old branch from before 2026-10-10 that `dev-0.2` replaced.

## How it was applied

#39 was squash-merged, as `main`'s linear-history rule requires, so `main` has no merge link to Yuri's history. A plain `git merge yuri/dev-0.2` would go back to the 2026-10-09 merge base: 906 commits, and the whole 0.3.1 conflict resolution again.

So this is the diff `aa6f2a9f..c05aa7e2` applied on top of `main`. Every file it touches was identical in `main` and in `aa6f2a9f`, so it applied with no conflicts.

The commit message ends with `Upstream-Sync: yuri dev-0.2 c05aa7e2…`. Since squash merges keep dropping the ancestry, that line tells the next sync where to diff from.

## Tests
- `test/issue-templates.test.js` and `test/ci.test.js`: 15 pass.
- No code outside `.github/` and that test changes. This PR goes into `main`, so it runs the full CI tier.
