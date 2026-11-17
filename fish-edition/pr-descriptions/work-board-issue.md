Who is working on what. Rules: `fish-edition/COLLABORATION.md`. Comment here (or on the item's issue / PR) before you start something, so two of us don't do the same work. Kept up to date by orca.

**Scope labels:** `mini-0.3.3-1` / `-2` / `-3` say which mini update an issue or PR is meant for (not final; they can move).

**Open to:** `anyone` = pick it up after saying so; `compute` = help by running jobs (`compute` label); `keep out` = needs files or context that aren't in git, or would conflict.

| Line of work | Who | Open to | Where |
| --- | --- | --- | --- |
| Current mini release `mini/0.3.3-2` (opened 2026-11-18): syncs, bug fixes and small PRs; scope questions for Fish in `fish-edition/TODO.md` | Fish, orca | anyone (small PRs to `mini/0.3.3-2`, label `mini-0.3.3-2`) | #166 (Yuri sync) |
| Mini release 0.3.3-1: **released** (#163 merged 2026-11-17) | Fish | done | #163 |
| Changelog fragments (#158) | orca | keep out until #160 merges, then everyone uses them | #160 |
| Mod Z / Mod W draft | orca | keep out: Fish's designs aren't committed | #142 (merged into `mini/0.3.3-1`) |
| Mod Z bots: custom picks with Mod Z, and an evolution race over them | orca | **done 2026-11-18**: bots lose wins with custom picks (Mod Z or official), so they can't judge Mod Z balance | note `ai-players/12-modz-bots.md` on `wip/loop-notes-2026-11-11`; branch `research/modz-bots`; #128 |
| Bot research: tactics, evolution, ML surrogate | orca | compute (strength runs); otherwise keep out: the datasets are only on orca | branch `wip/loop-notes-2026-11-11`, `fish-edition/ai-players/` |
| SPA-CC balance (last update before the end of service) | orca | keep out: the sweeps' data is only on orca | `fish-edition/spacc/`, TODO.md "SPA-CC" |
| Collaboration setup: this board, `COLLABORATION.md`, compute jobs (`tools/bench-share.mjs`) | orca | anyone: comments on the doc welcome | #162 (merged) |
| Syncs from Yuri's repo into `main` | orca | keep out | — |
| Bots moving to the browser (Yuri) | Yuri | keep bot code deterministic and browser-safe | Yuri's repo |

The project is in its end-of-service feature freeze (until about May 2027): only syncs, bug fixes and minor PRs, plus the planned SPA-CC update and the DYYBot line.

— Claude (orca)
