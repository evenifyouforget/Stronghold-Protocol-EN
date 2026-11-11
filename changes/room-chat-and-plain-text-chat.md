## 2026-11-11

### Chat in the alliance room

- The room screen (4 players or a Grand Alliance's 8) has a chat log under the seat cards: time, name (squad A green, squad B blue, yours gold) and the line, plus who joined or left. Scroll up to read back; a "↓ N new messages" button brings you down again, and ⤢ makes the log taller.
- Each line also pops a bubble over the sender's seat card, emotes too. The mute button on each player's name plate hides their bubbles and their lines (the same mute list as in the match).
- On a phone the log is a Chat button with an unread count and the last line; tap it to open the log over the left half of the screen.
- No kill wallet in the room: anyone seated can talk, up to 100 letters a line. Spectators can read along.
- Spam limits: one line every 1.5 s, 6 lines in any 15 s and 20 lines in any 5 minutes; going over pauses your chat for 30 s, then 60 s, then 120 s. The same line twice within 10 s is dropped. Reconnecting does not reset a pause.
- If the whole server's chat gets too busy, or one room uses more than its fair share, a line is not sent and you see "Chat is busy. Try again in a moment." A room that floods the chat only silences itself, and lobby chat can never use up the part of the budget kept for in-game chat.
- If you lose the connection and come back, you get the lines you had already seen. Someone who joins later does not see older lines. Chat is kept only in the server's memory, never saved, and is gone when the room closes.

### Plain text in both chats

- Match chat and room chat now take plain text only: letters of every language, digits, punctuation, currency signs and a few maths signs. HTML tags, emoji, symbols, invisible characters and "Zalgo" stacks of accents are removed; fancy-font letters become normal letters.
- Before: match chat let emoji and any other character through.
- A match chat line is also at most 100 letters now, whatever your kill wallet holds, and the same spam limits and busy check apply there.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0.00001 / 0.000002 MB/s (0.001 / 0.0002 GB/day): a line a minute in a 4-player room | 0.004 / 0.0004 MB/s for a 15 s burst; 0.0006 / 0.00007 MB/s sustained (0.055 / 0.006 GB/day) at the 5-minute cap, longest lines, 9 receivers |
| Bandwidth out / in, per room | 0.00004 / 0.00001 MB/s (4 players); 0.0002 / 0.00003 MB/s (Grand Alliance, 8) | 0.008 MB/s out, the room's fair share (0.7 GB/day); ≤ 0.003 MB/s in |
| Bandwidth out / in, 300 players | 0.001 / 0.0002 MB/s (0.08 / 0.02 GB/day): a third chatting a line a minute | 0.033 MB/s out, the server-wide budget (2.8 GB/day; without it 0.19 MB/s, 16 GB/day); ≤ 0.02 MB/s in |
| Server CPU | ≈ 0 % of one core (1.3 µs filter per line) | ≤ 5 % of one core (≤ 260 µs filter, one run per player per 1.5 s), plus under 0.1 % for sending at the budget |
| Memory | ≈ 0.5 MB | ≈ 1.5 MB at 300 players; ≤ 16 MB at the server's 1,000-room limit (16 KB history per room, under 1 KB of limits per player, about 100 B of budget per room chatting now) |
| Disk | 0 MB/day | 0 MB/day (nothing logged or saved) |
| Bot budget | 0 ms/round | 0 ms/round |

- Cap: one server-wide chat budget of 32 KB/s on the wire (room and match chat together, `SP_CHAT_BUDGET_KBPS`); a quarter of it only match chat may use (`SP_CHAT_MATCH_RESERVE`), so room spam never blocks in-game chat; one room or match may use at most a quarter (`SP_CHAT_ROOM_SHARE`), so a spamming room only silences itself. Per player: 100 letters a line, one line per 1.5 s, 6 in any 15 s and 20 in any 5 minutes, then pauses of 30 / 60 / 120 s; per network 20 lines in any 15 s; a chat frame over 600 characters is refused; floods stop at the existing 40 messages a second per connection. Over the budget or a room's share the sender sees "Chat is busy. Try again in a moment."
- Measured: message sizes (100 B typical, 987 B the longest) and filter times with the real server code; estimated: how often players chat, receivers per line, and 80 B of TLS / TCP overhead per message.
