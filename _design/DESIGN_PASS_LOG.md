---
title: purposewithpresence.com design pass log
date: 2026-11-09
branch: design-2026-11-09 (local commits only; never pushed, never merged)
status: the look is ON HOLD by instruction; this log covers the work that does not depend on it
where: this folder is _design/ so the site build never publishes it (the repo has no .nojekyll, so a .md at the root would become a public page). The brief asked for WORKTREE/DESIGN_PASS_LOG.md and shots/; they are here instead for that reason
---

# Design pass log

## 1. What happened to the look

1. A direction was written and locked ("Day sheet, night plate": cool survey paper, ink, one lantern amber,
   Bricolage Grotesque with Newsreader, no monospace, night plates for anything live). It is filed as
   `_design/DIRECTION_day-sheet_shelved.md`.
2. Its first build step (tokens with a night scope, the mono-to-label pass over seven stylesheets, the
   font swap and footer plates on 176 pages) was committed as `28ac4b8` and reverted in `baa8d1e` the same
   hour, when the operator rejected the paper-and-ink family for this site ("keep trying, I want wow").
   Nothing of that look is on any page of this branch.
3. The Claude Design home concept in `agency/pwp-flagship/claude_design/home_concept_2026-11-09/` was read
   (reference only). It is in the rejected family too, so nothing visual was taken from it. Two things in
   it are sound whatever the look and are already true of this branch: the contact form's four states
   (empty, focus, error, success) and the plan facts (1,200 / 2,400 / 3,300; setup 2,500 / 5,200 / 6,500;
   about 3, about 6.5, up to 9.5 hours; three-month minimum). Its copy says "a one-person studio" and
   "I"; the site keeps "we" and names no headcount.
4. No further look was invented. The site on this branch wears the live look (the 2026-11-04 bench).

## 2. Element inventory (what exists today, by page family)

| Family | Pages | Stylesheets | Header | Footer |
|---|---|---|---|---|
| Home | `/`, `/free-check/` (new), `/free-check/thanks/` | tokens.css, home.css, home.js | `.site-head .head-row .nav` (in-page anchors) | three-column `.foot-grid` |
| Studio | `/studio/` | studio/tokens.css (copy), studio.css, studio.js, forms.js | same pattern, own anchors | same, plus newsletter form |
| Studio guides | hub + 3 guides | studio/tokens.css, guides.css, assets/pwp-chrome.css, pwp-article.js | article header | article footer |
| Documents | about, contact, privacy, terms, disclosure, thanks, 404, directors-guide | tokens.css, pages.css (+ forms.js on contact) | home pattern, site links | three-column |
| Checklist | `/checklist/` | tokens.css, checklist.css, checklist.js | print header | one line |
| Articles | blog (127 + index), fitness (24 + hub), seedance-guide, tools/credit-calculator | tokens.css, assets/pwp-article.css, pwp-article.js | `nav .brand .nlinks .nav-cta`, phone menu | link list + full disclosure |
| Gear | hub + 4 product pages | assets/pwp-article.d559b20a.css (an older hashed copy), pwp-lander css and js | article header, simpler mark | link list |
| Redirects | `/go/*` (18), one retired blog stub | inline | none | none |

Components in use: buttons (`.button`, `.cta`, `.btn`), text links, chips and segmented controls, plan cards
and the plan matrix, diff rows, instrument panels (six on the home), product and guide cards, comparison
tables with a scroller, disclosure strip, short-answer box, FAQ details, breadcrumbs, contents rail,
reading progress bar, sticky offer bar, sign-up panel (58 blog pages), three mailing-list forms with
error and done states, calculators and a quiz, 404.

## 3. Completeness audit (what is still not designed; all waits on the chosen direction)

| # | Finding | Where |
|---|---|---|
| L1 | The default share image is the old "AI Music Video Guide" card (gradient headline, three model names). It is the `og:image` of 322 pages, including every fitness page, the studio guides and gear | `assets/og/home.jpg` |
| L2 | The studio share image is set in Fraunces, the patisserie build's face, and is the home page's share image too | `studio/studio-og.png` |
| L3 | Four different headers and three footers; the home family has no phone menu (the nav wraps to a second row), the article family has one | all families |
| L4 | Gear pages load an older copy of the article stylesheet and a simpler lantern mark | `gear/` |
| L5 | 127 blog pages carry an inline legacy style block (gradient headline text, backdrop blur, glow shadows) that the shared stylesheet overrides; 5,300 inline style attributes remain in article bodies | `blog/` |
| L6 | The blog index is one list of 127 cards, 18,500 px tall at 1280, with no grouping | `blog/index.html` |
| L7 | The Seedance guide page keeps the older product-launch layout and wording | `seedance-guide/` |
| L8 | The sticky offer bar and the sign-up panel are styled inline with literal colours, outside the tokens | 149 and 58 pages |
| L9 | No apple-touch-icon, no web manifest, no PNG favicon fallback | head of every page |
| L10 | A sign-up panel opens at 60 percent scroll on 58 blog pages. It now behaves as a dialog; whether it should exist is a design and marketing call | `blog/` |
| L11 | JetBrains Mono is this site's label face and the station's too | tokens |

