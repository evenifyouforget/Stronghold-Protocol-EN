The first Fish Edition plugins: four cheats as data-only plugins for game v0.3.3, and the tools and CI that check, test and pack them against the game.

Repo: `evenifyouforget/spa-fish-edition-plugins`. Base: `main`. Branch `wip/data-cheats`. Follows the decision on Stronghold-Protocol-EN#52: port what fits the plugin system, keep SPA-CC in Fish Edition.

## The plugins

| Plugin | How |
|---|---|
| `fish-extra-funds`: +2 Funds every round | a prep DSL effect on the income event (`funds` 2); the room's match host grants it to every player |
| `fish-extra-deploy`: Deployment Limit +2 | data patch: `economy.deployCap` 8 → 10 |
| `fish-double-lp`: double starting LP | data patch: every Strategy's `totalHp` × 2, and the fallback `defaultStartLp` |
| `fish-untimed`: no Rest Phase countdown | data patch: every timed round's `prepTime` → 0, which the game reads as untimed. A co-op prep then ends when everyone is ready |

- **No code, so no `SP_PLUGIN_SCRIPTS`.** They work on any 0.3.3+ server, including one without sandbox mode.
- **One switch each.** Data patches and prep DSL can't read a plugin setting as a condition, so each cheat is its own
  plugin. The room's host turns them on in the 插件 panel.
- **`fish-double-lp` and `fish-untimed` are generated** from the game's data by `tools/gen.mjs`. A patch can only set
  values, so it holds one `set` per record. CI fails if they're out of date for `GAME_VERSION`.

## Tools

- **`tools/ci.mjs`**:
  - clones the game at `GAME_VERSION` (`v0.3.3`) into `.game/`;
  - copies each plugin into its `plugins/`;
  - runs the game's `plugin.mjs check --strict` and the tests;
  - packs the zips into `dist/`, with `SHA256SUMS`.
- **`tools/test.mjs`**: the game's `plugin.mjs test` runs a plugin folder's own `test/`, but a content plugin may not carry
  `.js` files (`PLUGIN_FILE_TYPE`). So the tests live in `tests/<id>/`. This runner composes the content set the same way
  and preloads the game's `scriptTestSetup.js`.
  - It also works around a game bug: that preload reads `set.scripts`, which a set without script plugins doesn't have.
    The game's own `plugin.mjs test` would crash on any content-only plugin.
- **Workflows**: `ci.yml` (push to main, PRs); `release.yml` (a `v*` tag publishes the zips and SHA256SUMS as a GitHub
  release, which `node tools/plugin.mjs install <url> --sha256 <hex>` installs from).

## Differences from Fish Edition's built-in rules

- Fish Edition's "untimed" also takes the countdown off the Strategy draft and Improv. A data patch can't: those timers
  fall back to a default when set to 0.
- No "WITH CHEATS" on the result screen; the game marks the matches 非官方 instead.

## Known issues

- **No license yet.** The game is GPL-3.0-or-later; the repo has no LICENSE file and the manifests no `license` field.
  Your call.
- Not tried in a real room or browser: the tests drive the game's match engine, not the 插件 panel.

## Tests

`node tools/ci.mjs` from a fresh clone of the game at v0.3.3: 4 plugins checked with `--strict` (0 problems, 0
warnings), 4 of 4 tests pass, 4 zips packed. Each test runs the game's match harness on the composed data:
- deploy cap 10 for both co-op players;
- starting LP × 2 for every Strategy and in a match;
- +2 Funds at the start of rounds 1–3 against the same seed without the plugin;
- co-op prep: no deadline in rounds 1 and 2, still waiting after 10 minutes, ends once everyone is ready.

The untimed test fails when the patch is swapped for a no-op (checked by hand).
