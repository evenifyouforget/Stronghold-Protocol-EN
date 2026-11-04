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

| Term               | Meaning                                                                              | Upstream                                                             |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **profile**        | What one bot seat runs: an ordered list of tactics, with their parameters            | RFC sganggs #816's "profile"; run by registering it as a strategy id |
| **tactic**         | One item of a profile. Asked at a decision point, it returns an action or **passes** | —                                                                    |
| **decision point** | Where the game asks the bot: band pick, card pick, each prep step, bounty choice     | the registry's hooks (`pickBand`, `pickCard`, `prepBegin`, …)        |
| **action**         | One validated game action: buy, sell, merge, level, freeze, place, ready, …          | the game's own                                                       |
| **legacy**         | The original bot, unchanged                                                          | same                                                                 |

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

## Hypothesis tests: human Final Assault boards (2026-11-01)

Fish's questions (TODO.md "# GitHub"): does a human's final board beat every boss, and can the AI win from a human's
final board? Plus a third test that closes the loop. All on `mini/0.3.1-4` (03a9f044), solo Standard (FUNNY), whose
final boss comes at round 9.

**Method.**

- The records keep each Final Assault's BattleSpec, and a solo one replays exactly (same digest).
- To face another boss, the wave (template, routes, overrides) is rebuilt with `waves.js buildBossWave`, and the pool
  with `finalAssault.js bossPoolHp`. Rebuilding the recorded boss this way gives the recorded template, routes and pool.
- **Won** means the pool emptied before the LP lost reached the LP the player brought in. LP lost counts leaks at the
  enemy's LP cost, leaders' LP effects, and the overtime drain, which for a solo team starts at the 120 s countdown.
- **Validated:** on 160 bot matches, this standalone verdict for the boss the match drew agrees with the match's own
  result on 160 of 160.
- **Not covered:** co-op Final Assaults, whose fields share one pool. The one human Perilous win had cheats (Tier
  Start, Booster Pack) that change the random draws, so its seed doesn't rebuild the match for H1.

|                                                                                                   | boards                                          | bosses beaten                                       | notes                                                           |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| **H2:** the human's board, as placed, vs all 7 bosses                                             | 5 human Standard wins (+1 Perilous with cheats) | **7 of 7, every board**, 0 LP lost                  | all well inside the countdown                                   |
| **H1:** the bot places the human's units (same operators, elites, items, loadouts, bonds, layers) | the same 5                                      | **7 of 7, every board**, 0 LP lost                  | fights take a median 1.36× as long (0.82–3.36×)                 |
| **H3:** the bot's own board (its normal prep) vs all 7 bosses                                     | 160 seeds                                       | 52 % on average; 16 of 160 beat all 7; 21 beat none | shop level 4 on 157 of 160 boards; the humans' were all level 5 |

The bot's boards, by boss (all 160 / the 87 whose match was won):

| boss                | 1 胄 | 2 铳 | 3 管 | 4 昆图斯 | 5 卢西恩 | 6 阿利斯泰尔 | 7 萨米的意志 |
| ------------------- | ---- | ---- | ---- | -------- | -------- | ------------ | ------------ |
| all bot boards      | 75 % | 32 % | 74 % | 69 %     | 59 %     | **17 %**     | 36 %         |
| bot boards that won | 87 % | 48 % | 86 % | 84 %     | 78 %     | 30 %         | 48 %         |

**Answers.**

- **Does the human's final board beat every boss? Yes.** Every recorded human Standard board beats all seven, with no
  LP lost. Even among bot boards that won their own match, only 18 % do. Five boards in a row at that rate: p ≈ 2 × 10⁻⁴.
- **Can the AI win from a human's final board? Yes, every time.** On that board, only placement and items are left to
  decide. The bot's placement of the human's units beats every boss too, only more slowly. It is never slow enough to
  reach the drain.
- **So the bot's Standard losses come from the board it builds, not from how it places it.** This agrees with the
  2026-10-22 finding: its level curve is indexed by round, so it meets the round-9 boss at shop level 4. The humans
  were at level 5. Alistair is the clearest case: 17 % of bot boards beat him, every human board does.

**Caveats.**

