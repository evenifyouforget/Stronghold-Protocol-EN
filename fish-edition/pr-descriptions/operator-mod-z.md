**Draft.** Every Mod Z / Mod W of `fish-edition/operator-mod-z`, drafted together to find the ideas that don't fit the
code. Fish: "I want to draft the mod z/w all together first even if we can't test them thoroughly right now, so I can
find out if any of the ideas just don't work due to some code incompatibility reasons".

Branch `feature/operator-mod-z`, **built on the Yuri sync (#141)**, which is built on the changelog PR (#140). Merge
those first, then retarget this PR to `main`.

## Changelog

**Custom Lobby Modifications**

- New cheat **Mod Z / Mod W (draft)**, set **per operator in the lobby rules**: turning on an operator's module makes
  every player's custom pick of that operator use it, whatever module the player chose. One per operator (Typhon: Z
  or W). Players don't equip it themselves. Any module on counts as a cheat ("WITH CHEATS"), like the other cheats.
  The rule's chip lists them ("Mod Z / W (draft): Typhon W, Weedy Z"). Fish: "selecting typhon mod z in lobby rules
  forces all players with typhon to use mod z. I think that is probably an easier experience for real multiplayer
  lobbies".
- **Custom operator list:** the modules are not among a player's choices. An operator that has one shows a "Mod Z
  available" tag; its tooltip says "Enable Mod Z (cheat) for this operator in the room's Custom Lobby Modifications".
- **The rules dialog is split into tabs:** Cheats, Mod Z / W, Alliance (Alliance Modules and rebalanced alliances),
  Less luck, Risk. Each tab shows how many of its rules are on. Fish: "this probably means we need a better way to
  organize the menu as well".
- The Mod Z / W tab: a description, "All Z" / "Clear", and one button per module (operator name and module type; the
  tooltip has the module's name and text). A module that is on lights up mint (the alliance bans' red stays theirs);
  turning on Typhon W turns his Z off.

