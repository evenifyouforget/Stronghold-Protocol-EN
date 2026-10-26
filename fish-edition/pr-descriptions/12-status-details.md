# Status icons show the time left and the strength

Target: `main` (PR #12). Built on #13 (sync with Yuri 0.2.5): merge #13 first, then this shows only its own changes.
Display only, so it can also go to Yuri as-is.

ROADMAP Menu/UI: status icons above units didn't show how long they last, or how strong they are (35 % vs 40 % Fragile).

## What players get

- A ring around each status icon: the share of its time left. Statuses that never run out have no ring.
- A number under the icon for statuses with a strength: Fragile (and Arts / Physical / Elemental Fragile), slow,
  weaken, DEF down and resistance as a percent; ASPD down and RES down as points.

Screenshot (attach by hand, `test/e2e/out/status-details.png` from the browser test): four enemies under Fragile 40 %, slow
50 %, weaken 25 % and bind.

## How multiple Fragile (and the like) interact

These statuses follow the official rule "only the strongest effect of this type applies" (同名效果取最高). They never add
up: only the strongest runs, and a weaker one waits; if it outlasts the stronger one, it takes over when that ends.

- Fragile 30 % for 12 s, then Fragile 40 % for 6 s: the icon shows 40 % with a 6 s ring, then 30 % with the rest of its
  own time.
- Different-name effects do multiply (Fragile × Arts Fragile), and each has its own row; some share an icon (ASPD down
  draws the slow icon, DEF / RES down the weaken icon). An icon shows its own status's number first, never a mix of
  units.
- Palsy has no icon of its own, so it shows nothing yet.

## How it works

The browser runs battles itself with the shared sim, so nothing new goes over the network.

- `server/sim/snapshot.js statusView` + `battle/events.js`: snapshot table `st: [[id, status, endsAt, duration, value]]`,
  display only (no sim state reads it).
- `public/js/render/interp.js`: carries `st` per unit; `render/units.js`: ring (the redeploy ring's textures) and number
  (the shared label textures); `render/style.js statusValueLabel`: the number's format.
- Docs: `docs/SIM.md`, `docs/design/network.md`, `docs/design/client.md`.

## Tests

- `test/render/status-details.test.js` (new): the strongest-wins sequence above, timed and valued rows, parsing,
  formats, the ring and number on a view, shared icons.
- `test/render/status-details.browser.test.js` (new, opt-in `RENDER_E2E=1`): real field view in headless Chrome with
  real models.
- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container).