- 5 human boards, probably from one or two players, and only won matches; Standard only.
- "The bot from the human's board" is tested at the final board. Taking over at an earlier round needs the match
  rebuilt from the record's actions (see H8 below).
- Escorts don't vary: the faction setup of the match seed fixes them, so each fight is one deterministic run.

**Scripts** (scratch, in `untracked/hypotheses/`; offered as `tools/` if wanted):

- `h2-boss-swap.mjs <repo> <records…>`;
- `h1-bot-places-human-units.mjs <repo> <records…>`;
- `h3-bot-boards.mjs <repo> FUNNY 1 160`, ~1.5 min on 4 processes;
- with their results as `.jsonl`.

### More hypotheses worth testing

Cheapest first; the first three reuse the scripts above.

- **H4: Does the bossRound-scaled level curve close the gap?** Re-run H3 with the scratch `LEVEL_TARGET` change of
  2026-10-22. Expect level-5 boards and a higher all-7 rate. Bots only; it would be the evidence for that PR, here or
  for sganggs.
- **H5: How far up does a Standard-winning board carry?** The human boards against Perilous, Dire and Ultimate's Final
  Assault: the same boss, with that difficulty's pool and escorts. It says how much stronger a board must be per
  difficulty.
- **H6: Which SPA-CC tags would a winning human board still beat?** Each tag's Final Assault effect on the human boards:
  Activation (pool +50/150/400 %), Elements (leader DR), Originium Zone, Lockout. It measures tag cost on human play
  instead of the tag-blind bot, and feeds the clears tracking issue.
- **H7: Does the bot use the features humans use?** From the records: humans' refreshes, levels, freezes, sells and
  merges per round, against the bot's on the same seeds (botbench). The 2026-10-22 table did this for levels and tiers
  only.
- **H8: Can the bot take over mid-match from a human?** Rebuild a recorded match from its seed and actions up to round
  k, then hand the seat to the bot (autoplay). If the rebuild is exact, this tests the bot's play from human
  positions. Unknown whether the recorded actions rebuild the match exactly. Worth one try, since it would also
  verify the records.
- **H9: Is the bot's random band the problem?** Humans choose their band, the bot picks at random. Run botbench by
  band, and compare with the bands humans won with.
- **H10: Do bots benefit by switching bands?** Humans commit late, or are able to change strategy on the fly. Is committing to a band hurting the bots? Does continuing the match from round 7 with each possible new band choice reveal a different band is more winning?
- **H11: Are any human games "almost" won?** Sometimes we blame our teammates. Is the best board x4 enough to win the matches when the original match did not win?
- **H12: Who does the damage in the final round?** Is the distribution roughly even across operators, or does one DPS operator stand out? This influences whether bots should go for a more rounded playstyle, or focus on getting one operator as buffed as possible.

## Hypothesis tests, continued: H4–H9 and H12 (2026-11-01)

Same base (`mini/0.3.1-4`, solo Standard unless stated), same win test as H1–H3. H10 and H11 are not run yet.

### First, a correction to H3

H3 kept each bot board where the bot had placed it, i.e. placed for the boss its match drew. Against another boss that
placement can be useless (one board dealt Alistair no damage at all). So H3 understates the bot. **H3b** fixes it: for
each boss, the bot places its own units again with `arrange` against that boss's wave (`m.bossWaves` swapped,
`m._botPath` reset), as it would in a match.

|                                        | mean bosses beaten | beat all 7 | 1 胄 | 2 铳 | 3 管 | 4 昆图斯 | 5 卢西恩 | 6 阿利斯泰尔 | 7 萨米的意志 |
| -------------------------------------- | ------------------ | ---------- | ---- | ---- | ---- | -------- | -------- | ------------ | ------------ |
| H3 (fixed placement), 160 bot boards   | 52 %               | 16         | 75 % | 32 % | 74 % | 69 %     | 59 %     | 17 %         | 36 %         |
| **H3b** (re-placed per boss)           | 59 %               | 23 (14 %)  | 88 % | 33 % | 78 % | 87 %     | 64 %     | 28 %         | 36 %         |
| H3b, the 87 boards whose match was won | —                  | 23 (26 %)  |      |      |      |          |          |              |              |
| the 5 human boards, same treatment     | 100 %              | 5 of 5     |      |      |      |          |          |              |              |

