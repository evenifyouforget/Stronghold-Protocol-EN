## 2026-11-11

### Plain-text nicknames

- Doctor names follow the same plain-text rules as chat: letters of every language, digits, punctuation and a few signs. Emoji, symbols, HTML tags, invisible "filler" characters and "Zalgo" stacks are removed, and fancy-font letters become normal letters.
- Before: a name could hold emoji, symbols or invisible filler characters (blank-looking names).
- A name made only of removed characters counts as empty, so the title screen asks for another one.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (0 / 0 GB/day): no new messages | 0 / 0 MB/s |
| Bandwidth out / in, per room | 0 / 0 MB/s | 0 / 0 MB/s |
| Bandwidth out / in, 300 players | 0 / 0 MB/s (0 / 0 GB/day) | 0 / 0 MB/s |
| Server CPU | ≈ 0 % of one core: the chat filter once per login, about 1 µs | ≈ 0 % (a name is at most 12 characters) |
| Memory | 0 MB | 0 MB |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | 0 ms/round | 0 ms/round |

- Cap: a name is at most 12 characters and is cleaned once per hello.
- Estimated: CPU from the measured filter time of a chat line.
