# Battle view: a talent's liftoff hovers low, a skill's flies

Target: `main`. Branch `wip/liftoff-hover`. Display only (no sim or balance change), so also fit for Yuri. It
follows up our battle-visuals PR (#18), which draws every Operator in liftoff (起飞) at a flying enemy's height.

Kal'tsit - Esperanta looked far too high (Yuri's report). Official footage shows two heights, measured from the feet
to the shadow in tile rows on screen:

| Operator | Liftoff from | Official | Before | After |
|---|---|---|---|---|
| Kal'tsit - Esperanta | talent, all battle | ~0.25 | 0.86 | 0.32 |
| Leizi the Thunderbringer | talent, while no skill runs | ~0.25 | 0.72 | 0.17 |
| Tippi | skill | ~0.75 | 0.73–0.83 | unchanged |
| Angelina the Mellow Wish | skill | — | 0.68 | unchanged |

So a liftoff that only a **talent** grants is a standing hover, and a **skill's** liftoff is a real flight. The
official numbers were measured by eye from videos and screenshots, not read from the client.

- The snapshot gets a new flag bit, `UF.LIFTOFF_LOW`, set when every buff granting the liftoff is a talent buff.
- The view draws that at `LIFTOFF_HOVER` = 0.3 world units, and every other liftoff at `FLY_HOVER` (1.3) as before.
- No per-Operator table: the rule covers every liftoff Operator we have, and any new one.

## How it works

- `shared/constants.js` (`UF.LIFTOFF_LOW`), `server/sim/snapshot.js` (`unitFlags`),
  `public/js/render/units.js` (`LIFTOFF_HOVER`, the hover target).
- `tools/golden.mjs`: the replay digests mask the new bit like `UF.LIFTOFF` (a display flag), so the replays are
  unchanged.

## Tests

- `test/render/battle-visuals.test.js`: Tippi's skill liftoff doesn't set `UF.LIFTOFF_LOW`. A new case covers
  Leizi the Thunderbringer with no skill running: the snapshot sets both bits and the view settles at
  `LIFTOFF_HOVER`.
- `node tools/golden.mjs`: all 140 scenarios match. Lint and typecheck are clean.
