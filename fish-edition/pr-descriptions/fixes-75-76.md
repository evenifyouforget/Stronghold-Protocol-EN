Laterano Mod B's alliance text gets its live ammo % and its paragraphs, and the Unite Phase's "costs up to N LP" weighs a leaked Patriot like the settlement does.

Base: `mini/0.3.1-3`. Branch `wip/fixes-75-76`.

Closes #75
Closes #76

## #75: Laterano Mod B's alliance text

Both parts of the report hold on current main. With Mod B on, `shared/ruleData.js` replaced the alliance's text with
the rules dialog's one-paragraph plain text, and dropped the "current effect" line (its live number was Mod A's).

Now Mod B's alliance text is Mod A's own lines, already in the player's language and with their styling, around a new
middle line:

- Mod A's ammo line (the description), and its "current effect" line with the live %;
- **new:** `<At 100 stacks>` 200 % damage, and the bullet-spending Attributes trigger twice;
- Mod A's 6-member line (Mod B keeps it).

The live % is Mod B's `min(5 + 1 × stacks, 75 + 0.3 × stacks)`:
- `formatBondEffect` (`public/js/ui/richText.js`) learns an optional `min: { base, perStack }` on an `effectDescParams`
  entry;
- Mod B's record carries its four numbers as `fish_b_ammo*` blackboard keys.

The numbers now live in `shared/ruleData.js` (`LATERANO_B_AMMO`), which the battle code (`bonds/core.js LATERANO_B`)
reads too, so the text and the sim can't drift.

The rules dialog keeps its one-paragraph text, with the formula and Mod A's for comparison. The new middle line is
translated into en / ja / ko / zh-TW from the existing Mod B text.

## #76: a leaked Patriot in the Unite Phase

The settlement already charges a Patriot who gets through the Unite Phase 5 LP. That has been so since #20
(2026-10-15), and `test/match/risk-tags.test.js` pins it, so a server older than that would show 1 LP.

What was still wrong on main: the Unite Phase's HUD line ("Unite in progress: settlement costs up to N LP") and the
teammates' live LP counted every enemy still standing as 1 LP, and left out Last Line's +2. Now
`_pendingLpView` bills what `settle()` will:
- `_uniteLeft(ps, weigh)` weighs each enemy (`Match.riskLeakWeight`);
- then the per-round cap;
- then `riskLoss` (Last Line).

While the field runs, which of a leaker's enemies still stand isn't known, so the standing ones count as its heaviest
sent ones. That makes it an upper bound, which is what "up to" says. Once the field has its result, it's exact. The
enemy count itself (`uniteLeft`) is unchanged.

## Known issues

- Victoria Mod C's alliance text has the same plain one-paragraph formatting (not reported, not changed here).
- Not looked at in a browser.

## Tests

- New: `risk-tags.test.js` "while the Unite Phase runs, a leaker's pending LP weighs a Patriot like the settlement".
  Patriot plus one other enemy: 6 LP while both stand, 8 with Last Line, 2 without the tag; once the result is in,
  the Patriot alone costs 5. It fails without the fix.
- Changed: `rebalance.test.js`'s Alliance Modules test asserted the old behavior (no current-effect line). It now
  checks:
  - three paragraphs;
  - the 100-stack line in the middle;
  - the live % at 0 / 50 / 300 stacks (5 / 55 / 165 %), in Chinese in the match and in English in the client;
  - and Mod A's 455 % at 300 stacks once the rule is off.
- `npm test`: 8,893 of 8,976 pass, 82 skipped. The one failure is `test/ipv6-bind.test.js`, which needs IPv6,
  unavailable in our container.
- Typecheck is clean, lint has 0 errors, and the import check passes.
