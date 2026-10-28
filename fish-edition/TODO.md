# GitHub issues (open, 2026-10-28; #75, #76, #78, #79 close when #74 reaches main)

- #27 Bubble ↔ 碎铳之簧 damage loop (bug, good first issue): fixed by #37 (j-tai), now into `mini/0.3.1-3`; waiting
  for j-tai to make it sourceless damage, as Fish asked on 2026-10-22
- #29 AI: recalibrate the bounty kill-chance estimate
- #30 AI: solo FUNNY vs NORMAL, and Alistair (boss_6)
- #31 SPA-CC Risk balance: extend the botbench tag sweep
- #32 Opt-in anonymous match records + tools/records.mjs
- #33 Gameplay accuracy audit (tracking)
- #34 Effects: official effects instead of placeholders (Lemuen first)
- #36 What strategy do the AI players use? Is it optimized? (answered in ai-players.md)
- #47 SPA-CC bug: Patriot (and Reid) still targeted while invulnerable: should be untargetable, 0 AoE damage, no Lure,
  but still slowed by Mostima's passive
- #48 Visual bug: the Blood Debt bar lacks the Blood Debt icon
- #52 Feasibility: SPA-CC and the other gameplay changes as a plugin (answered in FINDINGS.md §6). Fish's decision
  (2026-10-27): SPA-CC stays in Fish Edition (Lockout etc. can't be plugins); port the compatible subset as plugins in
  `evenifyouforget/spa-fish-edition-plugins` (plugins #1: four data-only cheats, merged 2026-10-27)
- #71 AI: layouts ignore blocking (melee in the back, ranged facing backward); maximises range overlap as if enemies
  never stop (question, bot-players)
- #72 AI: deploys on originium tiles; humans hold one side, often the right to keep enemies off the tiles' buff
  (question, bot-players). Both answered in ai-players.md "Why the bot's layouts ignore blocking …" (2026-10-27).
- #75 Laterano Mod B's alliance text: no live ammo % and no paragraphs (reported on a 0.2.5 server; still true on
  main). Fixed in #80 (merged into `mini/0.3.1-3`). Victoria Mod C's text has the same plain formatting (not reported)
- #76 a Patriot leaked through the Unite Phase costs 1 LP (reported on a 0.2.5 server). Settlement on main charges 5
  since #20 (2026-10-15; test/match/risk-tags.test.js), but the Unite HUD's "costs up to N LP" counted him as 1 and
  left out Last Line: fixed in #80. Worth re-testing on a current server
- #78 the match history's end screen has no SPA-CC +N, tags or WITH CHEATS: records never kept the rules. Fixed in #82
  (merged into `mini/0.3.1-3`); matches recorded before it can't get them back
- #79 the issue templates' version badge showed sganggs's 0.3.3: fixed in #81 (merged into `mini/0.3.1-3`)
- #84 SPA-CC: Investor 2 / Strategy 2 show only their level-2 effect. Real, text only: the sim applies both levels (and
  Junk 2 too); the rules dialog treated every chain as replacing. Fixed in #94 (`wip/spacc-text-84-91`)
- #86 feature: the rules (SPA-CC tags included) in the match's Match Info tab (本局信息). Not started; small: the
  result screen's rules list already exists to reuse
- #87 feature: show an AI player's personality / profile. There are no bot profiles yet, here or upstream (only
  `BOT_NAMES`); waits for the bot-player research (ai-players.md)
- #88 feature: under Strategy 1, highlight the changed round numbers in the Strategy texts. Found: the texts don't
  change at all under Strategy 1 (Jessica still says 4/7/10/13; the game uses 5/8/11/14), for the 9 Strategies whose
  text names rounds. Not started: needs a text patch per Strategy (shared/ruleData.js), then the colour
- #89 feature: English names for the AI players. `BOT_NAMES` (server/lobby.js) are six operator names in Chinese
  ("AI·华法琳" …), upstream marks them i18n-ignore. Not started; a client-side translation of "AI·<operator>" through
  the operator names would cover every language
