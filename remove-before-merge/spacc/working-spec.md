# SPA-CC working spec

Working document for the SPA-CC Risk tags: names, numbers, new ideas. ROADMAP.md "SPA-CC" stays the summary.

State as of 2026-10-15, branch `wip/spacc`. Every tag is a lobby rule in `shared/rules.js` (category `risk`); the
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

### 10. `ccSilencers`

- **Name:**
- **Current label:** "Famiglia Shadow Silencer"
- **Risk:** 1
- **Effect:** on rounds 10–13, the Doctor with the fewest stacks across all alliances gets 5 Famiglia Shadow Silencers
  added to their battle, with no bounty.
- **Ties:** go to the earliest seat (p1 before p2).

### 11. `ccPatriot` (provisional)

- **Name:**
- **Current label:** "Patriot (prototype)"
- **Risk:** 1
- **Effect:** on round 9, one Patriot appears in every Doctor's battle, with no bounty.
- **Notes:** a stand-in to playtest the Patriot pilot until the enemy tags are designed. Feedback is in
  `enemy-palette/leaders.md`.

## Backlog (ROADMAP ideas not built yet)

| Idea | Risk | Status |
|---|---|---|
| Final boss gains 50 RES after taking 50 % max HP as Arts damage | 1 | needs the pool-wide mechanism (FINDINGS §5) |
| Final boss gains 5000 DEF after taking 50 % max HP as Physical damage | 1 | same |
| Final boss invulnerable for 10 s every 68 / 28 / 18 % max HP lost | 1 / 2 / 3 | same |
| Round 9 Improv offers Deathless Black Snake; skipping it → final boss +200 % HP (2: also Patriot and FrostNova, +100 % ATK) | 1 / 2 | needs new enemies (each a kit); Patriot exists now |
| Blood Debt and Asset Liquidations always on | 2 (with Silencers) | needs a custom design (FINDINGS §5, answer 7) |
| Final round: Rosmontis, Simulated Sentry joins (2: Matrix gives no buffs; the boss can't die while she lives) | 1 / 2 | needs a new enemy (kit with Matrix) |

## New suggestions

(add here)
