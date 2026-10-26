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

- 改动说明：新约能天使的天赋「火力电台」召唤的轰炸，开启官方特效时没有播放它自己的官方特效，只画了程序化的橙色爆炸，看起来和蕾缪安 S3 的炮击一样。玩家因此以为是蕾缪安 S3 在锁定期间就造成了伤害，其实伤害来自新约能天使的天赋：每次友方干员消耗弹药（蕾缪安 S3 每次锁定都消耗 1 发），都有概率在该干员的攻击范围内召唤一次轰炸。
  客户端里这次轰炸是 TalentBomb 能力：由 buff 模板 `angel2_t_1[target]` 在 `ON_BUFF_START` 触发的 `MultiRangedAttack`，命中特效 `angel2_buff_01_trail_01`（带烟尾从天而降的炮弹和红白色爆炸）。我们一直没有播放它：kit 的 `airstrike` fx 落到了程序化的爆炸上。
  - `render/vfx/talents.js`：`POINT_TRIGGERS` 把这个模板对应到 kit 的 `airstrike`，新增导出 `pointKinds()` 标出“在 fx 坐标处打击”的类型；
  - `render/vfx/talentfx.js`：`_strike` 在 (x, y) 的地面上播放 TalentBomb 的命中特效；`FxWiring.simFx` 把 fx 的坐标传给天赋层（`render/vfx/wiring.js`）；
  - 新约能天使 S3 开场的投送也是 `airstrike`，只有带 `talent: true` 的才播 TalentBomb。开发版的火力电台 kit 已经给轰炸打上这个标记，本 PR 不再改动 kit（已合入 `dev`，按审查意见移除了旧的 kit 改动）。
- 期望效果：天赋轰炸在被打击的位置播放官方的落弹和爆炸；她的 S3 投送和没有官方特效时的程序化爆炸保持原样。
- 关联 Issue / PR：无。这是在 EN 翻译分支的分叉 evenifyouforget/Stronghold-Protocol-EN 里发现并修复的，本 PR 把同样的修复移植到 `dev`。只改一名干员（新约能天使）。

## 依据与假设

> [!NOTE]
> 涉及规则时附官方数据字段、PRTS 或实测；未确认细节及处理方式写入 [ASSUMED]，代码中同步标注。

- 来源依据：客户端的 TalentBomb 能力（`Others/Direction/CommonAbilities/TalentBomb`，触发模板 `angel2_t_1[target]`，命中特效 `angel2_buff_01_trail_01`）；PRTS 天赋「火力电台」：“每当有友方干员的弹药被消耗……有概率立即对该干员攻击范围的敌人召唤一次轰炸”。
- [ASSUMED]：无。

## 验证结果

> [!NOTE]
> 运行相关测试、npm run ci 和 npm run golden，如实记录结果及未运行或跳过原因。Golden 变化说明场景及原因；重构不得改变结果，预期结果有意变化时运行 npm run golden:update 并同提交。界面改动附截图。

- 验证方法：新增单元测试；已在装有本地美术的部署上实际看过画面。
- 相关测试：`test/render/vfx-talents.test.js`：模板的 trigger / point 类型；带标记的 `airstrike` 在被打击的位置（不是新约能天使身上）播放 TalentBomb 的命中特效；不带标记的（她的 S3）和没有坐标的落回程序化爆炸。合入 `dev`（f07b8965）后：`node --test test/render/vfx-talents.test.js` 及引用新约能天使的测试，152 通过，0 失败。
- npm run ci：setup、smoke、lint（0 错误）、imports、typecheck 通过；test：8791 项，8722 通过，67 跳过，2 失败，都与本改动无关：
  - `test/ipv6-bind.test.js` 的双栈绑定（`EADDRNOTAVAIL`）：需要 IPv6，本机容器没有，与特效代码无关；
  - `test/plugins/script-integration.test.js` 的 all-bot 整局（100 秒超时）：当时机器负载高，单独重跑 3 次均通过。
