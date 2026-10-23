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

- What changed: with official effects on, Lemuen's S3 lock crosshair (`lemuen_skill_03_crosshair_range` / `_02`) disappeared about 1 s after each lock, long before its shell landed, and wasn't kept where a defeated target had stood. The binding used `hold: 'fx'`, which reads the skill fx's `hold` field as a duration in seconds. But the kit sends `hold: 1` as a **flag** ("keep this reticle while her skill waits"), so every crosshair was stopped after 1 s. The sim was already right: the shell falls where the enemy was last seen (`markOf` in the kit). Only the drawing was wrong.
  The new binding mode `hold: 'lock'` (`render/vfx/skillfx.js`: `_lockOn` / `_lockShell` / `_syncLocks`) follows the same rules as the procedural reticle in `render/fx/locks.js`:
  - it stays on the locked enemy while that enemy is alive, and at its last spot once it is gone;
  - it stays up as long as her skill runs, including the waits with nothing in range;
  - a `bombardShell` claims the nearest free lock, and that shell's `bombard` ends it;
  - with no shell, it goes `LOCK_T` (5 s, as in locks.js) after her last lock, shell or bombard;
  - if she is knocked out, the locks no shell has claimed go at once; a shell already in the air keeps its lock.
- Expected result: each crosshair shows from its lock until its own shell lands, and stays where a defeated enemy stood, which is where the shell falls.
- Related issues / PRs: found and fixed in our fork (evenifyouforget/Stronghold-Protocol-EN). The same fix is offered to sganggs. Display only: no sim, protocol or golden change.

## Sources and assumptions

> [!NOTE]
> For game rules, cite the official data fields, PRTS or your own measurements. Write any detail you could not confirm, and how you handled it, under [ASSUMED], and mark it the same way in the code.

- Sources: the client prefabs `projectile_chr_lemuen_s3_aim` (the crosshair, the two keys above) and `projectile_chr_lemuen_s3_attack` (the shell, `lemuen_skill_03_hit_01`); PRTS, her S3: "每0.5秒消耗1发子弹依次锁定敌人" (every 0.5 s it spends 1 bullet to lock the next enemy).
- [ASSUMED]: None. The 5 s without a shell and the cap of 48 reuse `LOCK_T` / `MAX_LOCKS` from `render/fx/locks.js`.

## Verification

> [!NOTE]
> Run the related tests, `npm run ci` and `npm run golden`, and record the results honestly, with the reason for anything not run or skipped. For golden changes, name the scenarios and why they changed; a refactor must not change results, and when an expected result changes on purpose, run `npm run golden:update` and commit it with the change. Attach screenshots for UI changes.

- How it was verified: new unit tests.
- Related tests: `test/render/vfx-procedural.test.js` adds two tests: the crosshair stays while the skill waits, stays at a defeated enemy's spot and ends with its own shell (or 5 s later with none); and the knock-out case. Both fail on `dev-0.2` without this fix. `node --test test/render/vfx-procedural.test.js test/render/vfx-talents.test.js test/content/kits_layout.test.js`: 34 pass, 0 fail.
- npm run ci: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,837, of which 8,754 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none. This run was on one tree holding both this PR and its Exusiai sibling PR (they touch different code); each PR's own tree passed its related tests and lint.
- npm run golden: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 141 scenarios all match (same combined tree).
- Golden changes: None.
- Screenshots / recordings: None attached; I can add some on request.

## Not applicable

- Items that do not apply: the docs checks, the Fidelity checklist.
- Why: a client-side effects fix; no rule change and no new Operator kit.

## Checklist

> [!IMPORTANT]
> Last step: look over your answers and tick only what you have done.

- [x] This PR handles one topic only
- [x] I ran the related tests, `npm run ci` and `npm run golden`, and filled in the results honestly
- [ ] For rule changes, I updated the docs and ran the docs checks
- [ ] For an Operator kit, it covers one Operator only and includes the Fidelity checklist with every item ticked