## 4. Fixes made on this branch (none depends on the look)

| Commit | What |
|---|---|
| `6d19c0d` | **`/free-check/` exists.** "Book a free check" in the header and footer of 146 pages (293 links) went to a 404, confirmed on the live site. The new page is the home section's own form, list and thank-you flow; added to `sitemap.xml` |
| `faf4cee` | **Signature hours.** The studio plan card and the home plan picker said "about 12" director hours; canon and the page's own structured data say 9.5 at most. Both now read "up to 9.5". Price lines dated 9 November (they said 4 and 5 November); the date is gone from the two section intros and kept once in the fine print. Home and About no longer describe "a small studio of designers, builders and artists". The three mailing-list forms had `novalidate` in the markup, so with script off an empty form posted; script now sets it |
| `60a90b6` | **Fitness hub structure** (section 6) |
| `5cae3f1` | Bylines no longer say "team" (151 pages and llms-full.txt). Sideways-scrolling tables are focusable and named when they scroll; 182 tables have a caption and 591 header cells a scope. Second disclosure block on a page has its own landmark name (8 pages). The sign-up panel has a dialog role, a label, takes focus and gives it back (58 pages). The Seedance guide has one banner and one main. Fitness brand link's visible text is inside its accessible name (25 pages). Blog index has an h2 between its h1 and the card h3s. 44 px targets: short nav and footer words, lab buttons, related-guide links, sign-up field and button |
| `89d22b8` and the last commit | The retired promo page forwards to the Seedance guide it names (it sent readers to the home page). The studio "How much does it cost?" answer in structured data matches the page word for word. `favicon.svg` is the site's lantern mark (it was the old guide's pink play icon). 44 px targets for breadcrumbs, source lists on phones, the contact address, checklist labels, the panel's close button. The home picker's no-script line says "business", not "shop". Two looping animations on the Seedance guide stop under reduced motion |

## 5. Plans and prices against cosmic876.com/studio

Source compared: `brain_state/studio/sad_robot/station_site/studio.html` (vault) against this branch.

Same on both: Essentials $1,200, Growth $2,400, Signature $3,300 a month; setup $2,500 / $5,200 / $6,500;
three-month minimum, then month to month; 30 days' written notice of a price change for existing clients;
a written agreement before work.

| # | Mismatch | Station page | This site | State |
|---|---|---|---|---|
| M1 | Signature director hours | not stated | said "about 12" in two places | fixed here: "up to 9.5" |
| M2 | Director hours at all | none of the three tiers states hours | about 3, about 6.5, up to 9.5 | open on the station page |
| M3 | What each tier contains | creator care lines (hosting, comments, release day, clips, fan email, a game a quarter) | local-business lines from the packages canon | open: same name and price, different contents. If either link goes to the same prospect, they see two different Essentials |
| M4 | Who it is for | creators | local businesses | open, by design; a line on each page naming the other audience would settle it |
| M5 | How it is billed | "billed monthly through Stripe" | not stated | open on this site |
| M6 | One-off work | "quoted in the consultation" | priced line by line on the page | open on the station page |
| M7 | Vault copies | `agency/pwp-flagship/site/studio/index.html` line 271, `site/home-v2/home.js` line 627 and `STUDIO_PUBLISH_NOTES.md` lines 35 and 48 still say about 12 | | open in the vault (outside this worktree) |

Sums checked in the browser: paid ads selects Signature at $3,300, setup $6,500; first three months with
setup $16,400 (6,500 + 3 x 3,300). Structured data on `/` and `/studio/`: 1200.00 / 2400.00 / 3300.00 with
setup 2500.00 / 5200.00 / 6500.00; priceRange "$1,200 to $3,300 a month".

## 6. Fitness section

Audit of all 25 pages before any change: disclosure sits before the first paid link on every page that
has one; every page says it is not medical advice; every article has a sources section and FAQ data;
8 to 46 journal or health-body citations per article; no coupon or discount offer; no result promised
(the flagged words were "we do not endorse that claim", "not a safety guarantee", "treat it as"); the
vendor is named only in body prose and URLs, never in a title, description or structured data; nothing
suggests the vendor or any person endorses or works with this site.

Changed (structure only, in the existing components and tokens, every sentence and figure kept):

- Hub: the inline-styled disclosure is the system disclosure block; jump links to programmes, evidence,
  tools, guides, questions; the affiliate note sits above the table, not inside its scroller.
- Programme table: on a phone each of the 11 rows is a card (name, then length, sessions, equipment,
  price as shown); from 761 px it is the table. Roles keep it a table for screen readers either way.
