# Point admins without a client to `npm run assets:release-local`

Target: `main`. Branch `wip/release-local-hints`, stacked on `wip/sync-yuri-0.3.1` (merge that one first; this PR's
own diff is the last commit). Docs and messages only, so it's also fit for Yuri.

## Why

`tools/fetch-release-local.mjs` (#24) was only mentioned in DEPLOY §6, after the steps for copying by hand. Everywhere
else an admin would look told them to copy `public/assets/local/` and `data/local-assets.json` from the full package.
Since 0.3.0 that advice is also incomplete: it leaves out `data/local-fx.json`, so no official battle effect shows.

## What

| Where | Before | Now |
|---|---|---|
| README, "Run from source" (zh, and `.github/README.md` en) | copy by hand | `npm run assets:release-local` first (about 200 MB of the ~800 MB package, checkout untouched); copying by hand is the fallback |
| `npm run doctor` / `npm run setup`, no-client hint (`tools/setup.mjs`) | copy by hand | names the script and `data/local-*.json` |
| Update warning about missing local art (`server/update.js`, zh and en) | copy from the full package | run the script |
| DEPLOY §6 (zh and en) | script one paragraph after the hand-copy steps | the paragraph opens with the script |

Not changed: setup's one-line no-client message, printed on every start. Upstream keeps it short with a pointer to
DEPLOY §6, and a test enforces that.

## Tests

- `test/setup-local-freshness.test.js`: the two hint strings it compares word for word are updated.
- The README keeps the phrases upstream's doc-completeness test pins.
- `npm test`: 8,926 / 8,974 pass. The 2 failures are the same environment-only ones as in the sync PR (the
  manifest-on-disk check, IPv6).
