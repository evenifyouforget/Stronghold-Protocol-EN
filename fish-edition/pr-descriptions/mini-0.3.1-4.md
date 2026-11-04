The fourth mini release on 0.3.1. It brings in upstream's 0.3.2, 0.3.3 and its unreleased 0.3.4 work (`dev`):
- the historical official versions, playable in rooms;
- boss and battle rules closer to the official game;
- much stronger bots.

On our side it adds:
- the first bot tactics and profiles, selectable per AI seat in the room;
- Fish Edition's version and What's new on the title screen;
- the Gunshatter / Bubble damage loop fix.

Base: `main`. Branch `mini/0.3.1-4`. It is squash-merged, and the squash commit's message is this PR's title, so its changes stay readable in `main`'s history. The package version goes from 0.3.1 to 0.3.3, upstream's last release; the title screen shows it with the commit (#102).

## Changelog

### Upstream: sganggs 0.3.2 and 0.3.3 (#106, via Yuri #22, which Yuri hasn't merged yet)

**Official versions**
- Four game versions, played by their own rules:
  - 第一期上半 / 下半 (Season 1, parts 1 and 2);
  - 第二期上半 (Season 2, part 1);
  - 第二期下半, the default.

  Each has its deploy order, timers, Bench limits, and its Alliances, Strategies, items and Attributes. The host picks the version, and the room's players vote on a change.
- The 19 operators that exist only in Season 1 are implemented from that version's data, with their art and models.
- Timed historical solo has an optional "Untimed" setting (「不限时」).
- `golden` and `botbench` take `--version`.

**Bosses and enemies**
- Boss attack skills take the place of a normal attack, and their cooldown starts when the animation ends:
  - Sal Viento Bishop Quintus no longer repeats his Tide (大潮);
  - the same rule now covers Lucien, the Phantom (Helm / Pipe / String), Alistair and the Will of Sami;
  - it also covers the attack skills of ordinary enemies and Bounty leaders.
- Blood Amber loses HP without its altar or throne.
- The Uneasy Designer faces its blocker.

**Battle resolution** (by Siornya: PRs #798, #802, #844, #855)
- Damage resolves in the official phased order: shields, barriers, dodge, block, fragile and sanctuary in priority and gain order.
- Fixed and percentage penetration apply in the right order.
- Many operator fixes follow from this, and Gunshatter is rebuilt on the same system.

**Rule fixes**
- Lee's and the other "at the start of the Rest Phase" grants arrive after the Improv pick.
- Duck Lord's Mystery Customer: the four players get the same replacements.
- The Hidden Core draws pairs and sides anew.
- Exusiai the New Covenant's talent strike.
- Blemishine's S3.
- SilverAsh the Reignfrost's S3 against air-only waves.
- Wild Mane's S2 push.

**Bots**
- The bot strategy registry: `SP_BOT_STRATEGY`, `botbench --bot` / `--compare`, and the opt-in `ioleta`, `adaptive` and `ioleta-adaptive` strategies.

**UI**
- The version pill.
- S.W.E.E.P. fixes.
- Detail card Alliance clicks and the elite icons in Operator Loadout.
- An opt-in spectator takeover of AI seats, voted by the humans (PR #691).
- Click outside to close.
- 0.3.3 fixes: the shop's empty item slots in Season 1, the Bench swap in Season 1, and item icons after a version switch.

**The lobby and the waiting room**
- Redesigned.
- 名片干员 seat cards with outfits (skins).

**CI**
- 4 shards, a Node 24 lane and a separate Golden job.

### Upstream: sganggs `dev` toward 0.3.4 (#111, replaces #109)

**Bots**, much stronger on Ultimate. Each change was measured in seed-paired `botbench` runs (upstream's §37.33–§37.67).
- Overall:
  - four-player Ultimate: from about 36% to about 75% of the boss HP pool finished, with about half the games won (254 of 480 seeds);
  - solo Ultimate: from about 25% to 58%.
- Co-op:
  - a bot takes Touch when a teammate has Goliath;
  - bots compare team swaps in the rehearsal and keep the one that leaks least;
  - bots don't hoard healers, and don't take a teammate's key operators.
- Final Assault:
  - the team is picked again for damage to the boss;
  - bound bosses get a placement planned around their body;
  - bots spread out against Alistair;
  - after the placement, bots sell the Bench to buy damage items for the best boss hitters.
- Economy:
  - bots no longer level to 6 (level 5 at round 9);
  - they buy no items except the ones that make an elite or merge, and spend the money on refreshes;
  - they plan layers for the main Alliance, including the Yan 9-member line with Muelsyse;
  - each Strategy has its own handling (Quintus's Mutated Cells, Narantuya's Sargon items, the class-team Strategies).
- Bots choose Strategies by their measured results on Ultimate, as well as their starting LP.
- A player who leaves before or during the Strategy draft no longer takes Goliath.
- Bots rehearse 6 layouts per prep instead of 3 (`SP_BOT_REHEARSAL`). The host browser's count stays 3, our own default.
- Per-seat bot strategies: `SP_BOT_STRATEGY_SEATS` (PR #890), the first step of the RFC for bot profiles.
- `botbench --layers`: where layers come from, and what money was spent on.

**Fixes**
- Two identical items (e.g. two Advanced Originium Solvents) both count.
- Enemies blocked from behind face their target during the wind-up.
- The Penitent's Grail splits damage the right way round.
- Ulpianus's S3 Move: it clears elemental damage, and it always executes.
- Duck Lord's replacements match the official footage: lower-route ground enemies only, and one kind per player.
- "Download full assets" survives a reload: files are stored on HTTPS or localhost (#725).
- Hidden Alliance discs no longer catch clicks.
- Strategy-phase cards no longer crop the operator's face.
- The selected operator's action frame on notched screens and in the PWA.
- Room buttons no longer cover the settings.
- Channelled casts (Festival Jazz Musician, Eye of Death) stand still while casting (PR #905).
- Titi's S2 locks the last deployed of equally hurt operators (PR #907).

**UI and tools**
- A "Moderate" setting for collapsing the shop while deploying.
- COST and SP floating numbers.
- The release notes show after an update.
- Packaging checks that the packages start.
- Summons wear their owner's outfit plugins.
- Seat cards can show 6★ DIY-pool operators such as Kal'tsit.
- The room plays a sound when a player readies.
- More shop counters (Jaye's refreshes, round rewards).
- Appearance plugins up to 512 MB.
- Exusiai the New Covenant's talent strike uses the official effect (PR #861 by Fish).
- Korean text review (PR #908).
- An opt-in P2P relay of match state (`SP_P2P`, PR #801).

**Dev-only** (not in a release package): the LLM advisor and file-based manual seats for agent playtests.

### Bots (Fish Edition)
- **Tactics and profiles** (#110):
  - A profile is an ordered list of tactics with legacy at the bottom, registered as an ordinary bot strategy (fish-edition/ai-players.md).
  - Two opt-in profiles, `fish-level` and `fish-tier6`, come from the hypothesis tests.
  - Nothing changes unless one is selected.
- **Bot profiles in the room** (#114 via #110, closes #107):
  - The host picks each AI seat's profile on its plate. The choices are the basic bot, the two Fish profiles and upstream's `ioleta` / `adaptive` / `ioleta-adaptive`.
  - "Fill remaining seats with AI" fills the free seats from a drop-down: All basic bot now, Recommended and Optimized later.
  - A room where nobody picks plays as before.

### Features
- **Fish Edition's version on the title screen** (#102, closes #98, #99, #100): the version and commit, What's new from git, and issue links prefilled with the version.

### Fixes
- **Gunshatter's Arts shield counter** (#37 by j-tai, closes #27): tagged as a counter, so Bubble's S2 no longer answers it in a loop.

### Tools and CI
- **The Python 3.8 syntax check runs on ubuntu-24.04** (#112): `ubuntu-latest` became Ubuntu 26.04, which has no Python 3.8 build, so the check failed on every run.

### Fork notes
- Kept through both syncs: lobby rules, SPA-CC, records, the AI names in the host's language, and the sliding push.
- Notes of the 2026-11-01 loops (#103): the hypothesis tests on human Final Assault boards and the bot (ai-players.md H1–H9, H12), plus TODO.md and `pr-descriptions/`.
- Notes of the 2026-11-05 loop (#113): TODO.md (the squash fallout; #104, #105 and #107 triaged) and `pr-descriptions/`.

Closes #27
Closes #98
Closes #99
Closes #100
Closes #107

## Known issues

- PRs here merge by squash only, so upstream's history doesn't come with a sync: each sync needs a hand-picked merge base.
- `CHANGELOG.en.md` stops at 0.3.1. Upstream's 0.3.2, 0.3.3 and 0.3.4 notes are in Chinese only (`CHANGELOG.md`).
- `docs/DEPLOY.en.md` lacks upstream's new §11 / §12 (official versions, capacity).
- The bot measurements in ai-players.md were made on the 0.3.1 bot and need a new baseline. The `fish-*` profiles aren't measured yet.
- Windows full CI has failed one shard intermittently since 0.3.1-1.
