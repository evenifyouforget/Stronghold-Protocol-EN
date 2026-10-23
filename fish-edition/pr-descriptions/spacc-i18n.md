Japanese, Korean and Traditional Chinese for every SPA-CC text, and a `--rules` option for botbench. These were the two code commits on `wip/3` that never reached main.

Base: `mini/0.3.1-2`. Branch `wip/spacc-i18n`. No gameplay change.

## Translations (ja / ko / zh-TW)

- **The 63 SPA-CC texts from `wip/3`** (801a9c64, written 2026-10-16): the Risk grid's tile names, the tag texts and the dialog's labels.
- **The 8 texts #63 added or rewrote, translated here:**
  - "Objective: Investor {n}" / "Objective: Strategy {n}";
  - the Investor 2 and Strategy 2 texts;
  - the "<When sold>" trigger tag;
  - the new Seasonal 2 Ledger text;
  - the new Invincible Blade 1 and 3 texts.
- **5 entries removed:** the translations of the texts #63 replaced, which nothing uses any more.
- **Wording follows each pack's existing terms**, e.g. 売却時 / 판매 시 / 售出時 for "when sold", and 啟動盟約 / 主動更新 in zh-TW.
- **Merged with #65's Equipment Booster Pack strings**, which were added at the same spot: both kept.

I wrote the 8 new translations. A native speaker's look at ja / ko would be welcome.

## botbench `--rules`

`node tools/botbench.mjs --rules ccBoss=2,ccPatriot` plays every match with those lobby rules (a bare key = 1). It's how the per-tag cost table in ai-players.md was measured. The bot doesn't know the tags, so the numbers show what a tag costs a player who ignores it. Documented in the tool's header and in docs/META.md.

## Tests

- `node tools/i18n.mjs check ja ko zh-TW --stale --strict`: all three 100 % (2,448 msgids), 0 missing, 0 errors, nothing stale.
- i18n, UI, lobby and client-static tests (1,908): all pass. `test/docs-paths.test.js` passes.
- `node tools/botbench.mjs --configs solo:HARD --seeds 2 --rules ccBoss=2,ccPatriot`: runs.
- Lint: no new warnings.
- Not checked on screen.
