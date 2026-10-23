> English version at the end (English 版本见文末).

> [!IMPORTANT]
> 选择一种改动类型，并填写以下内容。没有相关内容填“无”，不适用填“不适用”。

## 改动类型

- [x] fix: 修复
- [ ] feature: 功能
- [ ] docs: 文档
- [ ] refactor: 重构
- [ ] test: 测试
- [ ] chore: 维护

## 改动说明

> [!NOTE]
> 写清问题、原因和范围。

- 改动说明：开启官方特效时，蕾缪安 S3 锁定敌人的准星（`lemuen_skill_03_crosshair_range` / `lemuen_skill_03_crosshair_02`）在锁定约 1 秒后就消失了，远早于炮弹落下；被锁定的敌人倒下时也不会留在原地。原因是这条绑定用的是 `hold: 'fx'`，它把技能 fx 的 `hold` 字段读成持续秒数，而 kit 发出的 `hold: 1` 是一个标记（技能等待期间保留准星），于是每个准星 1 秒后就被停掉。模拟本身没有问题：炮弹照样落在敌人最后出现的位置（kit 的 `markOf`），只是画错了。
  新增绑定方式 `hold: 'lock'`（`render/vfx/skillfx.js` 的 `_lockOn` / `_lockShell` / `_syncLocks`），规则与程序化准星 `render/fx/locks.js` 相同：
  - 敌人还在时跟着敌人，敌人倒下后留在它最后的位置；
  - 技能持续期间一直保留，包括范围内暂时没有敌人、技能在等待的时候；
  - `bombardShell` 认领离它最近、还没被认领的准星，这发炮弹的 `bombard` 落地时结束它；
  - 一直没有炮弹时，在最后一次锁定 / 炮弹 / 落地后 `LOCK_T`（5 秒，与 locks.js 相同）结束；
  - 蕾缪安被击倒时，还没有炮弹认领的准星立即结束；已经在空中的炮弹保留它的准星。
- 期望效果：每个准星从锁定一直显示到对应的炮弹落下，敌人倒下后准星留在原地，炮弹落在那里。
- 关联 Issue / PR：无。这是在 EN 翻译分支的分叉 evenifyouforget/Stronghold-Protocol-EN 里发现并修复的，本 PR 把同样的修复移植到 `dev`。只改客户端显示，不涉及模拟、协议或黄金结果。

## 依据与假设

> [!NOTE]
> 涉及规则时附官方数据字段、PRTS 或实测；未确认细节及处理方式写入 [ASSUMED]，代码中同步标注。

- 来源依据：客户端预制体 `projectile_chr_lemuen_s3_aim`（准星，即上面两个 key）与 `projectile_chr_lemuen_s3_attack`（炮弹，`lemuen_skill_03_hit_01`）；PRTS S3：“每0.5秒消耗1发子弹依次锁定敌人”。
- [ASSUMED]：无。没有炮弹时的 5 秒与上限 48 个沿用 `render/fx/locks.js` 已有的 `LOCK_T` / `MAX_LOCKS`。

## 验证结果

> [!NOTE]
> 运行相关测试、npm run ci 和 npm run golden，如实记录结果及未运行或跳过原因。Golden 变化说明场景及原因；重构不得改变结果，预期结果有意变化时运行 npm run golden:update 并同提交。界面改动附截图。

- 验证方法：新增单元测试。
- 相关测试：`test/render/vfx-procedural.test.js` 新增两例：准星在技能等待时保留、敌人倒下后留在原地、随自己的炮弹结束（没有炮弹时 5 秒后结束）；以及蕾缪安被击倒的情况。两例在 `dev` 上不加本修复时失败。`node --test test/render/vfx-procedural.test.js test/render/vfx-talents.test.js test/content/kits_layout.test.js`：34 通过，0 失败。
- npm run ci：setup、smoke、lint（0 错误）、imports、typecheck 通过；test：8792 项，8724 通过，67 跳过，1 失败：`test/ipv6-bind.test.js` 的双栈绑定（`EADDRNOTAVAIL`），需要 IPv6，本机容器没有，与特效代码无关。
- npm run golden：通过：roster 49、bonds 46、fields 22、matches 21、standins 10、diy 140 个场景全部一致。
- Golden 变化：无。
- 截图/录屏：本机没有截下蕾缪安的画面；需要的话可以补。

