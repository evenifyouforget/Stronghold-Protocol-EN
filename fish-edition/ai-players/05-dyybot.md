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
- Up to 5 more Isomorph-compatible items (but not the ones for Alliances that are infeasible. if the Alliance needs N members and there are at least N-1 members who are also Yan members, then it is feasible with Isomorph)

Muelsyse cloning items are also indirectly on the shopping list. Sometimes we get these before we get Muelsyse.

## Variable valuation

I realize I often implicitly weigh the worth of an action rather than always taking it or not taking it. For example, Arcane Arts Circle (to give membership into Arcane) might be taken when I already have 1 Arcane, but it might be not taken when I already have 3 Arcane, or if it's earlier game and I have 0 Arcane. I'm not really sure what the rules would be in boolean predicate logic, but it might actually be easier to construct this system by having the bot assign a valuation to various items, that can change based on the current state. This lets us reason with numbers, and the bot can decide if an item is not worth it.

## Tactics that are likely to be consistent

- Equip custom operators: Chen the Dawnstreak and Shu on tier 5, nothing on tier 6
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

## Process

1. Draft the list of tactics (pseudocode is acceptable since some variables like the shopping list are not entirely well defined). Compare to human games, especially winning human games. If humans are behaving in a way that none of the tactics cover, adjust the tactics or add a new tactic, and repeat the review process. Aim to be able to explain 90% of human behaviour. Humans do not always play consistently, so some tactics may not apply to some games, and that's okay.
2. Attempt to come up with formal models for the "shopping list" and "variable valuation", which are the two big unknowns right now. Does the shopping list behave like A or B or C? For variable valuation, can we attempt training a linear estimator that predicts human actions among a limited set? Is the limited estimator accurate enough, or do we need something hand-tuned or a neural network? If further fuzzy functions were used in step 1, attempt to define them as well.
3. Draft the real list of tactics. It can include conflicting tactics.
4. Identify parameterizable numbers/choices, and parameterize them.
5. Run evolutionary algorithm for solo matches, with all existing tactics and all new tactics available, and starter bots including existing reference bots and new bots. Your budget is around 3 hours of background execution at max threads. We expect the winner is using at least some of the new tactics, otherwise lesson learned.

## Our profiles on the new bot: is the research redundant? (2026-11-05)

`main` now has upstream's bot work from 0.3.2 to `dev` (#108), which made `legacy` much stronger. So the question: do our profiles still improve on it?

**Method.**

- `botbench` on `main`'s code (mini/0.3.1-4 with #119), the three bots on the same seeds: solo seeds 1–160, co-op seeds 1–80.
- "Flips" count seeds won by the profile and lost by legacy (+), and the other way round (−).
- Boss damage is the leader damage per match, paired by seed, relative to legacy, ± one standard error.

|                      | legacy wins     | `fish-level`                 | `fish-tier6`                  |
| -------------------- | --------------- | ---------------------------- | ----------------------------- |
| solo Standard        | 141 (88 %)      | 146 (+13 / −8), +0.3 ± 0.9 % | 141 (+9 / −9), −0.1 ± 0.7 %   |
| solo Ultimate        | 36 (23 %)       | 36, identical on every seed  | 31 (+8 / −13), −17 ± 6 %      |
| 4-bot co-op Ultimate | 37 of 80 (46 %) | 36 (+0 / −1), −0.3 ± 0.3 %   | **15 (+0 / −22), −52 ± 10 %** |

**What it shows.**

