# Sync main with Yuri's dev-0.2 (0.2.6)

Target: `main`. Branch `wip/sync-yuri-0.2.6`. Brings in Yuri's `dev-0.2` at `b0cfec7c`: upstream 0.2.6 (content-hashed
asset URLs, brotli, the healthz traffic / loop / sim meters, the Spine bound fixes, the scene and impostor work …),
Yuri's own changes, and our PRs Yuri merged (#6 server maintenance, #10 status details + battle visuals, #11 the
dev-0.2 CI fixes).

## How it was built

Our earlier syncs were squash merges, so git's merge base for main and dev-0.2 is far back (`c4a1b445`) and a plain
merge reports 56 conflicts, mostly the same change on both sides. Instead:

1. Start from Yuri's `dev-0.2`.
2. Apply our fork's changes since the last sync (`9588c00e` → main, 152 files) as a three-way patch: 16 real overlaps.
3. Resolve those by hand: Yuri's side where it already had our merged work or newer text (`routes.js`,
   `server/index.js`, `main.js`, `docs/design/client.md`); the fork's additions kept (the custom-lobby `CUSTOM_RULES`
   error, the Blood Ledger `bl` snapshot field in the docs, the flame texture import); the generated game texts and
   the UI strings merged entry by entry (Yuri's entries, plus our fork-only ones: Patriot's texts, every SPA-CC string).
4. Record the result as a merge commit with parents main and `dev-0.2`: this PR has no conflicts, and the next sync
   has a correct merge base.

It also carries `801a9c64` (ja / ko / zh-TW for every SPA-CC text, the TODO update, the Degenbrecher note), pushed to
`wip/spacc-visuals` 15 minutes after #22 was merged.

## Tests

- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container) — golden replays,
  data checks and the generated-file tests included.
- Worth a quick playtest: a normal match (0.2.6's asset URLs with our fork's Patriot art), and a custom lobby with a few
  SPA-CC tags.