## 适用性说明

- 不适用项：文档检查、Fidelity checklist。
- 原因：只改客户端特效显示，不改规则，也不是新的干员 kit。

## 检查清单

> [!IMPORTANT]
> 最后一步：回顾回答，仅勾选已完成的项目。

- [x] 本 PR 只处理一个主题
- [x] 已运行相关测试、npm run ci 和 npm run golden，并如实填写结果
- [ ] 涉及规则时，已同步文档并运行文档检查
- [ ] 涉及干员 kit 时，仅一名干员，并附上逐项勾选的 Fidelity checklist

<details>
<summary>English</summary>

Type of change: fix (bug fix).

#### What changed

- What changed: with official effects on, Lemuen's S3 lock crosshair (`lemuen_skill_03_crosshair_range` / `_02`) disappeared about 1 s after each lock, long before its shell landed, and wasn't kept where a defeated target had stood. The binding used `hold: 'fx'`, which reads the skill fx's `hold` field as a duration in seconds. But the kit sends `hold: 1` as a **flag** ("keep this reticle while her skill waits"), so every crosshair was stopped after 1 s. The sim was already right: the shell falls where the enemy was last seen (`markOf` in the kit). Only the drawing was wrong.
  The new binding mode `hold: 'lock'` (`render/vfx/skillfx.js`: `_lockOn` / `_lockShell` / `_syncLocks`) follows the same rules as the procedural reticle in `render/fx/locks.js`:
  - it stays on the locked enemy while that enemy is alive, and at its last spot once it is gone;
  - it stays up as long as her skill runs, including the waits with nothing in range;
  - a `bombardShell` claims the nearest free lock, and that shell's `bombard` ends it;
  - with no shell, it goes `LOCK_T` (5 s, as in locks.js) after her last lock, shell or bombard;
  - if she is knocked out, the locks no shell has claimed go at once; a shell already in the air keeps its lock.
- Expected result: each crosshair shows from its lock until its own shell lands, and stays where a defeated enemy stood, which is where the shell falls.
- Related issues / PRs: found and fixed in our fork (evenifyouforget/Stronghold-Protocol-EN). The same fix is offered to YuriRestia's English translation fork. Display only: no sim, protocol or golden change.

#### Sources and assumptions

- Sources: the client prefabs `projectile_chr_lemuen_s3_aim` (the crosshair, the two keys above) and `projectile_chr_lemuen_s3_attack` (the shell, `lemuen_skill_03_hit_01`); PRTS, her S3: "每0.5秒消耗1发子弹依次锁定敌人" (every 0.5 s it spends 1 bullet to lock the next enemy).
- [ASSUMED]: None. The 5 s without a shell and the cap of 48 reuse `LOCK_T` / `MAX_LOCKS` from `render/fx/locks.js`.

#### Verification

- How it was verified: new unit tests.
- Related tests: `test/render/vfx-procedural.test.js` adds two tests: the crosshair stays while the skill waits, stays at a defeated enemy's spot and ends with its own shell (or 5 s later with none); and the knock-out case. Both fail on `dev` without this fix. `node --test test/render/vfx-procedural.test.js test/render/vfx-talents.test.js test/content/kits_layout.test.js`: 34 pass, 0 fail.
- npm run ci: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,792, of which 8,724 pass, 67 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none.
- npm run golden: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 140 scenarios all match.
- Golden changes: None.
- Screenshots / recordings: None attached; I can add some on request.

#### Not applicable

- Items that do not apply: the docs checks, the Fidelity checklist.
- Why: a client-side effects fix; no rule change and no new Operator kit.

Checklist (ticked in the Chinese template above): one topic only; related tests, `npm run ci` and `npm run golden` run and reported. The docs-checks and Fidelity-checklist items do not apply.

</details>