- npm run golden：通过：roster 49、bonds 46、fields 22、matches 21、standins 10、diy 140 个场景全部一致。
- Golden 变化：无。
- 截图/录屏：截图包含官方美术，没有直接附上；需要的话可以补。

## 适用性说明

- 不适用项：文档检查、Fidelity checklist。
- 原因：只改特效显示，不改规则，也不改 kit。

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

- What changed: the airstrike that Exusiai the New Covenant's (新约能天使) talent 火力电台 calls never played its official effect. With official effects on it drew the procedural orange blast, which looks like Lemuen's S3 bombardment. So players read it as Lemuen's S3 "damaging enemies while it locks on". The damage is really the talent's: whenever a friendly Operator's ammo is spent (every Lemuen S3 lock spends 1), it may call a bombardment on an enemy in that Operator's range.
  In the client, that strike is the TalentBomb ability: a `MultiRangedAttack` triggered by the buff template `angel2_t_1[target]` on `ON_BUFF_START`, with the hit effect `angel2_buff_01_trail_01` (a shell dropping from the sky with a smoke trail and a red-white burst). We never played it: the kit's `airstrike` fx fell through to the procedural blast.
  - `render/vfx/talents.js`: `POINT_TRIGGERS` maps that template to the kit's `airstrike`, and the new export `pointKinds()` marks it as a strike at the fx's spot;
  - `render/vfx/talentfx.js`: `_strike` plays TalentBomb's hit on the ground at (x, y); `FxWiring.simFx` (`render/vfx/wiring.js`) passes the fx position to the talent layer;
  - her S3 opening delivery is an `airstrike` too, so only one marked `talent: true` gets the talent bomb. Dev's 火力电台 kit already marks its bombing that way, so this PR no longer touches the kit (merged with `dev`; the old kit change removed, as the review asked).
- Expected result: the talent's airstrike plays the official falling shell and burst where it strikes. Her S3 delivery, and the procedural blast without official effects, stay as they were.
- Related issues / PRs: found and fixed in our fork (evenifyouforget/Stronghold-Protocol-EN). The same fix is offered to YuriRestia's English translation fork. One Operator (Exusiai the New Covenant).

#### Sources and assumptions

- Sources: the client's TalentBomb ability (`Others/Direction/CommonAbilities/TalentBomb`, trigger template `angel2_t_1[target]`, hit effect `angel2_buff_01_trail_01`); PRTS, her talent 火力电台: "每当有友方干员的弹药被消耗……有概率立即对该干员攻击范围的敌人召唤一次轰炸" (whenever a friendly Operator's ammo is spent, there is a chance to call a bombardment on an enemy in that Operator's range).
- [ASSUMED]: None.

#### Verification

- How it was verified: new unit tests, and watched on screen in a deployment with the local art.
- Related tests: `test/render/vfx-talents.test.js`: the template's trigger and point kinds. A marked `airstrike` plays TalentBomb's hit at the struck spot, not on Exusiai. An unmarked one (her S3) and one with no position fall back to the procedural blast. Merged with `dev` (f07b8965): `node --test test/render/vfx-talents.test.js` plus the tests that name Exusiai the New Covenant, 152 pass, 0 fail.
- npm run ci: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,791, of which 8,722 pass, 67 are skipped and 2 fail, neither from this change:
  - the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`): it needs IPv6, which this container doesn't have;
  - the all-bot full match in `test/plugins/script-integration.test.js` (100 s timeout): the machine was under load; rerun alone it passed 3 times out of 3.
- npm run golden: pass: roster 49, bonds 46, fields 22, matches 21, standins 10 and diy 140 scenarios all match.
- Golden changes: None.
- Screenshots / recordings: None attached (they show official art); I can add some on request.

#### Not applicable

- Items that do not apply: the docs checks, the Fidelity checklist.
- Why: an effects fix only; no rule change and no kit change.

Checklist (ticked in the Chinese template above): one topic only; related tests, `npm run ci` and `npm run golden` run and reported. The docs-checks and Fidelity-checklist items do not apply.

</details>
