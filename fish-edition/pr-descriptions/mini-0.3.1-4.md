The fourth mini release on 0.3.1: upstream's 0.3.3 and its `dev` since (per-seat bot strategies, much stronger bots), the first bot tactics and profiles, Fish Edition's version and What's new on the title screen, and the Gunshatter / Bubble damage loop fixed.

Base: `main`. Branch `mini/0.3.1-4`. Squash-merged: the squash commit's message is this PR's title, so its changes stay readable in `main`'s history.

**Not ready yet**: #111 (sganggs `dev`), #112 (the CI fix every run needs) and #110 (bot tactics) are still open against `mini/0.3.1-4`. Their lines below are marked *(to come)*.

## Changelog

### Upstream
- **sganggs 0.3.3** (#106, via Yuri #22, which Yuri hasn't merged yet): the official versions (第一期 / 第二期 rooms, version vote), the bot strategy registry (`SP_BOT_STRATEGY`, `botbench --bot` / `--compare`), 「不限时」 for timed historical solo, 名片干员 seat cards and skins, the redesigned lobby and waiting room, CI in 4 shards with a Node 24 lane and a Golden job. Fork features kept throughout: lobby rules, SPA-CC, records, the AI names, the sliding push.
- **sganggs `dev` after 0.3.3** (#111, replaces #109) *(to come)*: per-seat bot strategies (`SP_BOT_STRATEGY_SEATS`, sganggs #890), ≈ 40 bot improvements, `botbench --layers`, an opt-in P2P relay of match state (`SP_P2P`), fixes for 鸭爵, 乌尔比安, 缇缇, channelled casts, two identical items, enemy wind-up facing, and UI fixes. The bot rehearses 6 layouts per prep instead of 3 (`SP_BOT_REHEARSAL`); the host browser's count stays 3.

### Bots
- **Tactics and profiles** (#110) *(to come)*: a profile is an ordered list of tactics with legacy at the bottom, registered as an ordinary bot strategy (fish-edition/ai-players.md). Two opt-in profiles, `fish-level` and `fish-tier6`, from the hypothesis tests. Nothing changes unless one is selected; selecting one in the room is #107.

### Features
- **Fish Edition's version on the title screen** (#102, closes #98, #99, #100): the version and commit, What's new from git, and issue links prefilled with the version.

### Fixes
- **Gunshatter's Arts shield counter** (#37 by j-tai, closes #27): tagged as a counter, so Bubble's S2 no longer answers it in a loop.

### Tools and CI
- **The Python 3.8 syntax check runs on ubuntu-24.04** (#112) *(to come)*: `ubuntu-latest` became Ubuntu 26.04, which has no Python 3.8 build, so the check failed on every run.

### Fork notes
- The notes of the loops of 2026-11-01 (#103): the hypothesis tests on human Final Assault boards and the bot (ai-players.md H1–H9, H12), TODO.md, `pr-descriptions/`.

Closes #27
Closes #98
Closes #99
Closes #100

## Known issues

- PRs here merge by squash only, so upstream's history doesn't come with a sync: each one needs a hand-picked merge base.
- `docs/DEPLOY.en.md` lacks upstream's new §11 / §12 (official versions, capacity).
- The bot measurements in ai-players.md were on the 0.3.1 bot and need a new baseline.
- Windows full CI has failed one shard intermittently since 0.3.1-1.
