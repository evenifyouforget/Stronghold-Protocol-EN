The third mini release on 0.3.1: the room's rules in the Match Info tab, the Strategies' texts under Strategy 1, AI names in the host's language, and six fixes (Laterano Mod B's alliance text, the Unite Phase's pending LP, the match history's end screen, two SPA-CC texts, the issue templates).

Base: `main`. Branch `mini/0.3.1-3`. Squash-merged: the squash commit's message is this PR's title, so its changes stay readable in `main`'s history.

## Changelog

### Features
- **The room's rules in the Match Info tab** (#96, closes #86): the in-game 本局信息 tab lists the rules in force, with the risk total and WITH CHEATS. A SPA-CC tag's chip shows its effects on hover, and so do the end screen's chips.
- **AI players named in the host's language** (#96, closes #89): "AI·Warfarin, AI·Amiya, …" in English, and in Japanese, Korean and Traditional Chinese. The host's client sends its language with "add AI" (`room.addBot` / `queue.ai`, an optional `lang`), so everyone in the room sees the same names. Other languages and older clients get the Chinese names as before.

### SPA-CC
- **The Strategies' texts under Strategy 1** (#96, closes #88): the 12 Strategies whose rounds come one round later say the new rounds, highlighted, in every language (Jessica: 5/8/11/14). Before, the texts kept the old rounds.
- **A tag that builds on the level below lists both** (#94, closes #84): Investor 2, Strategy 2 and Junk 2 show their level-1 effect too in the rules dialog, and the level-1 tile lights up as included. The game already applied both.
- **Last Line of Defense's text** (#94, closes #91): it says it is once per round, also after the Unite Phase, on top of the 10 LP per-round limit, so a round can cost up to 12.
- **The Unite Phase's pending LP** (#80, closes #76): "settlement costs up to N LP" and the teammates' live LP weigh each enemy like the settlement does (a Patriot 5), then the per-round cap, then Last Line. The settlement itself has charged 5 for a Patriot since #20.

### Fixes
- **Laterano Mod B's alliance text** (#80, closes #75): Mod A's lines in their own styling, the live ammo % (`min(5 + 1 × stacks, 75 + 0.3 × stacks)`) and a new middle line for 100 stacks, in every language. The text and the battle read the same numbers.
- **The match history's end screen** (#82, closes #78): records keep the match's Custom Lobby Modifications, so a re-viewed match shows its SPA-CC +N, WITH CHEATS and its list of room changes. Matches recorded before this have none saved.

### Docs and text
- **Issue templates** (#81, closes #79): the "latest version" badge shows our main's version (it showed sganggs's 0.3.3) and the links point at this repo.

### Fork notes
- The notes of the loops of 2026-10-27 to 10-29 (#73, #83, #95, #97):
  - TODO.md, with the triage of #84–#93;
  - STANDARD_LOOP.md rewritten into 11 steps;
  - FINDINGS.md §6: which gameplay changes could be plugins (#52);
  - ai-players.md: #71 / #72;
  - `pr-descriptions/` cleaned of merged and closed PRs.

Closes #75
Closes #76
Closes #78
Closes #79
Closes #84
Closes #86
Closes #88
Closes #89
Closes #91

## Known issues

- **Strategy 2's Strategy texts:** Strategy 2 also changes Ioleta Russell (her cap), Du Yaoye (one special refresh) and Amiya (one more alliance per tier), and their own texts don't say so yet. The rules dialog does.
- **AI names:** an AI keeps the host's language; someone in the room with another language sees the host's names.
- Victoria Mod C's alliance text has the same one-paragraph formatting #75 reported for Laterano (not reported, not changed).
- **Not in this release:** #37 (closes #27) is waiting on j-tai's sourceless-damage version.
- **Not checked on screen:** no game assets in the CI or dev container.
