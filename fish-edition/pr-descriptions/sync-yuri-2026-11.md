# Sync sganggs dev and Yuri's dev-0.2 (2026-11-07) into main

Target: `main`. Branch `wip/sync-yuri-2026-11`.

Fish asked for sganggs → here. Yuri had already merged sganggs `dev` at `eff7d93a` (2026-11-06) into their `dev-0.2`
(Yuri #22, then their own merge `4d12f915`). So this PR does both steps, as two merge commits:

1. **sganggs `dev` at `eff7d93a`** (602caa0a): the sganggs work after `bfd2a920`, the commit #111 brought in.
2. **Yuri's `dev-0.2` at `e2fd04b3`** (2026-11-07): Yuri's own side of that merge and what came after.

## What's in it

**From sganggs (`bfd2a920..eff7d93a`, unreleased 0.3.4 work)**
- Three new DIY (自选) operators: Toska (冻河), Territoriya (国度) and Talulah (塔露拉), with their kits, data and tests.
- Upstream's bot changes. The legacy prep now starts with `selfPlan` and `pagerUse`, and `advisorSpendSteps` is now
  `planSpendSteps`. Our tactic profiles get the same start through a new `legacyPrepPreamble` in `server/match/bot.js`,
  so the "a profile with no actions plays like legacy" test still holds.
- The board's bracketed textures and the entry film's cue come from the asset manifest (sganggs #725). Also the CI
  bars for the bot prep cost guard, and many smaller fixes.

**From Yuri (see their `FORK-CHANGELOG.md`, 2026-11-07)**
- **Release notes open only from the title screen's button**, with no automatic opening, because the lobby has its own
  update banner. Non-Chinese pages read `CHANGELOG.en.md` (Yuri now ships its 0.3.4 section).
- **The entry film plays once per browser tab session**, not on every page load.
- **Damage meters:** one metric at a time (Damage / DPS / Healing / HPS) on the result screen and in the in-match
  panel.
- **Sound:** `data/assets.json` on a complete FX index. 19 older operators get their battle voices, and some (Glider,
  Ceylon) get attack sounds they were missing. A server needs `node tools/fetch-assets.mjs` for the new files.
- **Outfits:** 26 more, for the operators only Season 1 has.
- **English text in Season 1 and Season 2 part 1 rooms:** `data/versions/<slug>/i18n/en.json`.
- **English text for Toska, Territoriya and Talulah** in `tools/i18n/fallback-new-ops-en.json`, until official EN data
  has them.
- **Docs:** `SP_P2P`, `SP_BOT_STRATEGY_SEATS` and the rehearsal default of 6, in the English README and DEPLOY guide.
- Child processes no longer open console windows on Windows.

## How it was merged

The repo squashes, so neither upstream nor Yuri shares a usable merge base with `main`, and I picked the bases by hand.

- **Step 1:** merge base `bfd2a920`. That is the sganggs commit our last sync (#111, inside #108) reached. 37
  conflicts, resolved file by file. Test counts and lists are the union of both sides.
- **Step 2:** Yuri's `4d12f915` already holds the same sganggs commit, so I used a synthetic base: `4d12f915` with
  Yuri's three commits before it reverted (`5ec92f9c`, `945a6f55`, `74357ca7`). The merge then brings in only Yuri's
  own changes. Two things that base hid were added back by hand:
  - **Edits Yuri made inside the merge commit itself:** the release notes and entry film behaviour above, the docs,
    `tools/package.mjs` (which ships `CHANGELOG.en.md`) and `tools/build-i18n.mjs` (which reads the new-ops fallback).
    I took them from the diff between git's automatic merge and Yuri's result, for the files that merged without
    conflicts. Where Yuri resolved a conflict, our step 1 resolution stands.
  - **Yuri's `data/assets.json`:** merged key by key against upstream's `eff7d93a`. The only conflicts were the hash
    and the stats.
- **Data is rebuilt, not hand-merged:** `build-data`, which changes nothing beyond the merge, and `build-i18n` for all
  four languages. Each pack has both sides' keys, and our own term overrides are kept.
- **Goldens:** regenerated in step 1 and unchanged by step 2. `golden.mjs --check` passes.
- **One duplicate key** both sides added (`pauseShort` in `ui/preload.js`) is left once.

## Known issues

- **`data/assets.json` `stats.bytes` is an estimate,** and so was step 1's. Neither side's files are all on disk here.
  The hash and every other stat are recomputed from the merged manifest. The next `fetch-assets` run on a server with
  the full art sets the exact number.
- **Server-side bots:** Yuri's note says upstream's new bot logic runs on the server, and Yuri isn't deploying it until
  bot calculation moves to the host's browser. Yuri is working on that. Our server runs the same code after this PR,
  so watch the CPU on deploy.
- **The next sync needs custom merge bases again** (squash-only). The merge commits record `eff7d93a` and `e2fd04b3`.

## Tests

- Lint: 0 errors. Typecheck: OK. `golden.mjs --check`: all scenarios match.
- Full suite on a fresh `npm ci`: all pass except these environment failures, none of them caused by this PR:
  - the two HTTP version tests, which fail on `main` too on this machine;
  - the dual-stack bind test, because this container has no IPv6;
  - four checks that need every manifest file on disk: the 自选 assets, "every manifest path exists", the Spine
    loads and the `voiceJp` files. My local `public/assets` predates the new operators. CI has no art and skips
    them.
- One plugin-studio trial timed out while a bot benchmark was using the CPU. It passes when run alone.
- Counts updated for the merged manifest: `voiceJp` has 215 operators and 3,009 files (as Yuri's), and the audio
  pools have 1,042 refs and 1,046 pools (ours 1,028 / 1,032, Yuri's 1,040 / 1,044, two shared).

When squashing, end the commit message with:

```
Upstream-Sync: sganggs dev eff7d93abbd1bd6986e2e9c2d7a1e066b1975bbc
Upstream-Sync: yuri dev-0.2 e2fd04b36678ce5f3152096a7e1e3ac0ec75ed1f
```
