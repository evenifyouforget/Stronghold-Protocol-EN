# Changelog

> English translation of [CHANGELOG.md](CHANGELOG.md). The Chinese original is the authoritative version.

## 0.1.2 — 2026-10-04

Fixes the issues reported on GitHub after the 0.1.1 release; merged PRs #27, #28, #29 and #48, and adopted the test cases from PR #40. Every report was first reproduced on 0.1.1, only the genuine ones were fixed, and every fix was independently re-reviewed before merging. Rules were checked against the official data and PRTS; the few details with no findable source are implemented by inference — see [docs/DESIGN.md](docs/DESIGN.md) §22.

### Battle

- An Operator deployed facing up now falls over using the front-facing model when knocked out, instead of freezing on its attack, skill or idle animation (GitHub #25).
- Raid redeploys only land on tiles that can hit ground enemies; when no enemy is in reach it stays put instead of jumping around (GitHub #51).
- Ulpianus's S3, while blocking an enemy, lands on his own tile, no longer walks away and no longer leaves a marker behind; the bonus from Ægir's Devour is kept after he 【moves】 and returns (differs from the official game, intentionally kept; GitHub #33).
- After Surtr enters "Remnant Ash" (HP lock) she cannot be healed: Medics no longer heal her and the status bar shows the healing-disabled icon; the heal at the start of S3 still works (GitHub #52).
- Specter the Unchained's decoy is now drawn, and the decoy neither attacks nor uses skills; when S2 ends she swaps to the decoy instead of just falling over; she doesn't swap while the Durable Victorian Hammer's undying window is still active (GitHub #44).
- The floating units of Lappland the Decadenza's S3 attack enemies, rather than only the skill's own area damage (GitHub #32).
- Yu's S2 can teleport Leaders next to him (except self-bound ones), and no longer plays the pull effect when nobody is teleported; it now fires whenever an enemy is in skill range instead of waiting to be attacked (differs from the official "Defender Operators trigger their skill on taking damage" — an intentional change; GitHub #32).
- Gladiia and other Hookmasters and Push Strokers can be deployed on ranged tiles, per the official trait "can be deployed on ranged tiles" (GitHub #32).
- Enemy splash, explosions, area skills, zones and auras cannot hit Camouflaged Operators that aren't blocking them; Operators with Camouflage (迷彩) are still hit by splash as usual (GitHub #32).
- Horn and Ashlock (incl. Elite) cannot attack aerial units per the official game, and no longer splash onto them (GitHub #35, PR #48).
- Operators forced off the field, such as by Surtr's "Remnant Ash" or Nearl the Radiant Knight's S2, leave a downed Operator in place showing a redeploy countdown just like a knockout, and redeploy back to that tile (per the PRTS Stronghold Protocol help; GitHub #60).
- Mostima's slow (talent −15%, ×3 during S3) now shows a slow icon on enemies; the slow itself always worked (GitHub #16, PR #48).

### Enemies

- Unblocked ranged enemies now stop for each attack and finish the attack animation before moving on, instead of sliding while shooting (the pause is taken from the length of each one's attack animation; GitHub #58).
- Invisible enemies are revealed when blocked and only turn invisible again 3 seconds after the block ends (official mechanic; a few enemies are 0 or 1 second per the official data) — previously they vanished on the next frame. A Dublinn Flamechaser Soldier knocked out while blocked stays revealed for about 2 seconds after its 1-second "Remnant Ash" rebirth ends, so ranged Operators and Operator splash can finish it off; an ash knocked out while unblocked turns invisible immediately and, like the official game, needs blocking or anti-invisibility (GitHub #43).
- The effect of Active Originium persists for 300 seconds after the enemy leaves the tile (cleared on rebirth); swamps tick once per second, and units with weight ≥ 3 gain 2 stacks per tick; Deep Water damage is source-less true damage over time, not environmental damage (GitHub #33).

### Alliances and items

- Ægir's Devour skips members it has already knocked out: it no longer settles against them, and revived members stay standing (GitHub #33).

### UI

- The Operator Loadout screen gains "In-Match Stats": shows HP, ATK, DEF, RES, Attack Interval, Block, Cost, Redeploy Time, Attack Range, plus trait and talents for the selected skill and Module, switchable between Elite / Normal (GitHub #64).
- The trait on the Operator detail card now also shows the Module's trait when a non-default skill or Module is selected; previously it fell back to the class trait.

### Assets and tools

- Without extracted local-client assets, setup also downloads the battle emotes and the "How to Play" pages (about 21 MB) from public mirrors, so they are no longer missing; the deployment docs were corrected to match (GitHub #42).
- The English name is now the official Stronghold Protocol: Alliance; the Chinese name 卫戍协议：盟约 and the repository name are unchanged (raised in GitHub #38; a full English UI is still under discussion, and #38 stays open).
- The launcher's "send to friends" no longer treats a proxy's TUN address as the public IP (PR #27).
- Audio now goes through the extension-less /media route, so download managers such as IDM and Xunlei no longer pop up a "Download File Info" dialog (PR #28).
- Opening the browser on Windows now uses explorer.exe (system association), falling back to rundll32 only when that isn't found (PR #29).

## 0.1.1 — 2026-10-03

Fixes issues reported by players after the 0.1.0 release (32 in total, 4 of which turned out not to be problems after checking). Also handled GitHub issues #1, #4, #5 and #8, merged PRs #10 and #12, and adopted the problems pointed out by PRs #2, #7 and #14. Rules were checked against the official data and PRTS; the few details with no findable source are implemented by inference — see [docs/DESIGN.md](docs/DESIGN.md) §21.

### Battle

- Phalanx Casters (Carnelian, Mint, Beeswax, Pramanix the Prerita) hit every enemy in attack range with each attack while their skill is active, and Blast Casters (Aroma, Akkord) hit every enemy along a whole line; previously they hit one target and then splashed.
- Carnelian does not attack while charging S1, per the official game; she only keeps her high DEF and RES.
- Underflow's and Liskarm's S2, Horn's S2 and S3, and Ashlock's S1 and S2 now fire whenever an enemy is in attack range, without waiting to be attacked (many people reported this; it is an intentional departure from the official "Defender Operators trigger their skill on taking damage"; GitHub issue #4, PR #12). Underflow's S1 and other Defenders' manual skills still trigger on taking damage as before.
- Wild Mane's S2 pushes enemies along her facing, instead of pushing enemies behind her toward the protection objective.
- The coins from Swire the Elegant Wit's S3 are pushed outward from her and land on enemies 2–4 tiles in front of her and on the enemies she blocks.
- Flying enemies are "static rigid bodies" per the official game: they can be hit but not pushed or pulled (Mint, Degenbrecher, Cliffheart, Gladiia, etc.).
- Vina Victoria's S3 summons a Golden Vows in every empty melee-deployable spot around her, up to 8.
- Młynar's S3 can attack flying enemies, and the trait bonus after defeating enemies is calculated per the official game.
- Blaze the Igniting Spark's S3 now attacks one target and splashes in a 1.7 radius around it, showing a fire explosion on hit.
- Sankta Miksaparato: the HP drain from Originium Solvent now counts as taking damage, can trigger S3, and together with Mostima stacks Laterano automatically; with the "Old Friend" Module her S3 range no longer has 1 extra tile.
- Sankta Miksaparato's S2 can still block lethal damage when fewer than 30 rounds of ammo remain, per the official game (spending the remaining ammo and ending the skill); no ammo is consumed while an undying effect is on her.
- Yu's S2 no longer teleports a Tombkeeper Grotesque in statue form (self-bound) next to him.
- Area damage such as splash and circular skill areas cannot hit unblocked invisible enemies, matching the official game.
- Splash radii now follow the official values: Flinger 0.9, Chain Caster jump 1.7, Greyy 1.0, Rosmontis S2 1.5.
- Multiple Aromas share the "first attack" mark, so the same enemy only gets the bonus and Levitate once.
- Operators and summons can't be deployed on Deep Water; Raid redeploys and auto-picked tactical points only land on shore.
- Tacticians' reinforcements (Vigil's Wolfpack, Muelsyse's Flowing Shapes) can only be placed within the summoner's attack range.
- Once Tippi takes off, ground enemies no longer target her; normal attacks, splash, skill areas, burning zones and debuffs that require a target can't hit her; flying enemies, effects that say "ignores untargetable", and ground enemies' auras still apply.
- Lucien and Degenbrecher no longer fire area skills that hit nobody just because the only thing near them is an airborne Tippi.
- A knocked-out Operator stays on the tile where it fell and redeploys on that tile; Raid redeploys, reinforcements, summons and devices won't land on a downed Operator's tile.
- An Operator that falls on the starting position of a summon that has disappeared (such as Skadi the Corrupting Heart's Seaborn) goes back to lie down at its own starting position, instead of blocking the summon from returning.
- Operators inside a fence (official "wall") can't block ground enemies, and enemies pushed or pulled against a fence keep advancing.

### Enemies

- The Dublinn Flamechaser Soldier's "Remnant Ash" keeps walking forward and can be hit while blocked; 5 hits (10 for escorts) knock it out, and it only stands back up at full HP if not cleared within 10 seconds.
- Decode Basis α takes no HP loss in its original form; on its 4th instance of physical damage, 4th instance of arts damage, or when blocked, it becomes an Avenger, a Special Tactician or a Phantom and switches to the matching model.
- Rebirth and second-form animations filled in for Degenbrecher, Zaro, Avenger, Jesselton and Tombkeeper Grotesque; on rebirth an enemy's slow, fear and other statuses are cleared (including any status attached to the hit that knocked it out), and its skill cooldowns start over.
- Duck Lord Strategy: Fatty can't be blocked and doesn't attack; Duck Lord gets +300% movement speed after taking damage; it also replaces enemies in the Final Assault and Hidden Core, and costs 1 LP if it leaks.
- Bombtail stops to drop bombs, the bomb only explodes when it reaches the target, and after dropping it flies on at double speed; being stunned etc. before dropping interrupts it.
- On Battlefield #04 "Active Originium", the enemies on the lower route walk diagonally as in the official game; several Leader-fight exits were also changed to the official diagonal lines.
- HP loss from Dockworker drowning, Arc Frontliner imbalance, the Profane Chimera aura and the Enraged Possessed Leader now counts as taking damage (values per the official game).
- The Londinium Precision Mobile Defense Artillery bombards per the official game: the 9 tiles around the Operator with the highest Max HP in its attack range, one shell every 0.5 seconds, up to 10 shells.

### Alliances and items

- Lappland: the first Refresh of the round after obtaining her also adds Siracusa Stacks, counted separately for each Lappland.
- Quintus's Mutated Cells no longer disappear after use: after each battle the holder is replaced by a random Operator of the next tier up, and the Mutated Cells and other Equipment return to the Bench and can be assigned again.
- As in the official game, the new Operator from Mutated Cells goes to the Bench; its original tile is freed and the deployable count goes up by 1, and you have to redeploy it yourself (bots and AI Autopilot deploy it as usual); collecting enough copies of the same Operator merges into an Elite as usual (pointed out by PR #2).
- Standard Simulation disables Arcane and other Alliances per the official game; cards and Alliance details are marked "Disabled this match".
- When the Damazti Isomorph is equipped with a class-change Equipment, Alliance member lists and Operator cards count the holder (marked "Isomorph").
- With the Arcane Arts Circle, damage dealt by Yan's Protection on the field also makes the target lose special abilities for 5 seconds; with Originium Solvent, Yan's Protection takes 60 damage per second.
- Ægir's Devour is physical HP loss per the official game and is reduced by the target's DEF.
- Equipment returned on promotion or when removed by an effect is also merged automatically.
- The Durable Victorian Hammer's HP lock is now once per deployment, so it can lock again after a knockout and redeploy, or after a revive by the M3 Cocoon Shell or Ermengarde; when equipped together with the M3 Cocoon Shell, it always locks HP first and revives afterwards.
- Under the Narantuya Strategy, the Durable Victorian Hammer that Sargon Operators lend to nearby Operators also locks HP once per deployment, and a lock in progress when the loan expires lasts the full 8 seconds.
- When Equipment effects settle in sequence during the preparation phase, if an earlier effect moves Equipment away, later Equipment is no longer skipped or miscounted; Equipment newly assigned or moved mid-settlement is no longer settled twice (pointed out by PR #2).

### Match and decisions

- Bounty Decision deals cards following the structure of 22 official match screenshots: round 3 is one of 10 fixed "next two battles" combinations, round 9 is one of 6 boss-bounty groups, and round 11 draws from the 7 "next battle" bounty groups seen in the screenshots; each group deals 6 different cards, and repeat rounds of bounties no longer appear.
- Round 11 on Dire / Ultimate offers Bounty Decision, Secret Shop or Tactical Decision in the official proportions (14 / 4 / 4 across 22 matches), and no longer offers Equipment Supply.
- Secret Shop and Tactical Decision can offer two identical cards like the official game; each counts separately and can be picked separately. The round-11 Secret Shop follows the official game: 2 tier-VI items, at least 1 tier-V item and 1 Alliance Coin; the round-11 Tactical Decision only offers buff cards.
- The Hidden Core "damage over X%" announcement only counts this fight's Leader damage, and the previous round's announcement no longer carries over into the next.
- Announcements are queued by official priority, so Leader damage announcements are no longer pushed out by announcements like the Dispatch Center upgrade.
- Fixed Entelechia's heart candles being counted as leaks on timeout during Unite, which made the server reject the battle result.
- Fixed formations with very strong stacking traits (such as six-Kjerag Freeze) that stack a lot in one battle having their battle result wrongly judged as anomalous by the server and re-simulated server-side.

### UI

- The 3 pieces of Equipment from Catherine's upgrade show as Equipment cards ("Targeted Drop"); other free picks also show their source, and picks still queued behind show "N more to come".
- The small attack-range diagram on the Operator detail card shows the during-skill range live; the range hint on the board during preparation, the facing wheel and the detail card all show the same range.
- When the page stutters, is switched to the background, or you join mid-battle to spectate, enemy transformations are no longer missed, and transformation animations that already finished are no longer replayed after switching back.
- Blazing / Pyric Originium Slugs: the bundle includes the official models; when running from source without extracted local-client assets, Originium Slugs tinted orange / red-orange are shown.
- The background of the Operator Loadout screen (mint-green glow and grid) is visible again: a style rule had squashed it to 0 pixels high; the rest of the screen stays in place (pointed out by PR #14).
- When assets are hosted on another domain (CDN, object storage), images load in CORS mode, so the map and 3D board no longer show up blank (PR #10).
- The Damazti Isomorph's detail card lists the mapping from its talent slot: which Equipment pairs with which Alliance, with Alliances disabled this match marked; when equipped on an Operator the active group is highlighted, and each Alliance Equipment's details also state which Alliance the holder counts as a member of when equipped together with the Damazti Isomorph.
- When Harmony adds +1 to a Core Alliance's count, the Alliance details say "incl. Harmony +1" and list the Harmony Operator providing that 1 (e.g. Muelsyse) above the member list; the same applies when viewing a teammate's Alliances.
- When choosing a Strategy, Strategies built around an Alliance disabled this match (Paganini, Clementia and Młynar under Standard Simulation) are marked "Disabled this match" with an explanation in the details, and can still be chosen.
- After collapsing the shop during preparation, the board zooms to the official collapsed-shop view, with the Bench staying above the collapsed shop bar and the bottom-left buttons; expanding restores the original view; while dragging an Operator or choosing a facing it waits until you drop before switching (GitHub #5).
- After the browser reclaims a background page and reloads it on switching back, Operators no longer stay stuck as a placeholder icon of a square plus a droplet: the asset manifest reuses the already-loaded game data, failed downloads are retried, and failed or timed-out model downloads are retried too; for battles that started in the background, Operators show their models directly on switching back (GitHub #8).
- When choosing a Strategy you can click "View disabled Alliances & Operators" to review the match info's Alliances and disabled Operators again (read-only; the countdown keeps running and it closes automatically when it's the next player's turn; requested in GitHub issue #8); in a match, the 🔍 match info in the top-left also lists disabled Operators by tier.

### Bots

- Smarter bots: they collect three copies to merge Elites, freeze the shop when they can't afford the third copy, merge Elites before upgrading the Dispatch Center, commit to one main Alliance and avoid the Alliances teammates are building, pick damage dealers based on enemy DEF / RES, assign items according to their purpose, and choose bounties by reward and risk. Thinking time per Rest Phase is the same as before.
- Bots follow the new rules: Deep Water, tactical point range, Mutated Cells, Alliances disabled this match, Phalanx Casters' multi-target attacks.
- AI Autopilot won't destroy your items to make room.
- Bots no longer immediately sell Operators they just bought this round.
- Bots no longer choose Strategies built around an Alliance disabled this match (Paganini, Clementia and Młynar under Standard Simulation).

### Tools

- The Leader-fight performance test's threshold on CI (GitHub's Windows machines are slower) is relaxed to 1.0 ms per frame, taking the fastest of three runs; locally it still checks against 0.5 ms.
- When some asset downloads fail, entries are no longer silently removed from data/assets.json; instead those entries are listed and the original file is kept; add --allow-shrink if you really want to shrink it (pointed out by PR #7).

### Verified not to be problems

- Two white Originium Solvents merging into a gold one and then giving an extra white one: not reproduced after repeated testing with every Equipment.
- A Medic blocking a walking Leader stops healing and attacks the Leader instead: not reproduced; Medics blocking enemies keep healing teammates as usual (matches the official game). The big damage seen came from other Operators: Lucien no longer dodges after being blocked.
- Sciurus's discount being used up by Kjerag Operators obtained for free: not reproduced; free acquisitions such as promotion rewards, the Dispatch Module and Mimic Matter don't use it up — only shop purchases do.
- Underflow placed inside a fence doesn't attack: not reproduced; she attacks enemies in her attack range as usual. If she seems not to attack, most likely her attack range faces the fence or a Barricade, or nobody is attacking her so her skill doesn't fire (her S2 now fires whenever an enemy is in attack range; see "Battle").
- Three other reports were only partly true: Blaze the Igniting Spark's S3 always attacked with the new range in battle, and only the detail card's range diagram was wrong; the Arcane Alliance's effect always applied, and it only looked inactive because Standard Simulation disables it; the Durable Victorian Hammer's HP lock always worked, and it only looked inactive because it used to lock only once per battle, and could also be used up early when standing in front of an Ægir Operator and getting Devoured at the start.

## 0.1.0 — 2026-10-02

First public release.
