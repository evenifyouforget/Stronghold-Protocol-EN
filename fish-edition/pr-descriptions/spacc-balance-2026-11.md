The SPA-CC balance patch of November 2026: Fish's balance draft, tuned over three rounds of bot benches and replays of
Halley's record run (`fish-edition/untracked/spacc-balance-update.md`). Every tag level it changes gets " α" after its
name, so players can see what changed.

Base: `main` (df321603, after #136). Branch: `feature/spacc-balance-2026-11`.

## Changelog

**SPA-CC**

- **Suffocation 2 / 3 α:** operators' SP recovery −0.4 / −0.6 a second (was −0.5 / −0.8). Level 1 is unchanged (−0.2).
- **Famiglia:**
  - **Cleaner 1 α:** 3 Famiglia Shadow Silencers in co-op, 2 in solo (was 5). Rounds 10–13, the player with the fewest
    stacks, as before.
  - **Unending 2 / 3 α:** the Cleaner change above (they include Cleaner).
  - **Seasonal 2 / 3 α:** the Blood Debt fills to 300 before an Asset Liquidation (was 200), plus the Cleaner change.
- **Patriot:**
  - **Undying 2 α:** 2 Guerrilla Shieldguards join Patriot. In Marching Stance he takes 90 % less Physical and Arts
    damage from operators not blocking him. Skipping him still gives the final boss +100 % ATK. His +200 % HP, the
    immunities and the speed floor moved to Undying 3.
  - **Undying 3 α:** Patriot +200 % HP. In Marching Stance he is immune to Slow, Stun, Bind, Cold, Frozen, Frighten,
    Sleep, Fear, Levitate and Lure, and never slower than his base speed. He and his escort come again in the final boss
    rounds, whether he was taken or not (was: only if taken). Gone: the 5 Shieldguards, and every enemy +40 % move
    speed and +40 ASPD while he lives.
  - Undying 1 is unchanged.
- **Delegation:**
  - **United 1 α:** Degenbrecher, 2 Delegation Shieldbearers and 2 Delegation Centurion Champions (was 5 and 5). The
    Degenbrecher spawns at the start of the round. Her HP is 100 % per alive player. The minions keep the round's HP
    (was: the whole sub-wave 200 %).
  - **United 2 α:** the Degenbrecher's HP is 200 % per alive player (was: the whole sub-wave 300 %). ATK × 1.5 is hers
    only.
  - **United 3 α:** her HP is 300 % per alive player (was: the whole sub-wave 500 %). Momentum Murder's hard HP gate
    comes every 15 % of her HP (was 9 %).
  - **One HP bar for all fields:** the Degenbrechers of every boss field share their HP, so a wiped board doesn't leave
    a Degenbrecher that can never die. One field's finished Momentum Murder opens the gate on every field.
- **Vengeance:**
  - **Invincible Blade 2 α:** Reid, "Hateful Avenger": +50 % ATK, Status Resistance, 40 % less Physical and Arts
    damage below 50 % HP (was 30 %), 15 s invulnerable after reviving. The +150 % HP is gone.
  - **Invincible Blade 3 α:** one more Reid per 200 stacks above 200, as before. Below 50 % HP: 80 % less Physical
    and Arts damage (was 60 %) and +100 ASPD. The status immunities are gone.
  - Invincible Blade 1 is unchanged.
- **Text:** the tag texts in all four languages follow the new numbers. The α list is one constant (`BALANCE_ALPHA`
  in `public/js/ui/lobbyRules.js`), so a later patch can clear it in one place.

**Bots**

- `take-patriot` tactic and the `fish-patriot` profile: legacy that always takes the Patriot card. The balance benches
  needed bots that take him. Not in any room's list by default.
- Bot fields played in a browser get the linked Degenbrecher HP too (`b.pool` carries it; results report `degen` /
  `degenGate`).

## How it was checked

**Bots:** 4 legacy bots, co-op Ultimate, the same 80 seeds on main and on this branch. Compared with no tags (55 of
80 wins). Details: `fish-edition/untracked/spacc-balance-update.md`.

| Tag level | Main vs no tags | This branch vs no tags | Seeds won / lost, p |
|---|---|---|---|
| Suffocation 2 α | −19 pts | −19 pts | no change |
| Suffocation 3 α | −51 pts | −41 pts | 14 → 22 wins |
| Cleaner 1 α (co-op, 3) | −18 pts | −16 pts | |
| Unending 2 / 3 α | | −49 / −45 pts | about as main |
| Seasonal 2 / 3 α | | −42 / −45 pts | +14 / +15 pts, p 0.02 / 0.008 |
| Undying 1, taken | −2 pts | −2 pts | |
| Undying 2 α, taken | −1 pts | 0 pts | |
| Undying 3 α, taken | −28 pts | −22 pts | p 0.22 |
| Undying 1–3, skipped | about −60 pts | about −60 pts | |
| United 1 α | −24 pts | −12 pts | 12 / 3, p 0.04 |
| United 2 α | −38 pts | −15 pts | 18 / 0, p < 0.001 |
| United 3 α | −45 pts | −15 pts | 24 / 0, p < 0.001 |
| Blade 2 α | −9 pts | −9 pts | no change |
| Blade 3 α | −14 pts | −9 pts | p 0.22 |

Solo Cleaner 1 (legacy, solo Ultimate, seeds 1–40): 3 wins with 5 Silencers, 6 with 2 (no tags: 14).

**Halley's Ultimate+26 run**, replayed battle by battle with one tag changed (solo, with #131):

- Cleaner 1: 42 LP lost with 5 Silencers, none with 2.
- Seasonal 2: free.
- Unending 2 / 3: 44 LP (was 56).
- Seasonal 3: 30 LP.
- Patriot, skipped as he did: Hidden Core 12.1 s as played, 12.4 s at Undying 2, 14.8 s at Undying 3.
- Delegation: Final Assault 10.5 s as played, 33.4 s at United 2, 50.8 s at United 3.

**Tests:** full suite: see the PR comment.

## Known issues

- `fish-edition/spacc/working-spec.md` still describes the old numbers.
