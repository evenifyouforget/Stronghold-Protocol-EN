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

# to be ported to yuri

- [x] English docs (README, CHANGELOG, NOTICE, DEPLOY, PLAYING, WINDOWS `.en.md`): Yuri #3, merged, then updated by Yuri for the current repo state.
- [x] Difficulty details: Yuri #4, merged; Yuri moved its font sizes onto Text Size (`--t`).
- [x] Keyword popup: Yuri #7, merged 2026-10-14.
- [x] Reroll test (co-op briefing 45 s): Yuri #5, merged 2026-10-11.
- [x] Server maintenance: Yuri #6, merged 2026-10-15.
- [x] Status timers and values + liftoff altitude + Barrier HP: Yuri #10, merged 2026-10-15.
- [x] dev-0.2's CI (lint, docs paths, two Windows lobby tests): Yuri #11, merged 2026-10-15.
- [ ] Invulnerability ribbons: `yuri/invuln-ribbons` pushed (2026-10-16), PR to open (description in
  pr-descriptions/yuri-invuln-ribbons.md).
- [ ] Custom Lobby Modifications (lobby rules) and the SPA-CC tags: main only for now. Fish is asking Yuri (2026-10-16)
  whether gameplay mods are welcome as dormant code behind a server option (off by default) before porting.