**The modules** (stats from Fish's texts; same numbers at tier 5 and tier 6)

| Operator | Module | Stats | Effect |
|---|---|---|---|
| Typhon | SIE-Z | HP +300 | ATK % and ASPD bonuses summed and split evenly (+1 % ATK = +1 ASPD), ASPD's share at most +500 (the rest stays on ATK); ASPD +100 from 10 s after deploying (in the sum). Applied last in the stat stack |
| Typhon | SIE-W | HP +300, ATK +150, ASPD +10 | Attacks inflict Cold; on a Frozen target, Shatter within 1 tile: Freeze ends, Stun 4 s, +40 % physical damage taken for 4 s |
| Rosa | SIE-Z | ATK +700 | Marks enemies she damages; at skill end, 17 SP per marked enemy that fell during the skill |
| Eunectes | HES-Z | ATK +150, DEF +150 | 3×3 range; SP +1/s with an enemy in range; skill start lures enemies in range to her until it ends; DEF + her ATK gain (max +5000) |
| Fiammetta | ART-Z | ATK +100, RES +30 | Every skill an ammo skill (18 / 3 / 100); during it ASPD +50, Max HP +100 % |
| Hellagur | SBL-Z | ATK +150; joins Raid | Per attack: HP +50 and 1 % Sanctuary (80 stacks, kept); per deployment 1 Waxing (max 10): healing received +20 %, ASPD +20, 1 % ATK Corrosion per hit |
| Phantom | EXE-Z | ATK +100; joins Raid and Indomitable | Raid always treats his skill as ready |
| Saileach | BEA-Z | HP +200, RES +30 | Block 0, always Invisible; her DP ×2; her player's redeploy timers +50 % faster (+300 % during her skill) |
| Shining | PHY-Z | ATK +100, DEF +100 | Healing grants Immortal for 8 s (HP can't fall below 1); cooldown 0 s, +5 s each time it saves someone |
| Siege | SOL-Z | HP +300, ATK +100 | His DP ×2; DP above 90 is drained, 1 SP to every ally per DP |
| Thorns | LOR-Z | HP +250, ATK +100, ASPD +10 | Range +1; during his skill range +1, +1 target, Invisible; attacks add 10 % ATK Arts and 5 % ATK Nervous Impairment |
| Weedy | PUS-Z | HP +250, ATK +100 | Enemies' weight −2 while she is on the field; her damage becomes Corrosion unless the target is bursting; per +10 % ATK: SP +0.02/s and Water Cannon redeploy −1 % |
| Viviana | AFT-Z | HP +500, ATK +100 | Glimmering Touch (cooldown 12 s, ready at once): an enemy in range of any of her player's Kazimierz operators (Leaders first); 7 s later a 5×5 diamond on its tile takes 300 % ATK Burn and 300 % ATK Arts (600 % ATK × living Kazimierz operators on an enemy already in a Burn burst). Any enemy's Burn burst: RES −2, up to 10 times, kept after she falls |
| Zuo Le | SBL-Z | HP +400, ATK +100 | ATK from buffs ×2; SP from anything but natural recovery ×2; +1 skill charge; damage adds 5 % ATK Corrosion, or on an enemy at 0 DEF 5 % ATK Burn + 10 % ATK Arts |

## How it works

- `shared/modZ.js`: the module records, in the shape of the data's module records. The description is appended to
  the trait text. The icon is a placeholder: the badge shows the type letter.
- `shared/rules.js`: a new rule type `modules`. `modZ` is the list of Mod Z / W ids the room turns on (`options` =
  every id), at most one per operator; unknown ids and a second module of the same operator are dropped, and
  `isRuleValue` refuses them.
- `shared/diy.js`:
  - `modZRulePicks`: at match start (`server/match/player/diy.js setDiy`), every pick of an operator whose module is
    on gets that module. A pick naming a Mod Z / W that isn't on (stale or hand-made) gets the first official module.
  - The form with the Mod Z / W appended is used only when the pick names one (record, check, module lookup). The
    picker reads the data's form, so it never lists them.
  - The granted Alliances are added to the elite record while the module is active.
  - `hasModZ(charId)` for the picker's tag.
- `server/sim/content/modZ.js`: the battle effects, installed after the operator's kit. Weedy's Water Cannon reads her
  redeploy multiplier when it leaves (`kits/ops/op-weedy.js`).
- Engine edits (small):
  - `units.js _recalc` calls a unit's `fishStatPost` last, after every buff (Typhon Z's balance, Zuo Le Z's doubled
    buffs), so it follows buffs and debuffs as they change and Aegir's devour sees the final ATK.
  - `addDp` multiplies DP gains by the operator's `fishDpMul`. Saileach's kit now names her as the source of her
    DP. That only affects the resource numbers, and only for Pioneers / Chargers / Agents, so not her.
  - The Raid jump check reads `fishRaidReady`.
- `public/js/ui/lobbyRules.js`: the tabs (the shared `Tabs` component) and `ModZPicker`. `public/js/screens/diy.js`: the
  tag. All four languages.

## Ideas that don't fit the code (yet)

- **Eunectes S1 is a passive skill**, so "lure while the skill is active" never starts with S1.
- **Choices where the text names no number** (marked `[DRAFT]` in the code):
  - Typhon W's Cold lasts 3 s;
  - Siege drains all DP above 90 every 0.5 s;
  - Fiammetta's ammo skills have no time limit.
- **Phantom's Raid flag hasn't been run in a match with Raid yet.**
- **Choices for Viviana and Zuo Le** (marked `[DRAFT]`):
  - Viviana's explosion needs her alive at detonation and uses her ATK then; the target is the first enemy in range,
    a Leader replacing a non-Leader;
  - Zuo Le's starting SP isn't doubled, everything else but natural recovery is;
  - Viviana's effects are placeholders (the generic zone / AoE fx). The boss's effects aren't in our assets.

## Tests

- `test/modz.test.js`:
  - the rule: one option per module, valid values, one per operator (the first kept), in force when non-empty;
  - every module has effects;
  - the elite forms with a Mod Z / W carry it, and the picker's form never does;
  - the rule equips it: a chosen module and "no module" are both replaced, other operators keep theirs, a stale Mod Z
    pick falls back; the equipped pick is legal and its elite record has the module and Hellagur's Raid;
  - in a match: with the rule, the player's Hellagur fields Mod Z; without it, the module the player chose;
  - every module fights 60 s without a handler error;
  - Saileach Z: block 0, Invisible, allied redeploy +50 %;
  - Typhon Z: the balance numbers (+50 % ATK → +25 / +25, the +500 ASPD cap), and in battle +60 % ATK with the
    +100 ASPD ends at +80 / +80; Zuo Le Z doubles a buff, not a debuff;
  - Zuo Le Z's extra charge; Viviana Z's RES shred stays after she falls.
- `test/ui/rules-modz.e2e.test.js` (browser, `SP_E2E=1`): the five tabs, one tab at a time, the 14 buttons, turning
  on two modules updates the room's rules, the tab count and the chip, Typhon W replaces his Z, turning one off. Passed
  here with Chromium.
- `test/ui/diy-ui.test.js`: Siege's choices have no Mod Z; his card has the "Mod Z available" tag, Sharp's doesn't.
- Smoke runs (not committed):
  - 72 solo battles: no errors;
  - Shining's Immortal saved 8 times in 60 s;
  - Eunectes' lure works on S2 / S3;
  - Viviana Z / Zuo Le Z vs. no module, 60 s, four 60k HP 0 DEF test enemies: Viviana 186k vs 34k (15 Burn bursts),
    Zuo Le 240k vs 114k.
- Lint and typecheck clean; the custom-operator, rules, match and changelog tests pass; i18n strict check passes.
- Full suite: CI.

## Known issues

- Balance: estimates for Weedy and Rosa are in Fish's notes; the others aren't benched yet.
- Viviana Z: her own 300 % ATK Burn fills a normal enemy's gauge (1000) by itself, so every explosion bursts the
  normal enemies it hits. The 600 % path still needs another burst source, since a burst lasts 10 s and the cooldown
  is 12 s.
- Placeholder icons until Fish's SVGs.
- **Kal'tsit Esperanta's Mod Z is left out.** A module is only active on the promoted form, and her design (extra
  slots, "<When obtained>" vs "<When obtained (Elite)>") needed it on both. Fish: "that makes my kaltsit esperanta idea
  not work as intended. we can leave it out then".
- Like every module, the Alliances a Mod Z grants (Hellagur: Raid; Phantom: Raid and Indomitable) count only once the
  operator is promoted.