- #90 Du Yaoye's 2nd refresh without a Yan operator: not reproduced in code. The counter goes up before the hook
  (refreshes 1 and 2 pass, test/content/bands.test.js checks both); the trait adds one only if the shared pool still
  has a Yan operator at or below the shop level (level 1: only Leizi; level 2: + Xiaoman), which the text's 优先
  allows. Needs the replay's shop level and who held those copies
- #91 Last Line of Defense's wording. The rule matches Fish's description (once per round, also after Unite, past
  the 10 LP cap, up to 12), except the 2 LP is charged at settlement, not instantly. Text reworded in #94
- #92 SPA-CC balance: Suffocation 0.2/0.5/0.8 → 0.1/0.3/0.5 suggested; Fish proposes 0.2/0.4/0.6. Fish's call
  (`CC.spRecovery`, shared/ruleData.js). Against #93's rule 3, level 3's change is 25 %, not a halving
- #93 SPA-CC balance guidelines (tracking, Fish's post): no change needed
- Closed 2026-10-27/28: #77 (the count under the bar is enough, Fish), #85 (not a bug: the match had no Investor 1).
- Closed 2026-10-27: #28 (Windows zip-reader test; fixed by #70, reached main with #66).

# Investigation/questions

## AI players

Findings (2026-10-21): fish-edition/ai-players.md — strategy, speed, win rates per difficulty, a
per-tag SPA-CC cost table (botbench `--rules`), a record format and what not to collect.

