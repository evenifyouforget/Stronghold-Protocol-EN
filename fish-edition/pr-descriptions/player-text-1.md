The first pass of the blind-read retro over Fish Edition's own player texts (`fish-edition/PLAYER_TEXT.md`): fixes for what fresh readers misread, without changing what anything does. Mod Z / W descriptions wait on Fish (their questions are about the designs).

Base: `mini/0.3.3-2` · Branch: `fix/player-text-1`

## What changes (English shown; ja / ko / zh-TW follow)

| Text | Before | After |
|---|---|---|
| Risk: Swift | SP recovery chance becomes 20% + 0.25% × stacks (was 0.35% × stacks) | SP recovery chance: each stack adds 0.25% instead of 0.35% (the 20% base is unchanged) |
| Booster Pack (3 texts) | … 6 at a time in a fixed rotating order. The pack stays in your hand | … pick 1 Operator of that Operator's tier for free, from 6 choices (each use shows the next 6). The pack isn't used up, so you can use it again |
| Equipment Booster Pack (3 texts) | same pattern | same fix |
| Transmitter+ | … with teammates who have no use for the original, 2 random teammates each get … | says what the Transmitter does, then: with teammates, as with the original, the swapped-out Operator goes to a teammate who collects its Alliance; when no teammate does, Transmitter+ instead … |
| Damazti Isomorph (Off) | {name} also pairs with more items that sound like they belong to an Alliance | Pick + or ++ to see the list: worn with {name}, more items whose names sound like an Alliance's (e.g. Tianshi's Cauldron → Yan) also make the wearer a member; ++ adds one more item |
| Alliance bans | Pick the Alliances to ban; any slots left open are still drawn at random · {n}/{max} chosen, the rest random | Each match bans some Alliances at random. Choose which ones to ban here; any ban slots you leave open are still filled at random · {n}/{max} bans chosen, the rest random |
| Mod Z tab | When on, this custom Operator uses the module for every player (Fish Edition's own modules …) · {n}/{max} Operators on | Turn a module on and every Doctor's custom pick of that Operator uses it (this server's own modules …) · {n} of {max} Operators have a module on |
| AI: Ioleta opening | Picks the Ioleta Russell Alliance at the start when it can | Picks Ioleta's Strategy at the start when it's offered |
| AI: Evobot | The basic bot tuned by an evolution search … · Tuned … (the weekend run of November 2026); it beat the Basic bot in a 2,000-match paired test | The Basic bot with automatically tuned settings … · Tuned automatically on top of the Basic bot; it beat the Basic bot over 2,000 test matches |
| AI: Level curve | (identical numbers to the Basic bot, unexplained) | new line: on Ultimate its curve levels exactly like the Basic bot, so it plays the same matches and has the same numbers; it only differs in shorter modes |
| AI popup | tactic ids shown as code (`level-curve`), "then the basic AI decides", "operators" | no ids; "then the Basic bot decides"; "Operators" |
| Enemy offers (Patriot, Delegation …; en) | joins this round's battle … If nobody takes him | joins this round's battle as an enemy … If no Doctor picks him |

## Blind read

Same prompt and base-game context each time, a fresh agent each read (`PLAYER_TEXT.md`); text copies rendered from the game's own code.

| Screen | Before | After | Fixed findings | Still open |
|---|---|---|---|---|
| Room rules dialog | 60% | 60% | Booster Packs read as reusable; the bans read as bans; Swift not flagged; Isomorph's Off text read as pointing to a list | Transmitter+ (tweaked again after the read), the α mark, how tag levels stack, Mod Z's unexplained codes, game terms with no tooltip in a text copy |
| AI profiles popup | 65% | 70% | Ioleta read as a Strategy; Level curve's numbers explained; no developer talk flagged | what "solo" / "team of 4" measure, why weak profiles are offered |

**Not in this PR:** the α mark, tag-level stacking and Risk tile layout (UI work, not wording); Mod Z / W descriptions (questions to Fish first); game terms like Blood Ledger (they have in-game tooltips the text copy lacked).

## Tests

i18n, bot-info, risk-text and deck tests: 58 pass. Typecheck and lint clean (no new warnings).

— Claude (orca)
