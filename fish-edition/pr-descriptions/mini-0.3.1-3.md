The third mini release on 0.3.1: four fixes (Laterano Mod B's alliance text, the Unite Phase's pending LP, the match history's end screen, the issue templates) and the fork notes.

Base: `main`. Branch `mini/0.3.1-3`. Squash-merged: the squash commit's message is this PR's title, so its changes stay readable in `main`'s history.

## Changelog

### Fixes
- **Laterano Mod B's alliance text** (#80, closes #75): Mod A's lines in their own styling, the live ammo % (`min(5 + 1 × stacks, 75 + 0.3 × stacks)`) and a new middle line for 100 stacks, in every language. The text and the battle read the same numbers.
- **The Unite Phase's pending LP** (#80, closes #76): "settlement costs up to N LP" and the teammates' live LP weigh each enemy like the settlement does (a Patriot 5), then the per-round cap, then Last Line. The settlement itself has charged 5 for a Patriot since #20.
- **The match history's end screen** (#82, closes #78): records keep the match's Custom Lobby Modifications, so a re-viewed match shows its SPA-CC +N, WITH CHEATS and its list of room changes. Matches recorded before this have none saved.

### Docs and text
- **Issue templates** (#81, closes #79): the "latest version" badge shows our main's version (it showed sganggs's 0.3.3) and the links point at this repo.

### Fork notes
- The notes of the loops of 2026-10-27/28 (#73, #83):
  - TODO.md;
  - STANDARD_LOOP.md rewritten into 11 steps;
  - FINDINGS.md §6: which gameplay changes could be plugins (#52);
  - ai-players.md: #71 / #72;
  - `pr-descriptions/` cleaned of merged and closed PRs.

Closes #75
Closes #76
Closes #78
Closes #79

## Known issues

- Victoria Mod C's alliance text has the same one-paragraph formatting #75 reported for Laterano (not reported, not changed).
- **Not in this release:** #37 (closes #27) is waiting on j-tai's sourceless-damage version.
- **Not checked on screen:** no game assets in the CI or dev container.
