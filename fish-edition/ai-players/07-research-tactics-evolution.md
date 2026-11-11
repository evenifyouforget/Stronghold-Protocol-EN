# Research tactics and the evolution bench (2026-11-11)

Fish's "bot research" list (TODO.md "Bots"). Code: branch `feature/bot-tactics-research` (pushed, no PR):
- `server/match/botTacticsResearch.js`: the tactics;
- `tools/evolve.mjs`: the bench;
- `test/match/bot-tactics-research.test.js`: the tests.

Data: `untracked/evolve-2026-11/`.

## The tactics

Nine tactics, usable in profile data (`botbench --profile`, the bench). None is in a registered profile. All are cheap
and deterministic: no RNG draw, no rehearsal, PlayerState intents only. So they stay browser-safe.

| Kind | Tactic | What it does |
|---|---|---|
| Simplification | `simple-level` | levels whenever affordable from a round on, keeping a reserve; no legacy curve |
| Simplification | `simple-spend` | spends the leftover on N refreshes, stopping when a merge copy shows |
| Simplification | `simple-freeze` | freezes never, or only for an unaffordable merge copy |
| Variation | `bounty-optimism` | 机变: bounty cards scored with legacy's kill chance p reshaped to 1 − (1 − p)^k (#29: cards rated 20–50 % are killed 94 % of the time) |
| Variation | `bounty-gate` | 机变: no bounty card under an LP floor or below a kill chance; legacy picks among the rest |
| Variation | `lp-hold-level` | legacy's levelling, held while LP is low |
| Supplement | `merge-first` | buys the copies that complete a merge before legacy buys |
| Supplement | `sell-singles` | after legacy's selling, sells the hand's low-tier single copies |
| Supplement | `early-roll` | extra refreshes before legacy buys, from a round on, above a reserve |

A smoke run (solo ABYSS, 2 seeds) showed which ones change play under their defaults. `merge-first` didn't, most likely
because legacy already buys merge copies first.

## Is a data sharing model needed?

**Yes, at the boundary to legacy.** Tactics can share data among themselves today:
- per seat, each profile entry has `ctx.state()`;
- every tactic can import legacy's exported analysis (`bondPlan`, `buyScoreOf`, `fieldModel`, `bountyKillChance`).

**What they can't do is change what legacy computes inside its own decisions.** Writing the tactics found two cases:

- **The `bountyKillChance` hook doesn't steer the draft.** Legacy's 机变 pick calls its internal estimate, and the hook
  only feeds the digest (aiDigest.js). A tactic that changes the hook changes no decision. `bounty-optimism` had to
  rebuild legacy's bounty formula at `pickCard` instead.
- **Legacy's other scores are private.** Its scores for item and tactic cards (`tacticScore`), its lineup (`chooseLineup`)
  and its carry are not exported. So a tactic can't compare its option against legacy's best alternative. It can only
  take legacy's pick or override it outright.

The carry example from Fish's list is the same case: board placement's idea of the carry lives inside legacy's
`context()`. Two ways out, neither built yet:
- **Export legacy's analysis as read-only functions:** `chooseLineup`, `tacticScore`, the carry. This is cheap, and
  every tactic computes again what it needs.
- **A per-seat blackboard:** one tactic writes the carry or the plan, and others read it. This shares work, but it
  makes the order of tactics matter in a new way.

The first is enough until a tactic needs the same expensive answer at several decision points.

## The evolution bench

A candidate is a profile, legacy always below.
- **Mutations:** add, remove or move a tactic, or change one parameter within its declared bounds.
- **Crossover:** merges two parents' lists in order.
- **Fitness per match:** victory + 0.25 × hidden core + 0.25 × rounds passed / boss round, minus 0.005 per tactic.
- **Control:** legacy is in every generation, and every candidate plays the same seeds.
- **Caching:** matches are cached per genome and 10-seed chunk, so restarts resume.

### Run 1: solo ABYSS, 12 × 6 generations, one fixed block (seeds 1–40)

| | Training (seeds 1–40) | Held back (seeds 101–160) |
|---|---|---|
| legacy | 14/40 | 27/60 |
| best: `sell-singles(fromRound=5)` | 20/40 (+11 / −5 vs legacy) | 27/60 (+10 / −10) |

Answers to Fish's questions, for this run:

- **Did the most fit strategy win significantly more?** On the training seeds it seemed to. On held-back seeds, no:
  27/60 each, with 10 flips each way. The training gain was the winner's curse: 72 noisy candidates selected on the
  same 40 seeds.
- **Did it use evolution, or was it reachable with parameter tuning alone?** Parameter tuning. By generation 5 every
  top profile is `sell-singles` with a changed start round. The other tactics in those profiles change no outcome
  (20/40 each): they are hitchhikers.
- **Is the bench effective?** Not as run. 40 fixed seeds can't tell a 5-point gain from noise. In one generation,
  differences of ±4 wins appear among tactics that change little.

### Improvement: `--resample`

Each generation plays a fresh block of 40 seeds (generation g: seeds 40g+1 to 40g+40). A candidate's fitness is its
mean over every block it has played. A lucky candidate must keep winning on new seeds, and its score regresses as it
survives. The held-back seeds move to 1001–1060.

Run 2 (`untracked/evolve-2026-11/solo-abyss-resample/`) is the same run with `--resample`. Its result goes here.

### Further options, if run 2 is still noise

- **Rank by a paired sign test on flips against legacy** instead of the raw mean.
- **A finer fitness:** boss damage per match is far less noisy than win / loss (`ai-players/05` used it).
- **Fewer candidates on more seeds.** A gain of 5 points in win rate needs a few hundred paired matches to show.
- **`--pool legacy`:** legacy's own 35 parameters, which is #129's tuning run. Its answer to "evolution or just
  tuning?" is the baseline to beat.
- **`--config coop4:ABYSS`** for the team tactics of `06-fang-russell-4man.md`.
