# Stacks and Investor: why bots fall behind (2026-11-12)

Fish's long-term goals (TODO "Bots"): "Why do the bots suck so much at generating 200+ stacks?" and "Be able to play
Investor ... studying human games may be enlightening."

**Data.**
- **Humans:** the human seats of the match records in `logs/` (2026-10-27 → 11-08), Hard and Ultimate, without cheats,
  that passed round 10. That's 62 seats.
- **Bots:** legacy (main, #108) in 30 co-op Ultimate matches (seeds 1–30; seat 0 forced to Du Yaoye). That's 111 seats.
- The teams differ (humans played with humans, bots with bots), so read the gaps as large-scale, not exact.
- Scripts and tables are in `untracked/dyy-2026-11/`: `stacks.mjs` → `stacks.md`.

## The gap

| Per seat | Humans | Bots |
|---|---|---|
| Stacks (medians) at rounds 7 / 10 / 13 / max | 40 / 176 / 437 / 509 | 36 / 104 / 188 / 202 |
| Seats with 200+ / 400+ stacks | 61 / 47 of 62 | 58 / 11 of 111 |
| Investor active at some point | 30 of 62 | 1 of 111 |
| Operators bought | 68 | 30 |
| Operators sold | 48 | 14 |
| Items equipped | 31 | 4 |
| Merge rewards taken | 12.7 | 5.0 |
| Operators gained from effects | 6.7 (3.1 from 获得时 pool garrisons) | 2.2 (0.2) |
| Gold earned (median) | 186 | 148 |

- **Stacks are even until round 7.** The gap opens from rounds 7 to 13: humans gain about 400, bots about 150.
- **The highest human seats are Paganini (Laterano) with Investor:** 1,000–4,600 stacks, with 160–340 sales and
  400–700 gold.
- Every core Alliance shows the gap. Humans reach 1.3× (Kjerag) to 3.9× (Laterano: 763 against 196) the bots' medians; Yan is
  562 against 174.

## Why: the operators deployed and the items, more than cycling

**Where the stacks come from, rounds 7–13** (`untracked/dyy-2026-11/stack-sources.mjs` → `stack-sources.md`). Each
round's gain is split into estimates:
- 获得时: the "on obtain" traits of the operators obtained, ×2 under Investor;
- the engine: operators obtained × the deployed 小满 / 夕 / 山 ("each operator gained this round");
- the rest: everything else (the prep-start and prep-end traits of deployed operators, items, Alliance effects).

| Per seat, rounds 7–13 (median / mean) | Humans | Bots |
|---|---|---|
| Stacks gained | 410 / 594 | 169 / 188 |
| 获得时 traits | 36 / 75 | 32 / 37 |
| Engine (小满 / 夕 / 山) | 0 / 89 | 0 / 21 |
| Rest | 336 / 430 | 112 / 130 |
| Operators obtained | 30 / 43 | 17 / 17 |

- **Buying to feed the 获得时 traits explains little.** The median seat gets about the same from them on both sides.
  The engine matters for a minority of human seats (Investor, Yan with 夕), so the mean differs, but the median
  doesn't. (An earlier draft of this note blamed cycling first. This split corrects that.)
- **Most of the gap is the rest: about 340 against 110.**

**What humans deploy** (rounds deployed per seat, rounds 7–13; `fielded.mjs`, in the same md):

| Operator | Trait | Humans | Bots |
|---|---|---|---|
| 空弦 | prep start: itself and the piece in front, each active Alliance +3 | 2.8 | 0.4 |
| 断崖 | prep end: itself and the piece behind, each active Alliance +3 | 2.1 | 0.1 |
| 薄绿 | +2 Victoria per different-tier Victoria operator | 1.3 | 0.3 |
| 夕 | +2 Yan / Arcane per operator gained | 1.2 | 0.5 |
| 烛煌 | 获得时 +5 Yan / Victoria | 1.0 | 0.3 |
| 伊内丝 | prep end: its own active Alliances +5 | 0.7 | 0.3 |
| 山 | +1 Investor per operator gained | 0.6 | 0.0 |

- **The position stackers 空弦 and 断崖** each add +3 to every active Alliance of two operators, every round. Next to
  an operator with 3 active Alliances (and 2 of its own), that is 15 a round from one piece.
- **Legacy undervalues them.** Its engine bonus (`engineFor`, +10) only sees a trait that names the focus Alliance or
  says "自身所属／自身已激活的盟约". "使自身及身前一格干员的已激活盟约…" matches neither, so they get only the generic
  `recurring × 4`. Legacy does place them well once owned (§37.37 `positionTraitsOf`).
- **Not on every map:** a match bans about 22 operators per seed (`SharedPool.banned`); 空弦 and 断崖 were both out in
  seeds 1 and 3. The humans' matches ban too, so the comparison holds.

**Items:** humans equip 18 in rounds 7–13 (31 over the match), bots 2.4 (4). The bots don't leave them in the hand:
they never buy them. §37.39 stopped legacy buying shop equipment, except the elite items and, in solo, the dolls.
Per seat, whole match (`items.mjs` → `untracked/dyy-2026-11/items.md`):

| Item | Humans: obtained / equipped | Bots |
|---|---|---|
| 盟约之币 (1 fund, gives 1 fund back) | 6.3 / 4.3 | 0.6 / 0.5 |
| 变形同构体 (Isomorph) | 1.6 / 3.7 | 0.2 / 0.2 |
| 简易通讯机 (2: an operator of the bearer's Alliances) | 1.5 / 1.5 | 0.01 |
| 见钱眼开玩偶 (1: +2 funds next round) | 1.4 / 1.4 | 0.01 |
| 骑士储蓄罐 (3: 1–6 funds) | 1.3 / 1.3 | 0.01 |
| 寻呼模块 (4: a free pick of 3 operators of the bearer's Alliances) | 1.0 / 1.0 | 0.02 |
| 精打细算玩偶 (3: +1 fund every later round) | 0.5 / 0.5 | 0 |

**Turnover still differs** (buys 68 against 30, sells 48 against 14 per match), but the split says it buys fewer
stacks directly than it seemed. Its main effect is probably reaching the stackers and the merges sooner.

## Investor

Investor (投资人) has one threshold:
- **3 members, Bench included.** Then 获得时 effects trigger twice (3 times at 100 stacks), which doubles the engine
  above.
- **Members:** only five operators: Tin Man (tiers 1 and 2), Swire the Elegant Wit (Yan, tier 3), SilverAsh the
  Reignfrost (tier 5), Mountain (tier 5).

| | Humans | Bots |
|---|---|---|
| Most Investor operators held at once: 0 / 1 / 2 / 3+ | 20 / 7 / 6 / 29 | 67 / 38 / 5 / 1 |
| 3 reached, round (median, range) | 10 (8–14) | 10 (one seat) |
| The trios | Tin Man + Swire EW + Mountain (15); Tin Man + Swire EW + SilverAsh (11); other (3) | — |

**67 of 111 bot seats never hold a single Investor operator.** Legacy's buy score values an operator for the board
and its bonds. A Bench-counted bond whose members are spread across tiers 1–5 never gets enough weight. Humans assemble
it around round 10, when level 5 shows the tier-5 members.

Investor alone doesn't explain the stacks. Human seats with Investor have 569 stacks, without it 461. Both are far
above the bots' 200, so the deployed stackers and items above are the bigger part.

## A first tactic: `plan-bond` (writes legacy's internal state)

Legacy already has a plan for its own seat: `ps._botSelf`, written each prep by `selfPlan`. It names the focus bond,
and legacy reads it everywhere:
- buying: a member it doesn't own scores + priority × 6;
- the lineup: the same weight;
- its sales: a member is kept while selling it would lower the bond's active tier (`planProtected`).

The external advisor uses the same channel (`aiPlan.js`), which also has `keep`, `buy` and `items` fields.

`plan-bond` (`server/match/botTacticsResearch.js`, branch `feature/bot-plan-tactics`) adds one bond to that plan from
a round on. Its parameters are the bond (default Investor), the priority (1–5) and the start round. It changes data
only, never an action. It's the first tactic for Fish's "a tactic that writes each variable of the internal state".

**Smoke run** (co-op Ultimate, seeds 1–3, 12 seats), priority 3 from round 6:

| | legacy | `plan-bond` |
|---|---|---|
| Most Investor operators held at once: 0 / 1 / 2 / 3 | 8 / 4 / 0 / 0 | 7 / 2 / 1 / 2 |
| Investor active | 0 of 12 | 2 of 12, at rounds 12 and 14 |

It changes play, but too late and too rarely at these settings.

**Measured** (`untracked/queue2-2026-11-12.sh` → `untracked/investor-2026-11/`, `compare-*.md`): co-op Ultimate seeds
1–40, all seats the same bot.

| | legacy | priority 3 from round 6 | priority 5 from round 4 |
|---|---|---|---|
| Wins | 27 | 26 (lost 6, gained 5; p 1.00) | 22 (lost 7, gained 2; p 0.18) |
| Reached the boss | 39 | 36 | 34 |
| Rounds passed (mean) | 13.70 | 13.53 | 13.43 |
| LP left (mean) | 36.8 | 32.3 | 31.7 |
| Bounties leaked | 56 | 53 | 68 |
| Stacks at rounds 7 / 10 / 13 (mean per team) | 40 / 111 / 258 | 37 / 104 / 265 | 36 / 103 / 266 |
| Leader damage (mean) | 3.16 M | 3.27 M | 3.53 M |

**Verdict: neither setting helps.** Stacks at round 13 barely move (+3 %), and both lose defence: fewer teams reach the
boss and less LP is left. Priority 5 is clearly worse. Chasing Investor through the plan's buy weight alone takes
board strength without enough stack return; the cheap members are weak units. If Investor is retried, it should be
the timing tactic below (members on the Bench, not the board), measured with records for how often it activates.

## A second tactic: `plan-engines` (writes legacy's internal state)

`plan-engines` (same file and branch, 78b911a6) puts the position stackers into the plan's `buy` list from a round on,
and the owned ones into `keep`:
- `buy`: legacy buys a listed operator outright when the shop shows it, above its reserve (`planSpendSteps`), and its
  copies until the merge;
- `keep`: +18 in the bench and sale scores.

Parameters:
- `kinds`: `pos` (空弦, 断崖, 引星棘刺, 见行者), or `pos+own`, which adds the prep-time "own active Alliances +n"
  operators (伊内丝, 赫默, 莱恩哈特, 蒂比);
- `fromRound` (4) and `toRound` (11);
- `max` (2): no new kinds are bought once that many are owned.

Like `plan-bond`, it changes data only.

**Measured** (`untracked/queue4-2026-11-12.sh` → `untracked/engines-2026-11/`, `compare-eng-pos*.md`). botbench,
co-op Ultimate seeds 1–40, against queue2's legacy, paired:

| | legacy | `eng-pos` | `eng-pos-own` (max 3) |
|---|---|---|---|
| Wins of 40 | 27 | 22 (7 lost / 2 gained, p 0.18) | 14 (15 / 2, p 0.002) |
| Reached the boss | 39 | 34 | 31 |
| LP left (mean) | 36.8 | 27.8 | 27.7 |
| Bounties leaked | 56 | 65 | 77 |
| Stacks at rounds 7 / 10 / 13 (mean per team) | 40 / 111 / 258 | 39 / 108 / 266 | 35 / 106 / 252 |
| Leader damage (mean) | 3.16 M | 3.48 M | 2.20 M |

The records (seeds 1–30, seat 0 Du Yaoye, against `dyy-2026-11/bot-legacy`; legacy there is main's, so the code
differs slightly): `eng-pos` deploys 空弦 1.03 rounds per seat in rounds 7–13 (legacy 0.40) and 断崖 0.80 (0.10), but
the median stacks stay at 38 / 87 / 156 at rounds 7 / 10 / 13 (legacy 35 / 100 / 150).

**Verdict: deploying the position stackers doesn't give the stacks the humans get, and costs defence.** The bots now
field 空弦 and 断崖 2–8× as often, and stacks rise by 3 % at most. `pos+own` is clearly worse. Why it fails is not
measured yet. Likely reasons:
- 空弦 / 断崖 are weak units, and they take a board slot from a fighter;
- their +3 goes to "each active Alliance" of the piece beside them, so it pays only next to a piece with several active
  Alliances (not checked: how many the bots' neighbours have);
- the placement problem (09): the rehearsal still leaves the front empty half the time. queue7 (the leak allowance)
  runs on top of `eng-pos` to test this one.

## A third tactic: `plan-items` (the plan, plus one buy step)

`plan-items` (same branch, f93e6db6) puts shop consumables into the plan's `items.buy` from a round on, up to the Final
Assault prep:
- `set`: `stack` (随身身份牌, 简易通讯机, 寻呼模块), `coin` (见钱眼开玩偶, 骑士储蓄罐, and 精打细算玩偶 while 5+ rounds remain), or
  `both`;
- `fromRound` (4) and `reserve` (0).

The plan alone wasn't enough: in two solo test matches the shop showed 见钱眼开玩偶 in rounds 4–5 and 寻呼模块 in rounds
8–10, and legacy's buy loop spent the funds on operators and refreshes first. So the tactic also buys the listed items
the shop shows before legacy's loop starts; legacy equips them itself. 盟约之币 and Isomorph are left out: the coin is
neutral, and Isomorph is DYYBot's step 3 (05).

**Queued** (`untracked/queue5-2026-11-12.sh`, after queue4): botbench `items` and `items-eng` (with `plan-engines`) on
queue2's seeds, then records of `items-eng` (seeds 1–30).

## Next tactics (not built)

1. **Investor timing:** hold Tin Man and Swire EW on the Bench from early on, and look for the tier-5 member at
   level 5.
2. **Cycling:** from round 7, buy the cheapest operator that feeds an active 获得时 or engine rule and sell it next
   prep. Lower priority after the split above. queue3's `trade1.5` (legacy's own trade at half the bar) tests the
   cheap version first; it now runs last (`queue3-late`), after queue5.

**Queue order** (log `untracked/queue-2026-11-12.log`): the balance sweep and the DYY baseline → queue2 (Investor) →
queue6 (DYY Isomorph, 05) → queue4 (`plan-engines`) → queue5 (`plan-items`) → queue3 (`trade1.5`) → queue7 (the
leak allowance, 09). queue4 and queue5
run in sp-plan-run2 at 58d6c04a; their tactics' code is the same as at 78b911a6 and f93e6db6.

**To measure:** stacks (botbench `--layers`) and boss damage, paired by seed against legacy. Wins alone need hundreds
of seeds (07).
