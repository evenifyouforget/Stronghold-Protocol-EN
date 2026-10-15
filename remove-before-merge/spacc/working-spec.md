# SPA-CC working spec

Working document for the SPA-CC Risk tags: names, numbers, new ideas. ROADMAP.md "SPA-CC" stays the summary.

State as of 2026-10-15, branch `wip/spacc-tags` (on `wip/spacc`). Every tag is a lobby rule in `shared/rules.js` (category `risk`); the
numbers are in `shared/ruleData.js` `CC`. A tag with levels is one rule, so its levels exclude each other. With any
cheat on, the total Risk counts as 0.

**Name** is the tag's player-facing name (blank = not named yet). The **current label** is the placeholder shown on the
grid tile today.

## Implemented tags

### 1. `ccInvestorBench`

- **Name:**
- **Current label:** "Investor: no Bench"
- **Risk:** 1
- **Effect:** Operators on the Bench no longer count toward activating Investor. The board still counts.
- **Notes:** Investor's alliance text gets a "(Risk: Bench Operators no longer count)" suffix.

### 2. `ccSwift`

- **Name:**
- **Current label:** "Swift nerf"
- **Risk:** 1
- **Effect:** Swift's SP-recovery chance is 20% + 0.25% × stacks (normally 20% + 0.35% × stacks).

### 3. `ccForesight`

- **Name:**
- **Current label:** "Foresight ASPD -20"
- **Risk:** 1
- **Effect:** every Foresight Operator has −20 ASPD, whether Foresight is active or not.

### 4. `ccStrategyLate`

- **Name:**
- **Current label:** "Strategies delayed"
- **Risk:** 1
- **Effect:** Strategies that name a round take effect 1 round later.
  - Justin Jr. 2/5/8/11, Jessica 5/8/11/14, Fang 9/11/13/15 (round 15 = Hidden Core, only when it's played).
  - Quintus 4, Orchid 11, Yu 9, Pith / Dusk / Muelsyse / Malkie 2.
  - Lee: Funds held on rounds 2 and 3, paid out on round 4.
  - Harold from round 5, Duck Lord from round 6.
- **Unchanged:** Strategies on even/odd rounds or every N rounds (Dobermann, Matsukiri, Narantuya). Damazti also keeps
  5/10/15: its text says "every 5 rounds", although its data stores three named rounds.

### 5. `ccTier1Price`

- **Name:**
- **Current label:** "Tier I price up"
- **Risk:** 1
- **Effect:** from round 3, the first Tier I Operator bought each round costs 1 more.

### 6. `ccUpgrade`

- **Name:**
- **Current label:** "Upgrade cost up 1 / 2"
- **Risk:** 1 / 2
- **Effect:**
  - Level 1: upgrading the Dispatch Center from level 4 to 5 costs +2 Funds.
  - Level 2: 4→5 and 5→6 cost +3 each.

### 7. `ccSpRecovery`

- **Name:**
- **Current label:** "SP recovery -0.2 / -0.5 / -0.8"
- **Risk:** 1 / 2 / 3
- **Effect:** every Operator's automatic (time-based) SP recovery is 0.2 / 0.5 / 0.8 SP per second slower.

### 8. `ccBoss`

- **Name:**
- **Current label:** "Final Leader up 1 / 2 / 3"
- **Risk:** 1 / 2 / 3
- **Effect:** the final boss, Hidden Core included, gets +50 / 150 / 400% HP (its shared pool) and +15 / 25 / 50% ATK.

### 9. `ccLeaderDr`

- **Name:**
- **Current label:** "Leader DR 50% / 90%"
- **Risk:** 1 / 2
- **Effect:** Leaders take 50 / 90% less Physical and Arts damage, except while under an elemental burst effect. True
  damage is unaffected.
- **Leaders here:** the final / Hidden Core bosses and the leader-class enemies (`enemy-palette/leaders.md`), bounty
  ones included.

### 10. `ccDeepInfiltration`

- **Name:** Deep Infiltration
- **Risk:** 1
- **Effect:** DP generation −50 %.

### 11. `ccLowEfficiency`

- **Name:** Low Efficiency
- **Risk:** 1
- **Effect:** every operator's redeployment time +75 %.

### 12. `ccLastLine`

- **Name:** Last Line of Defense
- **Risk:** 1
- **Effect:** when a player's own battle leaks at least one enemy in a round, that player loses 2 more LP, past the
  10-per-round limit. It still applies when the Unite Phase catches every leak.
- **Reading:** normal rounds only; the final boss rounds charge the team's LP their own way and don't get the +2.

### 13. `ccOzArts` / 14. `ccOzPhys`

- **Name:** Originium Zone: Arts / Originium Zone: Physical
- **Risk:** 1 each
- **Effect:** once the final boss has taken 50 % of its pool as Arts (Physical) damage, counting every field together,
  it gets +50 RES (+5000 DEF) for the rest of the fight. The Hidden Core boss too (its own pool, counted afresh).

### 15. `ccLockout`

- **Name:** Originium Zone: Lockout 1 / 2 / 3
- **Risk:** 1 / 2 / 3
- **Effect:** every 68 / 28 / 18 % of the pool lost, the final boss is invulnerable for 10 game seconds. Each step is a
  hard gate: one big hit stops at it. Steps: Lockout 1 at 68 % lost (once), 2 at 28 / 56 / 84 %, 3 at 18 / 36 / 54 /
  72 / 90 %.

### 16. `ccFamiglia` (group)

- **Cleaner** (Risk 1), formerly `ccSilencers`: on rounds 10–13, the Doctor with the fewest stacks across all alliances
  gets 5 Famiglia Shadow Silencers in their battle, with no bounty. Ties go to the earliest seat.
- **Unending 2 / 3, Seasonal 2 / 3:** not built yet, they wait for the Blood Debt design (see Questions).

### 17. `ccPatriot` (group, replaces the provisional tag)

- **Undying 1** (Risk 1): the round-9 Improv always offers a Patriot card (no bounty). Whoever takes it fights him that
  round. If nobody takes him, the final boss gets +200 % max HP. A leaked Patriot costs 5 LP (still within the 10-per-
  round limit).
- **Undying 2** (Risk 2, includes 1): in Marching Stance he takes 90 % less Physical and Arts damage from units not
  blocking him, and is immune to Slow, Stun, Bind, Cold, Freeze, Tremble (Frighten), Sleep, Fear, Levitate and Lure
  (Attract). +200 % max HP and never slower than his base speed, in both stances. Not taking him also gives the final
  boss +100 % ATK.
- **Support 3** (Risk 3, includes 1–2): 5 Guerrilla Shieldguards come with him. In the final boss rounds, Patriot and
  his 5 Shieldguards come again on every player's half. His spear picks up to 3 targets on high ground (farthest
  first) and adds 135 % ATK as Necrosis.
