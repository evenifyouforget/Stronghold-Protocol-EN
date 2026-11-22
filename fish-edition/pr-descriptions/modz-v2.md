Mod Z / W v2: Fish's second drafts (`fish-edition/operator-mod-z/*.md`, "(v2)" sections, with the clarifications Fish added), into `mini/0.3.3-2`. Anything not here is deferred to the next mini.

**Note on the base:** this branch has #184 and #185 merged into it (it edits the same Siege and Viviana code); once they merge, their commits drop out of this diff. It does not depend on #186.

## In

| Module | What it does now |
|---|---|
| Typhon Z | + [Precision]; the first time her skill ends in a battle she is at max SP at once |
| Typhon W | + the first 30 enemies that die in a normal battle (no boss rounds, no unite phase), while she is on the field, are added again on their own route: +100% max HP, -70% ATK, no LP when they leak, not passed on, no bounty; none comes back twice |
| Rosa Z | + [Precision] |
| Eunectes Z | + [Durable]; each enemy that dies in her range: +3 Stacks to each of her active Alliances (20 times per battle) |
| Fiammetta Z | ammo 24 / 4 / 200, ASPD +100 and Max HP +100% during a skill; reloads to max when a [Laterano] Operator on one of the 4 tiles next to her finishes a skill while hers is active; every [Laterano] Operator gets x2 (x3 at 500+ Stacks) of the Laterano ATK effect, its limit too |
| Phantom Z | [Victoria], [Raid], [Resilient]; items that lend an Alliance work without the Damazti Isomorph; each deployment +3 Stacks to each of his active Alliances (10 times per battle) |
| Shining Z | + [Agile]; every Operator starts the battle with Immortal (ready); lethal damage turns it into 8 s of "HP can't go below 1" and grows her grant cooldown by 5 s (a grant does not); heals prioritise allies without it |
| Siege Z | + [Swift] (the 999 DP limit is #184's) |
| Thorns Z | max SP the first time his skill ends in a battle |
| Viviana Z | a Burn burst also lowers DEF by 200 (with RES -2), up to 10 times |
| Weedy Z | + [Aegir] |
| Zuo Le Z | + [Swift]; Burn 5% and Arts 10% of ATK on every hit (no Corrosion, no DEF-0 branch) |
| **Siege W** (new) | [Marvel]; 3 DP above 90 per Marvel Stack, at most 50 a round |
| **Weedy W** (new) | [Swift]; skill SP requirement -30% (added to similar effects); each cast gives every enemy on the field a Slippery stack (5 at most): Weight -1 each and 1000 / 2000 / 4000 / 8000 / 16000 true damage every 0.5 s while it touches a red box (a route's start tile); Water Cannon cooldown set to 1 s |
| **Saileach W** (new) | [Aid]; after each cast, +2 Stacks to every active Alliance (+4 with 3+ different [Aid] Operators on the field) |

Hellagur Z and Saileach Z are unchanged. **Deferred: Kal'tsit Esperanta Z** (needs a damage-reduction stat and per-piece memberships).

## Server

The server rejects a battle result whose stack gains exceed 60 + 4 x round plus what the official traits can add, and leaks of enemies it did not schedule. So: `layerAllow` on the modules that add stacks (Eunectes 60, Phantom 30, Siege W 50, Saileach W no limit) is added to the allowance in `layerAllowanceOf`, and a player with Typhon W gets 30 extra uncounted leaks (`specBounds`). Tests in `test/match/modz-layer-allowance.test.js`.

## Defaults I took (Fish's text didn't say)

- Typhon Z and Thorns: "the first time" = once per battle (Fish).
- Typhon W's revival only while she is on the field.
- Siege W: the 50-stack cap is on what she converts; she stops draining when it is reached.
- Saileach W has no trigger limit (as drafted); her stack allowance is unlimited for that player.
- Weedy W: Slippery goes only on the enemies on the field when the skill is activated; the SP requirement is taken off at the battle's start.

## Not covered by a test

Weedy W's Water Cannon timer (the hook is wired: the cannon's wait is now an object a module can shorten). None of this was run on a full board; the earlier bench numbers (Viviana's DEF shred is worth about +12% on human boss boards; Fiammetta's Laterano effect +44% / +85% on the 13% of boards with 6 Laterano members) are in each operator file.

## Text and the blind read

All four languages for every changed or new description; ja and ko show the Alliances that have no name in their pack by the Chinese name, as the UI does. Fresh readers with base-game context (`fish-edition/PLAYER_TEXT.md`), the whole module list as a text copy:

| | Overall | Least clear |
|---|---|---|
| Read 1 | 60% | Shining 30%, Typhon Z 40%, Saileach Z, Phantom, Hellagur, Weedy Z; Fiammetta's text was still the v1 wording (rewritten after) |
| Read 2 (after rewriting Fiammetta, Shining, Phantom, Eunectes, Typhon W) | 60%; Shining now read correctly | Phantom's Raid line, Hellagur (old text), Typhon Z's split, Siege's DP limit vs its drain, Viviana's diamond; per-Alliance vs total stacks (fixed after: "at most +60 / +30 for each") |

## Tests

`test/modz.test.js` (33), `test/match/modz-layer-allowance.test.js`, the sim, language and UI tests pass locally. CI runs the full suite.

— Claude (orca)
