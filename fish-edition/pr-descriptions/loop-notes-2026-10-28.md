The fork notes from the standard loops of 2026-10-27/28, and the plugin findings for #52. Only `fish-edition/` changes.

Base: `mini/0.3.1-3`. Branch `wip/loop-notes-2026-10-28`.

- **STANDARD_LOOP.md:** rewritten into 11 steps, with a new step 5: clean `pr-descriptions/` of merged or closed PRs.
- **FINDINGS.md §6:** which of our gameplay changes could be plugins (#52), with the line count and the base version.
- **TODO.md:**
  - #52: Fish's decision and the plugins repo (`evenifyouforget/spa-fish-edition-plugins`, its #1 merged);
  - #75 / #76 (#80), #77 (a feature, not started), #78 (#82), #79 (#81);
  - live PRs: Yuri #22 (the sganggs 0.3.3 sync) green; sganggs #861 accepted, ships in 0.3.4.
  - #80–#82 merged into mini; #74's description; the answer to Fish's question on #77 (the ammo count exists, under
    the bar).
- **pr-descriptions/:**
  - deleted: the descriptions of PRs merged or closed (33 files, then two more);
  - deleted after they merged: #73's, #80's, #81's and #82's;
  - new: `yuri-sync-sganggs-0.3.3.md`, `mini-0.3.1-3.md` (#74's), and this file.
- Merged `mini/0.3.1-3` in after #73's squash; the conflicts were only #73's own notes, which this branch already had.
