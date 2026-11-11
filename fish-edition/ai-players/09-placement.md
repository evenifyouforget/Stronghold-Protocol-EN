# Placement: how legacy lays out the board, and Fish's ideas (2026-11-12)

Fish's TODO ("Bots"): "I don't know how the current board layout works, but I suspect there may be better placement
strategies", followed by seven ideas. This note covers how the layout works today, what legacy already does for each
idea, and what the records measure.

## How legacy lays out the board

Each prep, `arrangeSteps` (`server/match/bot.js`) does four things:

1. **The lineup.** Which pieces to deploy (`chooseLineup`: unit values, bond tiers, composition).
2. **Candidate layouts.** `planLayout` places the pieces one by one: blockers first, then dealers by DPS, then healers.
   Each piece takes the free legal tile and facing that adds the most to an **exposure model**:
   - each enemy route spends time on each tile, plus the time blockers hold it there;
   - every unit whose range covers a tile deals its DPS (against the round's armour) there;
   - the value is the expected number of enemies killed;
   - a non-blocker standing on the road is penalised (`roadPenalty`), so dealers already avoid pathable tiles.

   The model runs with several parameter sets (`REHEARSAL_VARIANTS`: more or less blocking time, spread). Extra
   candidates come from:
   - the positional traits (`positionPlanSteps`, §37.37), below;
   - the Ægir devour (§37.70, §37.77);
   - the Final Assault: plans on the leader's body, damage lineups, plans against a blinking leader.
3. **The rehearsal.** Every candidate fights the round's real enemies in the real simulation (a preview battle). The
   winner has, in order:
   - the fewest leaks;
   - then the most leader damage;
   - then the most stacks gained **in the battle**;
   - then the most kills;
   - then the earlier candidate.
4. **Apply** the winner.

**Positional traits** (`positionTraitsOf`). Legacy reads them from the trait data:
- the piece in front or behind (空弦, 引星棘刺, 断崖, 见行者);
- the row (蛇屠箱, 歌蕾蒂娅, 余);
- a trait granted to the piece in front (凛御银灰), or to the rightmost piece of the row (远牙);
- the front piece's trait gains +1 (魔王);
- a trait copied from the front piece (白面鸮, 塞雷娅).

`positionPlanSteps` moves those pieces, or a partner onto the tile they look at, while the positional value grows and
the exposure value stays within 3 % (`POSITION_TOLERANCE`). The result is one more rehearsal candidate, placed first.

## What the records show

From the battle specs of the match records: the same 62 human and 111 bot seats as 08, normal battles from round 4
(`untracked/dyy-2026-11/placement.mjs`). "Front" is one tile along the facing.

| Check | Humans: share (battles) | Bots |
|---|---|---|
| 空弦 / 引星棘刺: a piece in front | 86 % (232) | 56 % (72) |
| 断崖 / 见行者: a piece behind | 97 % (154) | 50 % (18) |
| 魔王: the piece in front gains stacks from a trait | 44 % (48) | 60 % (10) |
| 莫斯提马: Laterano operators among the 4 neighbours (mean) | 1.62 (47) | 0.69 (70) |

The humans' near-100 % confirms the front/behind direction.

**Why bots leave the front of 空弦 empty half the time.** 空弦 adds its stacks at prep start and 断崖 at prep end.
Neither happens in a battle, so the rehearsal never sees them. The positional candidate goes first and wins only a full
tie: any other candidate that kills one more enemy beats it, without leaking less. The 3 % exposure tolerance limits
it further.

Deployment matters more than placement: humans deploy 空弦 and 断崖 7× and 19× as often (08). `plan-engines` (08)
addresses deployment. Once more stackers are deployed, their placement matters more.

## Fish's ideas, one by one

| Idea | Legacy today | Next |
|---|---|---|
| Laterano: Mostima next to an ammo user | Not modelled. Her trait ("自身周围4格的干员每消耗6发弹药" → Laterano +1) is a battle trait, so the rehearsal counts the stacks if a candidate happens to place her well. But no candidate aims for it (`positionTraitsOf` has no "4 neighbours" kind). Bots average 0.7 Laterano neighbours, humans 1.6. | New positional kind `around`: + the ammo users among the 4 neighbours, so `positionPlanSteps` moves her or them. |
| Kjerag: overlap the freeze area with the "on freeze, + stack" range | Not modelled. 初雪 / 银灰 ("范围内1名敌人进入冻结时 … +1") are battle traits: counted by the rehearsal, not aimed for. 凛御银灰's grant to the piece in front is modelled. | Needs a freeze model: where the cold wind and freezes happen (the whole field every 25 s, plus 谢拉格不融冰 hits). Then the exposure model can weight the stack operators' cover of the tiles where enemies stand when frozen. Medium. |
| Kjerag: no freezable tile in front that doesn't make stacks | Not modelled. | Same model: tiles early on the path covered by no stack operator are where freezes are wasted. Comes with the previous one. |
| Civilight (魔王) behind a stack generator | Modelled (`extra`). The records agree (60 % of 10 battles, humans 44 %). | Nothing, unless more data says otherwise. |
| Ægir snake, the dps at the back | Partly. §37.70 models the devour in normal rounds (stacks, the victims that stay down). §37.77 adds Final Assault candidates that feed a dealer (the devoured base ATK and block). The order is the official one: the leftmost and topmost Ægir devours first, and it devours the piece in front. A chain is possible but not aimed for. | Measure first: compare human and bot Ægir chains in the battle specs (chain length; whether the last link is the top dealer). |
| Ægir: a non-Ægir dps with Damazti Isomorph + an Ægir item | Isomorph is on DYYBot's list (05, step 3: the Isomorph plan). Legacy equips Isomorph only via 缪尔赛思's plan (`morphPlan`). | Part of the Isomorph tactic. |
| Boss: a carry dps with maximum buffs and healing, on a ranged / fence tile | Mostly there. The road penalty keeps dealers off pathable tiles. Boss rounds get body plans, damage lineups (a strong bench piece swapped in) and the rehearsal's leader-damage ranking. What's missing is buffs: the exposure model knows DPS and healing cover, not the ATK auras or 鼓舞 skills a carry could stand in. | A "carry" candidate for the Final Assault: the top dealer first on the best off-road tile, buffers and healers around it. The rehearsal keeps it if it deals more. |

## The tie-break tried (efd9963b)

`legacy-arrange` has two new tunables, both off by default:
- `prepTiebreak`: each candidate's prep-time positional stacks × this go into the rehearsal's stack tie-break;
- `posTolerance`: the exposure share the positional plan may give up (legacy: 0.03).

Six solo Ultimate matches with `plan-engines`, plain against `prepTiebreak 1` (and against `posTolerance 0.15`), changed
almost nothing: 空弦's front was filled in 42 % and 50 % of 12 battles, and stacks were the same in 5 of 6 seeds.
Tracing seed 5 shows why. The positional candidate exists in rounds 8–10 (+1.8, +5.4 and +7.8 stacks a round over
the default plan), and it leaks more: 8 leaks against 6 in round 9, 8 against 7 in round 10. The tie-break never
comes into play.

So, on these boards, filling 空弦's front costs defence. The humans' 86 % says they pay that price. Whether it pays
depends on what one stack is worth in LP. That's a policy question, not a tie-break.

## Proposed experiments, in order

1. **A leak allowance for the positional candidate:** it wins with up to k more leaks while the LP stays above a
   floor, from round 6 to round 11. A paired run gives the exchange rate. This would be one more tunable next to
   `prepTiebreak`.
2. **The `around` positional kind** for 莫斯提马. Small, in the same machinery.
3. **The Final Assault carry candidate.**
4. **The Kjerag freeze model.** The largest of the four.

Measure each with stacks and leader damage, paired by seed (07).
