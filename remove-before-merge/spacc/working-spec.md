# SPA-CC working spec

Working document for the SPA-CC Risk tags: names, numbers, new ideas. ROADMAP.md "SPA-CC" stays the summary.

State as of 2026-10-15, branch `wip/vengeance-junk` (on `wip/famiglia`). Every tag is a lobby rule in `shared/rules.js` (category `risk`); the
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

- **Cleaner 1** (Risk 1), formerly `ccSilencers`: on rounds 10–13, the Doctor with the fewest stacks across all alliances
  gets 5 Famiglia Shadow Silencers in their battle, with no bounty. Ties go to the earliest seat.
- **Unending 2** (Risk 2, includes Cleaner): every battle is an Asset Liquidation from start to end: every enemy +20 %
  ATK and +15 % DEF, the Silencers also +15 % ATK / DEF and +50 ASPD. No Silencer comes from it.
- **Seasonal 2** (Risk 2, includes Cleaner, not with Unending): every battle has its own Blood Ledger, fresh each time.
  It starts 25 % full (125) and fills 3 per game second (+1 per living Zaaro, +35 per second during his Furious Howl).
  At 500, an Asset Liquidation: the same buffs, one Famiglia Shadow Silencer comes, and the Ledger empties over 35 game
  seconds without filling. From round 10 it starts 75 % full (375).
- **Unending 3 / Seasonal 3** (Risk 3): Zaaro joins Cleaner's sub-wave (rounds 10–13, the fewest stacks) and costs 5 LP
  when he leaks.
- **Every battle:** normal rounds, the Unite Phase and the final boss rounds. A Ledger bar sits in the phase capsule at
  the top of the battle screen (the count while it fills, "Asset Liquidation" and a pulse while one lasts).

### 17. `ccPatriot` (group: Undying 1 / 2 / 3, a chain since Fish's playtest of 2026-10-15)

- **Undying 1** (Risk 1): the round-9 Improv always offers a Patriot card (no bounty). Whoever takes it fights him that
  round. If nobody takes him, the final boss gets +200 % max HP. A leaked Patriot costs 5 LP (still within the 10-per-
  round limit). He uses his Level 1 stats (60000 HP, 2000 ATK).
- **Undying 2** (Risk 2): in Marching Stance he takes 90 % less Physical and Arts damage from units not blocking him,
  and is immune to Slow, Stun, Bind, Cold, Freeze, Tremble (Frighten), Sleep, Fear, Levitate and Lure (Attract). +200 %
  max HP and never slower than his base speed, in both stances. Not taking him also gives the final boss +100 % ATK.
- **Undying 3** (Risk 3): 5 Guerrilla Shieldguards come with him. In the final boss rounds, Patriot and his 5
  Shieldguards come again, once per field. While he is alive (his revive included), every enemy on his field has
  +40 % move speed and +40 ASPD. (The old Support 3 spear — 3 targets, Necrosis — is gone.)

### 18. `ccDelegation` (group: United 1 / 2 / 3, a chain since 2026-10-15)

- **United 1** (Risk 1): in the final boss rounds, every field gets 1 Degenbrecher, 5 Delegation Shieldbearers and 5
  Delegation Centurion Champions, at 200 % of their HP that round. This Degenbrecher uses her Level 1 stats (45000 HP,
  1000 ATK, 800 DEF); a bounty Degenbrecher in a normal round keeps Level 0.
- **United 2** (Risk 2): the final boss cannot die while a Degenbrecher lives on any field (its pool stops at 1 HP).
  The sub-wave has 300 % HP and 150 % ATK. Degenbrecher charges: while unblocked her move speed climbs to +300 % over
  10 s, back to normal when she is blocked or can't move (stunned, frozen, asleep, levitated, bound).
- **United 3** (Risk 3): the sub-wave has 500 % HP. Her Momentum Murder comes every 9 % of her HP (normally 25 %), and
  each step is a hard gate: she loses no HP until the cast ends. (Cloned 3 is gone.)

### 19. `ccJunk` (Objective: Junk 1 / 2, prototype)

- **Junk 1** (Risk 1): every player starts with a **Cursed Hammer** (a Fish Edition item, made at run time; the Victorian
  Hammer's icon). Its carrier has −50 % ATK. It cannot be destroyed: not sold (no item can be), not destroyed by the
  player (refused), never the item a third equip replaces (picking it is refused; the default "oldest" skips it), never
  expiring in the temporary hand. (One edge left: an item coming back off an operator with the hand and temporary hand
  both full is lost, the Cursed Hammer too — the same for every item.) It gives no
  alliance, so it has no interaction with the Damazti Isomorph.
- **Junk 2** (Risk 2): a round's income is 1 lower while the Cursed Hammer is in the hand or temporary hand (not
  equipped).

### 20. `ccVengeance` (Vengeance: Invincible Blade 1 / 2 / 3, prototype)

Reid, "Hateful Avenger" (`enemy_1539_reid`, the leader), shown in the tag texts as `Reid, <his name>`.

- **Invincible Blade 1** (Risk 1): every normal battle gets 1 Reid per 300 total stacks of that player (at most 20). In
  the final boss rounds: by the total stacks of all alive players, once per field, on the left-first route.
