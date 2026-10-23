# Custom Lobby Modifications: rule categories, map and bans, Alliance Modules, rebalanced alliances

Target: `main`. Branch `wip/custom-lobby`. Only for custom rooms (solo and friends' co-op); public matchmaking plays the
original game.

## What the host gets

The room's rules strip now lists the rules in force and how the result will be labelled; **Edit** (others: **View**)
opens a dialog grouped by the ROADMAP's SPA-CC categories:

| Category | Rules | Result screen |
|---|---|---|
| Cheats | +2 Deployment Limit, +2 Funds every round, no time limit on action screens (co-op) | "WITH CHEATS" banner |
| Alliance Modules (neutral) | Laterano Mod A / **B**, Victoria Mod A / **C** | — |
| Rebalanced Alliances (neutral) | Virtuosa also in Swift and Aid; Blaze replaces Catherine | — |
| Less luck (seeded) | Choose the map; choose bans up to the difficulty's core / add-on counts (the rest stay random) | "seeded" after the difficulty |

The result screen lists every rule in force ("Lobby modifications this match"), so a recording shows how the result
was made. A room with any rule set can't search for teammates, and a searching room can't set rules.

## The rules

- **Laterano Mod B**: ammo +min(5 + 1 × stacks, 75 + 0.3 × stacks)% (Mod A: 5 + 1.5 × stacks). At 100 stacks, Laterano
  Operators deal 200% damage. Attributes that trigger on spending bullets (Mostima, Executor the Ex Foedere, Lemuen)
  trigger twice; both triggers count toward the Attribute's per-battle limit. The Attribute's owner decides, so
  Mostima's also doubles on a non-Laterano neighbour's bullets. The 6-member part is Mod A's and does not trigger
  twice.
- **Victoria Mod C** (replaces Mod A, including the hammer every 25 stacks):
  - When a Victoria Operator's skill ends, it recovers 8 SP per Victorian Hammer it carries (like Swift).
  - While Victoria is active, shop hammers are the upgraded ones and cost 0.
  - When the Rest Phase ends, each Victoria Operator carrying a hammer adds its Tier in Victoria stacks.
  - 6 members: those Operators also add 2 × Tier to each of their other active alliances; at combat start Victoria
    Operators get ATK +(200 + 1.2 × stacks)%, a Barrier of 200% Max HP and Status Resistance.
- **Virtuosa**: Laterano + Swift + Aid.
- **Blaze** takes Catherine's shop slot: tier 4, price 3, Catherine's training levels, and the skill and module the
  player chose for Catherine (default S2, Chainsaw Extension; the X module on the elite), Yan + Victoria, and "<When sold> Gain 1 Blaze the Igniting Spark" (an elite one
  from an elite; from the shared pool, so none when its copies are gone). She fights with her own full kit.
- **Map and bans**: a chosen map replaces the random one after the draw (so that seed's factions and bosses are
  unchanged); chosen bans are kept, the rest drawn as usual; the setup reroll vote keeps both.

## How it works

- `shared/rules.js`: one registry (type, category, default) used by the server, the sim and the client; labels
  (`ruleLabels`) and validation for `room.setRules`.
- Battles get the rules in BattleSpec `flags.rules`, so the browser runs the same rules as the server.
- `shared/ruleData.js`: the record changes of the rebalanced alliances, made at run time (data files stay generated) and
  applied identically by the match (`Match`), the sim (`simdata.withRuleData`) and the client (`data.setRules`).
- Docs: `docs/design/network.md`, `docs/design/match.md`.

## Tests

- New: `test/sim/laterano-mod-b.test.js`, `test/sim/victoria-mod-c.test.js`, `test/match/rebalance.test.js`; extended:
  `test/lobby-rules.test.js`, `test/match/rules.test.js` (seeded setup, reroll, labels, validation).
- Golden replays unchanged (rules off = the same draws and battles).
- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container).
- Checked by hand in headless Chromium: the dialog, the strip, choosing a module, Blaze, a map and a ban.
