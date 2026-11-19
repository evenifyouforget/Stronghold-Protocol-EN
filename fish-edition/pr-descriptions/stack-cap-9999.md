A new cheat, **Alliance Stack limit 9999**, into `mini/0.3.3-2`.

Closes #174

## What it does

In the lobby's Cheats tab: every Alliance's Stack (layer) limit goes from 999 to 9999 for all Doctors. The 999 is the original game's cap; it now comes from `layerCapOf(rules)` in `shared/constants.js`, and every place that applies it uses that (prep gains, battle gains, the settle after a battle, the client-result check, the helper's stack count, the invariants check, the bond strip's live copy in the client). The rule is a cheat, so the result screen shows "WITH CHEATS". Off by default.

## It also lifts the boss-hit limit (please check this is what you want)

The original game cancels any single hit of 300,000 or more on a Leader, in Final Assault and Hidden Core battles (`BOSS_HIT_LIMIT`, "限伤"). A cancelled hit does no damage at all. Boards at 999 Stacks already kill a Leader in 2–4 game seconds, so with ten times the Stacks most hits would pass 300,000 and be cancelled, and the cheat would make the boss *harder* to hurt. So with this cheat on, the limit is off too. As Halley-Lu said on the issue: it only makes sense if the damage limit goes.

I first told Fish that I found no damage cap in the sim. That was wrong (I searched for the wrong names): the limit exists. If you'd rather keep the limit and only raise the Stack cap, or split them into two cheats, it's one line (`health.js`).

## Text

Two new texts in all four languages: the toggle's name ("Alliance Stack limit 9999") and its description: "Every Alliance's Stack limit goes from 999 to 9999. Normally a single hit of 300000 or more on a Leader is cancelled and does no damage; that limit is removed too, so huge Stack counts can still hurt the boss".

Blind read (fresh agents, base-game context only, the Cheats tab as a text copy):

| | Alliance Stack limit line | Whole tab |
|---|---|---|
| First wording ("... (otherwise a hit from that many Stacks would be cancelled)") | partly clear: "I do not know that limit exists", "cancelled or dealt?" | 55% |
| After the rewording above | read right: cap raised, the cancelled-hit rule goes away so huge Stack counts can hurt the boss; 55% on the line (how Stacks become damage is game knowledge, not wording) | 45% (the low scores are Transmitter+ ~15% and Isomorph ~10%, known from the retro) |

## Tests

`test/match/big-stacks.test.js` (the rule is a cheat and off by default; `layerGainRoom` and `layerCapOf`; a player's layers stop at 999 normally and 9999 with the rule; the boss-hit limit cancels a 500000 hit unless the rule is on), `test/sim/playtest6_limits.test.js` (the battle's live copy clamps at 9999), plus the language, UI, rules and lobby tests: 1,572 + 50 pass locally. CI runs the full suite. I haven't clicked the toggle in a browser.

— Claude (orca)