The H1–H3 answers stand, at a smaller margin: five human boards in a row at 26 % is p ≈ 10⁻³.

### H4: does the bossRound-scaled level curve close the gap? Partly.

The scratch change (`LEVEL_TARGET` indexed by `round × 14 / bossRound`), 160 seeds:

|                  | match wins     | shop level at the boss | bosses beaten (H3b) | beat all 7 | Alistair |
| ---------------- | -------------- | ---------------------- | ------------------- | ---------- | -------- |
| current curve    | 87 (54 %)      | 4 on 157 boards        | 59 %                | 23         | 28 %     |
| **scaled curve** | **108 (68 %)** | 6 on all 160           | 62 %                | 23         | 35 %     |

Levelling wins matches, mostly against the easier bosses. Level 6 boards still beat all seven only as often as level 4
boards did. So level alone is not the gap.

### Why the human boards are stronger

Boss damage per second (median over boards: the 5 human boards as placed, the 160 bot boards re-placed per boss):

|       | 1    | 2    | 3    | 4    | 5    | 6    | 7    |
| ----- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| human | 4231 | 1067 | 3191 | 4753 | 1873 | 2040 | 1982 |
| bot   | 1473 | 605  | 1381 | 1892 | 753  | 480  | 714  |

2–3× higher, and higher than the bot boards that beat that boss. What it is **not**:

- **Placement:** H1, the bot placing the human units, beats everything.
- **Skills and modules:** every human operator was on its default skill and module, which is what the bot plays.
  Resetting them changes nothing.
- **Training:** both sides play potential 6 / 练度 3.
- **Board size, bonds, layers, elites, items:** all eight units on both sides; the bot has as many active bonds, more
  layers and more elites. With bonds switched off on both sides, the human boards still deal ≈ 3.6× the bot's damage.
- **Concentration (H12, below):** both sides get about 40–45 % of the leader damage from one operator.

What it **is**: the operators. Four of the five human boards field two tier-6 operators; at shop level 4 the bot fields
none (156 of 160 boards).

- Removing the two tier-6 operators from a human board leaves 36 %, 52 % and 62 % of its boss damage on three of the
  four boards (88 % on the fourth), and 4 of their 28 fights are lost.
- With the scaled curve the bot does buy them, and its results follow the count:

  | tier-6 operators on the bot board | boards | mean bosses beaten | beat all 7 | Alistair |
  | --------------------------------- | ------ | ------------------ | ---------- | -------- |
  | 0                                 | 50     | 3.5                | 5          | 28 %     |
  | 1                                 | 70     | 4.5                | 11         | 31 %     |
  | 2                                 | 33     | 5.2                | 5          | 45 %     |
  | 3                                 | 7      | 5.9                | 2          | 71 %     |

- But a bot board with two tier-6 operators (tier sum 27.8, the humans' range) beats all seven 5 times in 33; the
  humans' 5 in 5. The rest is which operators. Two human boards carry 自选 (DIY) picks (丰川祥子 ×2, 予愿安洁莉娜),
  and **the bot never takes a DIY pick** (0 of 160 boards). Their carries are named in H12.

### H5: how far up does a Standard-winning board carry?

The five human boards, unchanged and with the LP they had, against each difficulty's Final Assault (its round, enemy
scaling, escorts and pool; one escort draw per boss):

|          | pool (boss 1) | won      | how they lose                                            |
| -------- | ------------- | -------- | -------------------------------------------------------- |
| Standard | 247,500       | 35 of 35 |                                                          |
| Perilous | 675,000       | 28 of 35 | they clear the boss but too late: the drain takes the LP |
| Dire     | 1,800,000     | 5 of 35  | the same (median 483 s); only fe12 wins any (5 of 7)     |
| Ultimate | 3,600,000     | 0 of 35  | half never clear                                         |

A round-9 Standard board is roughly Perilous-ready. The higher difficulties have five more rounds to build in, so this
measures the pool, not what those players would have fielded there.

### H6: which SPA-CC boss tags would the human boards still beat?

