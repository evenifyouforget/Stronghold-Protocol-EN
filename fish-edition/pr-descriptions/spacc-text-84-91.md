The rules dialog lists every level of Investor 2, Strategy 2 and Junk 2 in force, and Last Line of Defense's text says what it does.

Base: `mini/0.3.1-3`. Branch `wip/spacc-text-84-91`.

Closes #84
Closes #91

## #84: a level-2 tag shows its level-1 effect too

The game already applies both levels:
- Investor 1's board-only count applies at `ccInvestorBench > 0` (`shared/ruleData.js`);
- Strategy 1's later rounds apply at `ccStrategyLate > 0` (`server/sim/content/bands/meta.js`);
- Junk 1's Toxic Waste applies at `ccJunk > 0` (`server/sim/content/risk.js`).

Only the dialog was wrong. It treated every chain tag as "the chosen level replaces the ones below". That's right for the tags with one number per level (Suffocation, Activation, Elements, Barge, Lockout), but not for these three.

Now:
- `shared/rules.js`: the three rules are marked `stacks: true`;
- `public/js/ui/lobbyRules.js` `levelsInForce`: a `stacks` chain includes every level up to the chosen one. The effects list under the grid shows each level's line, and the level-1 tile lights up as included, like a tag group's.

## #91: Last Line of Defense's wording

The rule (`Match.riskLoss`) was right. The text left out that it's once per round, and how it adds up with the cap. New text (the other languages say the same):

> If your own battle leaks any enemy in a round, you lose 2 more Life Points at settlement: once per round, however many leak, and even if the Unite Phase defeats them all. It is on top of the 10 LP per-round limit, so a round can cost up to 12 LP.

The 2, the 10 and the 12 come from `CC.lastLineLp` and `config.lpCapPerRound`. The issue says the 2 LP comes "instantly", but it's charged at settlement with the rest of the round's loss, so the text says "at settlement".

## Known issues

- Not looked at in a browser.

## Tests

- New: `test/ui/risk-text.test.js`:
  - the three stacking tags list levels 1 and 2; the one-number chains list their level alone; a tag group lists its ancestors as before;
  - Last Line's text names 2, once per round, the cap 10 and the total 12.
- The i18n tests pass (every language has the new text).
- `npm test`: 8,896 of 8,979 pass, 82 skipped. The one failure is `test/ipv6-bind.test.js`, which needs IPv6, unavailable in our container.
- Typecheck is clean, lint has 0 errors.
