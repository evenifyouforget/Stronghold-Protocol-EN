# ML from scratch: SPA without legacy's paradigm

Fish (2026-11-13): "do one pass of researching ml techniques and seeing what we could possibly build that isn't based on
the paradigms of legacy … analyze spa from the beginning, without being bound to legacy. what state can the bot see,
what actions are available, and what is the ultimate objective? what traditional or ml techniques can apply? are there
other ways to make sense of/add order to the system, other than how legacy does it? what constraints do we have? which
techniques may be able to get around the current bottleneck that is running games is slow? and finally, what seems most
promising to try on our budget?"

This pass is a survey plus two measurements (below). Nothing is built yet. The reading list, with links, is in
`untracked/ml-2026-11/papers.md`. The PDFs couldn't be saved: this sandbox can't reach arXiv. The same file has a
command that downloads them on your PC.

## The measurement that changes the picture: battles are cheap and replayable

Every human record keeps each battle's full input (`battles[].spec`: units with tile, direction, items, skill, elite;
spawns, routes, seed) and its result (`out`: killed, total, leaks). I fed the specs back into today's `Battle` (`untracked/ml-2026-11/replay.mjs`):

- **762 normal battles from 30 records: 761 give the same leak / no-leak result as the record.** This holds even though
  the records come from app 0.3.1 and the engine has changed since.
- **36 ms per normal battle** on one thread (73 game seconds each). That is about 28 battles a second per thread. On
  your PC's 24 threads, that is roughly 2 million battles an hour. The race plays about 1,350 whole matches an hour.
- The 182 records hold 3,242 normal seat-battles (873 with leaks, 27 %), 360 unite, 131 boss, 77 hidden.

So the slow part is the **whole match**, not the battle. Most of a match's time is the bot's own rehearsal (about 194
of the 240 ms of each prep) and the boss fights. A battle is a pure function, (board, wave, seed) → (kills, leaks,
damage), and it can be called millions of times without playing any games. Legacy uses the battle only as a final
check (the rehearsal). The techniques below use it as a data factory.

## 1. SPA from first principles

### What the bot can see (the state)

Per the rules in `server/match/bot.js`, a bot reads only what a player sees:

- **Its own seat:** LP, level, funds, hand, bench and board (operator, tier, elite, items, tile, direction), Alliance
  counts and layers, the Strategy (band) and its counters, frozen shop, last results.
