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

|                                        | per bot prep, median / p95 |
| -------------------------------------- | -------------------------- |
| whole prep                             | 0.12 s / 0.22 s            |
| decision logic only                    | 0.017 s / 0.05 s           |
| layout rehearsal (3 simulated battles) | 0.10 s / 0.20 s            |
| 机变 (card draft) pick                 | < 1 ms                     |

A co-op prep gives 65–215 s per round, and solo is untimed, so speed is no constraint. Rehearsal is the expensive part
and runs in 8 ms slices, so it never blocks the server.

## Is it competent? What is the win rate?

40 seeds per config (seeds 1–40), 4 bots in co-op:

|                 | Win   | Reached the final boss | Losses: eliminated before the boss / lost the final fight |
| --------------- | ----- | ---------------------- | --------------------------------------------------------- |
| solo FUNNY      | 50 %  | 40 / 40                | 0 / 20                                                    |
| solo NORMAL     | 68 %  | 40 / 40                | 0 / 13                                                    |
| solo HARD       | 25 %  | 38 / 40                | 2 / 28                                                    |
| solo ABYSS      | 0 %   | 22 / 40                | 18 / 22                                                   |
| co-op ×4 FUNNY  | 100 % | 40 / 40                | —                                                         |
| co-op ×4 NORMAL | 95 %  | 40 / 40                | —                                                         |
| co-op ×4 HARD   | 43 %  | 35 / 40                | 5 / 18                                                    |
| co-op ×4 ABYSS  | 0 %   | 9 / 40                 | 31 / 9                                                    |

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

| Tag (level 1, Risk 1)                           | Win (baseline 68 %) | Change                        |
| ----------------------------------------------- | ------------------- | ----------------------------- |
| ccLockout                                       | 0 %                 | −68                           |
| ccPatriot                                       | 10 %                | −58                           |
| ccDelegation                                    | 30 %                | −38                           |
| ccLeaderDr                                      | 33 %                | −35                           |
| ccBoss                                          | 40 %                | −28                           |
| ccFamiglia                                      | 40 %                | −28 (and LP left 9.0 vs 21.8) |
| ccTier1Price                                    | 43 %                | −25                           |
| ccLowEfficiency                                 | 48 %                | −20                           |
| ccOzArts                                        | 58 %                | −10                           |
| ccJunk                                          | 60 %                | −8                            |
| ccOzPhys                                        | 60 %                | −8                            |
| ccSpRecovery, ccDeepInfiltration, ccVengeance   | 63 %                | −5                            |
| ccInvestorBench, ccSwift, ccUpgrade, ccLastLine | 68 %                | 0                             |
| ccStrategyLate                                  | 70 %                | +2                            |
| ccForesight                                     | 73 %                | +5                            |

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

## First human records (`logs/2026-10-21.7z`, 2026-10-21)