- **Neither profile beats the new legacy.**
- **Levelling (H4, H7):** upstream's bot already did this on its own.
  - On Standard, legacy now wins 88 % (H4's 0.3.1 baseline: 54 %).
  - `fish-level` reaches shop level 5 by round 7 where legacy is at 4, and wins 5 more of 160. That's noise: 13 flips against 8.
  - On Ultimate the curve, read on a 14-round mode, _is_ legacy's, and both stop at level 5. So `fish-level` plays legacy's exact games.
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


## Process step 1: human Du Yaoye games against the draft (2026-11-12)

The draft tactics are on `feature/fish-dyy-profile` (`server/match/botTacticsDyy.js`):
- `dyy-level`: a fixed levelling schedule;
- `dyy-shop`: buy Yan and side-Alliance operators, sell Bench operators for them, hunt Yan with the 2 special refreshes;
- `dyy-freeze`: freeze an unaffordable Yan operator.

**Data.** The match records in `logs/` (182 matches, 2026-10-27 to 11-08) have 39 human Du Yaoye seats. 21 passed
round 10. 6 of those played with cheats (booster packs, extra Funds, tier start), including all four solo Ultimate wins,
so they don't compare with a bot. That leaves **15 seats**, all co-op, 9 of them won. Scripts and tables:
`untracked/dyy-2026-11/` (`dyy-step1.mjs` per seat, `dyy-step1b.mjs` what each action is for).

**What the draft explains, and what it doesn't** (the 15 seats pooled):

| | Humans | The draft |
|---|---|---|
| Levelling | level 2 / 3 / 4 / 5 at rounds 2 / 4 / 6 / 10 (medians; level 5 at 6–14) | `fish` 2 / 4 / 5 / 7 is two rounds early for level 5; `human` (2 / 4 / 6 / 9) fits |
| Operator buys | Yan 54 %, side Alliance 6 %, other 40 % | Yan yes; side Alliances are rare buys |
| The 2 special refreshes | every round from round 2; 42 % are followed by a Yan buy | the hunt, but only with no Yan showing (humans: 59 %) |
| Further refreshes (327) | almost none before round 9, then 37–72 per round over all 15 seats; 46 % lead to another refresh, 6 % to a Yan buy | **not covered** |
| Sells (301 operators) | 76 % Bench; 41 % leave another copy; 31 % tier 1; next action: refresh 26 %, a Yan buy 23 %, another buy 37 % | sell-to-buy covers about a quarter; **sell-to-roll isn't covered** |
| Board sells (24 %) | 82 % followed by a move onto the board: a swap | **not covered** (legacy's board) |
| Freezes (84) | 56 % for an item, 32 % for a wanted Yan operator; 80 % end the prep | the Yan freeze only |
| Equips | rise from round 9 with the roll-down. Top: 盟约之币 (+1 / 2 Funds when equipped) 65, 变形同构体 56, 简易通讯机 (1 / 2 operators of the bearer's Alliances) 23 | **not covered** (legacy's equips) |
| DIY operators | 4 of 15 seats | not covered |

**The shape of a human Du Yaoye game.** Two phases:
1. **Rounds 2–8, economy.** Level on schedule, the 2 special refreshes each round, buy Yan, freeze (a Yan operator or an
   item) at the end of the prep.
2. **From round 9 (about when level 5 is reached), the roll-down.** Refresh many times per round, fund it by selling
   duplicate and low-tier Bench operators and cashing 盟约之币, swap better operators onto the board, equip.

The draft only models phase 1. To explain 90 %, the list needs (pseudocode, for step 3):
- **dyy-rolldown:** from level 5 (or round 9): while funds > a reserve, refresh; buy merge copies, Yan operators and
  carry upgrades; sell duplicates and tier-1 / tier-2 Bench operators when funds run out. Parameters: start round or
  level, reserve, what is sellable.
- **dyy-cash-coins:** equip 盟约之币 when the funds buy a refresh or a wanted operator (not on a board slot's item).
- **dyy-comms:** 简易通讯机 on a Yan operator (it brings operators of the bearer's Alliances).
- **dyy-freeze-items:** also freeze for a wanted item (Isomorph, 简易通讯机, cloning items) at the end of the prep.
- **dyy-level:** default schedule `human`.
- Board swaps and the side Alliances: legacy's are probably enough. Check after the above.

Not covered yet: why 28 % of the special refreshes skip a wanted Yan operator. It's most likely funds, which the
records don't log per action; a replay of the economy would tell.

### The bot's Du Yaoye games against the humans'

Legacy (main, #108) as Du Yaoye in 30 co-op Ultimate matches with three legacy teammates (seeds 1–30, recorded with
`untracked/dyy-2026-11/botrecords.mjs`; 28 passed round 10; 8 won). Per seat, against the 15 human seats:

| | Humans | Legacy |
|---|---|---|
| Level 2 / 3 / 4 / 5 at round (medians) | 2 / 4 / 6 / 10 | **4 / 6 / 8** / 9 |
| Special refreshes in round 3 | 9 over 15 seats | 4 over 28 seats |
| Yan share of operator buys | 54 % | **37 %** |
| Freezes per seat | 5.6 (56 % for an item) | **1.2** |
| Seats that got a 变形同构体 (Isomorph) | 11 of 17 (the cheat filter here is per rule key) | **5 of 28** |
| Isomorph equips per seat | 3.7 | **0.2** |
| 简易通讯机 bought or offered and taken | 23 | **1** |
| Refreshes per seat | 40 | 35 |
| Sells per seat | 20 (31 % tier 1) | 18 (52 % tier 1) |
| Extra refreshes start | round 9 | round 5–7 |

**Where legacy differs most from the humans:**
- **Early levelling.** Legacy is two rounds behind at levels 2–4, and catches up at 5. `dyy-level` (either schedule)
  targets exactly this.
- **The Isomorph engine.** Legacy rarely gets an Isomorph and almost never equips one. Humans build around it
  (Fish's "General insights"). This is the biggest gap, and the draft has no tactic for it.
- **Yan focus and freezing.** Legacy buys fewer Yan operators and freezes a quarter as often.

**What's not a gap:** the roll-down. Legacy already refreshes about as much, starting earlier.

So, for step 3, in order: an Isomorph plan (get one, equip it on a carry or a Yan-feasible member, keep 简易通讯机
and cloning items), `dyy-level`, the Yan-focused buying and freezing. Then the roll-down only as a tuning of legacy's.

## Step 3 begun: the Isomorph tactic `plan-iso` (2026-11-12)

Where the humans' Isomorphs come from (all 62 human seats of 08): **merge rewards** (54 of 97; 缪尔赛思 56 of 76),
then strategy gifts (25) and buying (14). Half the human seats reach level 6, at a median of round 12. Legacy never goes
past level 5 (`BOT_MAX_LEVEL`), so tier 6 never shows in its shop. When a reward offers 缪尔赛思 or an Isomorph, humans
take it 43 % of the time, bots 31 %. Legacy already equips an Isomorph well once held (`morphPlan`).

`plan-iso` (`server/match/botTacticsResearch.js`, branch `feature/bot-plan-tactics`, 58d6c04a):
- **takes a merge reward** offering 缪尔赛思 or a 变形同构体, while fewer than `maxIso` (6) are owned;
- from shop level `fromLevel` (6), puts 缪尔赛思 and the 变形同构体 into the plan's buy lists;
- once an Isomorph is owned, lists the bond items of the Alliances one Isomorph completes. Fish's rule is applied to
  the owned members: first threshold ≤ 3, owned members one short. For a Yan board that's Durable, Arcane and Raid
  from the data alone, and Swift or Precision once one member is owned;
- keeps the Isomorphs and those bond items (`items.keep`).

Six solo Du Yaoye matches (seeds 1–6): an Isomorph got and equipped in 5 of 6 seats, against 2 of 6 for legacy.
Stacks were the same within a few.

**Measured** (`untracked/queue6-2026-11-12.sh` → `untracked/engines-2026-11/dyy-iso/`, `compare-iso.md`): solo
Ultimate, Du Yaoye forced, seeds 1–160, legacy against `iso`, paired.

| | `legacy` | `iso` |
|---|---|---|
| Wins of 160 | 20 | 17 (3 lost / 0 gained) |
| Reached the Final Assault | 136 | 135 |
| Leaks per game | 21.5 | 22.8 |
| Stacks, rounds 10 / 13 | 77 / 171 | 77 / 167 |
| Leader damage per game | 2.00 M | 1.98 M |

**This mostly tested nothing.** Legacy stops at level 5, so `fromLevel` 6 never comes and `plan-iso` never buys. Only
its merge-reward picks act; they change 49 of 160 seeds, with no visible gain (3 lost is noise, p 0.25).

**Level 6 added** (33e86ab4): `legacy-level` has a new `level6From` (default 16: never), so a profile can set
`maxLevel 6, level6From 11`. A three-seed smoke run reaches level 6 by round 13. **Queued** (`untracked/queue8-2026-11-12.sh`):
the same 160 seeds with `lvl6` (level 6 from round 11) and `iso6` (the same plus `plan-iso`), against queue6's legacy.
Legacy's own note (§37.38) found level 6 worse for legacy alone, so `lvl6` against `iso6` is the comparison that
isolates the Isomorph.

**Next for step 3:** cloning Muelsyse, then the roll-down.

## Baseline: the draft against legacy (2026-11-12)

Solo Ultimate, Du Yaoye forced, seeds 1–160, paired, from `feature/fish-dyy-profile` (c1f872e4). Data:
`untracked/dyy-2026-11/solo/` (chunks, joined `*.all.json`, `compare-*.md`).

| | `legacy` | `fish-dyy` (levels 2 / 4 / 5 / 7) | `fish-dyy-human` (2 / 4 / 6 / 9) |
|---|---|---|---|
| Wins of 160 | 20 | 18 (9 lost / 7 gained, p 0.80) | 24 (11 / 15, p 0.56) |
| Reached the Final Assault | 136 | 101 | 102 |
| LP left at the end | 13.7 | 8.2 | 8.8 |
| Leaks per game | 21.5 | 25.3 | 24.7 |
| Shop level, rounds 4 / 7 / 10 | 1.9 / 3.3 / 4.9 | 3.0 / 4.3 / 5.0 | 3.0 / 4.0 / 5.0 |
| Board value, rounds 4 / 7 / 10 | 19.8 / 28.9 / 36.6 | 11.6 / 21.9 / 31.0 | 11.6 / 23.3 / 33.6 |
| Merges per game | 6.4 | 3.5 | 4.0 |
| Stacks, rounds 10 / 13 | 77 / 171 | 66 / 188 | 71 / 191 |
| Leader damage per game | 2.00 M | 1.58 M | 1.61 M |

- **No difference in wins** that 160 seeds can see. `fish-dyy-human` is ahead by 4, which is noise (p 0.56).
- **The levelling does what it says, and costs the board.** At round 4 the drafts have shop level 3 against 1.9, and
  about 60 % of legacy's board value. They leak more from round 2 to round 8, and 35 fewer games reach the Final
  Assault.
- **Games that reach the boss do as well:** 18–24 wins out of about 100, against legacy's 20 of 136.
- **Merges halve.** The funds go into levels and Yan buys, not pairs. The stacks catch up by round 13.
- So the early levelling only pays if the levels turn into strength. Humans do that with the roll-down and the
  Isomorph engine (above). That is step 3's order: `plan-iso` first (queue6, then queue8 with level 6), then the roll-down.

