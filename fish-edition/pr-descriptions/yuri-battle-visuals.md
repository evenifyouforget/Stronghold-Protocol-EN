# Battle view: status timers and values, liftoff altitude, Barrier HP

Target: YuriRestia/Stronghold-Protocol-EN-translation `dev-0.2`. Branch `evenifyouforget:yuri/battle-visuals`, on
`a95644f1` (2026-10-15). Display only: no sim state, balance or network message changes; replays are unchanged.

Two commits; the second builds on the first's snapshot table, so they come together.

## What players get

- **Status icons show the time left and the strength.** A ring around each icon for the share of its time left
  (none for statuses that never run out), and a number under it for statuses with a strength: Fragile (and Arts /
  Physical / Elemental Fragile), slow, weaken, DEF down and resistance as a percent; ASPD down and RES down as points.
  Same-name statuses follow the official rule (同名效果取最高): only the strongest runs, and the icon shows that one; a
  weaker one that outlasts it takes over when it ends.
- **Operators in liftoff (起飞, e.g. Tippi's skill) are drawn at a flying enemy's height**, and come back down when it
  ends.
- **Barrier HP** is drawn as in the original game: a reverse bar over the HP bar, starting at the right end of the
  current HP and filling leftward, covering barrier / (max HP + barrier) of it (a Barrier of 400 % max HP covers 80 %).
  Before, a shielded unit only showed a thin full-width line, which stays for an unknown amount.

Screenshots (attach by hand): `test/e2e/out/status-details.png` and `test/e2e/out/battle-visuals.png` from the browser
tests below.

## How it works

The browser runs battles itself with the shared sim, so these are snapshot side tables the view reads; no sim state
reads them.

- `server/sim/snapshot.js` (`statusView`, `shieldView`, `unitFlags` + `UF.LIFTOFF` in `shared/constants.js`),
  `server/sim/battle/events.js` (snapshot tables `st` and `sh`).
- `public/js/render/interp.js` (carries them per unit), `public/js/render/units.js` (ring, number, barrier overlay
  `barrierShare`, liftoff hover), `public/js/render/style.js statusValueLabel`.
- `tools/golden.mjs`: the replay digests mask `UF.LIFTOFF` (a display flag, like the side tables).
- Docs: `docs/SIM.md`, `docs/design/network.md`, `docs/design/client.md`.

## Tests

- New: `test/render/status-details.test.js`, `test/render/battle-visuals.test.js`; opt-in browser tests
  (`RENDER_E2E=1`): `test/render/status-details.browser.test.js`, `test/render/battle-visuals.browser.test.js`.
- `npm run ci` on this branch: our tests pass. Two checks fail the same way on `dev-0.2` without these commits: lint's
  `no-irregular-whitespace` in `tools/assets/texture-fixes.mjs:26` (from `d42fec9f`), and `test/ipv6-bind.test.js`
  (needs IPv6, unavailable in our container).