- What strategy do the current AI players use? Is it optimized in any way?
- - What would making the AI better look like? Modular/evolutionary strategies? Machine learning?
- - If some kind of machine learning, and humans play significantly better: what data do we need to learn from humans?
- - Is there an explicit reason for the AI to be bad? ex. needs to be deterministic for testing
- How fast is the decision making of AI players?
- Are the AI players competent? (does this question need further defining)
- Around what is the winrate for a solo/4-man AI lobby, on each difficulty?
- Can we efficiently run many AI matches in the background, to gather data? (we should not force this on live server operators, but it is something some people could choose to run)
- What diagnostics could be collected from matches, that could measure human players vs each other and vs AI? (win rate > stack counts > others?)
- - How do we limit the data size while still getting useful key information? No full replays?
- What definitely should we not collect, for privacy reasons?
- Is there any infrastructure to collect such data? Can we build it?
- - Suggestion is to produce a small number of record files, such that any subset of them is a valid set for analysis.
- - Put it in a gitignored directory by default?
- Is there any infrastructure to process such data? ex. display stats?
- - Could scan for all record files in a directory, and use that as the data set. This makes it easy for admins to zip up and send their records.
- - Use the same directory as collection for analysis by default?
- How much better do human players play?
- If AI players are good enough, can we map out the difficulty curve for SPA-CC and determine what tags are easiest to take?
- Try processing the batch of game logs in 2026-10-21.7z . Did the logging system work? What can we learn from these games?
- - Done (2026-10-22): yes, it works (`records.mjs --verify`: 47 battles replay the same, 0 differ). Findings, one logging gap
    (no round row for a won match's last rounds) and two untraced oddities (ABYSS kills above the total, a frozen board):
    ai-players.md "The first human match records".

## Gameplay replication accuracy

The Arknights wiki has data on pretty much every operator, enemy, and stage gimmick. It includes explanations of some non-obvious mechanics, such as how Logos skill 1's instakill actually works. ex. https://arknights.wiki.gg/wiki/Logos https://arknights.wiki.gg/wiki/Fear

DragonGJY https://www.youtube.com/@DragonGJY also has analysis videos that further detail many interactions, but this is probably hard to scrape.

At least within the available data sources, can we check the accuracy of implemented gameplay so far? Have any shortcuts been taken, or features left out?

→ #33 (tracking issue; ~510 `[ASSUMED]` tags in server/sim/content are the starting list).

## Effects

Now that we have a script to download the full assets bundle, can we locate effects that should be associated with operators, and replace the placeholders with the correct animations? Ex. Lemuen's elite enemy lock on visual overlay, or the sprite for a pending orbital strike from skill 3

→ #34.

## New contributors

What are we missing that would help new contributors get started? (for humans or for other Claude Code instances)

## QA/usability/process

Can a new server owner figure out how to download the local assets bundle and deploy from source?

More generally, is there a process step we're missing before the PRs go up, to ensure usability?

# main/wip

- [x] Figure out what tool this app was apparently vibe coded with
- [x] Translate documentation files to English (ex. README.md -> README.en.md). Do not modify the original file.
- [x] Determine if the game is possible to build and run locally in this container. Are we just missing dependencies? If we cannot do a full build and run inside the container, then what is possible to test?
- [x] Determine which game rules are owned by this repo, and which ones are downloaded on the fly (would need patching at runtime if we want to change them).

Status (2026-10-11)

- Merged into main: lobby rules / Custom Lobby Modifications (+2 Deployment Limit, +2 Funds, untimed), difficulty details (#7), keyword popup (#8), branch conventions (#5), stale-browser-data note (#6).
- Open PRs into main: `wip/sync-yuri-dev` (Yuri's 4 commits after 1f05351c), `wip/lobby-rules-i18n` (ja / ko / zh-TW strings of the lobby modifications, plus Fish's ROADMAP commit).
- Next sync with yuri/dev-0.2 brings in Yuri's merged versions of #3 (English docs) and #4 (difficulty details, with Text Size); expect conflicts with our own copies, resolve in favour of Yuri's. After it, main's keyword popup CSS needs `font-size: calc(.14 * var(--t))` (Text Size), as on `yuri/keyword-popup`.

Server maintenance (ROADMAP "Reboot for updates"), branch `wip/server-maintenance`

- [x] See live matches: `npm run maintenance -- --status` (also `/healthz`).
- [x] No new matches this session: `--close` (enforced in Lobby.startMatch, so matchmaking can't slip past it).
- [x] Scheduled maintenance with a live countdown for players: `--in 15` / `--at 21:30`.
- [x] Smart stop, once, cancellable: `--stop-when-idle` / `--keep-running` / `--cancel`.
- Design for the ROADMAP usability check (2026-10-12):
  - [x] One copy-paste command for non-technical hosts who run from source, in README.en.md and README.md:
        `npm run maintenance -- --close --stop-when-idle --back-in 20 --wait && git checkout -- data/assets.json && git pull && npm ci && scripts/start.sh`
        (Windows: end in `scripts\start-windows.bat`; cmd or PowerShell 7, since Windows PowerShell 5 has no `&&`). Release-bundle
        hosts use the update bundle, service setups follow DEPLOY. Nothing in our tools runs `git pull` on its own.
  - [x] `--wait`: block until the server has stopped (exit 0); no server answering = exit 1, so the chain never pulls by
        mistake; Ctrl+C leaves the maintenance set and says how to cancel.
  - [x] `--back-in` / `--back-at`: expected downtime; when the server stops it tells players "back around 21:45", shown
        while the page reconnects, cleared when the new server answers.
  - [x] `--message`: free text in the bar. `announce.mjs` stays for one-off notices; its help points here for reboots.
  - [x] One-shot for real: the server consumes the file when it stops and drops a stale one at start.
  - [x] `--stop-when-idle` alone also shows players a bar ("restarts when current matches end").
  - [x] Stable interfaces documented (`logs/maintenance.json`, `/healthz` `maintenance`, `--status --json`, `--wait` exit
        codes); script text output and bar wording are for humans and may change.
  - [x] DEPLOY: how to start again per setup, `Restart=on-failure` does not restart after the idle stop (exit 0), and use
        `--close --stop-when-idle` rather than reading `--status` and stopping by hand.

Feedback for feature/lobby-rules

- Looks good, plays correctly
- PR approved
- [x] May want to change the text "Lobby Rules" to "Custom Lobby Modifications" so it's more obvious that this wasn't in the original game and some players would probably consider it cheating
- I noticed the graphics are ugly. This is probably just inherited from the previous repo
- [x] We should add the originals as alternate remotes as well: https://github.com/sganggs/Stronghold-Protocol < https://github.com/YuriRestia/Stronghold-Protocol-EN-translation < https://github.com/evenifyouforget/Stronghold-Protocol-EN
- [x] And then check if sganggs can be merged into here. Maybe the original CN is ahead with better graphics already? Make a new branch to try merging. (Merging into en-translation gave 57 conflicting files, almost all T() vs upstream's t(); main was rebuilt on yuri/dev-0.2 instead, which includes sganggs/master.)

Known issue: stale browser data (2026-10-10)

- Two players on `main` both got "3D/WebGL rendering is unavailable on this device" and the plain 2D view; a full refresh plus clearing the browser cache fixed it for both. Treat as busted for now, but more cache bugs are likely after future updates; find a lasting fix.
- That message appears whenever the 3D engine fails to start within 12 s for any reason (public/js/ui/fieldHost.js LOAD_TIMEOUT_MS), not only without WebGL; the real cause is in the browser console line "[field] render engine unavailable, using the simplified view: …". Ask for that line next time.
- Not reproduced in a fresh headless Chromium: the engine mounts in about 1.3 s.
- What the browser keeps (server/http/files.js cacheControlFor): html, code and data are `no-cache` (revalidated every load); public/assets, public/fonts and public/vendor are cached for 1 day; `?v=` URLs are immutable. The asset-preload Service Worker (public/resource-sw.js) also stores /assets, /fonts and /media in Cache Storage. The vendor libraries did not change between en-translation and main, so the 1-day cache and the Service Worker's stored art are the leading suspects.
- Possible fixes to look at: version-stamp the 1-day-cached URLs per build (`?v=<build>`), show a "new version, reload" prompt when the build changes (upstream already detects new builds, CHANGELOG 0.2.2), and have the engine-failure toast offer a reload / cache clear.

Next batch (2026-10-14), two PRs into main, both built on `wip/sync-yuri-0.2.5`

- [x] PR A `wip/status-details` (display only, also for Yuri): status icons show a ring for the time left and the value
      (脆弱 30 %, 减速 50 % …). Same-name statuses don't add up (同名效果取最高): the icon shows the strongest in force, and a
      weaker one that outlasts it takes over when it ends. Merged into main (#12).
- [x] PR B `wip/custom-lobby` (custom lobbies only, behind host options) — built; Fish to playtest. Readings of the
      ROADMAP text to check:
  - Victoria Mod C (Fish, 2026-10-15): when a Victoria operator's skill ends, that operator recovers 8 SP per hammer it
    carries (like Swift). "Hammers in the shop are upgraded and free" only while Victoria is active; the 6-member part (stacks to the other alliances, ATK
    +(200 + 1.2 × stacks)%, 200 % Barrier, Status Resistance) is all one 6-member tier; Mod C replaces Mod A
    entirely, so no hammer every 25 stacks.
  - Laterano Mod B (Fish, 2026-10-14): the bullet-spending Attributes (Mostima, Executor the Ex Foedere, Lemuen) count
    bullets as usual and trigger twice each time; the Attribute's owner decides (Mostima's doubles on a non-Laterano
    neighbour's bullets too); both triggers count toward the per-battle limit; the 6-member ATK per bullet does not
    double. In-game wording = Fish's choice A.
  - Blaze (Fish, 2026-10-14): Catherine's slot (tier 4, price 3) and the skill / module the player chose for Catherine
    (default S2, X module on the elite); selling her takes Blaze the Igniting Spark from the shared pool, so none when
    its copies are gone.
  - A room with any rule set cannot search for teammates (strangers play the original game).
- PR B scope (as planned):
  - choose the map and the alliance bans (unchosen slots stay random);
  - Alliance Modules: Laterano Mod B, Victoria Mod C (matchmaking stays on Mod A);
  - rebalanced alliances: Virtuosa also in Swift and Aid; Blaze replaces Catherine in her shop slot (tier 4, price 3,
    Catherine's skill slot and levels; Yan + Victoria; when sold, produces Blaze the Igniting Spark).
  - Follow ROADMAP SPA-CC's rule categories: modules are Neutral, map / ban picks are RNG Reducers ("seeded" on the end
    screen), the existing +2 Funds / +2 Deploy Limit / untimed are Cheats ("WITH CHEATS" watermark). This needs a
    rules selector with room for many more options, and the end screen listing every rule in force.
- [x] Investigate SPA-CC (ROADMAP "SPA-CC") — done 2026-10-15: FINDINGS.md §5 (effort per tag, order, 7 questions). a Contingency-Contract-style difficulty above Ultimate — difficulty tags
      worth risk, shown as e.g. "Ultimate+5 seeded". Go through the tag ideas one by one (which hooks exist, which enemies
      are in the data, effort), and say which tags are cheap, which need new sim hooks, and which need Fish's input.

PR C `wip/spacc` (on `wip/custom-lobby`), SPA-CC first batch — built 2026-10-15; Fish to playtest

- [x] Risk tags as lobby rules (`level` type, Risk per level), the Risk grid in the rules dialog, "+Risk" on the
      strip and the result title; cheats made the Risk 0 (since 2026-10-16 the Risk shows with cheats too).
- [x] Tags: Investor bench, Swift nerf, Foresight −20 ASPD (active or not), Strategies one round later (periodic ones
      and Damazti keep theirs), tier-1 price, shop upgrades (2 levels), SP recovery (3), final boss HP/ATK (3), leader DR
      (2; final bosses and leader-class bounty enemies, none under a burst), Silencers (fewest stacks, ties: earliest seat).
- [x] Patriot pilot: data (tools/build-data.mjs FORK_ENEMY_KEYS, flagged `fork`), art in the manifest, kit, and a
      provisional tag "round 9: Patriot in every wave" until Fish's enemy tags are designed.
- [x] Degenbrecher's ATK buff: not a gap — the game's text ties it to <Snowfall> ("Gains increased ATK during
      Snowfall"), an event mechanic this mode doesn't have, so it rightly stays off (checked 2026-10-16).
- [x] Blood Debt / Asset Liquidation (Famiglia Unending / Seasonal, #20) and the pool-wide boss tags (Originium Zone
      Arts / Physical / Lockout, #19): built.

SPA-CC after the first batch (2026-10-15/16) — merged: #19 (`wip/spacc-tags`), #20 (`wip/famiglia`); open: #21
(`wip/vengeance-junk`: Junk / Toxic Waste, Vengeance), #22 (`wip/spacc-visuals`, stacked on #21: Toxic Waste's look,
invulnerability ribbons, two cheats, the Risk kept with cheats, ja / ko / zh-TW for every SPA-CC text)

- [x] Fish's answers (2026-10-16): Toxic Waste's −50 % ATK stacks additively like other ATK modifiers; a leaked Reid
      costs 1 LP like most enemies; AI teammates ignoring Toxic Waste is fine (revisit if the AI is to play better).
- [x] Scrapped (Fish, 2026-10-16): the Rosmontis tags. Parked unless someone complains: the giant-boss ribbon seams,
      the stale-browser-cache issue (2026-10-10).
- [ ] Sync main with Yuri's dev-0.2 (0.2.6 + our merged #6 #10 #11).
- [ ] Visual overhaul (Fish, 2026-10-16): design doc first — a particle engine and a custom generic effect set, then a
      time-boxed extraction pilot (`tools/local-extract`) to weigh extracting the game's own effects.

- [x] Script to pull map assets/other resources from sgangss published release, for deploying from source on Linux:
      `npm run assets:release-local` (tools/fetch-release-local.mjs), merged in #24 (2026-10-21).
- [x] Investigate user question: did we lose the english README at some point? Can an English-speaking server owner locate the commands to pull assets, run maintenance, and enable match recording?
      Answer (2026-10-22): not lost. #13 moved it from `README.en.md` to `.github/README.md` (Yuri's layout), which GitHub
      shows on the front page. Assets (`npm run assets:release-local`) and maintenance ("Updating a running server") are
      there; match recording (`SP_RECORDS`) is only in docs/DEPLOY.en.md §11, which the README doesn't point to.
- [x] Optional: a one-line pointer to match recording (DEPLOY.en.md §11) in `.github/README.md`. In #64 (#58).
- [x] Investigate user question: did 0.3.0 or another recent upstream version already add the official invulnerability graphic, making our change redundant?
      Answer (2026-10-22): no. No render change about invulnerability from v0.3.1 to sganggs `dev` (0.3.2). Upstream has
      only a small gold status icon (since the initial import) and, from 0.3.0, the official 无敌 loop for a Reborn
      talent's window, with official effects on. The ribbons cover every invulnerable unit, with or without assets.

# mini/0.3.1-3 (from 2026-10-27)

Base `mini/0.3.1-3` (= main d115c384). Merged into it: #73 (the notes of 2026-10-27), #80 (closes #75, #76), #81
(closes #79), #82 (closes #78). Open: #83 (the notes of 2026-10-27/28), #37 (closes #27; waiting on j-tai). #74 is the
mini → main PR (draft; title and description written 2026-10-28, pr-descriptions/mini-0.3.1-3.md, which becomes the
template once it merges). Merging it is Fish's call; with #37 still out, #27 stays open.
- #71 / #72: answered (ai-players.md); no bot change for now. Fish (2026-10-27): holistic bot-player research later.

# mini/0.3.1-2 (2026-10-23/24) — merged into main as #66 (d115c384, 2026-10-26)

Base `mini/0.3.1-2` (= main 75c57d5c). Descriptions in pr-descriptions/. #66's title and changelog set the
convention for a mini → main PR (pr-descriptions/mini-0.3.1-2.md). Its squash message lacks #70 and "Closes #28":
#66 merged before the update, so #28 was closed by hand.

- [x] #63 `wip/spacc-tags-2`: Fish's SPA-CC spec updates (Investor 2, Strategy 2, Seasonal 2, Vengeance spawns).
- [x] #64 `wip/mini-fixes`: closes #57 (official 无敌 loop vs ribbons), #58 (README match recording), #59 (no-SETTLE
      round rows), #62 (Booster Pack sprite).
- [x] #65 `wip/item-booster` (stacked on #64, merge #64 first): closes #56, the Equipment Booster Pack.
- [x] #67 `wip/shift-physics`: closes #60 (pushes / pulls slide: momentum + friction at 30 fps, stacking, walls) and
      #61 (block shifting: inside the tile → just past the nearest edge, 0.51; a shared block position steps 0.2
      aside; [ASSUMED] numbers). Fish's 3×1 scenarios (MISC_USER_QUESTIONS.md, 水月 for Ascalon) are
      test/sim/block-shift.test.js and all six hold. Goldens regenerated: both directions, no match changes result.
- [x] #68 `wip/rbm-notes`: every note committed; `remove-before-merge/` renamed `fish-edition/`; ROADMAP reorganized,
      SCOPING removed.
- [x] #69 `wip/spacc-i18n`: ja / ko / zh-TW for every SPA-CC text (801a9c64 at last); `botbench --rules`.
- [x] #70 `wip/ci-annotations`: closes #28. Windows' own tar.exe crashed on the runners (exit 3221225477), so the
      zip-reader test failed on whichever shard held update-package.test.js; zipFolder falls back to the built-in zip
      writer, and failed tests are GitHub annotations (the job logs can't be fetched from the container).
- [x] #37: main merged into its branch, retargeted onto `mini/0.3.1-3` (2026-10-27).
- Known flake: `test/studio/review.test.js` "trial uses the actual sandbox executor" went over the 5 s plugin setup
  limit once on Windows (#66, node 22 shard 1/3; passed on re-run). `SP_SCRIPT_PROBE_MS` raises it, but
  test/plugins/script-review.test.js asserts the default 5000.
- Nothing in this batch has been checked on screen (no game assets in the container).

# to be ported to yuri

- [x] English docs (README, CHANGELOG, NOTICE, DEPLOY, PLAYING, WINDOWS `.en.md`): Yuri #3, merged, then updated by Yuri for the current repo state.
- [x] Difficulty details: Yuri #4, merged; Yuri moved its font sizes onto Text Size (`--t`).
- [x] Keyword popup: Yuri #7, merged 2026-10-14.
- [x] Reroll test (co-op briefing 45 s): Yuri #5, merged 2026-10-11.
- [x] Server maintenance: Yuri #6, merged 2026-10-15.
- [x] Status timers and values + liftoff altitude + Barrier HP: Yuri #10, merged 2026-10-15.
- [x] dev-0.2's CI (lint, docs paths, two Windows lobby tests): Yuri #11, merged 2026-10-15.
- [ ] Invulnerability ribbons: Yuri #12, open.
- [ ] Custom Lobby Modifications (lobby rules) and the SPA-CC tags: main only for now. Fish is asking Yuri (2026-10-16)
      whether gameplay mods are welcome as dormant code behind a server option (off by default) before porting.
- [x] sgangss sync PR: Yuri #14, merged. It also fixed dev-0.2's own red CI (three causes).
- [ ] kaltsit esperanta liftoff altitude bug fix: a bug from our #18, fixed here as #25; Yuri #20 (open).
- [x] EN versions of issue template and PR template: Yuri #17, merged; synced to main by #54 (merged).

# live PRs to watch (2026-10-28)

- Yuri, all open, no comments yet: #12 invulnerability ribbons; #18 Exusiai the New Covenant's talent strike; #19
  Lemuen's S3 crosshair; #20 liftoff hover; #21 release local art; #22 sync with sganggs 0.3.3 (opened 2026-10-27; CI
  green since 3a269451 brought sganggs's Pillow test fix). After #22 merges: step B, the sync into our main.
- sganggs #862 (Lemuen's crosshair): squash-merged by sganggs into their dev, author kept, released in 0.3.2, so
  Yuri #19 becomes redundant once Yuri syncs 0.3.2.
- sganggs #861 (TalentBomb's official strike): accepted 2026-10-26. sganggs squashed it into their dev (credited in
  the commit message and CHANGELOG, since the commits' author is "Claude") and closed the PR by hand; it ships in
  0.3.4. Yuri #18 becomes redundant once Yuri syncs 0.3.4.
- Upstream: sganggs released 0.3.2 and 0.3.3 (2026-10-25, 267 commits after 0.3.1). Yuri's dev-0.2 hasn't synced
  them (still c05aa7e2, which #54 brought here). Next sync here waits for Yuri, or goes straight from sganggs.

# need human action - branches that have not been made PRs yet

- [x] Upstream ports (2026-10-22): Fish opened them all (sganggs #861, #862; Yuri #18–#21). Status: live PRs above.
- [x] sganggs #861 (`sg/angel2-talent-strike`): slimmed down as sganggs asked (2026-10-27): sganggs `dev` (f07b8965)
      merged in, the kit change dropped (dev's kit already marks the bombing `talent: true`); 4 files, render + test.
- [x] Fish: on sganggs #861, update the body and post the reply. Done; sganggs accepted it (2026-10-26).
- [x] Fish: close Yuri issue #16 (EN templates; Yuri #17 resolved it). Done 2026-10-27.
- `wip/sync-yuri-0.2.6`: stale; can be deleted. Yuri #14 merged and reached here with #39 / #54.
- `wip/4` (2026-10-27): Fish's scratch branch, from main d115c384. `wip/3` is done: 801a9c64 reached main through
  #69, and its uncommitted remove-before-merge/ edits are in `git stash` ("wip/3: remove-before-merge/ edits …").
