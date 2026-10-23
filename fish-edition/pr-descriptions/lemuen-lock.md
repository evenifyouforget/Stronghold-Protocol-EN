Fixes #45 and #46.

## #45: the S3 crosshair disappears when its target is defeated

With official effects on, Lemuen's S3 lock is drawn by the client's crosshair prefabs (`lemuen_skill_03_crosshair_range` / `_02`). That binding used `hold: 'fx'`, which reads the kit fx's `hold` field as a duration. In 0.2.0 the kit started sending `hold: 1` as a **flag**, meaning "keep this reticle while her skill waits". So every crosshair was stopped 1 s after its lock, long before its shell landed, whether or not the target died. It was also never told where the target died.

The sim was already right: the shell falls on the spot where the enemy was last seen (`markOf` in the kit). Only the drawing was wrong.

The new binding mode `hold: 'lock'` (`SkillFx._lockOn` / `_lockShell` / `_syncLocks`) follows the same rules as the procedural reticle in `render/fx/locks.js`:
- it stays on the locked enemy while that enemy is alive, and at its last spot once it is gone;
- it stays up as long as her skill runs, including the long waits with nothing in range;
- a `bombardShell` claims the nearest free lock, and that shell's `bombard` ends it;
- if no shell comes, it goes 5 s after the last lock, shell or bombard;
- if she is knocked out, the locks no shell has claimed go at once. A shell already in the air keeps its lock.

This is client-only, so no sim, protocol or golden changes. It's upstream-friendly: the bug is in Yuri's code too.

## #46: S3 "still damages enemies while locking on"

The damage is working as intended. The real bug was the missing graphic: the strike was drawn as a generic blast that looks like Lemuen's own.

The damage comes from **Exusiai the New Covenant** (新约能天使), not from Lemuen:
- her talent 火力电台 reads "每当有友方干员的弹药被消耗……有概率立即对该干员攻击范围的敌人召唤一次轰炸" (whenever a friendly operator's ammo is spent, there is a chance to call a bombardment on an enemy in that operator's range);
- Lemuen's S3 reads "每0.5秒消耗1发子弹依次锁定敌人" (every 0.5 s it spends 1 bullet to lock an enemy). Every lock spends ammo, so every lock can call an airstrike into Lemuen's range;
- the airstrike's blast looks like Lemuen's own bombardment (both are heavy orange blasts).

I checked this against the first human match records (2026-10-21): 13 battles with Lemuen, and S3 lock phases of 8–69 s.
- Lemuen dealt **0** damage during any lock phase.
- Her locked targets were hit 119 times by Exusiai the New Covenant's `airstrike` talent and by other operators' normal attacks.

**The fix:** the airstrike now plays its official strike. In the client, 火力电台's strike is the TalentBomb ability, triggered by the buff template `angel2_t_1[target]`. Its hit effect `angel2_buff_01_trail_01` is a shell dropping out of the sky with a smoke trail and a red-white burst. We never played it: our `airstrike` fx fell through to the procedural orange blast, which looks the same as Lemuen's bombardment.
- `render/vfx/talents.js`: `POINT_TRIGGERS` maps that template to the kit's `airstrike` kind, and `pointKinds()` marks it as a strike at the fx's spot.
- `render/vfx/talentfx.js`: `_strike` plays TalentBomb's hit on the ground at (x, y). `FxWiring.simFx` now passes the fx position to the talent layer.
- Exusiai's S3 opening delivery is also an `airstrike`, so the kit marks the talent's strike with `talent: true` and only marked ones get the talent bomb. This is a cosmetic fx field, so goldens and digests are unchanged: goldens count fx kinds only.
- Checked in `public/dev/fx-viewer.html` with the local art. Without official effects, the procedural blast still draws as before.

## Tests
- `test/render/vfx-talents.test.js`: the template's trigger and point kinds. A marked `airstrike` plays TalentBomb's hit at the struck spot, not on Exusiai. An unmarked one (her S3) and one with no position fall back to the procedural blast.
- `test/render/vfx-procedural.test.js` adds two tests: the crosshair stays while the skill waits, stays at a defeated enemy's spot, and ends with its own shell (or 5 s later with none); and the knock-out case. Both fail on `main`.
- `npm run test`: 8928 pass, 2 fail. Both failures are environmental and also fail on `main` in this container: `data/assets.json` paths need the art on disk, and the IPv6 dual-stack bind test needs IPv6. Lint and typecheck are clean.
