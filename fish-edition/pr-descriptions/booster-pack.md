# Cheat: Booster Pack (#35), and Lemuen's official effects (#34)

Target: `main`. Branch `wip/booster-pack`, stacked on `wip/sync-yuri-0.3.1` (merge that one first; this PR's own
diff is the last commit). Gameplay (a cheat), so main only for now.

## Booster Pack (closes #35)

A new cheat, **Start with a Booster Pack**. Every player starts with a Booster Pack, an item made by the rule
(like Toxic Waste). It uses 商业包装方案 (Commercial Packaging Plan)'s icon.

- **Equip it on an operator:** it isn't attached. Instead it opens a free pick-one offer of **6 operators of that
  operator's tier**, the most an offer can show.
- **A fixed order:** the tier's base chess ids, sorted, with 自选 slots left out. Each use shows the next 6 after
  this player's place in that tier's order, and wraps round at the end, so the whole tier comes round in turn.
- **Per player and per tier:** each player keeps their own place in each tier's order, so players don't affect
  each other.
- **The pack stays in the hand.** The pick is free. Operators show even when the shared pool has no copy left,
  like any displayed reward.
- **AI players** neither use it nor drop it to make room.
- With **Start with one operator of each tier**, it makes any round-1 board possible.

Not done: a picker for a whole tier (20+ operators). 6 at a time in a fixed order covers a tier in 3–4 uses, and needs
no new UI.

## Lemuen's official effects (#34)

There's nothing to build for these:
- **Upstream 0.3.x already plays the official battle effects** on the 3D board (setting 官方特效, from the files the
  local-art release ships). Lemuen's list has 24 of them, including her S3 lock-on (`lemuen_skill_03_crosshair_range`),
  hits and trails.
- **On main it needed** the 0.3.1 sync, plus the release-script fix there (`data/local-fx.json`).
- **Still procedural:** her falling S3 shells. Upstream keeps them that way on purpose (docs/design/vfx-format.md,
  "Kept procedural").

**To playtest:**

1. Check out this branch and run `npm ci`, then `npm run setup` (the usual assets), then
   `npm run assets:release-local` (the v0.3.1 local art and its effects list).
2. Start the server. In the room's lobby rules, turn on **Start with one operator of each tier** and **Start with a
   Booster Pack**.
3. Equip the pack on the tier-6 operator until Lemuen (蕾缪安) is offered, and pick her.
4. Use the 3D board with the 官方特效 setting on.

## Code

- `shared/rules.js`: `boosterPack` (cheat). `shared/ruleData.js`: `BOOSTER`, the item record, the data patch.
- `server/match/player/round.js`: the pack at round 1. `server/match/player/items.js`: `openBooster` (the equip path).
- `server/match/bot.js`: never used, never destroyed to make room, kept when it lands in the temporary hand.
- Client: the rules toggle (`ui/lobbyRules.js`). The replace dialog doesn't open for the pack (`ui/equipReplace.js`).
- Texts in en / ja / ko / zh-TW.

## Tests

- New `test/match/booster-pack.test.js`:
  - every player starts with one pack, and nobody does without the rule;
  - the offer is the next 6 of the tier's order, round the end;
  - a pick is free and adds the operator;
  - another tier keeps its own place, and so does each player;
  - bots keep the pack through 4 rounds and never open it.
- `test/ui/leftovers.test.js`: no replace dialog for the pack.
- `npm test`: 8,931 / 8,979 pass. The 2 failures are the same environment-only ones as in the sync PR.
- Typecheck is clean and lint has 0 errors.
