# AI players: findings (2026-10-21)

Answers to the "Investigation/questions → AI players" list in TODO.md. Measured on main (0.2.5 + our PRs) with
`tools/botbench.mjs`, the repo's own bot benchmark: seeded bot-only matches with the real simulation in virtual time.

## What strategy do the AI players use? Is it optimized?

`server/match/bot.js` (~1,900 lines; summary in docs/META.md §1.5) is a hand-written heuristic player, not a learned
one. It sees only what a human would see, and acts through the same validated actions. Each prep:

1. **Economy:**
   - picks a focus core bond and a second bond;
   - buys toward a full board, completes merges, and levels the shop on a fixed curve (L2 ≈ R3 … L6 ≈ R12);
   - weighs each purchase against the expected value of refreshing for the third copy of a held pair.
2. **Lineup:** maximizes unit value plus bond tiers (greedy start, then swaps).
3. **Placement:**
   - traces the round's enemy routes over its board, and maximizes an "exposure" model (time on each tile × DPS
     against the round's DEF / RES, blocker hold time, anti-air for flyers);
   - then **rehearses**: it runs the 3 best layouts in the real battle simulation and keeps the one with the fewest
     leaks.
4. **Items and cards:**
   - items by role;
   - bounty cards by expected payout minus expected LP lost (its own kill-chance model).

It is optimized in the sense that each part was tuned against measurements: META.md says the planner beats random
layouts by ≈ 8 points of kill rate, and rehearsal adds ≈ 5 more. It is **unaware of our lobby rules**: it doesn't know
the SPA-CC tags exist, and it ignores Toxic Waste.

## How fast is its decision making?

Single-threaded (`--jobs 1`), HARD:

| | per bot prep, median / p95 |
|---|---|
| whole prep | 0.12 s / 0.22 s |
| decision logic only | 0.017 s / 0.05 s |
| layout rehearsal (3 simulated battles) | 0.10 s / 0.20 s |
| 机变 (card draft) pick | < 1 ms |

A co-op prep gives 65–215 s per round, and solo is untimed, so speed is no constraint. Rehearsal is the expensive part
and runs in 8 ms slices, so it never blocks the server.

## Is it competent? What is the win rate?

40 seeds per config (seeds 1–40), 4 bots in co-op:

| | Win | Reached the final boss | Losses: eliminated before the boss / lost the final fight |
|---|---|---|---|
| solo FUNNY | 50 % | 40 / 40 | 0 / 20 |
| solo NORMAL | 68 % | 40 / 40 | 0 / 13 |
| solo HARD | 25 % | 38 / 40 | 2 / 28 |
| solo ABYSS | 0 % | 22 / 40 | 18 / 22 |
| co-op ×4 FUNNY | 100 % | 40 / 40 | — |
| co-op ×4 NORMAL | 95 % | 40 / 40 | — |
| co-op ×4 HARD | 43 % | 35 / 40 | 5 / 18 |
| co-op ×4 ABYSS | 0 % | 9 / 40 | 31 / 9 |

**Reading:** it's a solid mid-level player. It almost always survives to the final boss on FUNNY–HARD; most losses
are the final fight, and ABYSS is out of reach. "Competent" is best defined against these numbers: a human who beats
the bot's win rate on the same difficulty plays better than the bot.

Things worth a look:
- **Solo FUNNY (50 %) is harder for the bot than solo NORMAL (68 %).** FUNNY's final boss comes at round 9, against a
  board at shop level 4. Every loss is the final fight with LP left. Either the easiest mode's boss is too strong for
  a round-9 board, or the bot doesn't plan for an early boss.
- **The boss drawn matters most.** Across the solo runs:
  - 阿利斯泰尔，帝国余晖 (`boss_6`, Alistair) was never beaten except twice on NORMAL;
  - 假想敌：胄 (`boss_1`) went 6/6 on FUNNY;
  - 卢西恩 (`boss_5`, Lucien) won about half its fights on FUNNY, NORMAL and HARD.
  The samples are small (3–12 per boss and difficulty).
- **Its bounty estimate is pessimistic.** Cards it rated 0–20 % likely to beat were beaten 54 % of the time, and
  20–50 % ones 88 % of the time. It turns down bounties it would have won, so there's room to tune.
- **A simulation bug found on the way:** in co-op NORMAL seed 22, Bubble (泡泡, `chess_char_2_08`, her S2 counter on any
  enemy damage) and 碎铳之簧 (`enemy_9018_actrpa`, a boss part that passes damage on) trigger each other until the
  32-deep hook guard cuts it off: 64 errors in one battle. Repro:
  `node tools/matchrun.mjs --mode coop --difficulty NORMAL --players 4 --seed 22 --rehearsal 3 --errors`.
  It's probably upstream too; the likely fix is that a counter doesn't answer damage that is itself a pass-on, or the
  other way round.

