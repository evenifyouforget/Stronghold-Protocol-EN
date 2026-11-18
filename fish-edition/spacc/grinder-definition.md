# SPA-CC bot grinder: a proposed rubric (#124 level 3; Fish's TODO, 2026-11-18)

Today's rubric (#168): 100 × solo Ultimate win rate + 100 × 4-man Ultimate win rate (4 clones), 0–200. Level 3 adds
entries of the form "100 × solo Ultimate win rate with these tags on".

## What the data is

- **Humans:** the match records aren't on hand here (Needs Fish: reshare), so the human side is #121's summary: 81
  matches on 0.3.1, 12 clean wins, and the per-tag clears and tries. That's enough for the record sets, not for a
  co-occurrence study. With the records back, "which tags humans take together" can be counted properly.
- **Bots (new, 2026-11-18):** each of the 41 tag versions alone, evobot, solo Ultimate, 40 paired seeds from 762481
  (random start), on `mini/0.3.3-2` after #166. Raw: `untracked/spacc-grinder-2026-11/tagcost/`. The bot doesn't know
  the tags (botbench `--rules`), so this is what a tag costs a tag-unaware player.

## 1. What each tag costs a bot (evobot, solo Ultimate; no tags: 15 of 40)

| Tag version | Risk | Wins of 40 | |
|---|---|---|---|
| Activation 2, 3 · Elements 2 · Lockout 1, 2, 3 · Famiglia Unending 2, 3 · Patriot 2, 3 | 1–3 | **0** | wall |
| Patriot 1 | 1 | 1 | wall |
| Famiglia Seasonal 3 · Elements 1 | 3 · 1 | 2 | near-wall |
| Activation 1 · Famiglia Seasonal 2 · Suffocation 3 | 1 · 2 · 3 | 5 | heavy |
| Delegation 1, 2, 3 · Suffocation 2 · Famiglia Cleaner 1 · OZ Physical · Vengeance 2 | 1–3 | 6–9 | heavy |
| Vengeance 3 · Strategy 1, 2 | 3 · 1–2 | 11–12 | light |
| Foresight · Junk 1, 2 · Last Line · Suffocation 1 · Vengeance 1 | 1–2 | 13 | light |
| Low Efficiency · OZ Arts · Swift · Intern | 1 | 14 | ~free |
| Deep Infiltration · Investor 1, 2 · Barge 1, 2 | 1–2 | 15–17 | free (noise) |

(Exact counts per version: `tagcost/*.json`; ±1 SD on 40 matches is about ±3 wins, so only the walls and the free tags
are firm.)

**Reading.** Two kinds of tag:
- **Economy and tempo tags are nearly free for a bot** (Investor, Barge, Deep Infiltration, Swift, Intern, OZ Arts,
  Low Efficiency): it either doesn't meet them or they barely bite. These are the "efficient for high Risk" tags,
  for bots at least. Several match #125's auto-award list, which fits: a tag that rarely matters is both cheap and
  often awardable.
- **Final-boss tags are walls**: anything that makes the boss tankier or invulnerable stops evobot completely. Humans
  clear some of them (the solo record has Lockout 3 and Elements 2), so the bot's weakness is boss damage, not
  "SPA-CC" as such.

So a rubric entry with a wall in it scores 0 for every current bot. It's headroom (fine to keep: it's where a better
bot shows), but it doesn't separate today's bots.

## 2. Proposed tag sets

Eight sets, solo Ultimate, covering all 41 tag versions (each at least once) over Risk 5–25. S5 is the human solo
record of 2026-11-04 (Risk 15, seeded in the real clear; unseeded here).

| Set | Risk | Tags | Idea |
|---|---|---|---|
| S1 | 5 | Investor 1, Swift, Strategy 1, Barge 1, Junk 1 | light economy |
| S2 | 5 | Suffocation 1, Vengeance 1, Delegation 1, OZ Arts, Last Line | light combat |
| S3 | 10 | Investor 2, Strategy 2, Barge 2, Junk 2, Intern, Foresight | full economy |
| S4 | 11 | Suffocation 2, Vengeance 2, Delegation 2, Deep Infiltration, Low Efficiency, OZ Physical, Famiglia Unending 2 | field |
| S5 | 15 | Investor 2, Swift, Foresight, Strategy 2, Intern, Elements 2, Deep Infiltration, Low Efficiency, Lockout 3, Famiglia Cleaner 1 | the human solo record |
| S6 | 15 | Activation 1, Elements 1, Lockout 1, Patriot 1, Famiglia Seasonal 2, Suffocation 3, Vengeance 3, Delegation 3 | bosses, low levels |
| S7 | 21 | Activation 2, Lockout 2, Patriot 2, Famiglia Unending 3, Investor 2, Strategy 2, Barge 2, Junk 2, Swift, Foresight, Deep Infiltration, Low Efficiency | bosses + economy |
| S8 | 25 | Activation 3, Patriot 3, Famiglia Seasonal 3, Elements 2, Lockout 3, Suffocation 3, Delegation 3, Vengeance 3, OZ Arts, OZ Physical | everything at the top |

