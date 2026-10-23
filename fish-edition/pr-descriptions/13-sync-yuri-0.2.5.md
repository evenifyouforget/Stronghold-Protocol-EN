# Sync main with YuriRestia dev-0.2 (0.2.5)

Target: `main` (PR #13). Merge this before #12 (status details), which is built on it.

Main was 189 commits behind Yuri's `dev-0.2`. This brings main up to date (`9588c00e`, 2026-10-14) so new work starts
from the current game. It already contains `wip/sync-yuri-dev` and `wip/lobby-rules-i18n`, so merging those first is
fine and changes nothing here.

## Brought in from Yuri (highlights)

- 0.2.5 game updates and fixes, Yuri's merged versions of our English docs (#3) and difficulty details (#4), Text Size.
- Generations (zero-downtime restarts for the hosted server), the damage chart, outfits, the Discord button, the
  updated room header and announcement banner, alternate result art.

## How conflicts were resolved

Yuri's side wins, except for what main has that Yuri does not:

- **Server maintenance**: the version sent to Yuri as their PR #6 (adapted to Generations; both coexist).
- **Custom Lobby Modifications** and their ja / ko / zh-TW strings: kept; font sizes moved onto Text Size (`--t`).
- **Keyword popup**: the version ported for Yuri (their PR #7), which already has Text Size and works with the outfits
  data, instead of main's older copy.
- **English README**: follows Yuri's location, `.github/README.md` (with the maintenance section); main's `README.en.md`
  is removed. Nothing outside `remove-before-merge/` linked to it.
- `data/i18n/*.json` regenerated for the keyword glossary; Korean emotes kept as Yuri built them (no data refresh
  sneaks in).

Check: the branch differs from Yuri + maintenance (`yuri/server-maintenance`) only by the lobby modifications, the
keyword popup and `remove-before-merge/`.

## Tests

`npm run ci` in a clean worktree: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container;
passes on GitHub Actions). `node tools/i18n.mjs check --all --strict`: 100 % in every pack.
