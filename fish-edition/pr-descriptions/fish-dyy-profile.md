Draft: the DYYBot line (`fish-edition/ai-players/05-dyybot.md`) and the bot research tactics, plus the experiments
for Fish to run on a bigger machine. **Not for merging yet**: the tactics are a first draft, and the runs below decide
what stays.

Base: `main` (7bf71d0c, #130). Branch: `feature/fish-dyy-profile`, which merges `feature/bot-tactics-research`.

## What's in it

- `server/match/botTacticsDyy.js`: Fish's Du Yaoye tactics, each passing for any other Strategy:
  - `dyy-level`: a fixed levelling schedule (`fish` 2 / 4 / 5 / 7, or `human` 2 / 4 / 6 / 9);
  - `dyy-shop`: buy Yan and side-Alliance operators, sell Bench operators for them, hunt Yan with the 2 special refreshes;
  - `dyy-freeze`: freeze an unaffordable Yan operator.

  Profile `fish-dyy` (opt-in, in the room's list), and the tactics by id for profile data.
- From `feature/bot-tactics-research` (ai-players/07):
  - `server/match/botTacticsResearch.js`: nine research tactics;
  - `tools/evolve.mjs`: the evolution bench.
- Tests: `test/match/bot-tactics-dyy.test.js`, `test/match/bot-tactics-research.test.js`.

## Experiments

**Run here (Claude), after the balance sweep:** the forced-Du Yaoye baseline and the draft. Solo Ultimate, Du Yaoye
forced, seeds 1–160, on the same seeds:
- `legacy`;
- `fish-dyy`;
- `fish-dyy-human` (the draft with the human levelling schedule).

That's 480 matches, about an hour. It answers whether the draft beats legacy as Du Yaoye, and which schedule is better.

**For Fish's PC, later: the DYYBot evolution run** (05 "Process", step 5). It waits for the step 3 tactics: the
Isomorph plan, the levelling, Yan-focused buying and freezing. Then this PR gets one command that runs everything and
writes one zip to send back.

## Known issues

- The draft explains well under 90 % of human Du Yaoye behaviour (05, "Process step 1"). Most of the gap is the
  roll-down from round 9: refreshes, sells and equips.
