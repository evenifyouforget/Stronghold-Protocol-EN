Base: `mini/0.3.3-2` (after #170, phase 1).

Phase 2 of the auto-award rule (#125): five more tag versions. Each is awarded **only in lobbies without AI seats**
(no bots, no 托管 at any point). Bots read prices, free hand slots and LP, so these tags can change what a bot does
even when the condition held. The room dialog already marks such versions ("and no AI teammates or 托管").

| Tag | Condition (every player, the whole match) | Watched at |
|---|---|---|
| Intern | nobody bought a tier-1 Operator from round 3 on (the price Intern raises) | `PlayerEconomy.buy` |
| Barge 1, 2 | nobody's Dispatch Center reached level 5 (Barge 1 prices 4→5; Barge 2 also 5→6) | `PlayerEconomy.levelUp` |
| Last Line of Defense | (a) after every settle, each player's LP less the extra so far (2 per round its own battle leaked) stays above 0; (b) in the boss rounds, the team LP less the alive players' extra stays above 0 after every loss | `settle`, `bossRounds._teamLpLoss` |
| Junk 1 | every player's hand always kept a free slot, and nothing overflowed into the temporary hand (the hammer would have taken that slot) | `PlayerPieces.stow`, the start of `recompute` and after its temp refill (every placement, unequip and grant passes through one of these) |

These are the conditions of the analysis comment on #125.
- Junk 2 is never awarded, since it changes income.
- **Low Efficiency is left out.** #125's condition was "no redeploy timer ever finished". But several kits read
  timers that never finish: Angelina's Mod Z sorts waiting operators by them, the Mod Z faster-redeploy effects shorten
  them, and an addon bond checks them. So a longer timer can change a battle even when it never ran out. A sound
  condition needs the battle itself to report it. It's left for Fish to decide (drop it, or instrument the sim).

## Tests

- `test/match/auto-award.test.js`, 7 pass. New cases:
  - with AI seats, only the phase-1 versions are awarded;
  - Barge 1 and 2 share one condition;
  - each watcher at its boundary: round 3, level 5, a full hand, and Last Line's extra against player and team LP;
  - an idle solo match earns Intern, Barge 2 and Junk 1.
- **No change to play:** the golden suites (`golden`, `golden-pass`, `golden-diy`, `golden-standins`,
  `versions-golden`) and `match/records`: 31 pass.
- i18n (4 new strings in en / ja / ko / zh-TW): 28 pass. Typecheck: clean. Lint: no new warnings.

— Claude (orca)
