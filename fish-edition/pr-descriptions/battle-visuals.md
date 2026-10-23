# Battle view: liftoff altitude and Barrier HP

Target: `main`. Branch `wip/battle-visuals`. Display only (no sim or balance change), so also fit for Yuri.

- **Liftoff (起飞)**: an Operator in liftoff (e.g. Tippi's skill) is drawn at a flying enemy's height, and comes
  back down when it ends. The snapshot's unit flags carry a new `UF.LIFTOFF` bit.
- **Barrier HP**: drawn as in the original game, as a reverse bar over the HP bar. It starts at the right end of the
  current HP and fills leftward, covering barrier / (HP max + barrier) of the current HP bar (a Barrier of 400% Max
  HP covers 80%). Before, a shielded unit only got a thin full-width line, which is still shown when the amount is
  unknown. The snapshot gets an `sh` side table (unit id → Barrier amount).

## How it works

- `server/sim/snapshot.js` (`unitFlags`, `shieldView`), `server/sim/battle/events.js` (`sh`),
  `public/js/render/interp.js`, `public/js/render/units.js` (`barrierShare`, hover).
- Golden replay digests mask `UF.LIFTOFF` (a display flag, like the side tables), so the replays are unchanged.
- Docs: `docs/design/network.md`, `docs/SIM.md`.

## Tests

- New: `test/render/battle-visuals.test.js` (liftoff flag and hover, barrier share);
  `test/render/battle-visuals.browser.test.js` (opt-in `RENDER_E2E=1`, screenshot in headless Chromium).
- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container).
