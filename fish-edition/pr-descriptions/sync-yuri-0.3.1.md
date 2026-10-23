# Sync main with Yuri's 0.3.1 (and sganggs 0.3.2)

Target: `main`. Branch `wip/sync-yuri-0.3.1`. Replaces the stale `wip/sync-yuri-0.2.6`.

Main was on 0.2.5. This brings in Yuri's `dev-0.2` at 0.3.1, together with sganggs' 0.3.2 fixes and dev-0.2's CI fixes from
Yuri #14 (`yuri/sync-sganggs-0.3.2`, `aa6f2a9f`). Upstream's 0.3.x adds plugins, official battle effects,
Sakiko, the audio rework, sandbox and studio features, and more (docs/history/0.3.0.md, 0.3.1.md).

The merge commit has main and #14's head as parents, so git knows what main last synced from. The next sync can be
an ordinary `git merge`.

## Before the merge: our lobby rules are renamed on the match side (`72282098`)

Upstream 0.3.x has its own match rules: `shared/plugins/rules.js`, the four switches a content plugin may declare
(shop bias, prep loadout, morph pairing, unequip). They reach the match as `opts.rules` / `m.rules`, the same names
as our host-set lobby rules. So ours are renamed where they meet:
- `opts.lobbyRules` / `m.lobbyRules`, and `ctx.lobbyRules` in the meta handlers;
- the test harness takes `lobbyRules`;
- our `test/match/rules.test.js` is now `test/match/lobby-rules-match.test.js`, because upstream adds a file with
  that name.

Nothing visible changes: `room.rules`, the `room.setRules` message, `m.public.rules` and the battle's `flags.rules`
keep their names. Both rule systems now work side by side.

## Conflicts and how they were resolved

Most conflicts were our own PRs that Yuri had already merged and then developed further (maintenance, battle
visuals, status details, CI). There Yuri's version is kept, plus what we changed since. The real merges:

- **Degenbrecher's HP-step bursts** (`content/enemies/leaders.js`): Yuri's loop cap (`burstLimit`, the
  stuck-step check), our Delegation United 3 cast gate, and our `burst` helper, which already has Yuri's "stored
  charges too".
- **Items** (`player/items.js`): Yuri's slot policy (morph pairing), with our Toxic Waste rules on top. It's never
  the item a policy replaces by default, can't be named for replacement, and a piece holding only it refuses more.
- **Shop** (`player/economy.js`): Yuri's bond bias, then our Victoria Mod C upgrade.
- **Battle input** (`match/combat.js`): Yuri's preview path, with our `waveBounties` (the SPA-CC risk bounties).
  Yuri's bot rehearsal now builds through the same `_normalOpts`, so it gets them too.
- **Unite LP** (`unite.js`): Yuri's skip of enemies born inside the field (`uniteRuntime`), plus our leak weight
  (Patriot / tier-3 Zaaro count 5).
- **Speed floor** (`sim/units.js`): Yuri's `moveSpeedFloor` and our Patriot `moveFloor`.
- **Improv draft** (`match/spDraft.js`): Yuri's `beforePrepOffers`, then our Patriot card.
- **Boss pool** (`battle/runner.js`, `battle/simHost.js`): Yuri routes the pool sync through `e.host.syncPool`;
  it now passes our Risk view as a third argument, in the worker too.
- **Band rounds** (`content/bands/meta.js`): Yuri's capped grant loops (`timesOf`) and duck holder lookup, with our
  ccStrategyLate `namedRound`.
- **Battle view** (`render/units.js`):
  - Yuri's three item pips (morph), with our Toxic Waste pip entries;
  - Yuri's boss HUD offset, with our invulnerability ribbons;
  - our liftoff heights.
- **Lobby** (`lobby.js`): Yuri's `setPlugins` and our `setRules` side by side.
- **JSON** (i18n, `data/terms.json`): merged key by key; Yuri's value wins wherever both changed.
- **Docs**: Yuri's text, with our additions placed in it (the release script, the `b.pool` `risk`, the snapshot's
  `bl`).

## Also in this PR

- **`tools/fetch-release-local.mjs`** takes every `data/local-*.json` from the release. Since 0.3.0 that includes
  `data/local-fx.json`, the list of official battle effects the server offers. Before, a 0.3.x install got the
  12,539 effect files but not the list, so no official effect would show. Existing lists are moved aside like the
  art. Tests and DEPLOY docs are updated.
- **`data/assets.json`** is Yuri's generated manifest, plus only the Patriot (`enemy_1506_patrt`).
  - Our 0.2.5 entry had the old sound format, which upstream's new audio-pools check rejects.
  - Its sound entry and two pools are what `tools/fetch-assets.mjs --offline` builds in 0.3.x's format; its
    model entry is unchanged.
  - A full regeneration wasn't possible here: the statistics-screen sprites come from a maintainer-side cache
    (`.cache/stats-assets`).
  - `test/audio-pools-data.test.js` counts +2 for the Patriot's pools, the way upstream pins Sakiko's.

## Tests

- `npm test` on the merged tree, with full assets and the v0.3.1 local art installed: 8,926 of 8,974 pass. Two fail,
  both because of this environment:
  - **"generated manifest data/assets.json" › every manifest path exists on disk**: 30 of Yuri's entries (26
    statistics sprites from the maintainer-side cache, 4 variant icons) couldn't be downloaded here. CI has no
    assets, so it skips this check.
  - **`test/ipv6-bind.test.js`**: needs IPv6, unavailable in our container.
- Typecheck is clean, lint has 0 errors, and the import check passes.
- After the rename alone (`72282098`, on 0.2.5): the match, sim and content suites pass (4,045 / 4,045).
- `test/fetch-release-local.test.js`: 6 / 6, including `local-fx.json` installed and a stale list moved aside.
