Fish couldn't follow the texts in #173's "Tags not auto-awarded" panel. Each line stated the tag's rule ("no Doctor ever obtained Muelsyse…") followed by "(failed: round 14, Muelsyse)", which reads as the opposite of what happened, and some used the code's own wording. This rewrites them to say what happened and how the tag would have touched it. It is also the first use of the blind-read check for player text (`fish-edition/PLAYER_TEXT.md` on the notes branch).

Base: `mini/0.3.3-2` · Branch: `fix/award-why-text`

## What changes

- **Each line says what happened, then why it mattered.** New `AWARD_EVENTS` in `shared/autoAward.js`; the room dialog keeps the rule wording (`AWARD_CONDITIONS`), where a rule is what's wanted.

  | Tag | Before | After |
  |---|---|---|
  | Investor 2 | no Doctor ever obtained Muelsyse, Kjera or Flametail (Elite included) (failed: round 14, Muelsyse) | Round 14: a Doctor got the Operator Muelsyse (this tag changes what Muelsyse does when gained) |
  | Foresight | no Foresight Operator fought in any battle (failed: round 1, Pramanix) | Round 1: Pramanix, a [Foresight] Operator, fought in a battle (this tag lowers their attack speed) |
  | Strategy 1 / 2 | no Doctor picked an affected Strategy (those that take effect in a named round) (failed: Muelsyse) | A Doctor picked the Strategy Muelsyse, which takes effect in a set round (this tag delays it by 1 round) |
  | Intern | no Doctor bought a tier-1 Operator from round 3 on (failed: round 3, Podenco) | Round 3: a Doctor bought Podenco, a tier I Operator (this tag makes the first tier I Operator each round cost more) |
  | Barge 1 / 2 | no Doctor's Dispatch Center reached level 5 (failed: round 6) | Round 6: a Doctor's Dispatch Center reached level 5 (this tag makes that upgrade cost more) |
  | Junk 1 | every Doctor's hand always had at least 1 free slot (failed: round 9) | Round 9: a Doctor's hand was full (this tag's [Toxic Waste] would have taken a slot) |

  Investor 1, Swift and Last Line of Defense get event lines in the same style.
- **Levels with the same reason share a row** ("Objective: Barge 1 (Risk 1) · Objective: Barge 2 (Risk 2)"), so two identical lines no longer read as two different reasons.
- **Each tag shows its Risk.** Both readers asked what a tag was worth.
- **A new intro:** "A Risk tag is awarded automatically only when it couldn't have changed the match. These tags could have changed this one, so they count toward Risk only if the room picked them."
- en / ja / ko / zh-TW, using each pack's existing game terms. Two old strings are gone.

## Blind read

A fresh agent got the end screen plus the panel and only base-game context (no code, nothing about this feature), and was asked what the panel tells it, what it would change next match, and what it had to guess at.

| | Confidence | Findings |
|---|---|---|
| Before (control: Fish's screenshot of #173) | 65% | rule lines read backwards next to "failed"; "a named round" unclear; identical lines for levels 1 and 2; Muelsyse as Strategy or Operator? |
| After (a text copy of the panel built from the en pack) | 70% overall; every line read correctly | "a Doctor" in a solo match: me?; is Muelsyse also an Operator?; what is each tag worth (now shown) |

The control agreed with Fish's read, so the test isn't too lenient. Fish's own read in the game is still the final check.

**Left for later:**
- "a Doctor" could say "you" in solo, but the server doesn't record which seat broke a condition yet.
- The "Objective:" prefix and the tag names (Barge, Junk) only make sense if you know the tags. That's the tags' own naming, outside this panel.

## Tests

`test/ui/risk-text.test.js` gains a case for the row grouping. Auto-award and i18n tests: 52 pass. Typecheck and lint clean.

— Claude (orca)
