# TODO

Open work only, grouped by what blocks what. Each fact has one home, and this file only points to it:

| What                                       | Where it lives                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Done work                                  | git history, merged PRs, CHANGELOG (not this file)                                          |
| An issue's discussion and findings         | the GitHub issue                                                                            |
| Bot research and answers about the bots    | `ai-players/` (index: `ai-players/README.md`)                                               |
| SPA-CC tags, numbers and status            | `spacc/working-spec.md`; design decisions in ROADMAP.md "SPA-CC"                            |
| The 2026-11 balance draft and its evidence | `untracked/spacc-balance-update.md` (Fish's draft), `untracked/balance-2026-11/findings.md` |
| End of service                             | `untracked/eos-notes.md` (the decision, the freeze table, the banner text)                  |
| Mod Z designs                              | `operator-mod-z/`                                                                           |
| Ideas and designs not built                | ROADMAP.md                                                                                  |
| Branch rules / session order               | BRANCHES.md / STANDARD_LOOP.md                                                              |
| Fish's scenarios                           | MISC_USER_QUESTIONS.md                                                                      |

**Feature freeze** (eos-notes): only syncs, bug fixes and minor PRs, plus the one final SPA-CC balance update and the
DYYBot line. No more sganggs syncs (they added SPA3, 2026-11-11); Yuri → main syncs only.

## What blocks what

```
SPA-CC final balance update (#31, #92)
  bot sweeps before/after .................. running (balance-2026-11/run.sh)
  stand-route fix merged into the branch ... waits for the sweeps
    └─ Halley replay rerun + analyze.py → verdicts in spacc-balance-update.md
         └─ Fish decides the values (+ pro player / community feedback, eos-notes)
              └─ spacc/working-spec.md, full test suite, PR into main

Evolution bench ............................ doesn't exist yet (nothing in tools/)
  ├─ bot research: "try it in the evolution bench"
  ├─ DYYBot step 5 (05-dyybot.md "Process")
  └─ Mod Z: "try the evolution bench", then the report

DYYBot
  forced-Du-Yaoye baseline (05-dyybot.md) .. not run (the first try ran out of memory)
    └─ DYY tactics (sp-dyy-wt, uncommitted) measured against it
```

## SPA-CC

Fish's list (2026-11-11), with where each item stands. Details in `untracked/balance-2026-11/findings.md`.

- [x] Use bots to estimate values of existing tags: #31 (`ai-players/04`, `untracked/tag-sweep/`). Bots got much
      stronger since, so the tags the draft doesn't touch need a fresh sweep.
- [x] Draft balance patch on a branch: `feature/spacc-balance-2026-11` (worktree `sp-sync2`, pushed, no PR). It has
      Fish's comments of 2026-11-11: Cleaner back to 5, the Degenbrecher at the round's start, the linked HP, 200/300/500 %.
- [ ] Use bots to estimate values of rebalanced tags: the sweep is running.
- [ ] Point out which nerfs are too small and should be undone: first verdicts are in `spacc-balance-update.md`.
      They get updated when the sweep is done.
- [ ] Point out which nerfs are too big: same.
- [x] Estimate values of rebalanced tags vs the Ult+26 game: findings.md "Halley's Ult+26 replayed". Rerun after the
      stand-route fix.

Branches that feed into it:

- `feature/bot-take-patriot` (`fish-patriot`, a legacy bot that always takes Patriot): pushed, no PR, merged into the
  balance branch. It is a bench-only profile.
- `fix/spacc-subwave-stand-route` (pushed, no PR):
  - **The bug, also on main:** a risk sub-wave unit could take a leader's standing route (wait 500 s), so it stood still.
    This is why United 2's Hidden Core took ~510 s in the Halley replay.
  - **Options:** merge it into the balance branch, or open its own bug-fix PR (Fish's call).

Also open: #47 (Patriot targetable while invulnerable), #48 (Blood Debt icon), #121 (clears tracking issue;
`untracked/spacc-clears.mjs` regenerates it), #125 (free-tags option: a feature, see "Needs Fish").

## Bots

Allowed under the freeze: DYYBot, its siblings, and the research already started (no new bots). Keep bot code
browser-safe, deterministic and cheap: Yuri is moving bots to the browser.

- **DYYBot:** the steps are in `ai-players/05-dyybot.md` "Process". First the forced-Du-Yaoye baseline (the command is
  in 05), then the tactics in `sp-dyy-wt`.
- **#129 `legacy-layered`:** the tuning run of its 35 parameters (botbench `--profile`, small saved chunks,
  held-back seeds) has not been started.
- **Evolution bench:** to be built. `ai-players/06` says it needs 4-player lobbies.

Fish's bot research list (2026-11-11):

