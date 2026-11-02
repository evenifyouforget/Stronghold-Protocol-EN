# Sync sganggs 0.3.3 (via Yuri #22)

Base: `mini/0.3.1-4`. Branch `wip/sync-sganggs-0.3.3`.

This merges the head of Yuri #22 (YuriRestia/Stronghold-Protocol-EN-translation, `3a269451`): Yuri's `dev-0.2` merged
with sganggs' 0.3.3 (`f07b8965`). Upstream's 0.3.2 / 0.3.3 add, among others:
- the official versions (第一期 / 第二期 rooms, version vote, version match hosts);
- **the bot strategy registry** (`defineBotStrategy`, docs/BOT_STRATEGIES.md; `botbench` / `matchrun --bot`,
  `botbench --compare`), with three opt-in bots; this is what our bot research builds on;
- 「不限时」 for timed historical solo, 名片干员 seat cards and skins, the redesigned lobby and waiting room;
- the CI shards (`tools/ci-shards.mjs`, `tools/test-run.mjs`), a Node 24 guard lane and a separate Golden job;
- `server/sim/damage.js` split into `server/sim/attack/*`.

It's an ordinary merge commit with both parents. Once Yuri merges #22, the next sync is a plain `git merge`.

## How it was merged

The real merge base is old: our earlier syncs from Yuri came in squashed (#54), so git saw 363 conflicting files.
The merge was done against `c05aa7e2` instead (Yuri's `dev-0.2` as #54 brought it in): 57 files, all resolved.
The rule throughout: keep both. Fork features stay, and upstream's go in around them.

### Server
- **Gunshatter's counter / #27**: upstream rewrote 碎铳之簧's shield and already makes the counter sourceless
  (`source: null, credit: e`): the same fix as #37. Upstream's `bosses.js` and `enemies/helpers.js` are taken (our
  `hurt()` `sourceless` option is dropped as unused); #37's test stays as the regression check.
- **`damage.js` → `attack/health.js`**: the SPA-CC boss-pool line (`pool.damage(pid, amount, type)`, which ccOzArts /
  ccOzPhys need) is ported to the new file.
- **Timers** (`match/infra.js soloUntimed`): upstream's rule (historical solo is timed unless 「不限时」), and our
  `untimed` lobby rule switches the timers off in solo and co-op alike.
- **Lobby**: upstream's versions, 「不限时」 and AI takeover vote beside our `room.setRules` and the AI names in the
  host's language (#89). Same in `shared/protocol.js` and `shared/constants.js`.
- **Combat**: our SPA-CC risk bounties (`waveBounties`) with upstream's `waveSpawns` (鸭爵's shared draw, #839), and
  in `bands/meta.js` ccStrategyLate's `namedRound` with upstream's per-round duck RNG and `onPrepStart`.
- **Server start / host**: `writeServerInfo` (#102) and `recordsDir` with upstream's `roomCode`; the match record
  message beside upstream's version-host crash kind.
- **Angelina's talent strike**: upstream's rewrite, which already has our `talent: true`.

### Client
- **Room** (`screens/room.js`, `room.css`): upstream's layout with our lobby rules bar (`RulesBar`); the old
  `.ready-count` styles upstream dropped stay dropped.
- **Stats / results**: upstream's `version` on records, with our `rules` (#78).
- **Items**: upstream keys item plates by icon URL; our Toxic Waste `invert` and cursed flame stay.
- **Units**: upstream's 锏 `withoutSkill`, plus our 爱国者 clips.
- **Tooltip**: upstream's new props, plus our `style`.
- **i18n**: both sides' new strings (en / ja / ko / zh-TW); no key differs between them.

### Tools and CI
- **ci.yml keeps our two tiers.** The full tier (main) runs upstream's jobs: 4 shards × Ubuntu / Windows on Node 22,
  `node24` (the CI guards) and `golden`. The quick tier (PRs into other branches) is unchanged. The required checks
  keep their names: `full CI` now needs `test`, `node24`, `golden` and `tooling`; `quick CI` needs `quick` and
  `tooling`. `tools/ci.mjs` and `test/ci.test.js` follow.
- **Packaging** (`tools/package.mjs zipFolder`): ours is kept (Windows' own `tar.exe`, then the built-in zip writer,
  GitHub #28) over upstream's version of the same fix (#840); upstream's tests for its error text are left out.
- **botbench**: our `--rules` with upstream's `--bot` and its new `--band` (forces only the opening `pickBand`).
- **fetch-assets / plan**: upstream's version-union planning, with our `eventSfxEnemyIds` (fork enemies' event sounds).

### Docs
- Long lines both sides edited (network.md, SIM.md, README) are merged word by word.
- `docs/DEPLOY.md`: upstream's new §11 (official versions) and §12 (capacity); our match records section is now §13
  (README's link follows).

### Regenerated, not hand-merged
- `data/assets.json`: `node tools/fetch-assets.mjs --add-only`. It keeps every entry of upstream's and adds ours
  (爱国者). The 28 entries of ours it lacks are 弑君者's old sound pool keys, which upstream renamed (0.3.2 mode banks).
- `test/golden/*.json`: `npm run golden:update`. Per family, the merged goldens differ from upstream's in exactly as
  many scenarios as ours differed from the base before (bonds 32/46, diy 117/141, fields 17/22, matches 20/21,
  roster 48/49, standins 10/10): the fork's own changes, nothing new.
- `test/audio-pools-data.test.js`: upstream's counts + 爱国者's 2 references and 2 pools (991 / 1032).

## Tests

- Local: lint (0 errors), import boundaries and typecheck pass. The full suite (4 shards) was still running when
  this PR was opened; results follow in a comment.
- CI on this PR is the quick tier only (base `mini/0.3.1-4`); Windows, the full shards and Golden run when the mini
  goes to main.

## Known issues

- `docs/DEPLOY.en.md` (our translation) doesn't have upstream's new §11 / §12 yet.
- Our H3 / H4 bot measurements (fish-edition/ai-players.md) were on the 0.3.1 bot; 0.3.3's `legacy` levels to L5 at
  R9 and L6 at R11 (§35.63), so they need a new baseline.

## Next

- Merge sganggs `dev` for the per-seat bot choice (sganggs #890, after 0.3.3) and upstream's recent bot work.
- The tactics API as a registry entry (fish-edition/ai-players.md "Standard terms for the new bot").
