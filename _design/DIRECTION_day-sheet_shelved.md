---
title: purposewithpresence.com design direction
slug: pwp-flagship
date: 2026-11-09
status: SHELVED 2026-11-09. The operator rejected the paper-and-ink family for this site ("keep trying, I want wow"). Kept for the record only; do not apply. The look commit that followed it on this branch is reverted
supersedes: "the workshop bench" (2026-11-04) as the site-wide direction; the bench's hero field and instruments are kept as night plates
tokens: /tokens.css (the only source; /studio/tokens.css is a byte copy; /assets/pwp-article.css aliases the same values)
canon: brain_state/design_canon/DESIGN_CANON.md (40 rules, method A to I, 11 gates)
---

# Direction: "Day sheet, night plate"

A surveyor's sheet of the local high street, read in daylight. Wherever something on the page is
live (the hero field, a working instrument, a calculator) the sheet opens onto a night plate:
the same street after dark, with one lantern lit. Paper for what we say, night for what runs.

## A. Perception goals (what a first-time visitor believes after five seconds)

1. A designer made this, by hand, for this studio. The page is the portfolio piece.
2. These people measure before they talk: prices in full, sources named, sums shown.
3. It is about my street and my shop, not about software.
4. Somebody keeps the light on after I have gone home.

Where it must feel credible: the plans and prices (exact, identical to the station's studio
page), the fitness and guide articles (evidence cited, disclosure before the first link), the
legal pages (an affiliate-programme reviewer reads them), every form (states designed, nothing
dead).

Category assumptions we break: an agency site is dark, glassy and gradient-lit; a fitness
affiliate page is a neon sales letter; a studio that uses automation has to look like a terminal.

## B. Committed words

| Word | Visual translation |
|---|---|
| Surveyed | Cool survey paper, hairline rules, sheet references, tabular figures, a scale-bar rule, sources set as marginal notes |
| Present | One amber marker (the lantern square) that says "you are here": the current page, the chosen plan, the primary action |
| Lit | Night plates: the only dark surfaces, reserved for things that run. The footer is the last plate, the light left on |
| Plain-spoken | Poster-weight grotesque headlines in sentence case, short lines, numbers before adjectives |
| Hand-set | A reading serif for anything longer than a paragraph, italic for notes in the margin, the drawn lantern mark, no icon pack |

Anti-words: neon, glassy, cosy-ivory, terminal, corporate, hurried.

Essence (three words): **marked, measured, lit.**
Proposition: one studio runs a local business's whole online presence every month, at a
published price, and the owner keeps every account.

## C. Category audit, and the two sister sites we must not resemble

| Code | The category, and our own other work | Our call |
|---|---|---|
| Ground | Agencies: black or near-black. COSMIC 87.6 FM: deep space navy. The patisserie build: warm ivory | **Break all three.** Cool survey paper (hue 250), with night plates as the exception, never the rule |
| Accent | Agencies: indigo to violet gradient. Station: cyan and magenta sweep. Patisserie: indigo and red | One lantern amber, as a fill or a marker. Never a gradient, never amber text on paper (an ochre ink token carries text) |
| Type | Agencies: Inter or Geist. Station: Unbounded with JetBrains Mono. Patisserie: Fraunces | Bricolage Grotesque for display and interface; Newsreader for reading and for notes. **No monospace anywhere** (the bench's JetBrains Mono is retired: it was the station's voice too) |
| Labels | Mono eyebrows, ALL-CAPS tracked kickers | Narrow-cut Bricolage in sentence case; italic Newsreader for annotations |
| Radius | Station 8 to 22 px and pills; category 12 to 16 px cards | 2 px panels, 4 px controls. No pills |
| Elevation | Glow, glass, blur | Tone steps and hairlines; one hard 2 px offset under a pressed-sign button. No blur, no glow outside the hero field |
| Hero | Centred H1, two buttons, a dashboard mock | Left-set headline over the live street field (a night plate) |
| Proof | Logo wall, counters, stars | The site itself, measured figures with their source, or nothing |
| Fitness pages | Before/after photos, red sale buttons, countdowns | A specialist journal: evidence boxes, comparison tables with units, programme cards with length and kit, disclosure first |

## D. The subject's own world

Local business lives on a street and is found on a map. The materials come from there: the
surveyed town sheet (cool paper, graticule, sheet numbers, a scale bar, a key), the marker that
says where you are, and the shop window lit after closing. The existing mark is a lantern; the
existing hero is a street grid at night where nearby searches travel to one lit shop. This
direction keeps both and builds the daylight around them.

## E. Perception board (qualities borrowed, never layouts)

- Borrow: the calm authority of a printed survey map (thin rules, small confident labels, one
  spot colour). Borrow: a newspaper's reading column for long articles. Borrow: an enamel shop
  sign's flat colour and hard edge for the one primary button.
- Avoid: the station's instrument glow and tracked mono kickers; the patisserie's serif-on-photo
  elegance; any "AI agency" node diagram.
- Transposition: map sheet becomes the page ground and the section index ("Sheet 01"); the spot
  colour becomes the lantern; the newspaper column becomes the article measure; the lit window
  becomes the night plate.

## F. Tokens (locked before any component; `/tokens.css`)

