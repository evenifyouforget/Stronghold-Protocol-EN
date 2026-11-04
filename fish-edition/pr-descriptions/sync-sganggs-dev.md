# Sync sganggs dev after 0.3.3 (per-seat bots, recent bot work)

Base: `mini/0.3.1-4`. Branch `wip/sync-sganggs-dev-2`. PR #111, replaces #109.

#109 was squash-merged into its base, `wip/sync-sganggs-0.3.3`, after #106 had been squashed into the mini, so its
content never reached the mini. This branch is the mini plus #109's final tree, unchanged (the mini's tree is #106's
head, which #109 was built on). The text below is #109's.

This merges sganggs `dev` at `bfd2a920`: the 111 commits after 0.3.3, no release yet (0.3.4's notes are in
`docs/history/0.3.4.md`). The repo merges PRs by squash only, so the next sync again needs the custom merge base
(see Known issues).

What it brings, for the bot research above all:
- **Per-seat bot strategies** (sganggs #890, part of RFC #816): `SP_BOT_STRATEGY_SEATS` / `Match.botFor(ps)`, so one
  match can seat different bots, e.g. a new tactics profile against `legacy`.
- **Upstream's bot work** (≈ 40 "Bots:" commits): engine-first buying, layer trades, co-op play, Final Assault
  lineups re-chosen for damage with the boss rehearsal picking between them, six rehearsed layouts per prep instead
  of three, no shop level 6, band picks weighed by how well the bots play each band, and more.
- **`botbench --layers`**: a per-bond layer ledger of each match (META.md).
- **Manual seats and an LLM agent adapter** (file-driven solo / co-op seats, Anthropic Messages). Opt-in tools.
- **Optional P2P relay** of the public match state over WebRTC (`SP_P2P`, off by default).
- Fixes: 鸭爵's swap (#839), 乌尔比安's 【移动】 (#903), two identical items on one operator (#902), channelled
  casts (#904), Titi S2 (#906), enemy wind-up facing (#869), and UI fixes (#886, #888, #889, #692, #657, #603).
- Our #46 talent airstrike went upstream as sganggs #861; it now comes back as upstream's.

## How it was merged

41 files conflicted. 34 hunks merged token by token where the two sides' edits don't overlap; each was read after.
The rest by hand, keeping both:
- **Server**: `infra.js`: upstream's `botFor` beside our `startLp` (the doubleLp cheat). `audit.js`: upstream's
  departed-seat check (0 LP), then our start LP. `lobby.js`: upstream's `PeerRelay` and its p2p routing before our
  retiring-generation check; our matchmaker / records / alt-art fields kept. `bot.js`: upstream's wider rehearsal
  (`maxCandidates`) with our host count (`SP_BOT_REHEARSAL_HOST`).
- **Shared**: `protocol.js` imports both `RULE_KEYS` and `REHEARSAL_MAX_CANDIDATES`. `plugins/ui.js`: both `p2p.*`
  and our `queue.*` intents.
- **Client**: `detailPanel.js`: upstream's item progress plus our outfit owner. `units.js` / `windup.js`: upstream's
  wind-up facing (#869) plus our lord / agent melee clips, which take the same target. `settings.js`: upstream's
  three-level deploy fold (#692) with our default.
- **ko.json**: our layout, with upstream's changed strings applied by key.
- **Tests**: upstream's `seedReleaseRead` (the release notes, #603) before our `?lang=zh` / mock-page navigation.
  `asset-download.browser.test.js` stays deleted, as Yuri deleted it (Yuri 51974653, 0.3.0 import fixes).
- **Docs**: README / META / client.md / network.md merged word by word.
- `README.md`: `SP_BOT_REHEARSAL`'s default is now upstream's 6 (it said 3). The host browser's count
  (`SP_BOT_REHEARSAL_HOST`) keeps its own default of 3: it used the shared constant, which upstream raised.
- i18n: upstream's extractor now flags literals inside a computed msgid (#849); three fork strings go through `N_()`.
- `deploy-middle` test (upstream's #692): a missing value takes the fork's default, off.

### Regenerated, not hand-merged
- `test/golden/*.json` and the three versions' goldens (`golden.mjs --update`, `--version <id> --update`). Per
  family, the merged goldens differ from upstream's in as many scenarios as #106's did from 0.3.3's (bonds 32,
  diy 117, fields 17, roster 48, standins 10), plus one in matches: solo-FUNNY-2, a scenario upstream's bot work
  itself changed (21 of 21).

## Tests

- Local: lint (0 errors), import boundaries (the 3 known `nodeData.js` notes) and typecheck pass. The full suite
  (4 shards) fails on only two tests, which need things this container lacks: IPv6, and an asset copy as new as
  the manifest (skipped in CI). The sandbox tests need a real `node_modules` (a symlinked one fails the Node
  permission model's read checks).
- CI on this PR is the quick tier only.

## Known issues

- Squash-only merging drops upstream's history from every sync: the next one again has to merge against a hand-picked
  base. Allowing merge commits for sync PRs would make it a plain `git merge`.

- Six rehearsed layouts instead of three: more server CPU for each AI teammate's prep when the host's browser doesn't
  take it (`SP_BOT_REHEARSAL` sets it back).
- Our H3 / H4 bot measurements (fish-edition/ai-players.md) need a new baseline on this bot. Upstream's "no shop level
  6" also runs against our finding that tier-6 operators are what the human boards have over the bot's.

## Next

- The tactics API as a registry entry, compared against `legacy` with `botbench --bot` / `--compare` and
  per-seat matches.
