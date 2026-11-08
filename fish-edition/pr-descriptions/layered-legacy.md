# Bots: the layered legacy bot (`legacy-layered`), the baseline for the tactics research

Target: `main`. Branch `feature/layered-legacy`.

Fish (`ai-players/02-architecture.md`): "Before making DYYBot and others, we should make a layered tactics version of
the current classical bot to compare as a baseline. We expect that the layered tactics version achieves the same or
better performance, and possibly slightly better performance after auto-tuning."

This is that version. It plays **exactly like legacy** at its default parameters, and its parameters are legacy's own
tunables, so a tuning run can now search them. It is a bench and research profile only: rooms don't offer it.

## What it is

**`server/match/botTacticsLegacy.js`**: legacy as one tactic per decision point, in legacy's order. Each tactic hands
the decision to legacy's own function, and carries as parameters the tunables legacy reads there, with upstream's values
as defaults:

| Tactic | Decision point | Parameters (legacy's constants) |
| --- | --- | --- |
| `legacy-band` | band pick | strength shrink and power, soft reserve, teammate burden |
| `legacy-card` | card pick | — |
| `legacy-bounty` | bounty kill chance | the exposure for a 63 % kill |
| `legacy-offers` | offers | — |
| `legacy-sell` | selling, layer trades | trade thresholds (co-op, solo), the round trades start |
| `legacy-buy` | buying | 21 purchase and lineup weights, bench budgets, the refresh cap |
| `legacy-level` | levelling | the round each shop level is first wanted (`LEVEL_TARGET`), the level cap |
| `legacy-spend` | end-of-prep spending | — |
| `legacy-freeze` | shop freeze | — |
| `legacy-equip` | items | the weight of a wanted item, the tier an elite item waits for |
| `legacy-arrange` | placement | the exposure model (`LAYOUT_PARAMS`), the Final Assault lineups rehearsed |

That is 35 of legacy's constants, all numbers with bounds. A new tactic (DYYBot's, or one an evolution run adds) goes
above the legacy tactic of its decision point.

**How a parameter reaches legacy's code** (`server/match/bot.js`, kept small for syncs):

- The 35 constants are now module-level `let`s instead of `const`s. Their values and every read site are unchanged.
- `LEGACY_TUNABLES`: upstream's values.
- `withLegacyTunables(t, fn)`: runs `fn` with some of them replaced, then puts the previous values back, also when
  it throws.

**Per seat** (`server/match/botTactics.js`):

- A tactic may declare `tunables(params)`: which of legacy's tunables its parameters set.
- A profile with any such tactic runs every hook (band pick, card pick, bounty chance, prep begin and end) with its
  values. For the prep generators, the values are set around each step and restored before the step yields. Bot code
  runs synchronously between yields, so another seat's prep, or anything else in the match, always sees legacy's
  values.
- Profiles without tunables, such as `fish-level` and `fish-tier6`, are built exactly as before.

**Tuning runs:**

- `tools/botbench.mjs --profile file.json` plays a profile given as data: `{ "id", "tactics": [{ "tactic", "params" }] }`,
  top first, legacy implied below.
- `profileFromData` (`server/match/botStrategies.js`) builds it from the tactics registered by id (`TACTICS`), and
  refuses unknown tactics, unknown parameters and out-of-bounds values.

**Browser-safe:** no Node-only modules, no new state outside the seat, and no new RNG draws. Yuri's move of the bots to
the host's browser can take it as it is.

## Tests

`test/match/bot-tactics-legacy.test.js`:

- The defaults equal legacy's values, key by key.
- Whole matches play identically to legacy: solo (2 seeds) and 4 bot seats (fake battles).
- A changed parameter changes play: a level cap of 2 keeps the shop at level 2.
- **Isolation:** a tuned seat sees its value (`hold` 9) in every step. A second seat in the same match always sees 4.
  After the match, the values are legacy's again.
- `withLegacyTunables` restores the previous values after a throw, and refuses unknown keys.
- `profileFromData` validates its input.

With the real simulation, `botbench` gives the same match records for `legacy` and `legacy-layered` on solo FUNNY,
solo ABYSS and co-op 4 HARD, 4 seeds each (12 matches). The only differences are timings and the strategy name. Decision
time shows no measurable cost.

Updated tests: two lists of every strategy id (+ `legacy-layered`), and `profileOf()` now also reports `tunables`
(null for a profile without them).

Lint: 0 errors. Typecheck: OK. Quick tier: 10,199 pass. The only failures are this machine's known environment ones, which happen on `main`
too: the art files on disk, the two HTTP version tests, and IPv6.

## Next (not in this PR)

- **A tuning run** (Node-side, in small saved chunks): vary `legacy-layered`'s parameters with botbench `--profile`,
  on training seeds, and check the best profile on held-back seeds. That gives the "slightly better after
  auto-tuning" baseline.
- **Then DYYBot's tactics** go above it.
