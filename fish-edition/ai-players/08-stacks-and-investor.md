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
- Every core Alliance shows the gap. Humans reach 1.5–3× the bots' medians, e.g. Laterano 763 against 196, and Yan
  562 against 174.

## Why: humans cycle operators, bots hold a board

Several stack rules count operators **gained**:
- Alliances that add stacks per operator gained in the round (`round_gain_char` in legacy's own stack model, `bot.js`);
- the 获得时 ("on obtain") garrison effects.

**Humans buy 2.3× as many operators and sell 3.5× as many.** They pay for it with more gold, more merge rewards, and
selling. Each cheap operator bought feeds the stacks, then gets sold again.

**Legacy buys toward a board and keeps it.** Its "layer trade" (`bot.js` §35.63: buy an operator whose 获得时 effect
adds stacks, sell it again) is the right idea, but it fires rarely: 14 sales a match.

**Items:** humans equip 31 per seat, bots 4. Many are consumables that are themselves engines: Alliance Coin (Funds),
Identification Device (+3 stacks), Simple Communicator / Dispatch Module (operators of the bearer's Alliances). Legacy
mostly leaves them in the hand.

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
above the bots' 200, so the cycling above is the bigger part.

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

**Queued** (`untracked/queue2-2026-11-12.sh` → `untracked/investor-2026-11/`): co-op Ultimate seeds 1–40, all seats
the same bot. The variants are legacy, priority 3 from round 6, and priority 5 from round 4.

## Next tactics (not built)

1. **Cycling:** from round 7, while the funds allow, buy the cheapest operator that feeds an active stack rule (a
   `round_gain_char` Alliance or a 获得时 effect), and sell it next prep. It's legacy's layer trade, run as a loop.
   Parameters: start round, reserve, which tiers.
2. **Consumables:** equip Alliance Coin, Identification Device, Simple Communicator and Dispatch Module when they pay.
   This needs the plan's `items` channel (`items.equip`), or the tactic acts directly.
3. **Investor timing:** hold Tin Man and Swire EW on the Bench from early on, and look for the tier-5 member at
   level 5.

**To measure:** stacks (botbench `--layers`) and boss damage, paired by seed against legacy. Wins alone need hundreds
of seeds (07).
