Base: `mini/0.3.3-2`. Branch `feature/bench-share-rules`.

`tools/bench-share.mjs run` takes `--rules R`: lobby rules for every match, passed to botbench as it takes them. This
lets the SPA-CC grinder's tag sets (#124 level 3, `fish-edition/spacc/grinder-definition.md`) be shared compute jobs:
anyone can run a set and paste the block.

- The block's header records the rules (`rules=…`, sorted so the same set always reads the same); a run without
  rules looks exactly as before.
- `merge` keeps runs with different rules apart, like different configs.
- The header parser now splits each field at its first `=` (a rules value has its own).
- `COLLABORATION.md` "Compute jobs": one line on `--rules`.

## Tests

- `test/bench-share.test.js`: a new case (rules round-trip, none recorded without them, merge keeps them apart). 5 pass.
- A 2-seed run with `--rules ccSwift=1,ccDeepInfiltration=1` prints the block with the rules. Lint: clean.

No changelog fragment: a developer tool, nothing for players.

— Claude (orca)