- Tools: four cards with their kind (calculator, quiz, planner) and the description from each tool's page.
- Guides: 20 cards in four groups (BFR 7; dumbbell, 15-minute and beginner plans 7; training methods 3;
  equipment, protein and recovery 3), each labelled evidence guide, review, comparison or buying guide
  with its date. No typed counts.
- The publish step still works: it adds a new card to the first `div.grid`, which is now a "New guides"
  block that stays hidden while empty.
- Articles: table captions and scopes, named scroll regions, byline, landmark names (section 4).

Not done, waits on the look: the article template's typography and reading column, programme cards as a
designed object, the evidence box, the section's own share image.

## 7. Checks and results

| Check | Tool | Before | After |
|---|---|---|---|
| Internal links, anchors, images, scripts, styles, share images, form targets | `linkcheck.py`, 197 pages, 13,305 references | 293 broken (all `/free-check/`) | **0 broken** |
| Sitemap URLs resolve | same, 173 URLs | 0 dead | 0 dead |
| Canonical points at its own page | same | 1 (retired stub, to home) | 1 (retired stub, to the guide: intended) |
| Structured data parses | same, 477 blocks | 0 bad | 0 bad |
| FAQ data matches visible text | 51 questions on 6 pages | 1 differed by punctuation | 0 differ |
| Sideways scroll at 375, 768, 1280 | Playwright, 54 pages x 3 widths | none | none |
| Script errors and failed first-party requests | same | none (the only console line was the analytics beacon, blocked in this sandbox) | none |
| axe-core at 375 and 1280 | 54 pages | 7 rules, 142 nodes, 48 of them serious (name mismatch on 25 pages, unreachable scrollers on 14) | **1 rule, 8 nodes, 0 serious** (a repeated landmark name on the 4 gear product pages, which their builder writes) |
| Contrast 4.5:1 | axe `color-contrast` | 0 failures | 0 failures |
| Targets under 24 px at 375 | 54 pages | 113 on 30 pages | 11 on 6 pages, every one a link inside a sentence or a table cell (exempt under WCAG 2.5.8) |
| Targets under 44 px at 375 | 54 pages | 221 on 48 pages | about 45: the word "disclosure" inside the offer bar's sentence (26 pages, now 24 px tall), maker and study links inside table cells (40 px), three gear card titles that sit above a 44 px button to the same page |
| Forms: empty, bad email, network failure, valid, honeypot, no script | `forms_test.py`, mailing endpoint intercepted, nothing sent | not run | **42 of 42** at 375 and 1280 |
| Interactions: plan picker, four fitness tools, credit calculator, phone menu, table cards, click-everything sweep of 21 pages | `interact.py` | not run | **65 of 65** |
| Reduced motion: nothing running, no text left hidden | 10 pages | 2 looping animations on the Seedance guide | 0 |
| Lighthouse, mobile, local server | 6 pages | not run | accessibility 100 and SEO 100 on all six; best practices 96 (the blocked beacon); performance 99 to 100 on fitness, free check and contact, 84 on studio, 65 on home |

Final run, 54 pages at 375, 768 and 1280 (162 loads): no sideways scroll, no script error, no failed first-party request, no contrast failure.

## 8. Not verified

- That MailerLite accepts the three forms. They post with an opaque response, so the page shows its
  thank-you on any completed request; only a real submission proves delivery, and none was sent.
- Performance on a real phone and the real host. The local server sends no compression and the canvas
  was drawn in software, so the home page's 65 (LCP 4.1 s simulated) is a floor, not a reading. The
  earlier record for the studio page on the real host was 99.
- External links (about 6,000 references to other sites) were counted, not fetched.
- WebKit and Firefox. Chromium only in this pass.
- Independence: every check here was run by the same hand that made the changes (`is_independent: false`).

## 9. For the captain

1. Run the cache stamp before publishing (seven changed stylesheets and scripts still carry their old
   `?v=`): home.css, home.js, pages.css, forms.js, studio/studio.css, studio/guides/guides.css,
   checklist/checklist.css, assets/pwp-article.css, assets/pwp-article.js.
2. The generator in the vault still writes what this branch corrected, so the next publish would bring
   it back: the "team" byline, the fitness brand link without a space before its label, a second
   "Disclosure" landmark, the sign-up panel without dialog semantics, tables without captions. The gear
   builder still points at the hashed stylesheet.
3. Commits carry a co-author trailer; this remote is public, so squash or reword before any push if the
   trailer should not appear there.
4. Decide M3 to M6 in section 5.
5. `_design/` holds this log, the shelved direction and the screenshots. It is not published; delete it
   or keep it off main as you prefer.

## 10. Screenshots (`_design/shots/`)

before_home_1280, before and after fitness-hub at 1280 and 375, before and after studio-plans at 1280
(the Signature card), after_free-check at 1280 and 375, after_favicon.
