## 2026-11-12

### The link between the servers survives a broken direct route

- When the US server's direct posts to Singapore's socket host (`SP_REGION_SOCKETS`) fail 3 times in a row, the link
  posts through Singapore's own host (stronghold-en.dev, through Cloudflare) instead. Every 5 minutes it tries the
  direct host again and goes back to it once it answers. Each switch is logged once.
- Before: a broken direct route left the link down until the route came back by itself (on 2026-11-11 for several
  hours), and cross-server matchmaking, counts and the room browser stayed local all that time.
- Only the link between the servers switches. Players' sockets and ping tests keep the direct host; nothing they see
  changes.
- While every post fails, the posts slow down from every 2 s to every 30 s, and go back to every 2 s once one gets
  through. `/healthz` shows `peer.fallback: true` while the link uses the fallback.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (server to server only) | 0 / 0 MB/s |
| Bandwidth out / in, per room | 0 / 0 MB/s | 0 / 0 MB/s |
| Bandwidth out / in, 300 players | 0.0003 / 0.00035 MB/s (0.03 / 0.03 GB/day) for the US server, the same as the direct link | 0.023 / 0.023 MB/s (2 / 2 GB/day); the hard cap is 0.13 MB/s (11 GB/day) |
| Server CPU | 0 % of one core (the same posts as before, one new connection when switching) | under 0.1 % of one core |
| Memory | 0 MB (six numbers) | 0 MB |
| Disk | 0 MB/day (one log line per switch) | under 0.01 MB/day (at most one switch-back and one switch line per 5 min) |
| Bot budget | 0 ms/round | 0 ms/round |

- Cap: the same one post per 2 s as before, each at most 256 KB (`MAX_BODY_BYTES`); the fallback only changes the
  route, not the amount. A direct try from the fallback adds one post per 5 minutes (+0.7 %) and gives up after
  2.5 s. While every post fails, at most one attempt per 30 s.
- Estimated from the code, per post: about 0.6 KB out and 0.7 KB in typical (state, signature and HTTP headers); at 300
  players all searching about 45 KB each way (300 queued players and 50 open rooms in the post and in Singapore's
  answer). Through Cloudflare that is about 43,000 requests a day on the free plan, the same count the link made
  before 2026-11-10, when it always went through Cloudflare.
