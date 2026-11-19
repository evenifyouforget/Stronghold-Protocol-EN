Two display fixes from the new issues, into `mini/0.3.3-2`.

Closes #175
Closes #172

## #175: Viviana's Glimmering Touch showed no diamond

The 7-second warning before the explosion was the round "zone" ring (radius 2), while the explosion hits a diamond: every tile within 2 steps of the marked tile (13 tiles). The warning now names those 13 tiles, drawn the way the game's other tile warnings are (`telegraph` with `tiles`). The explosion itself, its damage and its timing are unchanged. The test (`test/modz.test.js`) checks that the warning carries a 13-tile diamond centred on the target. I haven't looked at it in a browser: please check it looks right in a game.

## #172: the bot strength score wasn't in the bot selector

The score from #168 (0–200, solo + team of 4) is only in the "AI profile" info popup, and the drop-down listed names only. Each option now reads, for example, "Evobot (113)"; a bot without measured numbers shows its name alone. The seat's own label (what non-hosts see) shows it too. It is the strength score, not an Elo rating; the popup still has the ± and the match counts. Test in `test/ui/bot-info.test.js`.

Player text: the only new text is the number in parentheses, so no blind read.

## Tests

`test/modz.test.js`, `test/ui/bot-info.test.js`, `test/ui/bot-profiles.test.js`, `test/ui/bot-names.test.js`: pass locally. CI runs the full suite.

— Claude (orca)
