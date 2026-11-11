## 2026-11-11

### Every change states its server cost

- Behind the scenes: every changelog fragment now ends with a `Server cost:` block, either `none` or the numbers
  (typical and worst case per player, per room and for 300 players: bandwidth in MB/s and GB/day, server CPU, memory,
  disk, the host bots' time per round, and the cap that bounds it). `npm run changelog -- --check` refuses a fragment
  without one (format in `changes/README.md`).
- `npm run server-cost` checks a branch: when it touches server code, the protocol, the host-browser bot budget or adds
  network sends, repeating timers or file writes, one of its fragments must have the numbers. The lead's merge checks
  run it.
- A dev-only traffic meter: a dev server started with `SP_TRAFFIC_METER=1` counts WebSocket messages and bytes per
  message type, per room and per second; `npm run traffic-report` prints a test match's traffic in MB/s and GB/day,
  per player and for 300 players. It is never on in production or in a packaged release.

Server cost:

| Measure | Typical (production: meter off) | Worst case (dev server, meter on) |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (0 / 0 GB/day) | 0 / 0 MB/s: the report rides on GET /healthz from the same machine |
| Bandwidth out / in, per room | 0 / 0 MB/s | 0 / 0 MB/s |
| Bandwidth out / in, 300 players | 0 / 0 MB/s (0 / 0 GB/day) | 0 / 0 MB/s |
| Server CPU | 0 % of one core (nothing wrapped) | under 1 % of one core: one regex and a few counters per message |
| Memory | 0 MB | about 2 MB at the caps |
| Disk | 0 MB/day | 0 MB/day (nothing written) |
| Bot budget | 0 ms/round | 0 ms/round |

- Cap: off unless SP_TRAFFIC_METER=1, and never with NODE_ENV=production, SP_GEN or a packaged release; on, at most 200
  message types, 1000 rooms and the last 3600 seconds are kept.
- Estimated: CPU and memory from the code (no test match measured; the meter is dev-only).
