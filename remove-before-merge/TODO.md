- [x] Figure out what tool this app was apparently vibe coded with
- [x] Translate documentation files to English (ex. README.md -> README.en.md). Do not modify the original file.
- [x] Determine if the game is possible to build and run locally in this container. Are we just missing dependencies? If we cannot do a full build and run inside the container, then what is possible to test?
- [x] Determine which game rules are owned by this repo, and which ones are downloaded on the fly (would need patching at runtime if we want to change them).

Feedback for feature/lobby-rules
- Looks good, plays correctly
- PR approved
- May want to change the text "Lobby Rules" to "Custom Lobby Modifications" so it's more obvious that this wasn't in the original game and some players would probably consider it cheating
- I noticed the graphics are ugly. This is probably just inherited from the previous repo
- We should add the originals as alternate remotes as well: https://github.com/sganggs/Stronghold-Protocol < https://github.com/YuriRestia/Stronghold-Protocol-EN-translation < https://github.com/evenifyouforget/Stronghold-Protocol-EN
- And then check if sganggs can be merged into here. Maybe the original CN is ahead with better graphics already? Make a new branch to try merging.

Known issue: stale browser data (2026-10-10)
- Two players on `main` both got "3D/WebGL rendering is unavailable on this device" and the plain 2D view; a full refresh plus clearing the browser cache fixed it for both. Treat as busted for now, but more cache bugs are likely after future updates; find a lasting fix.
- That message appears whenever the 3D engine fails to start within 12 s for any reason (public/js/ui/fieldHost.js LOAD_TIMEOUT_MS), not only without WebGL; the real cause is in the browser console line "[field] render engine unavailable, using the simplified view: …". Ask for that line next time.
- Not reproduced in a fresh headless Chromium: the engine mounts in about 1.3 s.
- What the browser keeps (server/http/files.js cacheControlFor): html, code and data are `no-cache` (revalidated every load); public/assets, public/fonts and public/vendor are cached for 1 day; `?v=` URLs are immutable. The asset-preload Service Worker (public/resource-sw.js) also stores /assets, /fonts and /media in Cache Storage. The vendor libraries did not change between en-translation and main, so the 1-day cache and the Service Worker's stored art are the leading suspects.
- Possible fixes to look at: version-stamp the 1-day-cached URLs per build (`?v=<build>`), show a "new version, reload" prompt when the build changes (upstream already detects new builds, CHANGELOG 0.2.2), and have the engine-failure toast offer a reload / cache clear.
