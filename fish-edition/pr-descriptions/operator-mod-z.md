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
| Typhon | SIE-Z | HP +300 | ATK +1 % counts as ASPD +1; ASPD +100 from 10 s after deploying |
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
| Weedy | PUS-Z | HP +250, ATK +100 | Enemies' weight −2 while she is on the field; her damage becomes Corrosion unless the target is bursting; SP +0.02/s per +10 % ATK |

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
- `server/sim/content/modZ.js`: the battle effects, installed after the operator's kit.
- Engine edits (small):
  - `addDp` multiplies DP gains by the operator's `fishDpMul`. Saileach's kit now names her as the source of her
    DP. That only affects the resource numbers, and only for Pioneers / Chargers / Agents, so not her.
  - The Raid jump check reads `fishRaidReady`.
- `public/js/ui/lobbyRules.js`: the tabs (the shared `Tabs` component) and `ModZPicker`. `public/js/screens/diy.js`: the
  tag. All four languages.

## Ideas that don't fit the code (yet)

- **Eunectes S1 is a passive skill**, so "lure while the skill is active" never starts with S1.
- **Weedy's cannon redeploy −1 % per step isn't wired:** I found no redeploy timer for her cannon to shorten.
- **Choices where the text names no number** (marked `[DRAFT]` in the code):
  - Typhon W's Cold lasts 3 s;
  - Siege drains all DP above 90 every 0.5 s;
  - Fiammetta's ammo skills have no time limit.
- **Phantom's Raid flag hasn't been run in a match with Raid yet.**

## Tests

- `test/modz.test.js`:
  - the rule: one option per module, valid values, one per operator (the first kept), in force when non-empty;
  - every module has effects;
  - the elite forms with a Mod Z / W carry it, and the picker's form never does;
  - the rule equips it: a chosen module and "no module" are both replaced, other operators keep theirs, a stale Mod Z
    pick falls back; the equipped pick is legal and its elite record has the module and Hellagur's Raid;
  - in a match: with the rule, the player's Hellagur fields Mod Z; without it, the module the player chose;
  - every module fights 60 s without a handler error;
  - Saileach Z: block 0, Invisible, allied redeploy +50 %.
- `test/ui/rules-modz.e2e.test.js` (browser, `SP_E2E=1`): the five tabs, one tab at a time, the 12 buttons, turning
  on two modules updates the room's rules, the tab count and the chip, Typhon W replaces his Z, turning one off. Passed
  here with Chromium.
- `test/ui/diy-ui.test.js`: Siege's choices have no Mod Z; his card has the "Mod Z available" tag, Sharp's doesn't.
- Smoke runs (not committed):
  - 72 solo battles: no errors;
  - Shining's Immortal saved 8 times in 60 s;
  - Eunectes' lure works on S2 / S3.
- Lint and typecheck clean; the custom-operator, rules, match and changelog tests pass; i18n strict check passes.
- Full suite: CI.

## Known issues

- Balance: Rosa Z (S3) and Weedy Z look very strong in the smoke runs. Estimates come next.
- Placeholder icons until Fish's SVGs.
