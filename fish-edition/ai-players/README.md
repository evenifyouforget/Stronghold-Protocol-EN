# AI players

Research notes on the bot players: what they do, how well, and how to build a stronger bot. This directory was split
out of the former `fish-edition/ai-players.md` (2026-11-07), keeping its order. File paths in these notes, such as
`untracked/…`, are relative to `fish-edition/`.

| File | What's in it |
| --- | --- |
| [01-findings-2026-10.md](01-findings-2026-10.md) | The first findings (2026-10-21 → 27): the legacy bot's strategy, speed and win rates, the first SPA-CC tag table, the first human records, why humans win Standard, blocking (#71) and originium (#72) |
| [02-architecture.md](02-architecture.md) | Fish: keep the legacy bot, build a separate smart bot from layered strategies |
| [03-human-game-analysis.md](03-human-game-analysis.md) | Fish's research plan, the agreed bot terms, the evolution plan, hypothesis tests H1–H12 on human boards |
| [04-predictive-and-carry-rank.md](04-predictive-and-carry-rank.md) | Predictive models of board strength, the carry rank test, Alliance / Attribute copies, an HP-tracking boss pool, bot placement vs human placement, the #31 tag sweep |
| [05-dyybot.md](05-dyybot.md) | DYYBot: Fish's tactics for a strong Du Yaoye bot, and whether the new bot framework makes them redundant |
| [06-fang-russell-4man.md](06-fang-russell-4man.md) | Fang and Russell, team-play tactics, and why evolution needs 4-player lobbies |
| [07-research-tactics-evolution.md](07-research-tactics-evolution.md) | Nine research tactics, whether tactics need a data sharing model, and the evolution bench's first runs |
| [08-stacks-and-investor.md](08-stacks-and-investor.md) | Why bots fall behind on stacks (the operators deployed and the items they never buy) and never play Investor; the `plan-bond`, `plan-engines` and `plan-items` tactics |
| [09-placement.md](09-placement.md) | How legacy lays out the board; Fish's placement ideas against what legacy does and what the records measure |
| [10-evolution-methods.md](10-evolution-methods.md) | The literature on tuning under noise (irace, SMAC, NTBEA, CMA-ES); iterated racing in `evolve.mjs --race`; why the fitness stays win-aligned |
| [11-ml-from-scratch.md](11-ml-from-scratch.md) | SPA from first principles (state, actions, objective); ML techniques from the literature; battles are replayable from records at 36 ms each; the battle surrogate, discrete-choice imitation and a value function, ranked for our budget |

**Research order (Fish, 2026-11-05):**
1. Get everything out of the measurements first: predictive models and carry rank.
2. Then invent DYYBot tactics from human play.
3. Then tune DYYBot with an evolutionary algorithm.

## Seeds (Fish, 2026-11-17)

Research may use seeded bot games, and collaborators won't necessarily coordinate on the seeds they use. Avoid reusing
seeds, except for an explicit replication or a paired (fair) comparison, where both sides play the same seeds on
purpose. So:

- **Start each research inquiry at a random seed**, not the next number after the last one (for example
  `node -e "console.log(1e5 + Math.floor(Math.random() * 9e8))"`), and count up from there.
- **Write down the seeds used** in the note that reports the result: the range, which runs were paired, and which were
  held back.

Earlier notes used small consecutive ranges (101–148, 5001–5300, 7001–9000 …). They stay valid as recorded (each seed is
hashed through `deriveSeed`, so a range is only bookkeeping), but new work shouldn't pick seeds near them.
