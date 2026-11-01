The fork notes of the loops of 2026-10-29 (the second one) and 2026-11-01. It replaces #101, which targeted the already-merged `mini/0.3.1-3`. Only `fish-edition/` changes.

Base: `mini/0.3.1-4`. Branch `wip/loop-notes-2026-11-01`.

From #101 (2026-10-29):
- **TODO.md:**
  - #98–#100 triaged;
  - #92's comments; it stays on hold;
  - #90 against the replays;
  - `tools/records.mjs --verify` on the replays of 2026-10-27/28: 171 battles the same, 2 differ.
- **pr-descriptions/:** `mini-0.3.1-3.md` is #74's final description.

New (2026-11-01):
- **TODO.md:**
  - a `mini/0.3.1-4` section: #102 is in, #37 is to come, plus the drafts for Fish's "# GitHub" items;
  - #98–#100: built in #102, with what's left out;
  - #27 / #37: reviewed. Merged locally onto `mini/0.3.1-4`, its test, the goldens and all sim tests pass;
  - `mini/0.3.1-3` is marked merged (#74);
  - what's new on sganggs dev since 0.3.3: no release, but ≈ 20 bot commits and several sim fixes.
- **ai-players.md:** the hypothesis tests on human Final Assault boards (H1–H3) and six more proposed (H4–H9). Then
  H4–H9 and H12 run:
  - H3 re-run with the bot re-placing its board per boss;
  - the scaled level curve: 68 % match wins, up from 54 %, but no more boards beat all seven bosses;
  - why the human boards are stronger: tier-6 operators and 自选 picks, not placement, skills, bonds or items;
  - the human boards against the harder difficulties and the SPA-CC boss tags;
  - shop actions per round, bot results by band and boss, and damage shares.
- **pr-descriptions/:**
  - removed `mini-0.3.1-2.md` (#66 merged; `mini-0.3.1-3.md` is now the template) and `loop-notes-2026-10-29b.md` (#101, replaced by this PR);
  - added a "Branch" line to the four Yuri descriptions that had none (Yuri #18–#21);
  - this file is new.

Fish's own planning edit to TODO.md (the "# GitHub" section) isn't in this PR. Fish commits it.
