# Bots: tactics and profiles on the strategy registry

Base: `wip/sync-sganggs-dev-2` (#111, stacked on it; retarget to `mini/0.3.1-4` after #111). Branch `wip/bot-tactics`. PR #110.

The layered bot of fish-edition/ai-players.md ("Standard terms for the new bot", agreed 2026-10-27), built as an
entry of upstream's strategy registry. Nothing changes for anyone who doesn't select a profile: `legacy` stays the
default and is unchanged, and the goldens don't move.

## What it adds

- **`server/match/botTactics.js`**, the contract:
  - `defineTactic({ id, params, at })`: a tactic declares its parameters (int, number, bool or choice, with bounds
    and a default) and a handler for each decision point it takes.
  - `defineProfile({ id, tactics })`: an ordered list of tactics, each with its parameter values; legacy is always
    appended at the bottom. The result is an ordinary registry strategy, so `SP_BOT_STRATEGY`,
    `SP_BOT_STRATEGY_SEATS` (per seat, sganggs #890), `botbench --bot` / `--compare`, `matchrun --bot` and replays
    take it as is.
  - At a decision point the tactics are asked top first. A handler returns `PASS` to pass; anything else is the
    point's result. A handler may also call `ctx.next(...)` (the rest of the chain, legacy last) and act before or
    after it. `ctx.state()` is per-seat state of that entry, kept off the player object.
  - The decision points are the registry's hooks (`pickBand`, `pickCard`, `bountyKillChance`) and the named prep
    actions of upstream's `botPrep.js` (`takeOffers`, `sellJunk`, `buyLoopSteps`, `levelUp`, `spendDown`,
    `maybeFreeze`, `equipItems`, `arrangeSteps`). So each prep asks them in legacy's order, as often as legacy does,
    which also bounds the actions per prep.
  - Each point belongs to one slot of RFC sganggs #816 (draft / economy / placement); `profileOf(id)` shows a
    profile's tactics and its slots. If upstream builds the RFC's slot contract, a profile maps onto it slot by slot.
  - A point no tactic of the profile takes runs legacy's own function: a profile that takes nothing **is** legacy
    (the same hook objects), and one that takes a single point leaves the other hooks legacy's.
- **`server/match/botTacticsBasic.js`**, the first tactics, from the hypothesis tests:
  - `level-curve`: level to legacy's curve of the round, read on the mode's own length (`round × 14 / boss round`,
    H4), `shift` rounds early, up to `maxLevel`, keeping `reserve` funds; then legacy's own level-ups.
  - `buy-tier`: buy the shop's operators of `minTier` and up first (tier 6 by default, the tier-6 finding), then
    legacy's buy loop.
  - Two opt-in profiles: `fish-level` (`level-curve`) and `fish-tier6` (`buy-tier`, `level-curve` up to level 6).
- `bot.js`: `LEGACY_PREP_ACTIONS` exported (the chains' bottom); nothing else.

## Tests

- `test/match/bot-tactics.test.js`: definitions fail early (ids, unknown points, generator kinds, parameter
  declarations and values); a profile that takes nothing is legacy's hooks; chain order, `PASS`, `next()` with the
  same or new arguments, per-seat state; **a profile whose tactic passes at every point plays two whole matches
  exactly like legacy**; the registered profiles and their slot view; `level-curve` levels through the game's intent
  and hands on to legacy.
- `bot-strategies.test.js`: the registry's id list includes the two profiles.
- Local: lint (0 errors), typecheck, the match goldens (21 of 21 unchanged).
- Smoke, solo FUNNY, seeds 1–10: legacy and `fish-tier6` both win 10 of 10 (upstream's bot work since 0.3.3 makes
  FUNNY easy for legacy now); `fish-tier6` is at shop level 5 at round 7 where legacy is at 4.

## Known issues

- The two profiles aren't measured yet. Next: ABYSS (终极), the hard target upstream names, 100 seeds per mode,
  seeds 1–40 to develop and the rest held back (docs/BOT_STRATEGIES.md).
- Our H3 / H4 baselines were on the 0.3.1 bot and need rerunning on this `legacy`.
- `botbench` has no profile-file option yet: a profile has to be registered to be benched. An evolution run will need
  one (`--profile file.json`).