Each tag alone, on the five Standard boards. The pool tags (Originium Zone, Lockout) run against a real
`SharedBossPool`, with the lockout released after `CC.lockout.seconds` as the match does; without it the standalone
fight silently ignores them.

| tag                           | won          | per board | effect                                                            |
| ----------------------------- | ------------ | --------- | ----------------------------------------------------------------- |
| Activation 1 (ccBoss 1)       | 35 of 35     |           |                                                                   |
| Activation 2                  | 28 of 35     | 7,4,6,4,7 |                                                                   |
| Activation 3                  | 10 of 35     | 1,1,1,1,6 | only fe12 survives it                                             |
| Elements 1 (ccLeaderDr 1)     | 35 of 35     |           | fights ≈ 1.4× longer                                              |
| Elements 2                    | 25 of 35     | 7,6,5,5,2 | two fights reach the 3600 s cap                                   |
| Originium Zone, Arts          | 33 of 35     | 7,6,7,6,7 | total fight time ×3.1                                             |
| Originium Zone, Physical      | 35 of 35     |           | no effect: these boards deal little Physical damage (not checked) |
| Lockout 1 / 2 / 3             | 35 / 35 / 34 |           | median fight 58 → 81 / 111 / 133 s                                |
| OZ Arts + OZ Phys + Lockout 3 | 31 of 35     | 7,6,7,4,7 |                                                                   |

For the clears tracking issue: on these boards the expensive tags are Activation 2–3 and Elements 2; the others cost
time, rarely the fight.

### H7: does the bot use the shop like humans do? No: it buys where they level.

Per round, at the battle's start (`contentInfo.roundStats`): 5 human Standard wins and 60 bot matches (the 33 bot wins
look the same).

| round | shop level, human / bot | buys, human / bot | refreshes, human / bot | sells, human / bot |
| ----- | ----------------------- | ----------------- | ---------------------- | ------------------ |
| 1     | 2.2 / 1                 | 1.4 / 2.0         | 0 / 0                  | 0 / 0              |
| 3     | 3.6 / 3                 | 1.8 / 2.5         | 0.2 / 0                | 0 / 0              |
| 5     | 4.6 / 3                 | 2.2 / 3.0         | 0.4 / 1.0              | 0 / 0.1            |
| 7     | 5 / 4                   | 2.8 / 3.6         | 2.6 / 2.4              | 0 / 0.9            |
| 9     | 5 / 4                   | 3.8 / 4.1         | 5.0 / 4.9              | 2.6 / 1.2          |

The funds spent are the same. Humans put them into levels from round 1 and buy fewer, better units; the bot fills
the board first and reaches level 4 only at round 6. Freezes and merges aren't in the records.

### H8: mid-match takeover: not possible from the records

The records keep the battle specs and a per-round summary, not each shop action, so a match can't be rebuilt to round
k. It would need an action log in `records.js` first.

### H9: is the bot's band the problem? No: the boss is.

botbench, 320 solo Standard matches (current bot): 182 won (57 %); every match reaches the Final Assault, so every
loss is there.

- **By boss drawn:** 1 胄 46/50, 4 昆图斯 31/37, 3 管 28/38, 5 卢西恩 47/71, 2 铳 17/54, 7 萨米的意志 6/29,
  **6 阿利斯泰尔 7/41**.
- **By band:** the weighted pick gives 歌利亚 86 of 320 (65 % won). Most other bands have 5–18 matches, between
  20 % and 87 %, which is within noise at those counts. Nothing stands out the way the boss does. A per-band
  botbench (`--band`) would settle it.

### H12: who does the damage in the final round? One carry, on both sides.

Each operator's share of the leader damage, every board against every boss (5 human boards and 20 bot boards, × 7):

|       | top operator (median) | top two | operators dealing ≥ 10 % |
| ----- | --------------------- | ------- | ------------------------ |
| human | 44 %                  | 66 %    | 3                        |
| bot   | 41 %                  | 64 %    | 3                        |

