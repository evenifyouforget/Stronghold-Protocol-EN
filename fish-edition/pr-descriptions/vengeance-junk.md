# SPA-CC prototypes: Objective: Junk 1 / 2, Vengeance: Invincible Blade 1 / 2 / 3

Target: `wip/famiglia` (stacked; retarget to `main` once that merges). Branch `wip/vengeance-junk`. Custom lobbies only.
Details and readings: `remove-before-merge/spacc/working-spec.md` §19–20.

## Junk

- Every player starts with a **Cursed Hammer**: carrier ATK −50 %; it cannot be destroyed (sold, destroyed by the
  player, replaced away or lost from the temporary hand); no Damazti Isomorph pairing. Junk 2: −1 income each round it isn't equipped.
- The item record is made at run time like Blaze's (`shared/ruleData.js ruleDataPatch` → `items`, applied by the match,
  and by the client through `data.js` `RULED_FILES`); its ATK cut is applied in battle by `content/risk.js installJunk`.
- Match: the start grant and the income (`player/round.js`), never expiring (`player/prep.js resolveTemp`), never replaced
  or destroyed (`player/items.js`).

## Also (Fish's spec of 2026-10-15)

- Delegation United 1: 5 Shieldbearers and 5 Centurion Champions (was 10 each); United 2's charge also resets while
  Degenbrecher cannot move.

## Vengeance

- Reid, "Hateful Avenger" (`enemy_1539_reid`): 1 per 300 total stacks in every normal battle; in the final boss rounds by
  everyone's stacks, once per field on the left-first route. Blade 2: +150 % HP, +50 % ATK, Status Resistance, 30 % DR
  below half HP, 15 s invulnerable after his revive. Blade 3: ×2, +100 ASPD, 60 % DR and immunities below half HP.
- `Match.riskBounties` / `bossSubWave` / `vengeanceCount`; `content/risk.js installVengeance`; his revive's invulnerability
  in his kit (`enemies/leaders.js`).

## Tests

- New: `test/sim/risk-junk-vengeance.test.js`; extended: `test/match/risk-tags.test.js` (the hammer's grant / temp /
  replacement / income, Reid counts), `test/match/rebalance.test.js` (the client sees the Cursed Hammer).
