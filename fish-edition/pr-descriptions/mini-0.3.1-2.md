The second mini release on 0.3.1: shift physics and block shifting, the Equipment Booster Pack, the SPA-CC spec updates and four fixes.

Base: `main`. Branch `mini/0.3.1-2`. Squash-merged: the squash commit's message is this PR's title, so its changes stay readable in `main`'s history.

## Changelog

### Gameplay
- **Pushes and pulls slide instead of jumping** (#67, closes #60): momentum and friction at 30 fps, which reproduces the official distances. Pushes in quick succession stack; walls stop a slide.
- **Block shifting** (#67, closes #61): an enemy blocked while inside an operator's tile moves just past the tile's edge and stays blocked. One that would stand on another's block position steps slightly aside. The numbers are assumed, since the wiki gives none.

### SPA-CC
- **New tags** (#63):
  - Objective: Investor 2: Muelsyse's, Kjera's and Flametail's "When obtained" effects trigger when sold instead;
  - Objective: Strategy 2: Ioleta Russell capped at +50 %, one special refresh for Du Yaoye, Amiya's tiers need one more alliance.
- **Changed tags** (#63):
  - Famiglia Seasonal 2: the Ledger triggers at 200, starts empty, and starts half full from round 10;
  - Vengeance: Reids come by the highest active alliance's stacks, not the total.

### Cheats
- **Equipment Booster Pack** (#65, closes #56): its own lobby toggle. Equipped on any operator, it offers 6 items for free, cycling through every shop item.

### Fixes
- The match record has a row for every round, a won Final Assault's last round included (#65, closes #59).
- The Booster Pack shows its icon and name (#65, closes #62).
- An enemy shows either the official invulnerability effect or our ribbons, never both (#65, closes #57).

### Docs and text
- Both READMEs explain match recording (#65, closes #58).
- Japanese, Korean and Traditional Chinese for every SPA-CC text (#69).

### Tools
- `botbench --rules`: bot matches with any lobby rules, such as SPA-CC tags (#69).
- CI reports each failed test as a GitHub annotation, readable through the API (#70).

- Windows CI: Windows' own `tar.exe` crashes on the GitHub runners, which made the zip-reader test fail; `zipFolder` now falls back to a built-in zip writer (#70, closes #28).

### Fork notes
- `remove-before-merge/` is now `fish-edition/`, with every note committed. ROADMAP.md is reorganized and SCOPING.md removed (#68).
- After pulling: `mv remove-before-merge/images remove-before-merge/untracked fish-edition/`, because git doesn't move ignored files.

Closes #56
Closes #57
Closes #58
Closes #59
Closes #60
Closes #61
Closes #62
Closes #28

## Known issues

- **Windows CI: one timing flake left.** After #70, `test/studio/review.test.js` ("trial uses the actual sandbox executor") went over the plugin sandbox's 5 s setup limit once, on a busy Windows runner (node 22, shard 1/3); it passed on a re-run, and #66 merged. The limit can be raised with `SP_SCRIPT_PROBE_MS`, but `test/plugins/script-review.test.js` checks the default, so it's left as is for now.
- **Not checked on screen:** no game assets in the CI or dev container.