The human carries: 烛煌 (≈ 50 %), a 2-copy DIY 丰川祥子 (45–70 %), 0ed2's summon "炎佑" (38–73 %); 01c8 and 852a are
spread over two or three (予愿安洁莉娜 / 伺夜, 圣聆初雪 / 耶拉). So humans aren't more "rounded": the shape is the
same, and their carry is stronger. For a bot this points at getting a strong carry (tier 6 or a DIY pick) over
spreading the funds.

### What this says for the bot

In order of effect, all in the board the bot builds:

1. **Level earlier** (H4, H7): +14 points of match wins on Standard by itself.
2. **Take tier-6 operators and DIY picks** (the tier-6 table; DIY never used).
3. **Pick the carry** among them: same concentration as humans, weaker units.

Placement, skills and bands are not where it loses.

**Scripts** (in `untracked/hypotheses/`, with their `.jsonl` results): `h3b-bot-replaces-per-boss.mjs` (H3b; with the
scratch `bot.js` gate and `H4_SCALE=1` for H4), `default-skills.mjs`, `without-tier6.mjs`,
`h5-h6-other-mode-and-tags.mjs <repo> <modeId> <records…>` (`RULES='{"ccBoss":2}'` for H6), `h7-shop-actions.mjs`,
`h12-damage-shares.mjs`, and `h9-botbench-solo-funny-320.json`.

## Predictive modeling tests

One of the simplest predictive models is a linear model: add the score of each operator, and compare it to the score of the boss. If the operator sum score is greater, we predict a win. Scores of operators and bosses can be trained. This can be considered the most degenerate form of a neural network, with no intermediate layers.

We can generate test cases by running matches, and further generate more synthetic test cases by running just the boss round with "mutated boards" (replace one operator with a random different operator and let the bot re-position the board).

We can also do the same with human boards, though we have less data there, and it's probably worth separating human boards and their mutants from the fully synthetic test data.

Then we can run different configurations of the model, for example:

- Predict based on only operator tiers (mask all other information)
- Predict based on only alliance activations and stack counts (mask all other information)
- Predict based on each operator, but do not differentiate elite 1 and elite 2
- Predict baesd on only Strategy (Commander) chosen (ex. Pith. I will call them Commanders to avoid confusion)

This will tell us:

- What information is useful
- If any particularly standout good options exist (ex. best boss DPS carry) or terrible options exist

We do have to be careful in some cases ex. Executor the Ex Foedore (aka Fedex) may predict a win, not because he's good against the boss, but because a run that includes him has probably generated a lot of Foresight stacks and therefore Funds. Results should be recorded, interpreted, and scrutinized. Further hypotheses may be formed and tested.

# DYYBot

This is my first attempt writing a list of tactics that result in a very strong bot, based on my own human games. It includes general strategies, and optimizations for playing Du Yaoye.

## General insights

According to my mentor, Du Yaoye is actually stronger when Yan is banned, as all the remaining Yan operators must have at least 2 Alliances and are therefore generally better quality.

We want to speed-level to barge level 5, which should happen around round 7. Typically we level on rounds 2, 4, 5, 7.

Most of our boss DPS will come from one operator. Therefore we plan around having one DPS operator. Dusk is very strong, so she's fine as a fallback option that we can usually get thanks to Du Yaoye. If possible, certain operators given Yan membership with Damazti Isomorph will be significantly stronger than Dusk. Therefore we want to pick up one carry operator and plan around that carry operator for the boss.

Chen the Dawnstreak might be a particularly good carry, though I haven't tested thoroughly. While putting her in tier 6 would dilute the pool and therefore make it harder to get Muelsyse, she has Yan membership herself already.

Adding one operator to Yan is relatively cheap; the second Yan blade will merge into the first one, so you won't get to Isomorph a second Yan operator until the third Yan blade, which most games don't have good enough RNG to hit.

Yan generally prefers building Investor rather than Foresight or Marvel, but it's good to pick up Foresight or Marvel along the way if it's offered.

Items that let us duplicate Muelsyse or upgrade Muelsyse (and therefore print more Damazti Isomorph) will be on our shopping list. Durable, Raid, Arcane, Swift, and Precision are particularly good for adding a member via Damazti Isomorph, as our team is already capable of getting one member normally.

We definitely want one healer for the boss. 0 healing is very bad. It's perfectly acceptable to Isomorph the healer into Yan if we're already using a Yan carry operator.

