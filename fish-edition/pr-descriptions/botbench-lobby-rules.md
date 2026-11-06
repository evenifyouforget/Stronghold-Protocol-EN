## botbench --rules: the SPA-CC tags now apply

`tools/botbench.mjs --rules ccLockout=1` ran the match without Lockout. Every `--rules` run on `main` measured the
untagged game.

**Cause.** The Yuri 0.3.1 sync (#39) split the Match options in two:
- `opts.rules`: upstream's room switches;
- `opts.lobbyRules`: the Fish Edition lobby rules, which hold the SPA-CC tags and the cheats.

botbench passed its parsed `--rules` only as `rules`. `--rules` was added in #69, after that split, so it has never
worked on `main`. The tag table in `fish-edition/ai-players/01-findings-2026-10.md` was measured before the sync and is
not affected.

**Fix.** botbench passes the same object as `lobbyRules` too. Upstream's room switches still reach `rules` as before.

**Found by** the #31 tag sweep: all 41 tag versions on 4-bot Ultimate gave exactly the baseline's results, seed for seed.
The sweep is running again with this fix.

**Test.** `test/botbench-rules.test.js`: on a won solo NORMAL seed, Lockout 1 must change the outcome. It fails
before the fix and passes after it (about 26 s).
