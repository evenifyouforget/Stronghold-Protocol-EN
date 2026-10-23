# Battle view: invulnerable units wear two spinning gold ribbons

Target: YuriRestia/Stronghold-Protocol-EN-translation `dev-0.2`. Branch `evenifyouforget:yuri/invuln-ribbons`, on
`b0cfec7c`. Display only: no sim, balance or network change.

Until now an invulnerable unit (无敌: a leader's revive invincibility, a boss phase …) only showed a gold status icon among
the icons above it. Now it also wears two gold ribbons spinning around it, after the original game's look.

## What players see

- Two gold rings around the unit's body, as if in 3D: each a short band (0.25 tile) of radius 0.5 tile at 45 % of the
  model's height. The half turned away from the camera is drawn behind the model, the near half in front, additively.
- Each spins once per second, its near side moving left; along a ribbon the gold fades to transparent at 180°, and the
  two are half a turn apart. Their axes are screen-up, tilted 20° to the left / right, then 10° toward the camera.
- A multi-tile boss (a 巨型 enemy, data `hitArea`: 假想敌：胄 and the like) wears them three times as big, so they go
  round it.
- They appear whenever the unit's invulnerable flag (`UF.INVULN`, already in the snapshot) is on, and go when it ends.

Screenshots (attach by hand): `test/e2e/out/invuln-a.png`, `invuln-boss.png` from the browser test below.

## How it works

- `public/js/render/units.js`: `InvulnRibbons` (two `PIXI.Graphics`, one behind and one in front of the model, 48
  quads per ring each frame while invulnerable), `RIBBON` (every number in one place), `UnitView.ribbonK`.

## Tests

- New, opt-in (`RENDER_E2E=1`): `test/render/invuln.browser.test.js` — an invulnerable operator gets both halves, her
  neighbour none; a multi-tile boss gets them three times as big.
- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container).