(As `--rules` strings: `untracked/spacc-grinder-2026-11/sets.txt`; F9 and C3 in `sets-extra.txt`.)

### How the sets score today (solo Ultimate, 40 paired seeds from 762481)

| Set | Risk | Evobot | Legacy |
|---|---|---|---|
| No tags | 0 | 15 | 16 |
| S1 light economy | 5 | 10 | 12 |
| S2 light combat | 5 | 3 | 1 |
| C3 (extra) Suffocation 1, Vengeance 1, OZ Physical | 3 | 7 | 5 |
| S3 full economy | 10 | 5 | 7 |
| F9 (extra) the near-free tags: Investor 2, Barge 2, Deep Infiltration, Swift, Intern, OZ Arts, Low Efficiency | 9 | 6 | 10 |
| S4 field (no wall in it) | 11 | 0 | 0 |
| S5 human record · S6 · S7 · S8 | 15–25 | 0 | 0 |

**Reading.**
- **Tags compound.** S4 has no wall, and each of its tags alone costs evobot 6–9 wins of 15, yet together they leave
  0. Even the near-free tags add up: F9's seven tags each cost evobot 0–1 wins alone, together 9.
- **Only Risk ≲ 10 separates today's bots**, and combat tags hurt far more per Risk than economy tags (S2 at Risk 5
  is harder than F9 at 9).
- 40 matches can't separate evobot from legacy here (legacy is ahead in 4 of 5 scoring sets, by 2–4 wins: within the
  noise, but worth a bigger run before the grinder ranks them).

**So, revised proposal:** score on the sets bots can sometimes clear, and keep the rest as headroom.

- **Scored now (100 each):** S1, S2, S3, F9 (and C3 if a fifth is wanted). Together they still cover every economy
  tag, the light combat tags and OZ, at Risk 3–10.
- **Headroom (100 each, scoring 0 today):** S5 (the human record) plus one boss set (S6). They cover the walls, and
  they're where a bot that solves boss damage shows up.
- **Dropped:** S4, S7, S8. They duplicate the headroom sets' coverage at higher Risk and score 0. They can come back
  if a bot ever clears S6.
- Coverage with S1, S2, S3, F9, S5, S6 together: every tag version except Famiglia Unending 2 and 3 and Seasonal 3,
  Activation 2 and 3, Patriot 2 and 3, Lockout 2, Suffocation 2, Delegation 2, Vengeance 2, and OZ Physical (which
  C3 covers, if it's in). A tag at a higher level is
  harder than at a lower one, so the lower level in the rubric stands for it until a bot clears it; full coverage
  costs three more sets that score 0.

**Weights:** 100 each, like the two existing entries, so the maximum goes from 200 to 1,000. Alternatives: weight by
Risk (S8 counts 2.5× S3), or 100 × Risk / 10 so harder sets pay more. With today's bots the boss sets score 0 either
way, so the weights only matter once a bot clears one.

## 3. The combinatorial alternative

Instead of fixed sets: each match draws its tags at random (each tag version on with some probability, chosen to give
a target Risk spread), and the score is the win rate weighted by each match's Risk.

- **For:** covers combinations no fixed list would, and can't be "overfitted" by tuning a bot to eight sets.
- **Against:** far noisier for the same number of matches (every match is a different problem), and the walls make it
  worse: walls sit in 5 of the 20 tags (Activation, Elements, Lockout, Famiglia, Patriot), so a draw above Risk 5
  likely contains one, and most draws would score 0 for today's bots
  until the boss problem is solved. A fixed set is also explainable on the AI profiles popup; a distribution isn't.
- **Verdict:** fixed sets now. Revisit once a bot clears a boss wall; the per-tag table above gives the probabilities
  (e.g. draw walls rarely) if it's ever wanted.

## Questions for Fish

- The eight sets, or fewer? (S6–S8 score 0 for every bot today: keep as headroom, or drop until a bot needs them?)
- Weights: 100 each, by Risk, or something else?
- Seeded: S5 was a seeded clear for the human. Run the grinder unseeded (as here), or seeded like the record?
- Co-op: add one 4-man set (e.g. S3 with 4 clones), or keep level 3 solo only?

— Claude (orca)
