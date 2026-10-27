A match re-viewed from the match history shows its SPA-CC +N, its WITH CHEATS mark and its list of room changes, like the end screen right after the match.

Base: `mini/0.3.1-3`. Branch `wip/history-rules`.

Closes #78

The end screen (`ResultView`) reads the match's rules from `m.public`. The match history re-views a stored record with `pub=null`, and the records never kept the rules, so the tagline's +N, WITH CHEATS and "本局房间改动" were always empty there.

Now:
- `recordResult` gets the match's `m.public.rules` (`main.js`);
- a record keeps the rules in force, valid values only (`rulesOf` in `public/js/ui/stats.js`). The key is absent when none was, so a record without rules is the same as before, id included;
- compacted records keep them too (`COMPACT_FRAME`). They can't be re-viewed, but the rules aren't lost;
- the history's re-view passes them to `ResultView` (`screens/stats.js` `Replay`).

## Known issues

- Matches recorded before this have no rules saved, so their re-view stays without them.
- Quit records (放弃模拟) don't keep the rules; they have no end screen.
- Not looked at in a browser.

## Tests

- New: `test/ui/stats.test.js` "(fork) the rules in force are kept, and the history re-view shows the +N, the tags and WITH CHEATS (#78)". It fails without the fix.
- `npm test`: 8,893 of 8,976 pass, 82 skipped. The one failure is `test/ipv6-bind.test.js`, which needs IPv6, unavailable in our container.
- Typecheck is clean, lint has 0 errors.
