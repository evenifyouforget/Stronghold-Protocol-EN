## 2026-11-12

### Grand Alliance: One for All

- A Grand Alliance host can switch the room's strategy from Free pick to One for All. Everyone then votes in secret for
  one strategy, and the whole room plays the winner.
- Everyone votes at the same time, with one 50 s clock. You see only your own card and how many Doctors have locked in.
  Confirm locks your vote. When everyone has locked in, the vote ends at once.
- If you don't confirm, your highlighted strategy counts. With nothing highlighted, you vote for a random strategy (never
  one switched off this match). A tie is a random draw among the tied strategies.
- The reveal plays on Protocol Start!: every Doctor's pick lands on their card, the lines grow into the ship, the winner
  bursts into the centre under a gold ALL!, and the other picks glitch and turn into it.
- One for All rooms have their own badge and filter in the room browser and are matched only with each other. The
  stats page keeps One for All as its own mode.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | +0.000002 / 0 MB/s averaged over a match (+0.0002 / 0 GB/day) | the same: a vote sends one update per lock, a highlight sends nothing |
| Bandwidth out / in, per room (8 players) | match: +34 KB once (296 KB instead of 261 KB from the draft to round 1); room: 9 KB per switch of the strategy mode (about 2 per room) | the host toggling nonstop: 0.018 MB/s per room (rate limit 2 a second) |
| Bandwidth out / in, 300 players | +0.0005 / 0 MB/s (+0.07 / 0 GB/day with the switches), every room One for All | 0.67 MB/s if every host of 37 rooms toggled nonstop |
| Server CPU | under 0.01 % of one core (one tally of at most 8 votes per match) | the same |
| Memory | under 0.001 MB per room (at most 8 votes and highlights) | the same |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | 0 ms/round (bots never vote; a dropped seat's vote is one random draw) | 0 ms/round |

- Cap: the strategy switch is in the heavy rate bucket (6 at once, then 2 a second per connection); one vote per seat, locked for good (a second Confirm or a highlight after it is refused with a short error and no
  update); at most 8 seats; the vote ends after 50 s at the latest. BATTLE_CHECK runs 7.5 s instead of 3 s in this mode,
  with no traffic of its own.
- Switch measured with the lobby harness (room.state 1.14 KB to each of 8 members; the room list +16 B per One for All
  row). Vote measured in a Node match (8 players, every message's JSON counted per receiver, before WebSocket compression):
  today's squad draft vs the vote, from the draft to round 1. 300 players = 37.5 rooms, one match per 40 minutes each,
  estimated. CPU and memory estimated from the code.