We want to hit 6 Yan members if possible, as Gunshatterer with elemental shield can really screw over a team that has no elemental damage. The burn increasing arts damage somewhat and letting Blaze alter deal true damage is nice, but the countermeasure against Gunshatterer is the real reason we always want to have a source of elemental damage.

For DYY, using the last 1 Funds to refresh the shop to get a Yan operator and then freezing, is generally better than buying a 1 cost equipment.

Getting duplicates of Yan operators (particularly Swire/Swire Alter) is more consistent than getting duplicates of other operators, even vs Kazemaru, and even when the pool is already somewhat depleted by ourselves. This can probably be verified with math if it's really true.

## State and shopping list

While tactics can be refactored to all be stateless, it's easier to initially state related tactics as sharing a shopping list.

In particular, our shopping list might include:

- One carry operator (as in, after we pick up any carry operator, this slot is filled, but we don't commit until we know who it will be)
- One healer
- 5 other Yan operators (again, slots, that we don't fill until we know who it is)
- Muelsyse/Damazti Isomorph
- Yan item
- Up to 5 more Isomorph-compatible items

Muelsyse cloning items are also indirectly on the shopping list. Sometimes we get these before we get Muelsyse.

## Variable valuation

I realize I often implicitly weigh the worth of an action rather than always taking it or not taking it. For example, Arcane Arts Circle (to give membership into Arcane) might be taken when I already have 1 Arcane, but it might be not taken when I already have 3 Arcane, or if it's earlier game and I have 0 Arcane. I'm not really sure what the rules would be in boolean predicate logic, but it might actually be easier to construct this system by having the bot assign a valuation to various items, that can change based on the current state. This lets us reason with numbers, and the bot can decide if an item is not worth it.

## Tactics that are likely to be consistent

- Round 1: Buy 2 operators (buy until out of funds)
- - This will probably be replaced by a more general set of tactics to cover buying operators on all rounds.
- Round 2 or later AND Can upgrade barge to level 2/3/4/5: Upgrade barge
- Foresight not active AND unowned Foresight operator in shop: Buy that operator
- - Same for Marvel and Investor
- (1 Funds left OR 5 or more Funds left) AND no Yan operator in shop AND shop item is not needed AND used less than 2 refreshes this round: Refresh
- Shopping list operator in shop AND can buy it by selling operators: Sell operators to buy shopping list operator
- - Unneeded operators (safe to sell) determination: Below tier 6 AND not currently on board AND not unpromoted Yan operator AND not required to keep Foresight/Marvel/Investor active
- 0 Funds left AND (Yan operator in shop OR shop item is needed): Freeze
- Can upgrade barge to level 6 AND Muelsyse in inventory AND less than 6 Damazti Isomorph owned in total AND (cloning item in inventory OR cloning item in shop): Upgrade barge
- Can clone Muelsyse AND less than 6 Damazti Isomorph owned in total: Clone Muelsyse
- Muelsyse in inventory and 6 or more Damazti Isomorph owned in total: Sell Muelsyse

You should test mutants of these! Maybe I am wrong and these are not optimal.

## Our profiles on the new bot: is the research redundant? (2026-11-05)

`main` now has upstream's bot work from 0.3.2 to `dev` (#108), which made `legacy` much stronger. So the question: do our profiles still improve on it?

**Method.**
- `botbench` on `main`'s code (mini/0.3.1-4 with #119), the three bots on the same seeds: solo seeds 1–160, co-op seeds 1–80.
- "Flips" count seeds won by the profile and lost by legacy (+), and the other way round (−).
- Boss damage is the leader damage per match, paired by seed, relative to legacy, ± one standard error.

|                    | legacy wins | `fish-level`               | `fish-tier6`                 |
| ------------------ | ----------- | -------------------------- | ---------------------------- |
| solo Standard      | 141 (88 %)  | 146 (+13 / −8), +0.3 ± 0.9 % | 141 (+9 / −9), −0.1 ± 0.7 %  |
| solo Ultimate      | 36 (23 %)   | 36, identical on every seed | 31 (+8 / −13), −17 ± 6 %     |
| 4-bot co-op Ultimate | 37 of 80 (46 %) | 36 (+0 / −1), −0.3 ± 0.3 % | **15 (+0 / −22), −52 ± 10 %** |

**What it shows.**
- **Neither profile beats the new legacy.**
- **Levelling (H4, H7):** upstream's bot already did this on its own.
  - On Standard, legacy now wins 88 % (H4's 0.3.1 baseline: 54 %).
  - `fish-level` reaches shop level 5 by round 7 where legacy is at 4, and wins 5 more of 160. That's noise: 13 flips against 8.
  - On Ultimate the curve, read on a 14-round mode, *is* legacy's, and both stop at level 5. So `fish-level` plays legacy's exact games.
- **Tier 6 on Ultimate:** wrong there.
  - `fish-tier6` levels to 6 at round 13. Its board is worth less at round 13 (Σ shop price 36.6 against 41.2), with fewer elites (2.2 against 2.8).
  - It loses 22 co-op games and wins none back.
  - Upstream measured the same (§37.38: dropping level 6 raised the solo Ultimate pool finished from 30.9 % to 38.7 %). The tier-6 finding came from round-9 Standard boards. On Ultimate, paying for level 6 costs more than the tier-6 operators bring.

**Is our research redundant?** Partly.
- **Overtaken:**
  - the levelling findings, which upstream fixed on Standard;
  - "level 6 for tier 6", which is wrong on Ultimate.

  Keep both profiles as examples of the API, not as candidates.
- **Not redundant: gaps the new bot still has.**
  1. **Each Alliance's own layer engine.** Upstream names it as the remaining gap (§37.35, §37.36):
     - in Du Yaoye games with Xiaoman on the field, the bot gains 2.4–3.5 operators per round, where humans gain about ten;
     - it has 1.65 distinct Yan operators at round 5, and 2.83 at round 7.

     It's Upstream's measure of the bot's own strength by Strategy (`BAND_STRENGTH`, solo Ultimate pool finished): Du Yaoye is 35.8 %, 25th of 40 (Amiya 51.8 %).
  2. **DIY picks:** the bot's own seats field none. It only uses them taking over a human's seat (`DIY_PIECE_BONUS`). Two of the five human Standard boards were carried by DIY picks (H12). Not measured yet.
  3. **Bosses on Ultimate, solo, legacy:**
     - Gunshatter (`boss_2`) 1 of 27, the Will of Sami 1 of 15, Pipe 2 of 20, Lucien 4 of 37;
     - Helm 15 of 24.
  4. **The bounty estimate (#29):** still too pessimistic. Cards the bot rates 20–50 % are killed 94 % of the time.
- **The method isn't redundant either.** Upstream tunes the bot against itself with `botbench`. Our hypothesis tests compare it with human boards and records, which is how H1–H12 found what the bot doesn't do.

**Fish's Du Yaoye tactics: helpful, not redundant.** They target gap 1, the one upstream names and hasn't closed. The bot's Du Yaoye handling today is:
- Yan is the main Alliance from round 1 (§37.35);
- her two rigged refreshes come before the level-up;
- it aims for the 9-Yan line with Muelsyse (§37.43);
- it gives the layer engines a buy and lineup bonus (§37.36).

Nothing manages Xiaoman's gain-per-operator layers the way a human does. To write them so each can be built and measured:
- one tactic per idea: **when** (round, board, shop: "Xiaoman on the field and …"), **what** (buy / sell / refresh / level / place …), and what it gives up;
- each becomes a `defineTactic` at one decision point, in a profile `[dyy tactics…, legacy]`;
- measured as upstream measures Strategies: Du Yaoye forced with `botbench --band band_duyaoy`, solo Ultimate, paired seeds, against legacy forced the same way. Seeds 1–40 to develop, the rest held back.

The forced-Du Yaoye baseline is not run yet. The first try was stopped because the machine ran low on memory, so run it on its own, with fewer jobs:

```
node tools/botbench.mjs --configs solo:ABYSS --seeds 160 --seed 1 --jobs 4 --bot legacy --band band_duyaoy --json dyy-legacy.json
```

Data: `untracked/bench-2026-11-05/` (the nine `--json` runs and their tables).
