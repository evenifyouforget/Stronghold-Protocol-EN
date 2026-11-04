# Room: bot profiles per AI seat, and "Fill remaining seats with AI"

Base: `wip/bot-tactics` (#110, stacked on it; **retarget to `mini/0.3.1-4` after #110 merges**, the repo squashes only). Branch `wip/bot-profile-select`. PR #114.

Closes #107.

The room's host picks the bot profile of each AI seat, and fills the free seats with one drop-down. Nothing changes for a room where nobody picks: the AI plays the basic bot (`legacy`) as before, and `room.state` and the match's options keep their keys.

## What it adds

- **`shared/botProfiles.js`**: the profiles a room offers, with their names and one-line descriptions:
  - Basic bot (`legacy`, the default)
  - Level curve (`fish-level`) and Tier 6 first (`fish-tier6`), #110's profiles
  - Ioleta opening (`ioleta`), Adaptive placement (`adaptive`), and both (`ioleta-adaptive`), upstream's opt-in strategies
  - `external` (a dev checkout's LLM host) is never offered.

  The fill presets: **All basic bot** for now. Recommended and Optimized come later (#107), each one a line in `FILL_PRESETS`.
- **Server** (`server/lobby.js`, `shared/protocol.js`), host-only and before the match:
  - `room.addBot { lang?, bot? }`: adds an AI with that profile.
  - `room.setBot { seat, bot }`: changes an AI seat's profile.
  - `room.fillBots { preset, lang? }`: fills every free seat with the preset's AI (co-op rooms only).
  - `room.state` names a seat's `bot` only when it isn't the default.
  - The match gets `opts.botStrategySeats` (upstream's per-seat strategies, sganggs #890) only when some seat has a profile. The room's picks go over the operator's `SP_BOT_STRATEGY_SEATS`, so those still apply to seats the host left on the basic bot.
- **Room screen**:
  - **AI seat plate:** the host gets a drop-down of profiles under the AI's name. The others see the profile's name there when it isn't the default (otherwise "AUTONOMOUS UNIT" as before). The description shows on hover.
  - **"Fill remaining seats with AI":** a drop-down at the footer's left. The host sees it in a co-op room with a free seat, while not searching for teammates. On screens under 900 px wide the footer has no left column, so there it shows as the robot icon alone, with the same drop-down.
- Texts in English, Japanese, Korean and Traditional Chinese.

## Tests

- `test/lobby-bot-profiles.test.js`:
  - The list's ids are registered, legacy is first, and `external` is absent.
  - Protocol validation of the three messages.
  - `addBot` with and without a profile.
  - `setBot` is host-only and works on AI seats only; setting the default removes the key.
  - `fillBots` fills every free seat, is host-only, and is refused in a solo room and a full one.
  - The match's options: no `botStrategySeats` in a default room, the picks when set, and the merge with `SP_BOT_STRATEGY_SEATS`, resolved by the real `getBotStrategySeats`.
- `test/ui/bot-profiles.test.js`: when the fill drop-down shows; the room screen's requests and texts.
- Local results:
  - lint: 0 errors; typecheck passes;
  - i18n, lobby, version guards, bot strategies and tactics: 344 tests, 0 failed;
  - client and UI: 2085 tests, 0 failed.
- In headless Chromium, at 1600×900 and 740×360 (English) and 1280×720 (Japanese): add an AI with a profile, fill the rest from the drop-down, then change a seat's profile. No page errors. The drop-down leaves once the seats are full.

## Known issues

- The profiles aren't measured yet (#110), so their names say what they do, not how strong they are.
- A spectator who takes over a seat by AI takeover plays the basic bot. The profile picks apply to the room's AI seats only.
