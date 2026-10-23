The Booster Pack's equivalent for items: a separate cheat item with its own lobby toggle, as you chose on #56.

Base: `mini/0.3.1-2`. Branch `wip/item-booster`, stacked on `wip/mini-fixes`: both change the same `setRules` line in `public/js/data.js`. Merge that PR (#64) first; this one's diff is then only its own commit.

Closes #56

## What it does

- **New cheat toggle** "Start with an Equipment Booster Pack" (`itemBoosterPack`, category `cheat`, so the end screen says WITH CHEATS). It is independent of the Booster Pack's toggle; both can be on.
- **Every player starts with one Equipment Booster Pack** (`fish_item_booster_pack_equip`) at round 1.
- **Equipping it on any operator** opens a free pick-one offer of **6 items**:
  - they are the next ones of a fixed order through **every shop item**: tier 1 → 6, ids sorted within a tier (`gd.shopItemsByTier`, the same list the shop draws from);
  - each player has their own place in that order, so using it again shows the next 6, and the whole list comes round;
  - unlike the Booster Pack, the order doesn't depend on the operator's tier: any operator works.
- **The pack stays where it was.** Nothing is attached.
- **Items the shared stock has run out of are still listed**, as the Booster Pack lists operators. A displayed reward survives stock exhaustion when picked (`pickReward`).
- **AI players never use or drop it.** The existing Booster Pack checks cover it (`rec.booster`).
- **Icon:** 紧急调度券 (Emergency Dispatch Voucher), so it is told apart from the Booster Pack (商业包装方案) at a glance.
- **Texts:** en / ja / ko / zh-TW for the name, item text, toggle label and toggle description.

## How

- `shared/ruleData.js`: `ITEM_BOOSTER`, and its record from the Booster Pack's (`boosterRecord(text, true)`, `boosts: 'items'`).
- `server/match/player/items.js`: `openItemBooster()`; `equip` sends a pack to the right opener.
- `server/match/player/acquire.js`: `pushItemOffer(…, { anyStock })` lists items regardless of stock (off by default).
- `server/match/player/round.js`: the pack at round 1.
- `public/js/data.js`: `setRules` passes the rule through.
- `public/js/ui/lobbyRules.js`: the toggle and its label.

## Tests

- `test/match/item-booster-pack.test.js`, new:
  - the rule is a cheat;
  - each toggle gives only its own pack, and both give both;
  - the record's icon differs from the Booster Pack's;
  - the offer is the next 6 of one order through every shop item, from operators of different tiers;
  - the pack is kept and nothing is attached;
  - a pick gives the item for free;
  - an out-of-stock item is still offered;
  - each player has their own place;
  - AI players keep it unused for 4 rounds.
- `test/match/rebalance.test.js`: the client has the record (English name, icon) with the rule on, and none without it.
- The Booster Pack's own tests, UI tests and lobby-rule tests (1,051): all pass.
- `node tools/i18n.mjs check`: en 100 %; ja / ko / zh-TW have the same 63 missing as before (the SPA-CC texts not yet on `main`), none of them new.
- Lint: no new warnings. Typecheck: clean.
- `npm run ci`: setup, smoke, lint (0 errors), imports and typecheck pass. Tests: 8,953, of which 8,870 pass, 82 are skipped and 1 fails: the dual-stack bind test in `test/ipv6-bind.test.js` (`EADDRNOTAVAIL`), which needs IPv6, and this container has none.
- `npm run golden`: all scenarios match (roster 49, bonds 46, fields 22, matches 21, standins 10, diy 141).
- Not checked on screen: no game assets here.
