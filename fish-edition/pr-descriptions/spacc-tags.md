# SPA-CC: the second batch of Risk tags, tag groups

Target: `wip/spacc` (stacked). Branch `wip/spacc-tags`. Custom lobbies only. The tags, their numbers and the readings I
made are in `remove-before-merge/spacc/working-spec.md`.

## New tags

- **Deep Infiltration** (DP −50 %), **Low Efficiency** (redeployment +75 %), **Last Line of Defense** (+2 LP past the
  per-round limit when your own battle leaks).
- **Originium Zone: Arts / Physical / Lockout 1–3**: decided on the final boss's shared pool, for all fields together.
- **Tag groups**: a level includes the ones above it and excludes its siblings.
  - **Famiglia**: Cleaner (the old `ccSilencers`). Unending / Seasonal wait for the Blood Debt design.
  - **Patriot**: Undying 1 / 2, Support 3, Rampage 3 (replaces the provisional tag).
  - **Delegation**: United 1 / 2, Cloned 3, Resilient 3.

## How it works

- `shared/rules.js`: a tag group is a `level` rule with `nodes` / `parent` (`tagNodes`, `tagHas`).
- `server/sim/bossRisk.js`: the boss-pool state (Arts / Physical shares, Lockout gates and 无敌, United 2's hold). The
  server's `SharedBossPool` owns it; `b.pool` carries its view (`risk`); fields report `bossArts` / `bossPhys` / `hold`
  in `b.progress` and clamp their own damage to the view's floor (`LocalBossPool`). Each field's boss gets the buffs
  (`content/risk.js`).
- Match: the round-9 Patriot card (`spDraft.js`), the sub-waves of the final boss rounds (`Match.waveBounties(ps, { boss })`
  with `riskMods`), the round's LP (`Match.riskLoss`).
- Kits: Patriot's spear (Support 3), Degenbrecher's gate (Resilient 3). Engine: a `moveFloor` buff flag.
- Rules dialog: the grid lays groups out as trees; the effects list shows every level in force.

## Tests

- New: `test/sim/risk-pool.test.js`; extended: `test/match/risk-tags.test.js`, `test/sim/risk-tags.test.js`.
- Golden replays unchanged (tags off).
- `npm run ci`: all green except `test/ipv6-bind.test.js` (needs IPv6, unavailable in our container).
- Checked in headless Chromium: the Risk grid with groups chosen.
