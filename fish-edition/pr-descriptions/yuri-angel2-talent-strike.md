> [!NOTE]
> Draft: we'll mark it ready once we've watched the effect in a deployment with the local art.

> [!IMPORTANT]
> Pick one type of change and fill in everything below. Write "None" where there is nothing to say and "N/A" where it does not apply.

## Type of change

- [x] fix: bug fix
- [ ] feature: new feature
- [ ] docs: documentation
- [ ] refactor: refactoring
- [ ] test: tests
- [ ] chore: maintenance

## What changed

> [!NOTE]
> Say clearly what the problem was, why it happened and what the change covers.

- What changed: the airstrike that Exusiai the New Covenant's (新约能天使) talent 火力电台 calls never played its official effect. With official effects on it drew the procedural orange blast, which looks like Lemuen's S3 bombardment. So players read it as Lemuen's S3 "damaging enemies while it locks on". The damage is really the talent's: whenever a friendly Operator's ammo is spent (every Lemuen S3 lock spends 1), it may call a bombardment on an enemy in that Operator's range.
  In the client, that strike is the TalentBomb ability: a `MultiRangedAttack` triggered by the buff template `angel2_t_1[target]` on `ON_BUFF_START`, with the hit effect `angel2_buff_01_trail_01` (a shell dropping from the sky with a smoke trail and a red-white burst). We never played it: the kit's `airstrike` fx fell through to the procedural blast.
  - `render/vfx/talents.js`: `POINT_TRIGGERS` maps that template to the kit's `airstrike`, and the new export `pointKinds()` marks it as a strike at the fx's spot;
  - `render/vfx/talentfx.js`: `_strike` plays TalentBomb's hit on the ground at (x, y); `FxWiring.simFx` (`render/vfx/wiring.js`) passes the fx position to the talent layer;
  - her S3 opening delivery is an `airstrike` too, so the kit marks the talent's strike `talent: true` (`chess_char_6_13-angel2.js`), and only marked ones get the talent bomb. This is a cosmetic fx field: goldens count fx kinds only, so they don't change.
- Expected result: the talent's airstrike plays the official falling shell and burst where it strikes. Her S3 delivery, and the procedural blast without official effects, stay as they were.
- Related issues / PRs: found and fixed in our fork (evenifyouforget/Stronghold-Protocol-EN). The same fix is offered to sganggs. One Operator (Exusiai the New Covenant).

## Sources and assumptions

> [!NOTE]
> For game rules, cite the official data fields, PRTS or your own measurements. Write any detail you could not confirm, and how you handled it, under [ASSUMED], and mark it the same way in the code.

- Sources: the client's TalentBomb ability (`Others/Direction/CommonAbilities/TalentBomb`, trigger template `angel2_t_1[target]`, hit effect `angel2_buff_01_trail_01`); PRTS, her talent 火力电台: "每当有友方干员的弹药被消耗……有概率立即对该干员攻击范围的敌人召唤一次轰炸" (whenever a friendly Operator's ammo is spent, there is a chance to call a bombardment on an enemy in that Operator's range).
- [ASSUMED]: None.

## Verification

> [!NOTE]
> Run the related tests, `npm run ci` and `npm run golden`, and record the results honestly, with the reason for anything not run or skipped. For golden changes, name the scenarios and why they changed; a refactor must not change results, and when an expected result changes on purpose, run `npm run golden:update` and commit it with the change. Attach screenshots for UI changes.

- How it was verified: new unit tests. The effect hasn't been looked at on screen yet in a deployment with the local art; that's why this PR is a draft.
- Related tests: `test/render/vfx-talents.test.js`: the template's trigger and point kinds. A marked `airstrike` plays TalentBomb's hit at the struck spot, not on Exusiai. An unmarked one (her S3) and one with no position fall back to the procedural blast. `node --test test/render/vfx-procedural.test.js test/render/vfx-talents.test.js test/content/kits_layout.test.js`: 33 pass, 0 fail.
- npm run ci: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,837, of which 8,754 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none. This run was on one tree holding both this PR and its Lemuen sibling PR (they touch different code); each PR's own tree passed its related tests and lint.
- npm run golden: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 141 scenarios all match (same combined tree).
- Golden changes: None.
- Screenshots / recordings: None attached (they show official art); I can add some on request.

## Not applicable

- Items that do not apply: the docs checks, the Fidelity checklist.
- Why: an effects fix (the kit only gains a display-only fx field); no rule change and no new Operator kit.

## Checklist

> [!IMPORTANT]
> Last step: look over your answers and tick only what you have done.

- [x] This PR handles one topic only
- [x] I ran the related tests, `npm run ci` and `npm run golden`, and filled in the results honestly
- [ ] For rule changes, I updated the docs and ran the docs checks
- [ ] For an Operator kit, it covers one Operator only and includes the Fidelity checklist with every item ticked