Six records from one server, read with `tools/records.mjs` (branch `wip/match-records`, #42).

**Did the logging work?** Yes.

- All six files parse.
- **All 47 recorded normal battles replay to exactly the recorded result** (`--verify`). That's from human play, not bots.
- Every human action is there, and no field anywhere holds a name or id.

Three gaps showed up, now fixed on #42:

- **The last round had no row.** A final boss or hidden round ends without a SETTLE.
- **A match abandoned during the drafts counted as a loss** in the tables. Now it's counted apart.
- **The file times dated each match to the second** (13:25 … 15:14), and the 7z kept them. Now they're set to the day's
  midnight UTC.

**The matches** (all solo, all human):

| Mode     | Rules                                                             | Result                       | Notes                                                                   |
| -------- | ----------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| FUNNY ×3 | none                                                              | 3 wins, 0–2 LP lost          | L5 by round 6–7, board value 24–30 at the boss, 7–8 perfect rounds each |
| NORMAL   | Risk 7 + cheats (tier start, booster pack, Virtuosa bonds, Blaze) | win, hidden cleared, 0 leaks | 8 elites, 9 bonds; 201 refreshes, 183 rewards                           |
| ABYSS    | Risk 34: every tag and cheat on                                   | lost in round 10             | leaked from round 1 (4 of 8 enemies), 50 leaks in all                   |
| FUNNY    | Risk 7 + cheats                                                   | abandoned during the drafts  | no battle                                                               |

**What we can say (6 matches is a small sample):**

- **Humans won solo FUNNY 3 of 3; the bot wins it 50 %.** The bot loses its FUNNY matches at the round-9 boss.
  The humans reached it at shop level 5, with a board value of 24–30.
- **Human prep on FUNNY:** about 21 buys, 10–17 refreshes and 1–3 merges over 9 rounds. About 2 buys a round and
  more refreshes than buys.
- **The cheat runs are dominated by the booster pack:**
  - 432 and 572 actions in round 1 alone;
  - about 200 equips (each one opens the pack's offer);
  - about 200 picks, 150–160 sells and 200 refreshes per match.

  The records are fine for this, but per-round averages mix these runs with normal play. Filter by rule when
  analysing.

- **SPA-CC:** the one Risk 34 run says only that everything at once is too much at ABYSS. Mapping tag costs needs many
  matches per tag, or the botbench sweep above.

## Why do humans win Standard (FUNNY) and the bot doesn't? (2026-10-22)

Fish's question: humans don't seem to lose on Standard Simulation (FUNNY), so what is the bot doing differently?

The data:

- the bot on solo FUNNY, current `main` (0.3.1): 160 seeds (1–160), 82 wins (51 %);
- the three human FUNNY records with no cheats or tags (above): 3 wins. Those records end at round 8, before the last-round fix.

| at round 8                   | bot                       | humans                      |
| ---------------------------- | ------------------------- | --------------------------- |
| shop level (round 6 / 8)     | 4.0 / 4.0                 | 4.7 / 5.0                   |
| board value                  | 29                        | 26                          |
| elites deployed              | 1.2                       | 0.3                         |
| Σ bond tiers                 | 4.6–5.3                   | 3.7                         |
| units by tier T1–T6, round 6 | 2.5 2.0 2.9 **0.5** 0.1 0 | 2.7 1.3 1.3 **2.7** 0 0     |
| units by tier T1–T6, round 8 | 1.6 1.2 2.7 1.6 0.9 **0** | 1.7 1.0 1.3 2.3 1.0 **0.7** |

**The difference:** the humans level the shop early and field high-tier operators: tier 4 by round 6, tier 5–6 by round 8.

- They do it at the cost of bonds and merges: lower board value, fewer elites, fewer bond tiers.
- The bot spends on bonds and on merging low-tier units. It never fields a tier-6 unit on FUNNY.
- Its won and lost boards look the same, so the boss drawn decides its result.

**The cause:** the bot's level curve ignores the mode's length. `server/match/bot.js` `LEVEL_TARGET` is indexed by the round:

- it aims for L4 from round 7 through 9, and L5 at round 10;
- it was tuned for the 14-round modes;
- FUNNY's final boss is round 9, so the bot meets it with a shop level-4 board.

**Tested:** a scratch change, not committed, scaled the curve by the boss round: `idx = round(r × 14 / bossRound)`. NORMAL and the other 14-round modes are unchanged by construction.

| solo FUNNY                     | seeds 1–40 | seeds 41–160 | all 160 |
| ------------------------------ | ---------- | ------------ | ------- |
| current curve                  | 58 %       | 49 %         | 51 %    |
| curve scaled by the boss round | 70 %       | 63 %         | 65 %    |

A shift of only 2 rounds gave 63 % on seeds 1–40. The scaled curve overshoots: the bot reaches L6 at round 9, where the humans were at L5. So a tuned curve may do better still.

**By boss** (160 seeds, wins/losses, current → scaled):

| boss                | current | scaled |
| ------------------- | ------- | ------ |
| 假想敌：胄 (boss_1) | 23/1    | 20/4   |
| 假想敌：铳 (boss_2) | 8/19    | 13/14  |
| 假想敌：管 (boss_3) | 13/7    | 19/1   |
| 昆图斯 (boss_4)     | 12/2    | 12/2   |
| 卢西恩 (boss_5)     | 20/17   | 26/11  |
| 阿利斯泰尔 (boss_6) | 5/18    | 6/17   |
| 萨米的意志 (boss_7) | 1/14    | 8/7    |

**Alistair stays out of reach for the bot even with the better curve.** One human beat him on FUNNY, with Lumen (T6), Record Keeper (T5), and Hoshiguma and Sankta Miksaparato (both T4) at shop level 5. The leveling fix doesn't explain the rest: the bot's lineup or placement against him needs its own look. One human win is too few to say what works.

The other humans faced 卢西恩 (boss_5) and 昆图斯 (boss_4).

**Caveats:**

- three human matches;
- the bot plays one band at random, while the humans chose theirs.

**Possible follow-ups:**

- a PR making `LEVEL_TARGET` follow `gd.bossRound` (gameplay-neutral, bots only; probably upstream-friendly);
- then tune the curve itself, maybe L5 at round 7–8 for FUNNY;
- an Alistair study: boards and leaks per bot loss.

## The first human match records (logs/2026-10-21.7z, analysed 2026-10-22)

Six `SP_RECORDS` files, all from app 0.3.1, all solo. One was abandoned before its first battle, so `tools/records.mjs` counts five:

| match    | rules                                                               | result                   | LP at the end                  |
| -------- | ------------------------------------------------------------------- | ------------------------ | ------------------------------ |
| FUNNY ×3 | no lobby rules, Risk 0                                              | 3 wins, 9 rounds each    | 23, 23 and 29                  |
| NORMAL   | Tier Start, Booster Pack, Blaze, Virtuosa bonds, Risk 7 with cheats | win, Hidden Core cleared | 25 of 25, every battle perfect |
| ABYSS    | 19 Risk tags (Risk 34), Double LP, Extra Deploy, Extra Funds        | eliminated in round 10   | 0                              |

**Did the logging work? Yes.**

- `node tools/records.mjs --verify` replayed every normal battle from its recorded BattleSpec: **47 same, 0 differ**; 5 skipped (boss / hidden / synthetic).
- Every file parsed, and seats, bands, lobby rules, actions and per-battle kills are all there.

**Gaps and oddities in the data:**

- **No row for a won match's last rounds.** `rec.rounds` is pushed from `m.settle` (server/match/records.js), and a match that ends in victory never settles its final round(s): the FUNNY wins have 8 rows for 9 rounds, the NORMAL win 13 for 15 (no Final Assault, no Hidden Core row). The ABYSS loss has all 10. The battles themselves are recorded. Fix: push a last row when the match finishes.
- **Kills above the total:** in ABYSS round 8 the seat killed 64 of 29 and in round 9 47 of 30. With ccFamiglia=5 / ccPatriot=3 / ccDelegation=3 on, probably the Risk tags' spawned enemies counting in `killed` but not in `total`. Not traced.
- **A frozen ABYSS board:** level 5, 10 deployed and a board value of 111 in every row, though the seat bought, equipped and levelled. Either a Risk tag (ccLockout=3, ccUpgrade=2?) blocks it, or the purchases stayed on the bench, which the row doesn't count. Not traced.
- **Round-1 churn is the Booster Pack, not investors:** the two Booster Pack matches opened with 120–160 rewards / equips and 83–125 sells in round 1. That's why the per-round table shows 41.6 sells per seat in round 1. Read that table per rule, not pooled.

**What we learn:**

- Humans won FUNNY 3 of 3 at Risk 0. The bot wins about 51 % (65 % with the bossRound-scaled level curve above), so this agrees with the earlier finding. But it's three games.
- Tier Start + Booster Pack + cheats make NORMAL trivial. The NORMAL board was already 8 elites at level 6 after round 1, it never changed, and it lost no LP all match, including Final Assault and Hidden Core. From round 11 the seat only rolled the shop.
- Stacking 19 Risk tags at ABYSS was steadily lost: 4–12 leaks every round from round 1, LP 52 → 0 by round 10, even with Double LP. One data point for the SPA-CC difficulty curve.
- Five matches by what looks like one or two players is too few for win rates. Next time it's worth recording co-op and a spread of single Risk tags.

## Why the bot's layouts ignore blocking (#71) and stand on originium (#72) (2026-10-27)

Fish's observations: melee units in the back, ranged units facing backward (#71); units deployed on 活性源石 tiles,
where humans hold one side, often the right so enemies don't pick up the tiles' buff (#72).

Both come from the layout planner, `server/match/bot.js` `planLayoutSteps` + `Layout.value()`. It is a tower-defense
model with a "hold time" bonus:

- every enemy route is a list of tiles with a walking time per tile;
- a blocker adds `hold × blockCnt` seconds (4 s per block slot) on its own tile;
- a layout's value is the expected kills: Σ routes n × (1 − e^(−damage taken / (1.5 × HP))), where the damage is
  seconds on each tile × the DPS of every unit whose range covers it.

### #71: blocking

What the model can't see:

- **Enemies never hurt operators.** Nothing in the value is about a unit surviving, except a 0.15 penalty per road
  tile a ranged unit stands on. "Block in front to protect the ranged DPS" is invisible to it.
- **It doesn't matter where on the route the block happens**, only how much DPS covers the blocker's tile. Blockers
  are placed first, while no DPS is placed yet, so their tile is decided by their own range alone. The DPS units are
  then fitted around wherever they went, which can be the back of the route.
- **The estimate saturates.** Once the units placed so far are expected to kill nearly everything, the
  e^(−x) term flattens and a further unit adds almost no value anywhere. Its tile and direction are then decided by
  tiny differences, down to the 1e-6 random tie-break. The code says so for 1-tile-range guards ("the kill estimate
  saturates in a full layout and then cannot tell the tiles apart") and patches that one case afterwards.
- **Direction:** of the four, the one whose rotated range covers the most weighted road time wins; RIGHT on a tie.
  "Facing backward" can still cover the road after a bend, or be a saturated near-tie.
- **The rehearsal doesn't fix it:** it runs the 3–5 candidates in the real simulation and keeps the one with the
  fewest leaks, then the most kills (`server/sim/rehearsal.js`, −1000 per leak + kills). Operator deaths don't count.
  All the candidates come from the same model, with other tunables (`REHEARSAL_VARIANTS`). Boss rounds have no
  rehearsal at all.

### #72: originium tiles

`fieldModel` knows one tile gimmick, airflow (`airflowAtkMul`). It doesn't know 活性源石:

- a unit on one takes timed true damage per second, and gains ATK and ASPD (`server/sim/content/devices.js`);
- ground enemies that walk over one get the same: more ATK and ASPD, and a lasting HP loss.

To the planner such a tile is an ordinary legal tile. Neither the damage to its own unit nor the buff enemies pick up
on the way is in the value. The rehearsal would see a leak caused by either one, but not a unit dying without a leak.

### What would improve it (not built)

Cheapest first:

1. **Rehearsal score counts deaths:** e.g. −1000 per leak, −50 per operator death, + kills. Small, and it uses the
   real simulation, so originium damage and unprotected ranged units both start to cost. It only picks among the
   candidates, though, so it helps only when one of them is better. No help on boss rounds.
2. **Originium in `fieldModel`:** a penalty for a unit on a 活性源石 tile (damage per second × the time it stays
   versus its HP, less when a healer covers it). For enemies, count a route's HP as higher after it crosses one,
   which favours killing them before. Holding one side would follow from that.
3. **Front blocking:** a survival term. An enemy not yet blocked threatens the ranged units it walks past, so a
   blocker that stops it before those tiles is worth more. Or place the blockers after a first pass of DPS units, at
   the first route tile the DPS covers. This needs tuning against `tools/matchrun.mjs` / botbench, as the current
   tunables were (META.md: the planner beats random layouts by ≈ 8 points of kill rate, the rehearsal adds ≈ 5).

`bot.js` is upstream's (sganggs; product-policy tracking in their issue #315). Changes here are gameplay-neutral (bots
only), but they change bot results and the goldens.

# Architecture decisions/suggestions

Correct me if I'm wrong, since everything to follow is contingent on this assumption.

**Many tests depend on the bot behaviour. Therefore, we cannot just change the bot behaviour.**

So the obvious answer to this is to keep the existing "dumb" bot, and introduce a separate "smart" bot, where we are so far free to make changes.

# A layered strategy

As described in https://github.com/evenifyouforget/Stronghold-Protocol-EN/issues/36 - as a start, the smart bot could be functionally the same as the dumb bot but built with a series of strategies.

This naturally opens the door for evolutionary algorithms and mass programmatic testing of bot strategies. An evolution/benchmark run could be started in the background, and it would be relatively token-efficient as it does not need constant monitoring.

From there, we can try adding new sub-strategies and see if it those sub-strategies end up in the winning configurations.

# More human game analysis

The iteration will consist of making a hypothesis (or multiple hypotheses) and testing them programmatically.

For example, if the AI player is given the human's final boss board, can the AI player win? Does the human's final board win against all bosses, if you switch the boss?

Other areas can also be investigated. For example, does the AI player make use of all gameplay features? If it doesn't use shop freeze, can a better bot be made using shop freeze? If the AI player does not react to lobby rules selection, can a better bot be made that has conditionals on lobby rules?

## Response (Claude, 2026-10-27)

**On the assumption:** half right. Tests do depend on the bot, but they don't freeze it.
- 19 test files import `server/match/bot.js`, and the match goldens record bot games.
- Goldens can be regenerated, though: #67 did it here, and sganggs's 0.3.2 changed `legacy` itself (leveling,
  core-bond commitment, a full-bench-swap fix) and updated its goldens.
- The better reasons to keep the current bot and add another beside it:
  - it stays the yardstick, so the goldens keep catching simulation regressions;
  - a recorded match replays with the bot it was played with;
  - `bot.js` is a 1,900-line upstream file, and changing our copy would conflict on every sync.

So the conclusion holds.

**Upstream already has the framework** (sganggs 0.3.2 / 0.3.3; not in our 0.3.1 main yet):
- **A bot registry (sganggs #673):** `docs/BOT_STRATEGIES.md`, `server/match/botStrategies.js`. The original bot is
  `legacy`, the default.
  - A new entry is made with `defineBotStrategy` and overrides only the hooks it wants: band pick, card pick, prep,
    bounty estimate. The rest are legacy's, so goldens don't move.
  - `SP_BOT_STRATEGY` picks one entry for the whole match. `ioleta` and `adaptive` (sganggs #742) are the first opt-in
    entries.
- **RFC sganggs #816:** one profile per bot seat, with separate slots for the band draft, the economy and placement,
  overridable per band. Close to the layered idea above. Its first step, an entry per seat
  (`SP_BOT_STRATEGY_SEATS`), is sganggs PR #890 (opened 2026-10-26).

**Suggested order:**
1. Sync sganggs 0.3.3 (directly; Yuri hasn't). It's large: 267 commits, 548 files since 0.3.1.
2. Build the new bot as a registry entry: the per-seat choice, the replay rules and botbench support come with it.
   Leave `legacy` alone.
3. **Evolution:** legacy's tunables are plain data already: `LAYOUT_PARAMS`, `REHEARSAL_VARIANTS`, `LEVEL_TARGET`,
   the purchase weights. A bot that takes them as parameters is ready for a background search.
4. **Mind the noise.** At 40 seeds, ±5 points is noise (the SPA-CC sweep above). A search needs:
   - many seeds per candidate;
   - held-back seeds for the final comparison, against overfitting;
   - a fitness score over several modes and difficulties.

**On the human-game experiments:**
- **The human's final board against every boss:** feasible now. The records keep each battle's BattleSpec, and
  `tools/records.mjs --verify` already replays them, so it's that replay with the boss swapped.
- **The bot continuing from a human's board:** needs a way to start a match mid-way. More work.
- **Shop freeze:** the bot already uses it (`maybeFreeze`: it freezes when it can't afford the third copy of a pair).
- **Lobby rules:** a real gap. The bot reacts to none of them.

## Standard terms for the new bot (agreed 2026-10-27)

Upstream's "strategy" means a whole bot (`SP_BOT_STRATEGY=legacy`, `defineBotStrategy`), so we don't use the word for
the parts.

| Term | Meaning | Upstream |
|---|---|---|
| **profile** | What one bot seat runs: an ordered list of tactics, with their parameters | RFC sganggs #816's "profile"; run by registering it as a strategy id |
| **tactic** | One item of a profile. Asked at a decision point, it returns an action or **passes** | — |
| **decision point** | Where the game asks the bot: band pick, card pick, each prep step, bounty choice | the registry's hooks (`pickBand`, `pickCard`, `prepBegin`, …) |
| **action** | One validated game action: buy, sell, merge, level, freeze, place, ready, … | the game's own |
| **legacy** | The original bot, unchanged | same |

Rules:
- At each decision point the tactics are asked in order. The first that returns an action wins.
- After an action, the next decision starts again from the top. There's a cap on actions per prep, so a looping
  tactic can't stall the round.
- If every tactic passes during prep, the bot readies. The band and card picks can't pass: they take the game's
  timeout default.
- At first, legacy is one tactic at the bottom of every profile, because its prep is monolithic. A starting profile is
  [new tactics…, legacy] and plays like legacy until tactics above it take decisions. Splitting legacy into smaller
  tactics can come later, one decision at a time.

## Evolution (agreed 2026-10-27)

A candidate is a profile. What mutates:
- which tactics are in it (add, remove; the same tactic may appear twice with different parameters);
- their order (move), since in a priority list order is behaviour;
- each tactic's parameters. Every tactic declares its parameters (integer, decimal or choice; bounds; default), and
  mutation stays inside them.

Rules:
- legacy stays fixed at the bottom, so every candidate is a complete player.
- A length cap or a small fitness cost per tactic, against bloat.
- Crossover is optional. If added: merge two parents' tactics in order, each keeping its parameters.

What a run fixes, so it can be repeated: the tactic code, the training seeds and the held-back seeds, and the fitness
(which modes and difficulties, how win rate and LP weigh). Its result is a profile file anyone can play or re-score.