- [ ] Write new tactics based on legacy or other existing classical bots:
- - [ ] Simplifcations of existing tactics' behaviours
- - [ ] Variations of existing tactics' behaviours (different code, not what can be accomplished with just parameters)
- - [ ] New tactics that could supplement existing tactics
- [ ] Determine if any data sharing model is needed, other than actions. (ex. if board placement step needs to know who the carry is, this may force the tactic to be monolithic and unable to be broken up, unless every tactic replicates that carry dps logic OR a new form of data sharing is introduced)
- [ ] Try it in the evolutionary auto-tuning bench
- - [ ] Answer: Did the most fit strategy win significantly more?
- - [ ] Answer: Did the most fit strategy actually make use of evolution, or was it reachable with only parameter tuning?
- - [ ] Answer: Is the evolution bench effective? If not, can we improve it to make it effective?

Bot issues still open:
- answered in `ai-players/`, could be closed: #36, #71, #72;
- research: #29, #115, #124, #128;
- features: #87, #117 (see "Needs Fish").

## Mod Z

Designs in `operator-mod-z/` (Fish's, uncommitted). Mod Z is new gameplay, so it may not fit the freeze: Fish's call.

- [ ] Attempt to draft these mod Z's on a branch
- [ ] Hypothesize what would make each mod Z good
- [ ] Draft bot tactics that would make use of those mod Z
- [ ] Try the evolution bench
- [ ] Report on if the new mod Z's are underpowered, about right, or overpowered

## Bugs (allowed under the freeze)

- #116 Blaze's skill can't be changed.
- #120 the changelog's "NEW" area still shows 0.3.0 and the Sakiko announcement.
- #122 the Degenbrecher's stacks come on deployment, not on skill activation.
- #123 the LP lost shown top right and in the round announcement leaves out Last Line's −2.
- #47, #48: under SPA-CC above.
- #90 Du Yaoye's 2nd refresh:
  - not reproduced in code or in the 2026-10-27/28 replays;
  - a record logs the shop before the trait (server/match/records.js `shop`), so logging it after onRefresh too would
    settle the next report;
  - the issue has no comment yet, so this analysis is only here. Worth posting it there.
- Leftovers of #98–#100:
  - tools/package.mjs doesn't put server-info.json in release zips;
  - docs/PLAYING.md (upstream's, Chinese) still links sganggs's issues;
  - the title screen's Discord button still points to stronghold-en.dev's community.
- Leftover of #88: Strategy 2's three Strategy changes (Ioleta, Du Yaoye, Amiya) aren't in their texts.

## End of service

Everything is in `untracked/eos-notes.md`. Open:

- the banner switch and the static EoS page, both with the default message preloaded (Fish: commit them closer to the
  time);
- the translations once Fish's EN text is final;
- the repos' README notice.

## Needs Fish

- **Feature issues under the freeze, close or label and leave:** #87, #104, #105, #117, #118, #124, #125, #128.
- **Research and tracking issues to keep or close:** #33, #34, #52, #93.
- **Bot findings post** (`untracked/bot-findings-post.md`, written for an issue on sganggs's repo): post it elsewhere,
  or drop it now that there are no more sganggs syncs?
- **Lobby rules and SPA-CC for Yuri:** Fish asked Yuri on 2026-10-16 whether gameplay mods are welcome as dormant
  code. Is this still wanted with EoS coming?
- **Merge commits for sync PRs:** the repo merges by squash only, so every sync needs a hand-picked merge base.
  Allowing merge commits would make the next sync a plain `git merge`.
- **Stale branches:** many `wip/*`, `yuri/*` and `wip/loop-notes-*` branches are merged or dead, locally and on the
  fork. They could be pruned. `wip/sync-yuri-0.2.6` is the one known stale branch.
- **The old `wip/3` notes stash:** `git stash` `stash@{0}` "wip/3: remove-before-merge/ edits …". It can be dropped
  once you've checked it.

## Parked

- Stale browser data / "3D unavailable" (2026-10-10):
  - parked by Fish on 2026-10-16;
  - lead: version-stamp the 1-day-cached URLs per build;
  - ask for the console line `[field] render engine unavailable` next time.
- Visual overhaul (particle engine, effect extraction): a new feature, frozen.
- Record digests: 2 of 173 battles of 2026-10-27/28 differ (32cd92, rounds 3–4) with the same kills and leaks.
  - Lead: put the commit and the digest's JSON in records.
- Known flake: `test/studio/review.test.js` "trial uses the actual sandbox executor" once went over its 5 s limit on
  Windows.
- Open questions with no owner:
  - What would help new contributors (humans or Claude) get started?
  - Can a new server owner find how to fetch the assets and deploy from source?
  - Is a usability step missing before PRs go up?
