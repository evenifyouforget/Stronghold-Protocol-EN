## 2026-11-12

### Thorns the Lodestar's third skill covers the official area

- Thorns the Lodestar's S3 now works like the official game: one sea area spanning the operators it lands on (the
  shape between them, fixed where it was thrown), burning the enemies inside once per interval. Before, each targeted
  operator got its own ring reaching 1.5 tiles out, moving with them and burning on its own, so an enemy near two of
  them burned twice.
- The area reaches a third of a tile past the line joining the targets on every side; when they stand in one line it
  is a strip two thirds of a tile wide along it. The official line effect now runs around the area's corners.
- Its targets follow the official rule: operators in his range only (he can pick himself), the lowest Block first, a
  tie going to the latest deployed. Alone in range, the area is just his tile: enemies standing on it burn, but huge
  enemies never do, as in the official game; otherwise a huge enemy counts once its body reaches the area's box.
- With official effects off, the area shows as one outline through its corners instead of a ring per operator.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (0 / 0 GB/day) | 0.00001 / 0 MB/s (under 0.001 / 0 GB/day) |
| Bandwidth out / in, per room (4 players; 8 in Grand Alliance) | 0 / 0 MB/s | 0.00004 / 0 MB/s (0.00008 with 8) |
| Bandwidth out / in, 300 players | 0 / 0 MB/s (0 / 0 GB/day) | 0.003 / 0 MB/s (0.26 / 0 GB/day) |
| Server CPU | 0 % of one core | under 0.01 % of one core |
| Memory | 0 MB | under 0.01 MB |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | 0 ms/round (one area check instead of three ring checks) | 0 ms/round |

- Default client-side combat (production; `SP_COMBAT` unset): 0 for all of it; combat runs in the browsers
  (docs/design/network.md). The worst case is the legacy server-run mode (`SP_COMBAT=server`).
- Cap: one area per S3 cast, gone with the skill's duration; its three `zone` events carry the corners once (at most 3
  points and a short key).
- Estimated, not measured: about 60 extra bytes per zone event, 3 events per cast, a cast at most every few seconds
  per field.
