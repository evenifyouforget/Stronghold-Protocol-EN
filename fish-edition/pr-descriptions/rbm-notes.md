Every fork note committed, onto `mini/0.3.1-2`, and the folder renamed from `remove-before-merge/` to `fish-edition/`. No code change beyond comments.

Base: `mini/0.3.1-2`. Branch `wip/rbm-notes`.

## What's in it

- **From `wip/3`:** ai-players.md, effect-palette/, pr-descriptions/ (37), `.gitignore`, and the newer TODO.md and enemy-palette/leaders.md.
- **Fish's planning updates of 2026-10-24:** STANDARD_LOOP.md, MISC_USER_QUESTIONS.md (the block-shifting scenarios), BRANCHES.md (the mini branches).
- **spacc/working-spec.md:** kept as on `mini`. #63's copy is newer than `wip/3`'s.
- **Still out of git** (`fish-edition/.gitignore`): `images/` (official art, © Hypergryph) and `untracked/`.

## The rename: `remove-before-merge/` → `fish-edition/`

The old name no longer said what happens to the folder:
- it is tracked on main and the mini branches, and nothing removes it before a merge;
- upstream ports (`yuri/*`, `sg/*`) are cut without it.

`fish-edition/` says what it is: Fish Edition's own notes, never upstreamed. `docs/` stays the game's documentation, which goes upstream.

- The path is updated in the code comments that point at these notes (`shared/rules.js`, `shared/ruleData.js`, `server/sim/content/risk.js`, `server/sim/content/bonds/core.js`, `tools/build-data.mjs`), the block-shift test, ROADMAP, TODO, the working spec and `.gitignore`.
- The descriptions of merged PRs keep the old path, as records.
- **In an existing checkout,** git doesn't move ignored files, so move `images/` and `untracked/` across by hand after pulling: `mv remove-before-merge/images remove-before-merge/untracked fish-edition/`.

## ROADMAP.md reorganized, SCOPING.md removed

- **ROADMAP.md now has:**
  - Fish's intro;
  - a list of what is done, with pointers;
  - the open ideas in Fish's wording: the rest of the damage chart, doubled waves, Laterano Mod C, Mod Z, Radiant, the Nearl / Mlynar tiers, Hoshiguma;
  - the designs the code comments point to: "Laterano Mod B", "Victoria Mod C", "SPA-CC";
  - the rejected ideas with their reasons.
- **SCOPING.md** was the Phase 2 feasibility study, written against the code before main was rebuilt on Yuri's dev-0.2. Everything it recommended is built or listed above. Its open questions (doubled waves, Radiant) moved into ROADMAP.md.
- **The SPA-CC tag list** now lives only in spacc/working-spec.md. ROADMAP keeps the design decisions: the rule categories, the CC model, the grid, the rejected tags.

## Not included

`wip/3`'s non-note commits: ja / ko / zh-TW for the 63 SPA-CC texts (801a9c64) and a botbench change. They are code, so they can go in a PR of their own.
