# Player text: the style rule and the blind read

Fish, 2026-11-19, on #173's "Tags not auto-awarded" panel: "I don't understand the texts when I read them", and "we
need a better process for llm-based qa of those". Tests and the i18n checks only prove a string exists in every
language; nothing checked that a player can follow it. This is that check.

## The style rule

- **Say what happened, not the rule behind it.** "Round 14: a Doctor got the Operator Muelsyse", not "no Doctor ever
  obtained Muelsyse (failed: round 14, Muelsyse)": next to "failed", a rule reads as the opposite of what happened.
- **Then say why it matters to the player**, in the player's terms ("this tag delays it by 1 round"), not the code's
  ("an affected Strategy (those that take effect in a named round)").
- **Two lines that read the same must mean the same.** If two items share a reason, show them once together
  ("Barge 1 · Barge 2"); if they differ, the text has to say how.
- **Name what a thing is when a name is ambiguous** ("the Operator Muelsyse" vs "the Strategy Muelsyse").
- Use the game's own words for game terms (the language packs' existing translations), and no internal ids.

## The blind read (for every PR that adds or rewords text players see)

1. **The material.** The text as a player meets it: a screenshot of the real screen, or, without a browser, a plain
   text copy of the screen built from the language pack's actual strings (never retyped), with the layout in brackets.
   Include the screen around it when it gives context (e.g. the end screen behind a popup).
2. **A fresh agent each time**, told to read only the files given, no code, no repo, no web.
3. **Base-game context only:** the glossary below. Never explain the feature under test, its purpose or the intended
   reading.
4. **One open question first,** then the fixed follow-ups (the prompt below). No hints about structure in the questions.
5. **Compare on orca's side.** The reader never sees the intended meaning. Every misreading, guess or contradiction it
   quotes is a finding: rewrite, then a new agent reads again.
6. **Control.** For a rewrite, run the old text through the same prompt first. If the reader finds the old text clear
   where Fish didn't, the test is too lenient: tighten it before trusting it.
7. **Record it in the PR description**: the reader's confidence and the findings, before and after. Fish's own read in
   the game stays the final check.

### The prompt (fill the files; keep the rest word for word)

```
You are helping test whether a game's text is understandable to a player. Act as a player of the game described
below. Look ONLY at the files named here, with the Read tool. Do not open, search or read any other file, code or
website: the point is what a player understands from the screen alone.

<the files, one line each: path and what screen it is (and how the player got there)>

What a player of this game knows (the game's basics only):
- It is an auto-battler. Each player is a "Doctor". Doctors buy "Operators" (units) in a shop between battles, place
  them, and the battle plays itself. A match has numbered rounds.
- Operators have tiers 1 to 6; higher tiers cost more. Unused Operators wait in your "hand" (a few bench slots).
- The shop is the "Dispatch Center"; Doctors spend funds to raise its level, which offers better Operators.
- At the start, each Doctor picks a "Strategy", named after a character (for example Muelsyse); it gives that Doctor a
  special effect.
- Operators belong to "Alliances" (for example Foresight); having enough of one Alliance's Operators gives a bonus.
- Before a match, the room can turn on lobby modifications. Some are cheats (marked by the red "WITH CHEATS" banner).
  Others are "Risk tags": optional extra difficulties, each worth some Risk points; the total shows next to the
  difficulty in the title. Players chase high-Risk clears.
- LP is the life points the Doctors are defending.

<one sentence: what the player just did to see this>. Answer in plain words:
1. What do you think this is telling you? Go through it as a whole and then line by line, in your own words.
2. Would you do anything differently next match because of it? What?
3. Which words, phrases or parts did you have to guess at, or found contradictory? Quote them.
4. How confident are you, overall, that you understood it (0–100%)?

Be honest about confusion; a guess labelled as a guess is more useful than a confident reading. Keep the answer under
500 words.
```

## Log

| Date | Text | Reader confidence | Main findings |
|---|---|---|---|
| 2026-11-19 | #173 "why not" panel, as merged (control) | 65% | rule lines read backwards next to "failed"; "a named round"; identical lines for levels 1 and 2; Muelsyse as Strategy or Operator? |
| 2026-11-19 | #179's rewrite (a text copy built from the en pack) | 70%; every line read right | "a Doctor" in solo: me?; Muelsyse also an Operator?; what each tag is worth (added to #179); the tag names and "Objective:" prefix (outside the panel) |
