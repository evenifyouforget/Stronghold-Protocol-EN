Part of #125 (phase 1). Base: `mini/0.3.3-2`. Branch `feature/auto-award-125`.

A new lobby rule, **Auto-award free Risk tags** (`autoAward`, neutral: not a cheat, no label of its own). At the end of
the match, each Risk tag the room didn't take is added to the result's Risk when the match shows it changed nothing:
replaying the match with the tag on would give the same match. The conditions are the ones from the analysis comment
on #125.

## Phase 1: the tags it awards

| Tag | Condition (every player) |
|---|---|
| Investor 1 | Investor never active (the bench counts), at any moment |
| Investor 2 | Investor 1's condition, and nobody obtained Muelsyse, Kjera or Flametail (Elite included) |
| Swift | Swift never active in any battle |
| Foresight | no Foresight Operator fought in any battle |
| Strategy 1 | nobody picked an affected Strategy (the 13 with a named round; derived from the data, matches the spec) |
| Strategy 2 | Strategy 1's condition, and nobody picked Ioleta Russell, Du Yaoye or Amiya |

All six hold with AI seats too. Phase 2 (a separate PR): Intern, Barge 1 / 2, Low Efficiency, Last Line, Junk 1, which
need a lobby without AI seats (the code already has the `aiOk` flag and notes 托管 as an AI seat).

Only untaken tags are awarded, at the highest level whose conditions held (a tag taken at level 1 isn't raised).

## How it works

- `shared/autoAward.js`: the awardable versions, their conditions and texts, `awardedTags`.
- `server/match/autoAward.js`: watchers that mark a condition broken at the first event that shows the tag could have
  mattered. They only read the match:
  - Investor 1: the live bond recompute (`PlayerRound`), when 投资人 is active.
  - Investor 2: `acquireChess` / `transformChess`.
  - Swift, Foresight: every real field, server or client combat (normal, boss, unite), from its battle spec (active bonds,
    deployed operators). Previews and bot rehearsals aren't watched.
  - Strategy: at the end, from each player's Strategy.
- The result: `m.result.awarded`, `m.public.awarded` and the match record's `awarded` (`{ key: level }`).
  `ruleLabels(rules, awarded)` adds their Risk to the total.

## What players see (Fish's choices in `fish-edition/spacc/cards-overhaul.md`)

- **End screen:** awarded tags join the rules chips as orange chips (still Risk) with corner brackets instead of an
  outline, a faint triangular lattice and an **AUTO** label; a scan line creeps up them (off with reduced motion). The
  Risk total includes them.
- **Room, Risk tab:** the rule's toggle above the grid. While it's on, it lists every tag it can award with its
  condition, and warns that the conditions cover only some cases, so taking a tag by hand is the way to be sure. The
  awardable tiles get a dashed outline.

## Tests

- `test/match/auto-award.test.js` (new, 5): the award logic (rule off, taken tags, levels, stacking), the list against
  RULES, `ruleLabels` with awards, Strategy 1's 13 Strategies, a whole match played with the rule on and off (same
  outcome, same rounds; the idle game earns Swift and Foresight, in `m.public` and `m.result`), and a real field breaking
  Swift and Foresight.
- `lobby-rules-match`, `risk-tags`, `records`: pass.
- **Golden: every scenario matches** (the watchers change nothing).
- `i18n check --all --strict`: complete in all four languages. Lint: no new warnings.

Not seen in a browser (no Chrome here): the chip and the dialog list are worth one look.

— Claude (orca)
