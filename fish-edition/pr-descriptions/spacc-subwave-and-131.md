Two gameplay fixes split out of the SPA-CC balance branch, so they can reach main without the balance update. Fish:
"you can bundle them in one pr targeting main, since nothing else will target main for a while".

Base: `main` (7bf71d0c, #130). Branch: `fix/spacc-subwave-and-131` (cherry-picks of 17c3486c and 63f6d6d6 from
`feature/spacc-balance-2026-11`).

## Changelog

- **SPA-CC:** the Delegation, Patriot and Vengeance sub-waves walk again. A sub-wave spawned for a boss field took the
  leader's route. In the Hidden Core that route stands still for 500 s, so the sub-wave never moved: United 2's
  Degenbrecher held the pool until the overtime. A sub-wave now never takes a leader's standing route
  (`server/match/waves.js`).
- **Fixes:** promoted operators, and their summons, ignore the 300,000 leader-hit limit (#131). Damage with no hitting
  unit (element bursts) is still limited (`server/sim/attack/health.js`, `hit.js`; the client's hit-cap effect in
  `public/js/render/fx/kinds.js`).

Closes #131

## Tests

- `test/match/risk-tags.test.js`: no sub-wave route stands still, in either final round.
- `test/sim/playtest6_limits.test.js`:
  - a promoted operator's hits and HP loss get through the limit, with no hit-cap effect;
  - so does its summon's hit;
  - a normal operator's summon, and damage with no source, are still limited.
- Full suite (`npm test`) on this branch: see the PR comment.

## Known issues

- None known. The balance changes that came with these fixes stay on `feature/spacc-balance-2026-11`.