- **Rampage 3** (Risk 3, includes 1–2, not with Support 3): the same sub-wave, and while he is alive (his revive
  included) every enemy on his field has +40 % move speed and +40 ASPD.

### 18. `ccDelegation` (group)

- **United 1** (Risk 1): in the final boss rounds, every player's half gets 1 Degenbrecher, 10 Delegation
  Shieldbearers and 10 Delegation Centurion Champions, at 500 % of their HP that round.
- **United 2** (Risk 2): the final boss cannot die while a Degenbrecher lives on any field (its pool stops at 1 HP).
  The sub-wave has 1000 % HP and 150 % ATK.
- **Cloned 3** (Risk 3): 2 more Degenbrecher (3 per half).
- **Resilient 3** (Risk 3, not with Cloned 3): the sub-wave has 1500 % HP. Degenbrecher's Momentum Murder comes every
  9 % of her HP (normally 25 %), and each step is a hard gate: she loses no HP until the cast ends.

## How the groups work

A group is one rule whose levels form a tree. A level includes the ones above it (Seasonal 3 = Seasonal 2 + Cleaner)
and excludes its siblings (Support 3 or Rampage 3). Its Risk is the chosen level's number, not a sum (Rampage 3 = 3
Risk), as with the other leveled tags. The grid shows siblings side by side under the shared tiers; the chosen tile is
lit, and the tiers it includes are lit faintly.

## Readings I made (correct me)

1. **"All fields" / "added to the final boss round(s)":** every player's half of a boss field gets its own sub-wave, so
   a pair field has two. One per field would put it all on one player's side.
2. **Undying 1 in co-op:** the draft is shared, so one Patriot card for the team; the penalty applies when nobody took
   him. In co-op's 6-card draft, the Patriot card replaces the last card (a draft shows at most 6).
3. **Support / Rampage 3's final-round sub-wave comes whether or not anyone took Patriot on round 9.** A mode without a
   round-9 Improv (training, solo Funny) never offers him, so there's no penalty there.
4. **Patriot / Degenbrecher "Level 1 stats":** this mode has only one level of each, so nothing to change.
5. **Delegation's HP / ATK multipliers** apply on top of the round's usual enemy scaling.
6. **Momentum Murder's cast:** this mode had it instant. I gave it 1 s (an assumption) so the gate means something; the
   burst comes at the end of the cast.
7. **Lockout's 10 s** are game seconds (the battles run at 2×, so 5 real seconds).

## Questions

1. **Blood Debt / Asset Liquidation** (Famiglia Unending / Seasonal): how does the gauge fill, how full is "full", what
   does Asset Liquidation do and for how long? With that, the Zaaro part of tier 3 is quick (he's in the data with his
   kit).

## Backlog (ideas not built yet)

| Idea | Risk | Status |
|---|---|---|
| Famiglia Unending 2 / 3, Seasonal 2 / 3 (Blood Debt, Asset Liquidation, Zaaro) | 2 / 3 | waits for the Blood Debt design |
| Vengeance group | | Fish is rewriting it (the mob Hateful Avenger, not Reid) |
| Final round: Rosmontis, Simulated Sentry joins | 1 / 2 | needs a new enemy (kit with Matrix) |

## New suggestions

(add here)
