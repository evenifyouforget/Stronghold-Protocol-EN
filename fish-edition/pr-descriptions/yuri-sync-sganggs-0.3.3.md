# Sync dev-0.2 with sganggs 0.3.3

Target: Yuri's `dev-0.2`. Branch `yuri/sync-sganggs-0.3.3`, the same kind of merge as Yuri #14.

This brings in sganggs' `master` at 0.3.3 (`f07b8965`, 488 commits since the last sync point `c9d804f4`). Upstream's
0.3.2 / 0.3.3 add:
- the official versions (第一期 / 第二期 rooms, version vote, version match hosts);
- the bot strategy registry;
- the 界面大小 setting;
- 名片干员 seat cards and skins on seats;
- the redesigned lobby hub, waiting room, briefing, strategy draft, 干员调配 card view and 自选 picker;
- the shutdown timeout, the sim pool, and more (docs/history/0.3.2.md, 0.3.3.md).

It's an ordinary merge commit, so the next sync can be a plain `git merge` again.

## Conflicts and how they were resolved

The rule throughout: keep both. Yuri's fork features stay, and upstream's additions go in around them. Where
upstream rewrote a screen, its new layout is kept and Yuri's features are put back into it.

### Server
- **Lobby** (`server/lobby.js`):
  - Yuri's matchmaking (搜寻队友, 单人匹配 queue, `matched` seats) works beside upstream's official versions, fixed room
    code and seat cards;
  - `room.create` leaves the queue after upstream's checks pass;
  - queue seats get the room in `humanSeat`, so cards are checked against the right version;
  - Yuri's retiring / maintenance gates run before upstream's version-host check.
- **Server start** (`server/index.js`): upstream's versions / event loop / sim pool, with Yuri's notices, maintenance,
  presence, generations and alt-art. Health reports both sets of fields.
- **Shutdown** (`server/http/boot.js`): upstream's `shutdownHandler` (SP_SHUTDOWN_TIMEOUT_MS), with Yuri's Ctrl+C
  guard while matches are live in front of it.
- **Bot rehearsal** (`server/match/bot.js`, `match/rehearsal.js`):
  - upstream's `candidateLimit` and sim pool, with Yuri's delegated rehearsal to the host page;
  - the fallback when a delegated job fails is back in the delegate branch (git had put it in the pool branch).
- **Health / CSP / static / net**: the keys and doc lines of both sides.
- **Sim snapshot** (`server/sim/battle/events.js`): Yuri's `st` / `sh` / `notes` / `fever` and upstream's `motes` / `face`.

### Client
- **Lobby** (`screens/lobby.js`, `css/screens/lobby.css`). Upstream's new hub layout, with Yuri's additions:
  - 单人匹配 is a third hub entry. It opens 选择模拟协议 at the co-op difficulties and joins the queue. It only shows
    for the default version, because the queue seats into a 第二期下半 room.
  - While queued, the queue panel takes the entries' place and the 密钥加入 tile is off.
  - The update announcement sits in the left column.
  - The online count and the Discord button are in the top bar.
  - The difficulty details button is in 选择模拟协议.
  - The co-op texts mention 搜寻队友.
- **Room** (`screens/room.js`): upstream's new seat cards, with Yuri's 搜寻队友:
  - the search bar, the search button in place of 开始模拟, the searching status, and 搜寻中 on empty seats;
  - also the online count, Discord, the ready sound and the generation-free invite link.
  - `canFindMates` now leaves out rooms of another version, which the server refuses.
- **Outfits vs skins**. Yuri's 时装 (docs/OUTFITS.md) and upstream's skins (docs/SKINS.md) both change an operator's
  avatar and portrait.
  - `chessAvatarUrl` / `chessPortraitUrl` take both: an outfit wins, then the skin.
  - Upstream's `OperatorImage` passes the owner's outfit (`outfitOwner`, defaulting to `ownerId`), so other players'
    units still wear their outfits.
- **干员调配** (`screens/loadout.js`): upstream's card view, with Yuri's 调配 / 时装 switch in the detail. **自选**
  (`screens/diy.js`): upstream's new picker, with Yuri's outfit section and dub picker in the detail.
- **Briefing / draft**: upstream's section layout. Yuri's 核心盟约 call goes on the core bond row, the call chip on
  each draft order card, and the 10-second timer warning on both.
- **Battle view**:
  - `render/units.js`: Yuri's melee-twin shot kind, with upstream's strike clips and attack rate.
  - `render/app.js`: upstream moved the wind-up look-ahead to `render/app/windup.js`. It now takes a `skip` (Yuri's
    quiet note attacks) and passes the target to `windUp`.
- **Detail panel, result, bond strip, stats, settings, runner, sim loader, metrics**: both sides' parameters and
  lines.
- **CSS**: upstream's new screen styles, plus Yuri's rules for the features above. Yuri's fourth HUD corner row
  (作战统计) keeps upstream's new 界面大小 size floors.

### Tools, data, docs, tests
- **`tools/fetch-assets.mjs`**: upstream's per-version presentation union, plus Yuri's outfits read from the default
  version's data. **local-extract**: upstream's texture format / add-only, plus Yuri's `--fx-skins` and outfit effect
  replacements.
- **`data/assets.json`**: a structural three-way merge (no file was hand-edited).
  - 76 new upstream sound pools lack Yuri's `group` / `spatial` fields.
  - **Please regenerate it** with `tools/fetch-assets.mjs` on your side.
- **i18n**: merged key by key.
- **Docs**: upstream's text, with Yuri's notes placed in it.
- **Tests**:
  - counts that both sides moved are added up: local groups 81 + 1, audio pools 1013 + 17, references 987 + 2;
  - e2e flows follow the new lobby hub;
  - `test/golden/diy.json` is regenerated (deterministic, checked twice);
  - `test/ui/asset-download.browser.test.js` stays deleted, as on dev-0.2 (and leaves `ci-shards.json`);
  - dev-0.2's own data shows up in upstream's version checks. `outfits` and `terms` are gameplay data files of the
    default version, Sakiko makes 82 kitted 自选 picks, and the room state has `searching` / `searchSince` (the
    default-version guard fixture gains those two lines).

## Known issues

- The lobby with three hub entries, the queue panel in the hub, and the room's search button in the new footer have
  not been looked at in a browser. Spacing may need work.
- `data/assets.json` needs regenerating (see above).
- Upstream's per-version data sets (`data/versions/*`) don't have dev-0.2's `activeRange` / `activeExtend` skill
  fields; the data-versions test ignores them for now. Regenerating the sets with dev-0.2's `tools/build-data.mjs`
  would add them.
- Upstream's 界面大小 floors (72 / 96 px) for the HUD corner now apply to dev-0.2's 作战统计 row too.
- The two operator appearance systems now live side by side. It may be worth folding 时装 into upstream's skins later.

## Tests

Merge commit `ae3bf9f1`, parents `c05aa7e2` (dev-0.2) and `f07b8965` (sganggs 0.3.3).

- `npm test`: 10,349 of 10,478 pass, 128 skipped. The one failure is `test/ipv6-bind.test.js`, which needs IPv6,
  unavailable in our container.
- A second commit (`3a269451`) brings in sganggs's fix from after 0.3.3 (06b57698, #881): 0.3.3's add-only FX test
  needed Python's Pillow, which the CI runners don't have, so it failed one shard on every PR, sganggs's own included.
- Typecheck is clean and lint has 0 errors.
- Golden replays: every family matches except `diy`, which was regenerated (the 自选 pool changed on both sides).
