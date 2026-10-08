To LLMs/AI agents: This file is read only. Do not modify it.

# Phase 1 - Understanding

Hi Claude. You can call me Fish. This game (Stronghold Protocol Alliance) has passed through some different hands, until it ended up open source. I felt the original had some missed opportunities, so I forked the repo so I could mod it myself.

I'm opting to try an AI-first workflow - meaning I'll manually code if needed, but I always offer you the first attempt at any task. Don't delete this remove-before-merge/ directory - that is the human's responsibility to do manually.

See TODO.md

For branding purposes, this fork is Fish Edition, because I am Fish.

# Phase 2 - Scoping

Assess the feasibility of ideas in Appendix A - Ideas, and decide what the next PR should be.

Priority factors in:

- Hard dependencies
- Soft dependencies (one feature acts as a prototype or gives useful insights for another)
- Ease of implementation
- Possibility of parallel independent PRs
- User demand/urgency

# Phase 3 - Implementation

...

# Appendix A - Ideas

## Menu/UI

- Highlighted keywords (ex. Cold) already exist, but they don't currently show a definition on hover or on click. On click to show a popup with the keyword definition would be helpful.
- Some kind of damage chart (possibly hidden in a post-game analysis tab) would be helpful. The simplest prototype would be a bar chart that splits by operator (so duplicates of the same operator end up counting toward the same bar). A probably more useful chart would split by operator/player/round, with 3 buttons to toggle whether operator/player/round are combined, and an additional 2 buttons to filter round to only last round/second last round (since these are the boss rounds and it would be a very common query).
- On the difficulty selection screen, it doesn't show details for what each difficulty actually changes. Like, is this giving enemies +50% HP? If Ultimate is just adding a flat stat modifier, that sounds simple enough to just change the text to say. If it's a long list of changes, we might be able to hide it in a help menu.
- Status effects that currently show as an icon above enemies' heads, don't show how long it lasts (for effects that expire). Considering these are already circular icons, it seems simple enough to make an arc chart in the form of a thick outline.
- Status effects that currently show as an icon above enemies' heads, some of these have an associated stack or variable, but it's not visible. (correct me if I'm wrong but) Fragile is one of these, and currently there's no way to distinguish 35% Fragile from 40% Fragile.

## Gameplay Expansion

All of these will require some input from the dev before the details are finalized.

- A difficulty higher than Ultimate.
- Gameplay modifiers which the host of the lobby (for simplicity, we can ignore matchmaking for this and only consider solo or custom lobbies) can choose to enable for the whole lobby. (a) +2 Deployment Limit (b) +2 Funds every round (c) Doubled enemy waves (the enemy list is copied once) (d) Disable time limit for all user action screens (but not the autobattle timer) (e) Enable rebalanced Alliance effects.
- Alliance Modules. Like how Operator Modules give a choice of different gameplay for each Operator, Alliance Modules give a choice of different gameplay for an Alliance. Not all Alliances will have Module selections, so it is an optional field. For matchmaking, all Alliance Modules are locked to Mod A (the original effect). For solo/custom lobbies, the host of the lobby can select the Modules for all Alliances, and this is shared between all players. (it must be this way because the final boss combines 2 players' boards, and if we allowed per-user selections, there may be a conflict in the combined board)
- Custom Operator Modules. In the original game, releasing new Modules are the preferred way to buff old Operators that don't really hold up to modern standards anymore, rather than buffing the Operator directly. These custom Modules would be banned for matchmaking (rather than lockout, it's probably easier on the fly to detect the custom module and instead swap loadout to the first available module, or remove the module if there are no non-custom modules available. this way we fail gracefully) and allowed in solo/custom lobbies.
- "Rebalanced Alliance Effects" - see below section
- For solo/custom lobbies only - ability to directly choose the Alliance bans and map. If you don't choose it, it will be random like usual.

### Alliance Modules

#### Laterano Mod B

[Laterano] Operators gain +min(5 + 1.5 × stacks, 105 + 0.3 × stacks)% ammo on skill activation

<At 100 stacks> [Laterano] Operators deal 200% damage. "On spending X bullets" effects (namely, Mostima, Executor the Ex Foedere, Lemuen) trigger twice.

<With 6 different [Laterano] Operators on field> All [Laterano] Operators +4% ATK whenever any [Laterano] Operator spends 1 ammo, max +200%

### Rebalanced Alliance Effects

I'll bundle others into this category if they don't fit as an Alliance Mod B or an Operator Mod Z.

- Give Virtuosa membership in Swift and Aid in addition to Laterano. (because Virtuosa is currently very weak)
- Give Civilight Eterna, Mlynar, Nearl the Radiant Knight, Vina Victoria, and Lappland the Decadenza membership in a new "Radiant" Alliance focused on buffing True damage. (since currently Arts damage gets the most love, followed by Physical damage and the Elemental damage types, and True damage doesn't have many buff sources)

#### Radiant

*Add-on Alliance · ??? · activates at 2*

Enemies take +(10 + 1 × stacks)% True damage.