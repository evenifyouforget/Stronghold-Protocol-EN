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

- What changed: Kal'tsit - Esperanta was drawn far too high (#15). Every Operator in liftoff (起飞) was drawn at a flying enemy's height, but official footage shows two heights. I measured them from the feet to the shadow, in tile rows on screen:

  | Operator | Liftoff from | Official | Before | After |
  |---|---|---|---|---|
  | Kal'tsit - Esperanta | talent, all battle | ~0.25 | 0.86 | 0.32 |
  | Leizi the Thunderbringer | talent, while no skill runs | ~0.25 | 0.72 | 0.17 |
  | Tippi | skill | ~0.75 | 0.73–0.83 | unchanged |
  | Angelina the Mellow Wish | skill | — | 0.68 | unchanged |

  So a liftoff that only a **talent** grants is a standing hover, and a **skill's** liftoff is a real flight.
  - The snapshot gets a new flag bit, `UF.LIFTOFF_LOW` (`shared/constants.js`, `server/sim/snapshot.js` `unitFlags`), set when every buff granting the liftoff is a talent buff.
  - The view (`public/js/render/units.js`) draws that at `LIFTOFF_HOVER` = 0.3 world units, and every other liftoff at `FLY_HOVER` (1.3) as before.
  - No per-Operator table: the rule covers every liftoff Operator we have, and any new one.
  - `tools/golden.mjs`: the replay digests mask the new bit like `UF.LIFTOFF` (a display flag), so the replays don't change.
- Expected result: Kal'tsit - Esperanta and Leizi the Thunderbringer (outside her skill) hover just above the ground; Tippi and Angelina the Mellow Wish fly as before.
- Related issues / PRs: Closes #15. It follows up #10, which draws liftoff Operators at a flying enemy's height.

## Sources and assumptions

> [!NOTE]
> For game rules, cite the official data fields, PRTS or your own measurements. Write any detail you could not confirm, and how you handled it, under [ASSUMED], and mark it the same way in the code.

- Sources: official gameplay footage and screenshots (the table above).
- [ASSUMED]: the official heights were measured by eye from videos and screenshots, not read from the client, so `LIFTOFF_HOVER` = 0.3 is a close match, not an exact one.

## Verification

> [!NOTE]
> Run the related tests, `npm run ci` and `npm run golden`, and record the results honestly, with the reason for anything not run or skipped. For golden changes, name the scenarios and why they changed; a refactor must not change results, and when an expected result changes on purpose, run `npm run golden:update` and commit it with the change. Attach screenshots for UI changes.

- How it was verified: new and updated unit tests.
- Related tests: `test/render/battle-visuals.test.js`: Tippi's skill liftoff doesn't set `UF.LIFTOFF_LOW`. A new case covers Leizi the Thunderbringer with no skill running: the snapshot sets both bits and the view settles at `LIFTOFF_HOVER`. `node --test test/render/battle-visuals.test.js`: 3 pass, 0 fail.
- npm run ci: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,835, of which 8,752 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none.
- npm run golden: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 141 scenarios all match.
- Golden changes: None (the new display bit is masked like `UF.LIFTOFF`).
- Screenshots / recordings: None attached; I can add some on request.

## Not applicable

- Items that do not apply: the docs checks, the Fidelity checklist.
- Why: a display fix; no rule change and no Operator kit.

## Checklist

> [!IMPORTANT]
> Last step: look over your answers and tick only what you have done.

- [x] This PR handles one topic only
- [x] I ran the related tests, `npm run ci` and `npm run golden`, and filled in the results honestly
- [ ] For rule changes, I updated the docs and ran the docs checks
- [ ] For an Operator kit, it covers one Operator only and includes the Fidelity checklist with every item ticked
