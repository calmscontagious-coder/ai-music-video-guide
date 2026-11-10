---
title: purposewithpresence.com design pass log, direction A "Living Light"
date: 2026-11-10
branch: design-2026-11-09 (local commits only; never pushed, never merged)
note: _design/ is not published by the site build. The 2026-11-09 log and the shelved paper direction are in this branch's history (commit b21f32b).
---

# Living Light pass

Chosen by the operator ("first option"). Reference only: agency/pwp-flagship/claude_design/bold_directions_2026-11-10/.

## What is built

| Part | Where | State |
|---|---|---|
| Tokens: ink ground #0a0a1f, violet, coral, lime, gold, ice; dark glass; Unbounded + DM Sans; 22 px panels, pill buttons | `/tokens.css` (+ byte copy `/studio/tokens.css`), fallbacks in the three article stylesheets | done |
| Shared stylesheet: faces, aurora ground, type, bridges for the older page families, home components, stills | `/assets/pwp-light.css`, last in the head of 176 pages | done |
| Script: tracking hook (same contract), phone menu, pointer light, scroll progress, card tilt, pause | `/assets/pwp-light.js` (home, studio) | done |
| Home | `/index.html` rebuilt: kinetic headline (weight follows the pointer, lines slide on scroll), CSS prism, business strip with a pause button, what we run, five steps, three foil cards, work, free check, the eight questions (word for word, so the FAQ data still matches), start, footer | done |
| Studio | same markup and facts; the three tiers wear the foil band, tilt and glare | done |
| Free check, thanks, contact, about, legal, 404, guides, blog, fitness, gear, Seedance guide | re-lit through the tokens and the bridge rules (ground, glass, faces, pill buttons, headings) | done at the base level; their own headers, footers and components are still the older shapes |
| Checklist | stays a paper sheet for printing; new faces only | by design |
| Share images, favicon | `/assets/og/home.jpg`, `/studio/studio-og.png` redrawn (same URLs, same prices); favicon is the prism | done |

## Decisions

- Chip reads "Independent studio for local businesses", not "One-person web studio": the standing rule is to name no headcount.
- The headline keeps "shop" as drawn; the sentence under it names salons, clinics, trades, gyms, studios, shops and restaurants.
- Unbounded is also the station's display face. Kept because the chosen drawing uses it; the body face, palette, glass, prism and cards are not the station's, and there is no monospace anywhere.
- Aurora alphas are capped so the ground never exceeds relative luminance 0.10 (measured peak 0.076). That is dimmer than the drawing, which put body text over lime at 0.42 alpha (about 2.5:1).
- A "Pause the light" button sits beside the moving strip (WCAG 2.2.2); reduced motion gets stills with no button needed.
- Not carried over from the old home: the lab of six instruments, the plan picker and matrix, the comparison list, the art band. The old page is in history at cdbb7cb; `home.css` and `home.js` stay because /free-check/ uses them.

## Checks (2026-11-10)

| Check | Result |
|---|---|
| Links, anchors, assets, form targets (197 pages, 13,413 references) | 0 broken; /#plans, /#work and /#free-check still resolve |
| Structured data | 477 blocks parse; home offers 1200.00 / 2400.00 / 3300.00 with setup 2500.00 / 5200.00 / 6500.00 unchanged; 8 FAQ answers identical to the page |
| Home, studio, free-check at 375, 768, 1280 | no sideways scroll, no script error, no failed first-party request, axe 0 violations, no target under 44 px |
| 12 other pages at 375 and 1280 | no sideways scroll, no script error; axe unchanged (one landmark name on gear product pages) |
| Contrast over the moving colour | peak ground luminance 0.076; ink 7.9, muted 6.9, faint 5.8, error text 5.5 to 1; headline spectrum 3.9 to 4.2 to 1 (large text) |
| Behaviour | 25 of 25: every package fact on the page, primary button to /free-check/, menu, weight follows pointer (660 to 858), card tilt, pause stops strip and aurora, tracking hook receives clicks, reduced motion runs nothing, free-check form validates and posts once (endpoint intercepted), studio tiers read the right figures |

Not verified: a real phone (touch tilt, backdrop blur cost), WebKit and Firefox, MailerLite delivery, an independent grade.

## For the captain

Run the cache stamp before publishing (new and changed: tokens.css, studio/tokens.css, assets/pwp-light.css, assets/pwp-light.js, pwp-article.css, pwp-chrome.css, pages.css). The article and gear generators in the vault still emit the old font link and no pwp-light.css.

Shots: `_design/shots/` before and after for home, studio and free-check at 1280 and 375.
