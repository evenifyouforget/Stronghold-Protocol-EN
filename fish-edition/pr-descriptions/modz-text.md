Mod Z / W: the English module texts reworded from Fish's own descriptions (`fish-edition/operator-mod-z/<op>.md`) and Fish's answers to a blind read's questions, plus one behaviour fix those answers turned up.

Base: `mini/0.3.3-2` · Branch: `fix/modz-text`

## The fix

**Shining Z heals allies at full HP too, to grant Immortal.** Fish's text: "Can heal allies that are already at max HP (just to apply Immortality)". The draft only healed injured allies, so a full-HP ally never got Immortal. Now a full-HP ally counts as a heal target while her grant is ready and the ally has no Immortal; injured allies still come first (`battle/queries.js`, `content/modZ.js`). New test in `test/modz.test.js`, which fails without the fix.

## The texts (English)

Each module now says what the reader had to guess, taken from Fish's description or answer:

- **Typhon Z:** bonuses from buffs only, added up and split evenly; the +100 ASPD after 10 s lasts the battle and is split too.
- **Typhon W:** Cold lasts 3 s; shatter replaces the Cold and hits neighbours Frozen or not; the +40 % stacks with Fragile.
- **Rosa:** marks last the whole battle; any killer counts; no limit.
- **Eunectes:** "Lures" (the keyword); DEF from ATK she gains from buffs.
- **Fiammetta:** ammo skills still start with SP; 1 attack = 1 ammo; her HP keeps its percentage.
- **Hellagur:** this battle only; Waxing's numbers are per stack.
- **Phantom:** Fish's wording ("[Raid] can always redeploy him as if his skill were ready") plus what that lets him do.
- **Saileach:** +50 % / +300 % ticking speed, with Fish's example.
- **Shining:** heals full-HP allies to grant it; the cooldown resets each battle and grows only when an Immortal saves someone.
- **Siege:** every 0.5 s; to your Operators on the field.
- **Thorns:** same damage per tick.
- **Weedy:** any elemental burst; ATK from buffs.
- **Viviana:** Leader enemies first; 600 % replaces the Arts part; Viviana counts; RES −2 up to 10 times per enemy.
- **Zuo Le:** a skill without charges gets 2; which SP is doubled.

Only the English changed. ja / ko / zh-TW keep their current texts, which follow the Chinese source and say the same thing with less detail.

## Blind read

A fresh agent each time, with base-game context only (`fish-edition/PLAYER_TEXT.md`):

| | Confidence | Least clear |
|---|---|---|
| Before | 60 % | Phantom, Hellagur, Typhon Z, Viviana, Shining |
| After | 65 % | Phantom (~20 %), Weedy, Typhon Z, Fiammetta, Siege |

Typhon Z, Zuo Le and Phantom were reworded once more after the second read. The remaining questions are mostly fine detail (tile shapes, whether bonuses add or multiply) and how the Alliances themselves work (Raid), which their in-game tooltips cover.

**Hellagur's Tenacity (Fish, 2026-11-19: the same Tenacity as his talent).** Waxing's ASPD was plain ASPD; now it is Tenacity (坚忍) like his talent: nothing at full HP, all of it at 70 % HP lost, linear in between. The game's glossary says Tenacity bonuses to the same stat don't add up ("同类属性取最高": the highest counts), so Waxing and his talent's +100 don't stack: up to 5 Waxing stacks add nothing over his talent, and 10 stacks give +200 in all. New test.

## Tests

`test/modz.test.js` and the i18n tests: 68 pass.

— Claude (orca)
