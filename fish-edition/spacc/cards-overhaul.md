# Cards display overhaul (Fish's TODO, 2026-11-18; for #125)

Four kinds of "card" (the rule chips on the end screen, the room and the in-game strip; the Risk grid tiles in the room):

| | Selected in the room | Awarded after the match (#125) |
|---|---|---|
| **Cheat** | exists (`rules-chip--cheat`, red) | – |
| **Non-cheat modifier** | exists (`--neutral` mint, `--seeded` amber) | – |
| **Risk tag** | exists (`--risk`, orange) | new |

So the grid is really 3 kinds × 2 ways of getting there, with only one cell new. That suggests the combinatorial
style Fish described, with one rule: **the kind keeps its colour; how the card got there is the frame.**

## 1. The SPA look, as I'd describe it

Written from the CSS and the components, not from seeing the site: I can't open a browser here. A few screenshots
(room, end screen, a Risk grid) would let me check this against what players see.

- **A dark terminal, not a dark website.** Near-black green-grey surfaces (`#0c0f0e` to `#2d3632`), never pure black,
  with hairline borders a step lighter. Panels are flat rectangles: no rounded corners, no drop shadows to speak of.
- **One signal colour.** Mint / cyan (`#4ed8af`, glow `#17f9b7`) means "live, yours, interactive". Gold is money and
  prices, amber is caution (and seeded), orange is Risk, red is danger and cheats, ice-blue is rare. Colour is spent
  sparingly, so a coloured outline already reads as a status.
- **CRT texture, kept faint.** Panels carry 1 px horizontal lines every 3 px at 1.6–2.5 % white: you feel them more than
  see them. Diagonal hatching (−55°, mint at 6 %) marks busy or locked areas.
- **Hologram behaviour.** Things arrive by *wiping* in (clip-path left to right) with a bright *sweep* line passing over
  them, or by scaling from a squashed state; digital segments *flicker* in steps (not fades); a scan line drifts
  slowly down some figures (`ps-scan`, 7 s). Motion is linear or stepped, like a display refreshing, not springy.
- **Type.** Light text on dark, small uppercase English micro-labels ("ALLIANCE REPORT", "AI PROFILES") as a second
  voice beside the Chinese / translated titles; numbers in a tabular face.
- **Frames.** Bracket corners (`--bk-c`) on panels: the frame is implied by its corners, a military HUD idiom.

## 2. Effects to play with

Judged on three things: **fits** (the look above), **cost** (to build and to run on a phone), **still** (is the
difference visible in a static screenshot? The end screen is what people screenshot and post, so this matters most).

| Effect | Fits | Cost | Still | Notes |
|---|---|---|---|---|
| Fish: card tilts toward the cursor (3D) | weak | low | **no** | Physical-card idiom, not a display. No cursor on phones. |
| Fish: scan line slowly creeps up the card | **strong** | low | weak | The site already does this (`ps-scan`). Good as the *motion* half of a pair. |
| Fish: RGB line-blocks glitch in and out | good | low | weak | On-theme, but a glitch reads as "broken" if it's the main signal. A rare accent. |
| Fish: triangular foil lattice lit by a fake light (mouse) | weak as foil | medium | partly | Foil is a trading-card idea. Recoloured to the card's own hue at low alpha and kept static, the lattice becomes an "interference pattern" and fits. |
| Bracket corners only, instead of a full outline | **strong** | trivial | **yes** | The site's own frame idiom; an instant "different kind of the same thing". |
| Dashed / segmented outline (like `.seg`) | good | trivial | **yes** | Reads as "not fully committed" — could suit awarded tags, but might read as "disabled". |
| Double outline (outer hairline 2 px out) | good | trivial | **yes** | Reads as "certified", "confirmed". |
| Hatch fill (−55° stripes in the card's colour) | **strong** | trivial | **yes** | Already used for locked / busy states, so it may read as "locked". |
| Inset glow in the card's colour | good | trivial | yes | Subtle; fine as a second signal, too faint alone. |
| Cut corner (one corner clipped by `clip-path`) | good | trivial | **yes** | Very legible at chip size; a classic sci-fi UI shape. |
| Micro-label inside the chip ("AUTO", "+" or a glyph) | **strong** | trivial | **yes** | The site's second voice. Needs translation only if it's a word. |
| Wipe + sweep when the card appears | **strong** | low | no | The site's entrance idiom (`rd-wipe`, `rd-sweep`). Free polish, no meaning. |
| Stepped flicker on appear (`seg-flicker`) | **strong** | trivial | no | Same: entrance only. |
| Chromatic split on the text (red / cyan offset) | medium | trivial | yes | Makes text harder to read at chip size. |

## 3. A proposed look

Colour = kind (unchanged). Frame = how it got there.

| | Selected | Awarded |
|---|---|---|
| Cheat | red, full outline (today) | – |
| Modifier | mint / amber, full outline (today) | – |
| Risk tag | orange, full outline, faint orange fill (today) | **orange, bracket corners instead of the outline, a static interference lattice in orange at ~8 %, and a small "AUTO" micro-label**; in motion, a scan line creeps up it every few seconds |

Why this split: every awarded tag is still clearly a Risk tag (orange) and counts the same in the total, but in a
screenshot you can tell at a glance which tags the player committed to beforehand — the "prestige" Fish raised on
#125. Brackets + lattice + label are three static signals, so it survives a screenshot, a small phone and colour
blindness (it doesn't rely on hue).

Optional, if there's appetite: the selected tags get the double outline (a "committed" seal), so the two Risk cards
differ both ways rather than "normal vs special".

Reduced motion: the scan line and any entrance effects switch off (the site already honours `prefers-reduced-motion`);
the static signals carry the meaning alone.

## 4. Should it reach other UI?

Under the EOS freeze, I'd keep it to the places the cards appear: the end screen chips, the room chips, the in-game
strip and the Risk grid. One natural extension inside that: in the room's Risk grid, an "awardable if you play
without it" tile state (brackets, no fill), so players learn which tags #125 can award. Nothing else — buttons and
menus already have their own established states, and a new style there would dilute this one's meaning.

## Questions for Fish

- Does the split read right: colour = kind, frame = selected vs awarded?
- "AUTO", a glyph, or nothing for the label? (A word needs four translations; a glyph doesn't.)
- Selected tags: keep as today, or add the double outline?
- Screenshots of the room, the end screen and the Risk grid, to check section 1 against the real thing.

— Claude (orca)
