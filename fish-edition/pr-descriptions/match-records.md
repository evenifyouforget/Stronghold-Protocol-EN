# Opt-in anonymous match records, and `tools/records.mjs` to analyse them (#32)

Target: `main`. Branch `wip/match-records`, stacked on `wip/sync-yuri-0.3.1` (merge that one first; this PR's own
diff is the last commit). It doesn't depend on the booster pack or the release-local hints. Gameplay-neutral and off by
default.

Closes #32.

## Turning it on

`SP_RECORDS=on` (or `1`, `true`, `yes`) writes to `logs/records/`, which is gitignored like all of `logs/`. Any other
value names the folder. Unset, empty or `off` means nothing is recorded or written. DEPLOY §11 (zh and en) documents it,
including the Windows service and systemd.

Every finished match writes one gzipped JSON file, `<folder>/<YYYY-MM-DD>/<random id>.json.gz`:
- about 10 KB for a solo match, and 30–35 KB for 4-seat co-op (600 KB before compression, mostly battle specs);
- any subset of files is a valid data set, so an admin can zip a day's folder and send it;
- test rooms are never recorded.

## What a record holds

- The app version and the date; the mode, difficulty, lobby rules, a plugin room's content hash, and the seed.
- Per seat (`s0`–`s3`): human or AI, strategy, rounds passed, title id, the end-screen statistics. The outcome.
- **Every action that changed the game, in order, without times** (your comment on #32): buys, sells, refreshes,
  freezes, level-ups, moves, equips, Arts, destroys, unequips, rewards, 机变 cards, bands, 教鞭 choices, plugin offers,
  and AI takeover switching on or off.
  - An action the AI made for a seat (an AI seat, a human under AI 托管, or one who left) has `bot: 1`.
  - Refused actions aren't recorded.
  - A buy or reward names the piece it gave (`got`: id and uid), so later moves and sells link up.
  - **Every shop roll** (`shop`: round start, refresh, effects) and **every piece gained outside an action** (`gain`, with
    its source). That keeps the investor churn a single board snapshot loses.
- A row per round at SETTLE: LP, shop level, funds, deployed units, board value, elites, items, the unit ids, bonds and
  tiers, layers, band.
- **Every battle's BattleSpec, plus the digest of the result the match used.** Battles are deterministic, so a battle
  replays from its spec (your comment on #32). The tests check that replays give the recorded digests.

## What a record never holds

- player names or ids;
- room codes, IP addresses, tokens;
- browser or device details;
- times of day (only the date);
- emotes, chat, or the "Report a problem" text.

Every playerId becomes its seat id. That includes inside the specs, so replays run with seat ids. A test walks the
whole record of a real match looking for the ids, names, room code, IPs, epoch timestamps and identity-like keys.

## How it works

- **`server/match/records.js`** (new) observes the match without changing it. It wraps the seat's action methods, the
  draft appliers, `_ccField`, `_fieldDone` and `settle` on the instance. It draws no rng and writes no state. With records
  off it isn't installed at all. A test plays the same seed with records on and off and gets the same summary.
- **The record is built inside the match** and returned as `summary.record`, because a plugin room's match runs in a
  sandboxed child process with no file access.
  - The match host sends it as its own `record` message just before `end`, under the 16 MB frame limit. `end` itself is
    capped at 1 MB, and a co-op record could pass that.
  - The lobby writes the file and keeps the record out of `room.lastSummary`.
- **`server/records.js`** (new): `SP_RECORDS` parsing and the file store (async gzip; a write failure is logged, never
  thrown).
- **`tools/records.mjs`** (new): `node tools/records.mjs [folder…]` prints markdown tables:
  - matches per mode and difficulty;
  - human vs. AI seats;
  - by lobby rule (rules not at their default);
  - by Risk (the SPA-CC sum, with cheats noted);
  - by strategy;
  - human prep activity per round.

  `--json` outputs the same numbers as JSON. `--verify` replays the recorded normal battles with this checkout (records
  of another version are skipped).

Not done:
- **Replaying a whole match from its actions.** The battle specs already give exact battle replays. A whole-match replay
  would need the co-op seat order checked, as #32 says.
- **Replaying boss and 联防 battles.** They're recorded, but they share the boss pool or depend on the other fields, so
  `--verify` and the tests replay only normal battles.

## Found on the way (not changed here)

`wireOptions` (`server/match/host/proxy.js`) forwards a fixed list of options to a plugin room's match host. Our fork's
`lobbyRules`, `serverMatchNo` and `altArtChance` aren't on it. The lobby still accepts lobby rules in a room with
gameplay plugins (`setRules` has no check for that), so they show in the room but the hosted match plays without them.
This is from reading the code; I haven't tested it in a match. It's worth an issue.

## Tests

- New `test/match/records.test.js` (6):
  - off: nothing installed, no `record`;
  - on: the same match as off;
  - the record's shape;
  - anonymity;
  - every normal battle replays to its digest;
  - a human's own intents are recorded without `bot`, and a refused one isn't recorded.
- New `test/records.test.js` (6):
  - `SP_RECORDS` values;
  - the file store (folder per day, app and date, no time, a failed write);
  - the match host relay;
  - the lobby, with records on and off (real server, stub match);
  - `tools/records.mjs` reading, tables and `--verify` on a recorded match.
- By hand: a real server with records on, a real solo match left by its player. It wrote
  `2026-10-21/<id>.json.gz` with `app` 0.3.1, and without the player's name.
- `npm test`: 8,938 / 8,986 pass. The 2 failures are the same environment-only ones as in the sync PR (the
  manifest-on-disk check, IPv6). Typecheck is clean, lint has no new warnings, and the import check passes.
