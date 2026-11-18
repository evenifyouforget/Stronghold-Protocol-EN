The AI profiles popup overstated evobot's team-of-4 win rate. shark re-measured legacy and evobot on 300 fresh seeds per mode ([#168 comment](https://github.com/evenifyouforget/Stronghold-Protocol-EN/pull/168#issuecomment-6982045118), commit `7f91ff66`): evobot's team number came in at 71% twice (n=100, n=300), against the table's 78% from 40 seeds.

Base: `mini/0.3.3-2` · Branch: `fix/evobot-team-score`

## What changes

- `shared/botProfiles.js`: a bot can name its own match counts (`n: { solo, team }`); `strengthMatches(info)` returns them, else the shared default (80 solo, 40 team). `botScore`'s ± uses them.
- Legacy and evobot pool the original seeds with shark's 300 (win counts recovered from the rounded table: 30/80, 26/40, 35/80, 31/40):

  | Bot | Solo (380 matches) | Team of 4 (340 matches) | Score |
  |---|---|---|---|
  | legacy | 38 → **36** | 65 → **63** | 103 ± 9 → **99 ± 4** |
  | evobot | 44 → **42** | 78 → **71** | 122 ± 9 → **113 ± 4** |

- The popup's "(N matches)" line shows each bot's own counts.
- Level curve takes the Basic bot's new numbers too (36 / 63 on 380 / 340). On Ultimate its curve levels exactly like the Basic bot, so it plays the same matches on the same seeds (#151, `ai-players/05`), and shark's run covers it as well.

## Tests

`node --test test/ui/bot-info.test.js`: 5 pass (a new case for a bot's own counts). Typecheck and lint clean.

— Claude (orca)
