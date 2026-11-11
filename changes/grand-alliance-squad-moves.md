## 2026-11-11

### Grand Alliance: join a squad instead of hopping seats

- In a Grand Alliance room you now change squad with Join Squad A / Join Squad B, shown on the other squad's empty seats. You take that squad's first free seat.
- You can't move inside your own squad any more, and you can change squad at most once every 5 seconds and 4 times a minute. The button counts down while you wait.
- Changing squad clears your Ready. The host can still swap two players, but only between the squads.
- Before: every empty seat had a Sit here button for every player, with no limit, so one player could jump around the room and make everyone's screen jump.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (0 / 0 GB/day) | 0.0005 / 0.000003 MB/s (0.05 / 0 GB/day): a member at the 4 moves a minute cap |
| Bandwidth out / in, per room (8 players) | 0.00002 / 0 MB/s: about 4 moves before a match, 8 KB each | 0.004 / 0.00002 MB/s: all 8 members at the cap (before: 2.6 MB/s, 40 moves a second each) |
| Bandwidth out / in, 300 players | 0.0007 / 0 MB/s (0.06 / 0 GB/day) | 0.16 / 0.001 MB/s (14 / 0.1 GB/day) (before: 96 MB/s, 8300 GB/day) |
| Server CPU | 0 % of one core | under 0.1 % of one core: one room update per allowed move |
| Memory | under 0.001 MB per room | under 0.001 MB per room: at most 16 players × 4 move times |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | 0 ms/round | 0 ms/round |

- Cap: one squad move per member per 5 s and 4 a minute; a refused move costs one 90-byte error and no room update.
  Before this change a member could move up to 40 times a second (the connection's message limit).
- Measured with the traffic meter: 6 test players in a Grand Alliance room, each allowed move sent one 0.9 KB room
  update to every member (the same before and after: about 8 KB a move with 8 members). Counted before WebSocket
  compression, so the real traffic is lower. Typical moves per match estimated; CPU and memory estimated from the code.
