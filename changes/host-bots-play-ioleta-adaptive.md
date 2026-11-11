## 2026-11-11

### AI players in a player's browser can use Ioleta's adaptive AI

- New server setting `SP_HOST_BOT_STRATEGY` picks the AI that bots play when they run in a human's browser (`SP_BOT_EXECUTION=host`, and every Grand Alliance room). The servers are meant to set it to `ioleta-adaptive`. Bots the server plays itself keep the original AI, and a per-seat setting still wins. Unset, nothing changes.
- An unknown AI name in the setting stops the server at startup with a clear message.
- New tool `tools/hostbotbench.mjs` times the real browser bot Worker in a GPU Chrome over whole matches, per AI and room size, against the bot time budget.
- Measured on a desktop (14 preps, the same boards for both AIs): Ioleta's adaptive AI thinks less than the original. A whole round of bots took 3.8 s at the median and 18 s in the slowest round with 4 players (original AI: 6.4 s and 34 s), and 12.8 s and 79 s with 8 players (original AI: 17.1 s and 134 s). Only the last prep goes over the bot budget (42 s typical, 60 s there); the bots then place the best layout tried so far.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (0 / 0 GB/day): the same bot frames, only the AI in the browser differs | 0 / 0 MB/s |
| Bandwidth out / in, per room | 0 / 0 MB/s | 0 / 0 MB/s |
| Bandwidth out / in, 300 players | 0 / 0 MB/s (0 / 0 GB/day) | 0 / 0 MB/s |
| Server CPU | 0 % of one core: the setting is read once at startup | 0 % |
| Memory | 0 MB | 0 MB |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | 3800 ms/round with 4 players, 12800 ms/round with 8 (original AI: 6400 and 17100) | 18000 ms/round with 4 players, 79000 ms/round with 8, cut at the 60 s budget (original AI: 34000 and 134000) |

- Cap: the host browser's bot budget, 40 % of the prep time between 15 and 60 s; a bot that runs out places the best
  layout it tried. The bots run in the host's browser, never on the server.
- Measured with tools/hostbotbench.mjs (14 preps, the same boards for both AIs, a desktop GPU Chrome); the server
  figures are 0 by the code (no new frame, timer or file).