- **Invincible Blade 2** (Risk 2): those Reids have +150 % max HP, +50 % ATK, Status Resistance, 30 % less Physical /
  Arts damage below 50 % HP, and are invulnerable for 15 s after their revive.
- **Invincible Blade 3** (Risk 3): twice as many, +100 ASPD; below 50 % HP 60 % less damage instead and immune to Slow,
  Stun, Bind, Cold, Freeze, Tremble, Sleep, Fear, Levitate and Lure.
- Only the Reids the tag adds get these; a Reid that comes as an ordinary bounty keeps his data.

### Sub-waves on the final boss fields (Patriot Undying 3, Delegation)

Once per field, not once per player (Fish 2026-10-15). Every unit takes a route that goes to the left portal first and
then the right one, leaking at the right door if it gets through — the same one-circuit route half the template's own
mobs take (the other half go right first). A one-player field's routes all go left, so its sub-wave goes left.

## Tile names

The Risk grid's tiles show the tags' names (Fish's, "part of the branding"): Objective: Investor / Swift / Foresight /
Strategy / Intern / Barge 1–2 / Deep Infiltration / Low Efficiency / Last Line of Defense, Environment: Suffocation 1–3,
Originium Zone: Arts / Physical / Activation 1–3 / Lockout 1–3 / Elements 1–2, Objective: Junk 1–2, Famiglia: Cleaner 1
/ Unending 2–3 / Seasonal 2–3, Patriot: Undying 1–3, Delegation: United 1–3, Vengeance: Invincible Blade 1–3. English is Fish's wording; the Chinese source strings are
translations of it, and Japanese / Korean / Traditional Chinese fall back to the Chinese until someone translates them.

## How the groups work

A group is one rule whose levels form a tree. A level includes the ones above it (Seasonal 3 = Seasonal 2 + Cleaner)
and excludes its siblings (Support 3 or Rampage 3). Its Risk is the chosen level's number, not a sum (Rampage 3 = 3
Risk), as with the other leveled tags. The grid shows siblings side by side under the shared tiers; the chosen tile is
lit, and the tiers it includes are lit faintly.

## Readings I made (correct me)

1. **"All fields":** answered — once per field, left-first route (above).
2. **Undying 1 in co-op:** the draft is shared, so one Patriot card for the team; the penalty applies when nobody took
   him. In co-op's 6-card draft, the Patriot card replaces the last card (a draft shows at most 6).
3. **Undying 3's final-round sub-wave comes whether or not anyone took Patriot on round 9.** A mode without a
   round-9 Improv (training, solo Funny) never offers him, so there's no penalty there.
4. **Level 1 stats:** answered (Fish's note below). The data build now keeps both enemies' Level 1 stats from the game
   data (`level1` in `data/enemies.json`; they match the wiki), and the sim uses them as above.
5. **Delegation's HP / ATK multipliers** apply on top of the round's usual enemy scaling.
6. **Momentum Murder's cast:** this mode had it instant. I gave it 1 s (an assumption) so the gate means something; the
   burst comes at the end of the cast.
7. **Lockout's 10 s** are game seconds (the battles run at 2×, so 5 real seconds).
8. **Blood Ledger, the parts the wiki leaves open:**
   - The Silencers' Liquidation bonus is in their data as a Passive with up to 5 stacks. I read it as one stack per
     Liquidation so far in the battle, only while one lasts (Unending: always 1).
   - A Liquidation's Silencer comes on the field's first ground route, scaled like that round's enemies.
   - Kills add nothing in this mode: the wiki's per-kill amounts are for Famiglia soldiers, casters and capos, which
     this mode doesn't have (only the two Silencers and Zaaro).
   - Furious Howl (Zaaro's `WildCalling` in the data: every 40 s, the first 5 s into his second form, 5.5 s long) only
     adds to the Ledger here; whatever else it does in the event isn't modelled.

Level 1 stats - Level 0 is the default. Some enemies have Level 1 stats used on hard stages, such as Patriot (https://arknights.wiki.gg/wiki/Patriot/Enemy) and Degenbrecher (https://arknights.wiki.gg/wiki/Degenbrecher/Enemy)

Compare:

Level 0 stats

HP ATK DEF RES
28000
A+
900
B+
600
B
50
A

Level 1 stats

HP ATK DEF RES
45000
A+
1000
A
800
B+
50
A

## Questions

1. **Blood Debt / Asset Liquidation** (Famiglia Unending / Seasonal): how does the gauge fill, how full is "full", what
   does Asset Liquidation do and for how long? With that, the Zaaro part of tier 3 is quick (he's in the data with his
   kit).

See https://arknights.wiki.gg/wiki/Blood_Ledger

→ Answered (2026-10-15): built as Famiglia Unending / Seasonal above. Fish: Unending = always in Liquidation, Seasonal =
the running gauge; the Ledger is fresh every battle and runs in every battle.

## Backlog (ideas not built yet)

| Idea                                                                           | Risk  | Status                                                   |
| ------------------------------------------------------------------------------ | ----- | -------------------------------------------------------- |
| Final round: Rosmontis, Simulated Sentry joins                                 | 1 / 2 | needs a new enemy (kit with Matrix)                      |

## New suggestions

(add here)
