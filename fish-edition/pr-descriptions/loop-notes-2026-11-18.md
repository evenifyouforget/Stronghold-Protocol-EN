# Notes: fish-edition/ as of the 2026-11-18 loop

Target: `mini/0.3.3-2`. Branch `wip/loop-notes-2026-11-18`. Notes only: nothing outside `fish-edition/` changes.

The working notes branch `wip/loop-notes-2026-11-11` was cut on 2026-10-26 and never merged as a whole, so this branch
is cut fresh from `mini/0.3.3-2` and takes that branch's committed `fish-edition/` (merging it directly would bring
three weeks of stale code). `COLLABORATION.md` comes from `main` (#162).

## What it brings

- **Bot research notes** (`fish-edition/ai-players/`): the old `ai-players.md` split into an index (`README.md`, with
  the "Seeds" rule) and notes 01–12: human-game analysis, DYYBot, the evolution bench and its race methods (evobot's
  2,000-seed confirmation), stacks and Investor, placement, ML from scratch, and the Mod Z bots result (note 12).
- **`STANDARD_LOOP.md`**: the 11 steps, with the current templates (`mini-0.3.3-1.md`, `sync-yuri-2026-11-13.md`).
- **`TODO.md`**: the committed version (the 0.3.3-2 scope questions are in Fish's working copy, not here).
- **`pr-descriptions/`**: cleaned (merged PRs' files out). It keeps the open PRs' files (#135, #137, #166), the
  templates, the work board's source (#161) and `yuri-improv-view-fields.md`.
- `FINDINGS.md`: its first line no longer points at the old TODO list.

## Tests

`test/match/bot-evobot.test.js` and `test/sim/block-shift.test.js` (the two that name files in `fish-edition/`): pass.

No changelog fragment: notes only.

— Claude (orca)
