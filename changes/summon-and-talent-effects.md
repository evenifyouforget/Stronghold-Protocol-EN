## 2026-11-11

### Summon and talent effects from the game client (part 1)

The game client defines effects for summons and for talents that we never drew. This part adds:

- **Summons know their summoner.** Each summon now tells the game which operator summoned it, so that operator's effects can play on it. Kal'tsit's Mon3tr now shows her S1–S3 buffs, Pozëmka's sub-bow shows hers, Closure's command center shows its S2 and S3 range loops, and Vigil's wolves and Mechanist's summons show their skill buffs.
- **Muelsyse's clones.** A clone that splits during S3 now plays the official split effect, and its official end effect where it stood when it goes.
- **Talent effects on other units.** Pallas's Peak Performance glow on the allies that have it, and her S3 blessing; Texas the Omertosa's S1 cut on the enemies it hits; Eunectes's S2 stun on the enemy she blocks; Astgenne the Lightchaser's S3 link on each linked enemy; Ho'olheyak's S3 lift; Insider's ammo grant on the chosen ally; Shu's S3 seed mark on marked enemies.
- **Talents that fire at a moment.** Necrass's skeleton upgrade glow and her S3 special skeleton's growth; Kal'tsit Esperanta's S3 teleport out and landing; Typhon's S3 aim; Narantuya's S3 boomerang return.
- **Sandbox.** A new `&tokens=` link parameter places summon pieces next to their summoner (Mon3tr, Closure's command center).

### Summon and talent effects from the game client (part 2)

Talent and trait effects that depend on what is happening in the battle now show while that holds:

- **Ready and charged states.** Papyrus's and Lessing's glow while S1 is ready; Leizi the Thunderbringer's and Młynar's trait glow grows with their attack ramp.
- **Effects while something lasts.** Nasti's S2 shield while it holds; Lucilla's S2 talent boost while S2 runs; Heavyrain's S2 aura on the allies inside it; Humus's recycle shield while it holds; Lee's guard while it is up, and its hit when it cancels a stun.
- **Marks and moments.** Carnelian's S3 mark on enemies, part-charged and full; Swire the Elegant Wit's merchant payment and revive; Humus's trait heal; Aroma's S2 landing; Тоска's heal and SP grant on the ally.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0.0001 / 0 MB/s (0.01 / 0 GB/day) | 0.001 / 0 MB/s (0.09 / 0 GB/day) |
| Bandwidth out / in, per room (4 players; 8 in Grand Alliance) | 0.0004 / 0 MB/s (0.0008 with 8) | 0.004 / 0 MB/s (0.008 with 8) |
| Bandwidth out / in, 300 players | 0.03 / 0 MB/s (2.6 / 0 GB/day) | 0.3 / 0 MB/s (26 / 0 GB/day) |
| Server CPU | under 0.1 % of one core | under 0.5 % of one core |
| Memory | under 0.1 MB | under 1 MB |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | 0 ms/round | 0 ms/round |

- Default client-side combat (production; `SP_COMBAT` unset): 0 for all of it. The server sends no `b.snap` for combat
  there (docs/design/network.md); the table is the legacy server-run mode (`SP_COMBAT=server`).
- Cap: one `fxs` row per unit and buff, gone with its duration or the unit's deployment; a field sends its rows only
  when they change (`fxd`), plus the whole set once a second and to a watcher that just started or whose last frame was
  dropped (shared/fxsDiff.js); the client keeps the sets of at most 16 fields. The probes run only when a snapshot is
  built (the bots build none).
- Estimated, not measured: rows of about 40 bytes; typical 3 rows and about 1 change a second, worst case 40 rows (Carnelian's
  marks on a full wave and Heavyrain's aura on every ally) and about 10 changes a second; about 2.5× smaller after the
  WebSocket's deflate. Every frame used to repeat every row: 5× more (0.15 / 1.5 MB/s for 300 players). Part 1 went in
  before the rule (unmeasured); its rows now go on change too.
