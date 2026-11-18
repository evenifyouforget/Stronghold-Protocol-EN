Closes #169. Base: `main` (a hotfix ahead of 0.3.3-2, at Fish's request; `mini/0.3.3-2` gets it with its next merge from `main`).

**The bug:** the shared deck popup (#132, released in 0.3.3-1) has no close button. It closes only with Esc or a click
outside. Both fail for some players:
- In browser fullscreen, Esc leaves fullscreen instead of reaching the page.
- The popup is tall, so on a small window there is little or nothing outside it to click.

**The fix:** in `Modal` (`public/js/ui/components.js`), a dialog that can close and has no footer buttons now draws an
× in its top-right corner (`closeButton`, default on for exactly those; a dialog can opt out). This fixes the deck
popup and the other dialogs built the same way, e.g. the AI profiles popup. Dialogs with footer buttons (they already
have a Close / Cancel) are unchanged. Esc and a click outside still work as before.

## Tests

- All 31 non-browser test files that touch dialogs: 1,156 pass. Typecheck: clean. Lint: no new warnings.
- `test/ui/deck.e2e.test.js` now also reopens the popup and closes it with the ×. Browser tests don't run in CI, so this
  one needs a machine with Chrome: `SP_E2E=1 node --test test/ui/deck.e2e.test.js`.
- I couldn't look at it in a browser here. Worth one look at the deck popup before merging.

— Claude (orca)