| Role | Day sheet | Night plate (`.night`) |
|---|---|---|
| Canvas | `oklch(0.968 0.006 250)` | `oklch(0.155 0.012 255)` |
| Surface (a sheet laid on the sheet) | `oklch(0.992 0.003 250)` | `oklch(0.195 0.014 255)` |
| Raised (hover, selected, wells) | `oklch(0.94 0.009 250)` | `oklch(0.235 0.016 255)` |
| Line / line soft / line strong (control edges, 3:1) | `0.80 0.014 250` / `0.885 0.01 250` / `0.56 0.02 250` | `0.32 0.014 255` / `0.255 0.012 255` / `0.5 0.014 255` |
| Ink / muted / faint | `0.21 0.035 255` / `0.36 0.028 255` / `0.47 0.022 255` (16.2, 9.9, 6.2 to 1 on canvas) | `0.96 0.004 255` / `0.78 0.01 255` / `0.68 0.012 255` |
| Lantern (fills, markers, focus on night) | `oklch(0.80 0.16 72)` | `oklch(0.82 0.16 75)` |
| Lantern ink (accent-coloured text, link underlines) | `oklch(0.49 0.115 62)` (5.9 to 1) | the lantern itself (10.2 to 1) |
| On lantern | `oklch(0.19 0.03 75)` (9.6 to 1) | same |
| Plus / minus / sky (states and diff marks only, always with a sign or a word) | `0.45 0.11 155` / `0.49 0.17 28` / `0.47 0.11 240` | `0.8 0.13 155` / `0.74 0.14 28` / `0.8 0.1 230` |

- Type: **Bricolage Grotesque** (variable: opsz 12 to 96, wdth 75 to 100, wght 200 to 800).
  Display at opsz 96, wdth 82, wght 720. Interface text at opsz 14, wdth 100, wght 400. Labels
  (`--font-label`) at opsz 14, wdth 78, wght 560, sentence case, 14 px.
  **Newsreader** (variable: opsz 6 to 72, wght 300 to 700, roman and italic) for article and
  document body at 19 to 20 px / 1.6, and in italic for notes, captions, sources and fine print.
  Tabular lining figures on every price, table and stat (both faces carry them).
- Scale (px): 14 label · 16 small · 18 interface body · 20 reading body · 22 lead · 30 h3 ·
  44 h2 and phone h1 · 64 tablet h1 · 96 desktop h1.
- Space: 4 px base; 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 144. Label jump 8, block 24,
  section 96 (144 on the home).
- Radius: 2 px panels, 4 px controls. Elevation: none; one hard offset (`0 2px 0` ink) on the
  primary button's hover.
- Motion identity: 120 ms press, 200 ms state, 280 ms enter; ease-out `cubic-bezier(0.2,0,0,1)`
  in, `cubic-bezier(0.4,0,1,1)` out; transform and opacity only. One orchestrated moment per
  page (the hero field on the home; a lantern that lights on load elsewhere). Reduced motion:
  every transition and animation off, the field a still frame, the lantern simply lit.

## G. Forbidden (written before any component)

From the station (COSMIC 87.6 FM): space navy as the page ground, cyan or magenta, the two-colour
sweep, Unbounded, JetBrains Mono or any monospace, tracked ALL-CAPS kickers, tick-mark dial
rules, meters, glow shadows, pills, the receiver and door-tile layouts.

From the patisserie build: warm ivory, indigo with red, Fraunces or any soft display serif, a
photo hero under serif type, the chapter bar, pill nav or dock, carousels, seasonal shelves.

From the retired bench: dark as the default page ground, mono index labels, the giant outlined
section numerals, amber text on a dark page as the only accent trick.

Generic tells: gradient washes and blobs, glass and backdrop blur, centred-everything heroes,
three equal icon cards, Starter / Pro / Enterprise, fade-up on every section, gradient headline
text, stock people at laptops, emoji anywhere, icon fonts, invented proof, fake scarcity,
guarantees, countdowns, "team", headcounts.

Copy kill list: seamless, robust, leverage, elevate, unlock, empower, cutting-edge, world-class,
"in today's", the "X without the Y" headline, model or tool names, any account of how the work
is produced. Third-party brands only in body prose and tables. Nothing that implies a brand or
a person endorses us.

## H. Three directions considered

1. **Day sheet, night plate (chosen).** Above.
2. **Bench, warmed.** Keep the dark bench, swap the mono for a serif, deepen the amber. Rejected:
   it still reads as the station's sibling (dark ground, lit accent), and long articles stay
   light-on-dark, which is the weakest reading condition on a phone outdoors.
3. **Sign shop.** Enamel green and cream, hand-lettered heads, one sign per service. Rejected:
   reads as one trade, sits beside the music zine-collage look, and loses the lantern.

Why the first: it is the only one that is unmistakably not the other two sites at a glance,
keeps the element the operator loved (the live street field) and gives it more power by making
it the single dark object on a light page, and gives the fitness and guide articles a real
publication column.

## I. Governance

Constant: the two families and their cuts; the token palette; 4 px base; 2 / 4 px radius; no
blur or glow; the lantern mark; **amber once per viewport** (the marker or the primary action,
never both competing); night plates only for the hero field, live instruments and calculators,
dialogs, the sticky offer bar and the footer; Newsreader for anything read at length.

May vary by page: the layout, which plate carries the page's one memorable element, density of
legal pages, whether a band sits on canvas or surface.

Page signatures (one memorable element each):

| Page | Signature |
|---|---|
| Home | The street field (night plate) |
| Studio | The three-plan sheet with the lit recommended column |
| Fitness hub and articles | The evidence column: short-answer card, programme cards, sourced tables |
| Guides and blog | The reading column with its section rail |
| Free check, contact | The form as a filled-in survey slip, with designed states |
| 404 | An off-the-sheet graticule with the lantern as the way back |

## Gate record

Mechanical checks and their results are in `DESIGN_PASS_LOG.md`. Independence: this pass is
self-reviewed (`is_independent: false`); a cross-family grade (gate 11) and the operator's
review are still owed before publishing.
