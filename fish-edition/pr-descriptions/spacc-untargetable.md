Fixes #47 and #48. Fork-only (SPA-CC content).

## #47: Patriot (and the Blade 2 Reid) is still targeted while invulnerable

After his revive, Patriot gets `reborn_invincible` seconds of 无敌 (invincibility). The ccVengeance Invincible Blade 2 Reid gets 15 s. Both used the engine's general `invulnerable` flag, which only blocks damage. Operators still picked them as targets and spent their attacks on them.

Both now opt into the `invincibleUntargetable` switch that Xi already uses (#510). For that window:
- no operator selects them (`untargetable`);
- area and splash hits deal 0 (`invulnerable`);
- statuses from operators don't land, Lure (诱导) included. `applyStatus` already refuses a status from the other side on a unit that is both invulnerable and untargetable;
- a source-less aura still applies. Mostima's 主观缓时 slow is an `addBuff` with no source, so it keeps slowing them, as the issue asks.

The official Reid (no SPA-CC tag) is unchanged. His data's `Reborn.invincible` keeps the official meaning, since the issue names the SPA-CC one.

## #48: the Blood Debt bar has no icon

The bar is redrawn as the Siracusa event's gauge, from Fish's screenshots:
- it's a wide thin bar centred under the top bar, in the gap above the band row. It used to sit inside the phase capsule. The official bar is about 60% of the screen; ours is `min(52vw, 10rem)` so it stays clear of the left and right columns;
- it has a dark translucent track with a hairline border, and no numbers;
- while it fills, the fill is cream, growing left to right;
- during an Asset Liquidation the fill is red and drains back;
- the Liquidation's claw mark sits on the centre all the time, greyed out until a Liquidation starts and red while one lasts. It pulses once when one starts. That's Fish's idea: the mark makes it clear that the bar is Blood Debt;
- the tooltip is unchanged, and screen readers get the count (`role="meter"`).

The claw is an inline look-alike. I couldn't find the official sprite:
- it's not in our asset list;
- it's not in the CDN's act42side bundles in the hot-update list;
- it's not in the ArknightsAssets2 mirror's `ui`, `activity` or `arts/ui/[uc]battlecommon` trees.

Once someone finds its bundle in a real client, it can be added to `tools/local-extract` and swapped in.

I checked it on screen in `public/dev/game-mock.html` (combat phase) at 1920×1080, 1400×800 and 1000×560.

## Tests
- New `test/content/spacc-untargetable.test.js`:
  - Patriot and the Blade 2 Reid: during the window no operator can target them, a splash hit does 0, Lure is refused and a source-less slow lands;
  - Patriot is targetable again after the window;
  - the plain Reid is unchanged.
  - The tests fail without the kit change.
- `test/ui/ledger-hud.test.js`:
  - the bar has no visible numbers, and the claw mark shows both while filling and while liquidating;
  - the top bar renders it during battle phases, and the capsule no longer does;
  - the mark pulses once.
- `test/ui/text-scale.test.js`: dropped the guard on the bar's text size, since the bar has no text now.
- `npm run test`: 8928 pass. The 2 failures are the same environmental ones as on `main` (local art on disk, IPv6). No golden scenario moved. Lint and typecheck are clean.
