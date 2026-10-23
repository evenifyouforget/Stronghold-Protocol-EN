Pushes and pulls now slide instead of jumping, and an enemy blocked inside an operator's tile is shifted to its edge (arknights.wiki.gg Shift).

Base: `mini/0.3.1-2`. Branch `wip/shift-physics`. **Gameplay change:** every push, pull and block now plays out differently, so some golden results change (below).

Closes #60
Closes #61

## #60: Shift physics

Before, a push moved the enemy its whole distance in one frame. Now it slides:
- **A push gives momentum.** Each 受力等级 has a speed in tiles/s for mass 1 (`PUSH_MOMENTUM`): −2 → 1, −1 → 2, 0 → 4, 1 → 4.5, 2 → 5.3, 3 → 5.8.
- **Friction slows it each frame:** 0.5 × 9.81 tiles/s² at the sim's 30 fps. This reproduces the official distance table to within 0.01 tile (1.698 for 1.7, …).
  - A projectile (弹道) push moves on its hit frame.
  - An effect (特效) push loses that frame, which gives the 特效 column (1.562, 1.987, …).
  - The slide lasts as many frames as the official 失衡 times.
- **Momentum stacks.** A second push on a sliding enemy adds to its speed, so two quick pushes send it farther than both apart.
- **A pull moves at a constant speed:** its distance over 0.65·√(starting distance) seconds, at most 1 s (a −2 pull over 0.5 s). It replaces any push slide.
- **Walls stop the slide where it stands.** 浮空, 失衡免疫, a 重生 or leaving the field also end it.
- **A sliding enemy isn't blocked on the way**, only where its slide ends.
- `push` / `pull` still return the whole distance, walls included, so drag damage and wall stuns are unchanged.
- The client already slid enemies over the 失衡 time; the `displace` fx still carries the end point and duration, so the client is unchanged.

## #61: block shifting

When a ground unit starts blocking an enemy that stands inside its tile, the enemy moves just past the nearest edge and stays blocked. This covers:
- the unit deployed onto it;
- its stun ending;
- the enemy it was blocking defeated;
- a neighbour letting go;
- a pull that ends inside the tile.

Exceptions:
- **Not onto a wall or high ground:** it stays where it is.
- **Not from the exact centre** (e.g. a prespawned enemy).
- A walking enemy is blocked at contact (0.71 tile), outside the tile, so it is never shifted.

If an enemy would stand where another enemy blocked from the same side already stands, it steps a little to the left, else the right. Enemies that are already apart don't move.

Your 3×1 scenarios (MISC_USER_QUESTIONS.md) are tests now, with 水月 standing in for Ascalon. All six behave as written. Scenario 3 relies on the official 0.1-tile collider: shifted 0.51, the enemy is 0.01 into C, so 水月's range on B still reaches it.

## Readings I made (correct me)

The wiki gives no numbers for block shifting:
- **"Just outside" the edge:** 0.51 tiles from the centre.
- **"Slightly left or right":** 0.2 tiles, left first, then right, then twice that.
- **Device and air blocking aren't shifted, and leaders never move.**
- **Pull time for a pull ≥ 0:** the wiki's −1 row, 0.65·√d (it has no row for ≥ 0).

## Tests

- **New:** `test/sim/shift-physics.test.js` (8):
  - the table at 30 fps;
  - no jump, slowing down;
  - the 特效 frame;
  - stacking;
  - walls;
  - a pull's constant speed;
  - a pull ending a push;
  - no block while sliding.
- **New:** `test/sim/block-shift.test.js` (8): your six scenarios, the exact centre, and the side step (shared position vs already apart).
- **Updated (22 test files):** tests that read a position right after a hit. They now wait for the slide to end, or read where it will end (`_shiftPredict`).
- **Updated for #61, each matching a wiki case:**
  - 崖心 / 缪尔赛思 drags: the pull still ends at the 0.6708 stop radius. Then the second enemy steps aside, or the copy shifts the enemy to its tile's edge.
  - An enemy held where it passes a full blocker, re-blocked when the slot frees: now at the edge.
  - Taking over the enemy between two operators: now at the front one's edge.
  - The fear test waits until the enemy is back.
  - 野鬃 / 见行者 "< 0.25 tile": the target is made unblockable, because a blocked one is now at the edge.
- `node --test test/sim/*.test.js test/content/*.test.js`: 3,373 tests, all pass.
- **Updated:** `test/match/bot.test.js`, the rehearsal test's duck case. Its two layouts now leak 1 each, so it compares 9,4 (2 leaks) with 9,7 (1). This is how 0.3.0's collider change was handled before.
- `npm run ci`:
  - setup, smoke, lint (0 errors, 150 warnings, one fewer than `main`), imports and typecheck pass;
  - tests: 8,963, all pass except the golden digests (regenerated below) and the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none.
- **Goldens regenerated** (`npm run golden:update`, then `npm run golden`: all 289 scenarios match). Gameplay moved in both directions, with nothing one-sided and no sim errors:
  - **Battles (roster, bonds, fields, standins, diy):** 224 of 268 changed. Total kills / leaks:
    - roster 3,607 / 985 → 3,598 / 984;
    - bonds 990 / 22 → 990 / 22;
    - fields 246 / 17 → 250 / 16;
    - standins 496 / 604 → 497 / 603;
    - diy 6,022 / 11,239 → 6,017 / 11,190.
  - **The biggest swings:** roster-014 95 → 114 leaks; diy-048 72 → 47; diy-075 26 → 43; diy-036 113 → 101.
  - **Matches:** 20 of 21 changed, but every one keeps its result and rounds passed. Only team LP moves, by −17 to +5 (e.g. solo NORMAL 12 → 14, co-op ABYSS boosted 800 → 783).
- Not checked on screen: no game assets in this container.
