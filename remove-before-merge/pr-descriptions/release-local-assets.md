# Fetch the local-client art from a full release (no client needed)

Target: `main`. Branch `wip/release-local-assets`. Tooling and docs only (no game code), so also fit for Yuri.

An install without an Arknights client (for example a Linux server running from source or from the lite package)
has no `public/assets/local/`, so it misses the official board, scenes, enemy and summon models. DEPLOY.md §6 says to
copy that folder and `data/local-assets.json` by hand from the full release zip of the same version. This adds a
script that does it:

```
npm run assets:release-local        # = node tools/fetch-release-local.mjs
```

- **Reads only what it needs.** The zip's central directory (a few MB) and then the local-art entries are read with
  HTTP range requests, about 200 MB of the ~800 MB v0.3.1 zip (111 MB of 552 MB for v0.2.5). Nothing is unpacked by hand.
- **Same version by default:** `v<package.json version>`, as DEPLOY.md asks. `--tag v0.3.1` picks another release,
  `--latest` the newest, `--repo` another GitHub repository, and `--url` any full-package zip on a server that answers
  range requests. `--dry-run` lists what it would fetch.
- **Touches nothing else.** Only `public/assets/local/` and `data/local-assets.json` are written, and both are
  git-ignored. The code, data, other assets and any local dev or gameplay changes stay as they are.
- **Safe:**
  - every file is CRC-checked;
  - files are staged in `.cache/release-local/<tag>/`, so an interrupted run resumes;
  - the current local art is moved to `.cache/release-local/previous-<time>/`, never deleted;
  - a failed run swaps nothing in;
  - re-running with the same release is a no-op.
- Node only (no Python, no unzip), so it works the same on Linux, macOS and Windows.

## How it works

- `tools/fetch-release-local.mjs`: `readEocd` (zip64 aware), `parseCentralDirectory`, `selectLocalEntries` (one
  optional top folder; skips directories and any path that would leave the target), `groupRanges` (adjacent entries
  in one request of up to 16 MB), `extractEntry` (stored / deflate, CRC), `run`.
- GitHub's release storage refuses suffix ranges (`bytes=-N`, HTTP 501), so the size comes from a 1-byte read first.
- Docs: `docs/DEPLOY.md` and `docs/DEPLOY.en.md` §6, after the copy-by-hand paragraph. `package.json`: the
  `assets:release-local` script.

## Tests

- New `test/fetch-release-local.test.js`: an in-memory zip behind a fake fetch that refuses suffix ranges. It covers:
  - only the two targets are installed;
  - the previous files are moved aside;
  - a re-run is a no-op;
  - resume keeps good staged files and fetches a wrong one again;
  - a CRC mismatch or a zip without the manifest swaps nothing in;
  - a server without range support is reported;
  - entry selection and range grouping.
- Real run against v0.2.5: 1,707 files in 56 s. `node tools/doctor.mjs` then shows "本地客户端美术 1658 项，3D 棋盘可用，已提取各战场官方场景"
  (local client art: 1,658 entries, 3D board available, official battlefield scenes extracted).
  A dry run against v0.3.1: 14,323 files, 200.6 MB to download.
- `npm run ci`: one test fails because of local art, but it isn't caused by this script. With the summon models on
  disk, `test/local-token-models.test.js` ("the committed metadata is what the extracted models parse to") fails
  because our committed `tools/assets/local-token-spines.json` has no per-clip `extents`, which the parser now writes.
  Yuri's `dev-0.2` already has the regenerated file, so the next sync from Yuri fixes it. It fails the same way on a
  machine that extracted from a client. Otherwise all green, except `test/ipv6-bind.test.js` (needs IPv6, unavailable
  in our container). The asset-suite failures in a worktree with *only* the local art and none of the downloaded
  assets are that setup, not the script: a real install runs setup's download first.