## Can we run many AI matches in the background to gather data?

Yes, and it's cheap: a solo match takes ≈ 2–4 s and a 4-bot co-op match ≈ 8 s of one CPU core. `botbench` runs N worker
threads (`--jobs`), and the matches are seeded, so the results are reproducible. The 320 matches above took ~9 minutes
on 8 threads. The tag sweep below (800 matches) took about 70 minutes on 8 threads. That's slower per match than the
grid: NORMAL matches run the full 14 rounds, and the boss tags make the battles longer.

## Can we map the SPA-CC difficulty curve with it?

Yes, with the caveat that the bot plays tag-unaware. It measures what a tag costs a player who doesn't adapt to it.
I added `--rules key=level,…` to `tools/botbench.mjs` (it passes them into the match as lobby rules) and ran every
tag at level 1 (Risk 1 each) on solo NORMAL, on the same 40 seeds as the baseline:

| Tag (level 1, Risk 1) | Win (baseline 68 %) | Change |
|---|---|---|
| ccLockout | 0 % | −68 |
| ccPatriot | 10 % | −58 |
| ccDelegation | 30 % | −38 |
| ccLeaderDr | 33 % | −35 |
| ccBoss | 40 % | −28 |
| ccFamiglia | 40 % | −28 (and LP left 9.0 vs 21.8) |
| ccTier1Price | 43 % | −25 |
| ccLowEfficiency | 48 % | −20 |
| ccOzArts | 58 % | −10 |
| ccJunk | 60 % | −8 |
| ccOzPhys | 60 % | −8 |
| ccSpRecovery, ccDeepInfiltration, ccVengeance | 63 % | −5 |
| ccInvestorBench, ccSwift, ccUpgrade, ccLastLine | 68 % | 0 |
| ccStrategyLate | 70 % | +2 |
| ccForesight | 73 % | +5 |

- With 40 seeds, a change of ±5 points (2 wins) is noise.
- **Every one of these is Risk 1, yet the costs range from nothing to everything.** If Risk should reflect difficulty,
  Lockout, Patriot, Delegation and Leader DR are underpriced at Risk 1, and the ones at 0 are overpriced.
- **The zero-cost tags** are probably tags the bot ignores or that don't apply solo: Swift (prep time; solo is untimed),
  Investor Bench, Upgrade, Strategy Late. Last Line costs LP (LP left 18.5 vs 21.8) but not wins. Humans may feel
  these more than the bot does.
- **Next steps if wanted:**
  - higher levels, and combinations;
  - co-op;
  - more seeds for the close calls;
  - a Risk vs win-rate chart.
  The command for one tag:
  `node tools/botbench.mjs --configs solo:NORMAL --seeds 40 --jobs 8 --rules ccPatriot=1 --json patriot.json`.

## Data from real matches (records, stats, privacy)

**Nothing is collected today.** The server keeps no record of a finished match. Results go only to the players'
screens (and stay a few minutes for a reconnecting player). The client's "Report a problem" text is only made when a
player asks for it.

**What could be collected:** botbench's per-match record is already the right shape, and could be reused for real
matches (an opt-in server option, off by default):
- version and content hash, mode, difficulty, lobby rules, plugins, seed;
- per seat: human or bot, band, rounds passed;
- per round and seat: LP, shop level, board value, units, bonds and tiers, layers, elites, items, leaks, bounty picks;
- the result and titles.

That's enough for win rates by difficulty, tag and band; humans vs bots; and the stack counts / layers you mentioned.

**Your format suggestion fits well:** one small JSON file per match, in a folder per day. Any subset of files is then a
valid data set, an admin can zip a folder and send it, and a tool (`tools/records.mjs`, like botbench's `--compare`) can
scan a folder and print the same tables as above.

**Optional, later:** the matches are seeded, battles take no player input, and the bots are deterministic. So the seed
plus the ordered list of prep actions should be enough to replay a whole match. That needs checking before relying on
it, since in co-op the order of actions between seats matters.

**What not to collect:**
- player names, IP addresses, session or reconnect tokens, room codes;
- browser or device details;
- exact timestamps (the date is enough);
- emotes or any other chat-like activity;
- the "Report a problem" text.

Seats should be "seat 0–3, human / bot", with no identity that links one match to the next, unless players opt in.

**How much better do humans play?** Unknown until there's real-match data. Once records exist, compare human win
rate and rounds passed per difficulty against the bot's table above.