- **The shop:** the 5 offers (or the band's variant), refresh cost, level-up cost.
- **The shared pool:** the copies left of each operator (the shop odds follow from it and the level).
- **Teammates:** their Alliance strips (coop).
- **The round ahead:** the enemy preview (composition, routes), and the stage. Bosses and the hidden round are known by
  round number.

Hidden: future shop draws (random, but the odds are known), other players' hands, future waves past the preview.

Size: 112 normal operators (tiers 1–6) × 2 elite levels, 115 items, 23 Alliances, 40 Strategies, a 4 × 9 board, 14–15
rounds. A full board is about 8 operators with up to 2 items each.

### What it can do (the actions)

The human records count 115k human actions. By type: equip 21k, move 18.5k, shop log 16k, reward 15.6k, sell 14.5k,
refresh 13.7k, buy 10k, destroy 1.5k, gain 1.3k, level up 0.9k, card 0.5k, freeze 0.5k, band 0.2k.

Structurally there are four kinds of decision:

1. **Rare, high-stakes picks:** the Strategy at round 0, Strategy cards, reward offers. Few per game, large effect.
2. **The economy loop:** buy / sell / refresh / level / freeze. Many per round, each small, all interacting through
   funds (which are lost at the end of prep).
3. **Items:** which operator wears what. These are many small choices, but their effects multiply.
4. **Placement:** tile and direction for each deployed operator. This feeds only the battle.

A prep round is a variable-length sequence of these actions. The order matters, because a refresh reveals new offers.

### The objective

Solo: survive every round (LP > 0) to the end and beat the final boss. Coop: the same for the team, with shared
boss pools. The win is binary and comes at the end, after about 15 rounds and roughly 600 actions. That is the classic
long-horizon, sparse-reward setting, which is why single tactics barely move the win rate (05, 08, 10). Useful
stand-ins along the way: leaks per round, LP left, boss damage, the round reached.

### What kind of problem it is

- **Two coupled sub-problems:** a fast, discrete economy (prep) and a slow, deterministic battle given the board. The
  battle's only input from the economy is the board; the economy's only input from the battle is the result (LP,
  coins, layers). That decomposition is the main source of order this note exploits.
- **Single-agent against the house in solo** (the waves don't adapt to you), so it isn't a game-theory problem. It's
  planning under uncertainty: the shop is a stochastic environment. Coop adds a shared pool and teammates.
- **Determinism:** a given seed and the same actions give the same match. Good for search and for paired tests.

## 2. Techniques from the literature

The reading list is in `untracked/ml-2026-11/papers.md`. "(verify)" marks a source I found by search but couldn't open
from here.

### Learned battle models (surrogates)

- **StarCraft combat models.** Stanescu, Barriga and Buro learned Lanchester-style unit strengths from recorded battles
  ("Using Lanchester Attrition Laws for Combat Prediction in StarCraft", AIIDE 2015). Their bot used the model instead
  of a simulator and won more. Uriarte and Ontañón ("Automatic Learning of Combat Models for RTS Games", AIIDE 2015)
  learn forward combat models from replays.
- **Total War.** Kwan and Cakmak (Creative Assembly), "Learning Combat Outcomes in Creative Assembly's Total War"
  (AIIDE 2025). A supervised model of 1-vs-1 unit outcomes drives the auto-resolver and the engage / retreat AI,
  replacing hand rules.
- **What transfers:** SPA's battle is a deterministic simulator we can call 2 million times an hour. A learned model
  is cheap to train here, and we can check it against the real simulator at any time.

### Learned evaluation plus shallow search

- **TD-Gammon / AlphaZero lineage.** Learn V(state) and pick the action whose result has the best V. Gumbel
  AlphaZero / MuZero (Danihelka et al., "Policy Improvement by Planning with Gumbel", ICLR 2022) works with very few
  simulations, which suits a small per-prep budget. Code: `deepmind/mctx`.
- **Hidden information.** Information Set MCTS (Cowling, Powley, Whitehouse, IEEE TCIAIG 2012) searches over
  information sets rather than one tree per sampled future. That's the right shape for "what will the next refresh
  show".
- **Auto-battlers specifically.** TFTMuZeroAgent (an open-source Gumbel-MuZero agent on a TFT Set 4 simulator) and a
  Battlegrounds MCTS paper (Zolboot et al., CATA 2022, verify). "Build, Don't Play" / AutoTavern (arXiv 2610.33845,
  verify) claims an LLM-free deck-building agent on a Battlegrounds-like gym; an independent review disputes its
  results.
- **What transfers:** the shape (value network plus small search), not the scale. Those agents train for millions of
  games on GPUs.

### Learning from humans without new games

- **Behaviour cloning (BC).** Predict the human's action in the same state; DAgger (Ross et al. 2011) corrects the drift
  when the clone's mistakes lead it into states no human visited.
- **Drafting / deck-building.** Ward et al., "AI solutions for drafting in Magic: the Gathering" (arXiv 2009.00655):
  pick models trained on human drafts. Generalised card representations for MTG drafting (arXiv 2407.05879): features
  of the card, not its ID, so new or rare cards still get sensible values. SPA's shop is a draft (pick from 5 offers),
  so this is the closest match in the literature.
- **Human-regularised RL and search.** piKL / Diplodocus (Bakhtin et al., arXiv 2210.05492, no-press Diplomacy): search
  or RL that stays close (KL) to a human BC policy. It plays strong and human-like, and needs far less self-play than
  RL from scratch. Hanabi: BC plus regularised RL (arXiv 2506.21490, verify).
- **Offline RL.** AlphaStar Unplugged (Mathieu et al., arXiv 2308.03526): a StarCraft II agent from replays only, BC
  first, then offline RL improves on it. It shows the ladder: BC → BC + value → offline policy improvement.
- **What transfers:** Fish's idea (act like a human) is exactly BC. The literature's lesson is that BC is the best
  starting point and a good prior, but with 269 human seats it won't beat the humans it copies. A value function or
  search on top is what improves on it.

### Tuning under noise (already in 10)

irace, SMAC, NTBEA, CMA-ES. Surrogate-assisted evolution (Jin, "Surrogate-assisted evolutionary computation", 2011)
is the bridge: rank candidates on a cheap model, and play real games only for the survivors.

## 3. Other ways to add order (instead of legacy's)

Legacy hand-writes a score for every decision point (`buyScore`, `lineupScore`, `bondPlan` …) and tunes constants.
Some alternatives:

1. **Decompose by the battle boundary.** Learn `P(no leak | board, wave)` and expected leaks. Then every economy choice
   (buy, sell, level, item, lineup) is valued by how it changes that one number on the next waves, rather than by
   separate hand scores. Placement becomes search against the same model, with the real simulator as the final judge.
2. **Power curve vs requirement curve.** Waves get harder on a known schedule. A board's learned "power" must stay
   above each round's requirement, and leftover power is wasted. The economy then becomes a resource-allocation plan
   over (funds, level, power): spend just enough to survive now, invest the rest (levels, pairs, Foresight). This is a
   small dynamic program, not a heuristic. It explains Investor and stack play (08) as "bank when the margin allows".
3. **Comps as goals (what TFT players do).** Cluster the human end boards into archetypes (target Alliances,
   operators, items). The bot picks a reachable target from what it holds, then plays toward it. This is
   goal-conditioned play from data, where legacy's `bondPlan` is hand-written.
4. **Discrete choice for the shop.** A human sees N offers and buys some. A conditional-logit (McFadden) model learns
   each offer's utility from features (tier, Alliance fit, pair progress, price, funds, round). It is interpretable, a
   few hundred weights, and runs in microseconds in the browser. The same model works for reward offers, Strategy
   cards and items.
5. **Value of a round state.** Learn `V(state at prep end) → P(win)` from records and bot games. 269 human seats ×
   15 rounds is about 4k states (small); a weekend of bot games adds about 900k (biased toward the bots' own play).

## 4. Constraints

- **Browser-safe, deterministic, cheap** (bots go client-side). Any model has to be plain JS weights, so a linear
  model, small trees or a small MLP of at most a few MB. No GPU, no library, and seeded randomness only. Inference
  must fit a prep's budget (about 240 ms today, mostly rehearsal).
- **Training happens offline** on your PC (24 threads, 32 GB, Windows; I'm assuming no GPU in use). CPU training of
  small models is fine: gradient-boosted trees or MLPs on millions of rows take minutes to hours.
- **Human data is small:** 182 records, 269 seats, 115k actions, 3.2k normal battles. Enough for BC of frequent
  decisions (buys, sells, refreshes) and battle models, but thin for rare ones (Strategy choice: 233).
- **Game versions drift.** Old records still replay (761 / 762), but balance PRs (SPA-CC, Mod Z) shift values. Models
  need retraining, so the pipeline matters more than any one model.
- **EOS (~May 2027) and the feature freeze.** Only the DYYBot line may grow, so anything has to land as DYYBot
  tactics / decision points.
- **Our own budget:** my sessions run here with a few threads; only jobs over 3 h go to your PC.

## 5. Ways around "games are slow"

From cheapest to most ambitious:

1. **Don't play games; play battles.** 2 million battles an hour vs 1,350 matches. Generate (board, wave) → outcome data
   by mutating human and bot boards (swap one operator, move one, add or drop an item, as 04's mutants did, but
   millions instead of hundreds). This trains the battle surrogate.
2. **Don't play battles either: learn from records.** BC and discrete choice need no simulation at all.
3. **Fast-forward games.** Replace the battle (and the rehearsal) by the surrogate, so a match costs only its prep
   logic. Without rehearsal, a prep is about 46 ms (240 − 194), so a match should be well under a second, roughly
   10–50× faster. Screen candidate profiles in these games, and race only the best on the real simulator
   (multi-fidelity, as in 10's SMAC / surrogate notes).
4. **Shorter games.** Start matches at round 6 or 10 from recorded or bot states (the scenario tool already gives
   gifts by round). A decision that matters late can then be tested without playing the early rounds.
5. **Variance reduction.** Paired seeds (already used), common random numbers, and control variates (subtract a
   surrogate's predicted win chance from the outcome). Each one cuts the games needed for the same p.

## 6. What seems most promising on our budget

1. **Battle surrogate (start here).** Data: the 3.2k human battles plus mutants, generated at about 2 M an hour. Model:
   a small MLP or boosted trees over a set encoding (per unit: operator features, tier, elite, items, tile class;
   per wave: enemy counts, DEF / RES, flyers, route lengths). Targets: no-leak probability, leaks, boss damage.
   - **Uses:** value every buy / sell / item / lineup choice by its effect on next round's leaks; rank many layouts
     and rehearse only the top 2–3, replacing about 194 ms of rehearsal; fast-forward games for evolution.
   - **Why first:** it doesn't depend on human data size, it's checkable against the real simulator at any time, and
     it attacks the bottleneck directly.
   - **Risk:** 04's linear model reached a win AUC of only 0.76 on boss boards (R² ≤ 0.24 for damage). A nonlinear
     model with 1000× the data should do much better, but that is the first thing to measure.
2. **Discrete-choice BC of the shop and items from the 269 human seats.** It's cheap (hours) and interpretable,
   and it is Fish's "act like a human" idea. Measure top-1 / top-3 agreement with humans on held-out seats. As a DYYBot
   tactic it can replace `buyScore` with a learned utility. It is also the prior for item 3.
3. **Value function plus one-step lookahead (later).** Learn V(state) from bot games plus records (fast-forward games
   make this cheap). Then each prep decision picks the action whose result has the best V, kept close to the BC prior
   (piKL-style). This is the closest thing to the TFT / Battlegrounds agents that fits a CPU and a browser.

Not recommended on this budget: full RL from scratch, MuZero-scale self-play, or LLM agents. They need orders of
magnitude more games or compute than we have before EOS, and none of them is browser-cheap.

### A first step (small, resumable chunks)

1. `untracked/ml-2026-11/battles/`: dump the 3.2k human battles as rows of (encoding, outcome). Add mutants in chunks of
   100k with a PID lock, so a restart resumes (about 3 minutes per chunk on 24 threads).
2. Train boosted trees and a small MLP. Report the no-leak AUC and leak MAE on held-out human battles (not their
   mutants), against the no-leak base rate (73 %).
3. If the AUC is about 0.9 or higher: rank layouts with the surrogate, rehearse the top 3, and compare against legacy
   rehearsal on paired seeds (time and win rate).

That's a few hours of my time plus one job for your PC. Items 2 and 3 can wait for the result.
