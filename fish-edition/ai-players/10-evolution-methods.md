# Evolution methods: what the literature recommends, and what we use (2026-11-12)

Fish: "please research the literature and let's use already known good techniques" for the evolution grinder.

Our problem in the literature's terms: **automatic algorithm configuration** under noise. A configuration is a profile
(tactics, their order, their parameters: categorical, integer and real). An evaluation is a match on one seed, with
a noisy, mostly binary outcome. Matches are expensive: about 1,000 solo matches an hour on Fish's PC.

## What the literature offers

| Method | What it does | Fits us? |
|---|---|---|
| **irace** (iterated racing; López-Ibáñez et al. 2016) | Samples candidates around the elites, then *races* them: all play the same instances one at a time, and a statistical test drops the significantly worse ones early. Elitist: survivors carry their results into the next race. | **Yes.** Built for this: mixed and conditional parameters, noisy evaluations, instances (= our seeds). The standard tool of the field. |
| SMAC (Hutter et al. 2011) | Bayesian optimisation with a random-forest model of the fitness; handles categorical and conditional parameters; its own intensification (racing against the incumbent). | Strong, but the model is heavy machinery for our space (variable-length tactic lists). A later option. |
| NTBEA (Lucas et al. 2018) | An evolutionary algorithm with a bandit model of parameter combinations, designed for noisy game-agent tuning; competitive with SMAC on Planet Wars. | Fits fixed parameter sets, not variable tactic lists. Good if we tune one tactic's parameters. |
| CMA-ES with uncertainty handling (Hansen et al. 2009) | The standard optimiser for continuous parameters; the UH variant measures noise from rank changes and adds re-evaluations. | Only for real-valued parameters. Most of our space is choices and lists. |
| Racing / ranking and selection with common random numbers (F-Race, OCBA; Chick & Inoue) | Spend evaluations on the candidates still in contention; play everyone on the same random numbers (seeds) so the comparisons are paired. | **Yes:** the core of irace, and we already pair by seed. |
| Survey (Jin & Branke 2005) | Noise: resampling, larger populations, or models. | Background. |

**Choice: irace's iterated racing**, written into our bench (`tools/evolve.mjs --race`, `tools/race.mjs`). The R
package itself would need R on Fish's PC and a wrapper around botbench, and its sampling model doesn't know our
tactic lists. So we keep our mutations (add, remove or move a tactic, change a parameter) as the sampling step, and
take the rest from irace:
- **Instances = seeds**, in one stream of 10-seed blocks. Every candidate of a race plays the same blocks (paired).
- **Racing:** from block 3 (`--first`) on, each candidate is tested against the current best: a one-sided paired
  t-test, Holm-corrected, α 0.05. irace's paper recommends the t-test when the instances' scores are commensurable and
  the goal is the mean, which is our case.
- **Elitism:** each race starts again from the first block, so a new candidate meets the elites on every seed they've
  played (cached, so free for the elites). An elite can only be dropped once the race has gone past its seeds.
- **Budget split** (irace §3): iteration j gets the remaining budget over the iterations left, and
  N_j = B_j / (3 + min(5, j)) candidates. Survivors: 2 + log2(parameters).
- **Sampling:** a parent elite picked with weight by rank, as irace does, then mutated; the parameter step shrinks
  by 0.7 per iteration (irace shrinks its sampling spread). The first race screens every pool tactic alone.
- **Legacy is the control:** never dropped, and every fitness is paired against it.

## The fitness: no cheaper proxy

Earlier I suggested scoring leader damage and stacks instead of wins, for less noise. The data says no. Paired t
statistics of each tactic against legacy (co-op Ultimate, 40 seeds):

| | score (now) | wins | leader damage | stacks R13 | rounds | LP |
|---|---|---|---|---|---|---|
| `items` | +0.16 | 0.00 | +0.68 | +1.22 | −0.29 | −1.82 |
| `eng-pos` | −1.42 | −1.71 | **+0.76** | +0.02 | −2.42 | −2.33 |
| `eng-pos-own` | −3.69 | −3.59 | −1.72 | −2.23 | −3.93 | −1.79 |
| `inv-p5-r4` | −1.35 | −1.71 | **+0.62** | −0.21 | −1.81 | −1.05 |

Leader damage *rises* for two profiles that lose more games. Stacks and damage are not aligned with winning, and they
aren't less noisy either. Mixes trade one signal for another (adding LP sharpens the losers and blurs `items`). So the
fitness stays the win-aligned score (victory + 0.25 × hidden core + 0.25 × rounds / boss round), paired by seed. A
stacks goal (Fish's 200+) is a different objective, to be chosen on purpose, not as a noise trick.

The gain has to come from **where the seeds go**, which is what racing does.

## Checked on a synthetic game

`EVOLVE_FAKE=<tactic>` replaces matches with a synthetic game: a 40 % win chance, ±4 points per tactic, and the
planted tactic +15 or +6 points. Seeds share luck (60 %), like paired matches. Each method had to put the planted
tactic into its best profile; 12 planted tactics × 2 search seeds each:

| Planted effect | Race: found (mean matches) | Old GA with `--resample`: found (mean matches) |
|---|---|---|
| +15 points | 24 of 24 (1,588) | 20 of 24 (1,870) |
| +6 points | 19 of 24 (2,472) | 17 of 24 (2,932) |

Racing is better, but not by a different order. A 6-point effect still needs a few thousand matches; a 2–3 point
one (like `sell-singles`) needs far more, whatever the method. Both methods also pick up hitchhikers: tactics with
no effect that ride along.

## The first real race (queued)

`untracked/queue9-2026-11-12.sh` → `untracked/evolve-2026-11/race1/`: solo Ultimate, pool research + basic, a
2,400-match budget, then the final elites against legacy on held-back seeds 5001–5300. It runs after queue3's
rerun, in sp-plan-run4 (ab9b02ee).

## For Fish's PC

One command, once the first race looks right:

    node tools/evolve.mjs --out race-pc --race --config solo:ABYSS --budget 20000 --jobs 22
    node tools/evolve.mjs --out race-pc --race --config solo:ABYSS --holdout-only

At about 1,000 matches an hour that's about 20 hours. It's resumable after a restart. Zip `race-pc` back.

## Sources

- M. López-Ibáñez, J. Dubois-Lacoste, L. Pérez Cáceres, M. Birattari, T. Stützle, "The irace package: Iterated
  racing for automatic algorithm configuration", Operations Research Perspectives 3 (2016) 43–58.
- M. Birattari, T. Stützle, L. Paquete, K. Varrentrapp, "A racing algorithm for configuring metaheuristics", GECCO
  2002 (F-Race).
- F. Hutter, H. Hoos, K. Leyton-Brown, "Sequential model-based optimization for general algorithm configuration",
  LION 5 (2011) (SMAC).
- S. Lucas, J. Liu, D. Perez-Liebana, "The N-Tuple Bandit Evolutionary Algorithm for game agent optimisation", 2018
  (arXiv 1802.05991).
- N. Hansen, A. Niederberger, L. Guzzella, P. Koumoutsakos, "A method for handling uncertainty in evolutionary
  optimization…", IEEE TEVC 13(1) (2009) 180–197.
- Y. Jin, J. Branke, "Evolutionary optimization in uncertain environments — a survey", IEEE TEVC 9(3) (2005) 303–317.
- S. Chick, K. Inoue, selection procedures with common random numbers, Winter Simulation Conference 2000.
