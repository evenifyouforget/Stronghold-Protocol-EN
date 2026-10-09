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