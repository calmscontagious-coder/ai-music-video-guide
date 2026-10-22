# Concept site: shared design system and bag

Written 2026-10-22 for the eng-0002 concept preview. Every page of the preview loads the same two files and reads the same data file:

| File | Size | Job |
|---|---|---|
| `site.css` | about 30 KB | Tokens, base, every component (header, nav, app bar, buttons, menu tiles, slot picker, box builder, panels, tiles, story, footer, notice, bag drawer) |
| `app.js` | about 26 KB | The bag in localStorage, badges, the drawer, the Shopify checkout link, the slot picker, the category filter, the box builder, the app-bar highlight, menu rendering from `menu.json` |
| `menu.json` | about 39 KB | 20 cafe items, the 28 Shopify products, one booking item; drives any menu grid that asks for it |

No dependencies. The two code files stay under 60 KB together (56.5 KB on 2026-10-22). Fonts: Bodoni Moda (display) and Nunito Sans (text) from Google Fonts.

## Colour rules (operator ruling, 2026-10-22)

- Canvas is warm ivory `#faf7f2`; cards and panels are white; `#f3eee6` is the deeper ivory for an alternate section.
- Indigo `#1f156b` carries type, primary buttons and the pickup band. Hover goes to `#120052`.
- The logo's red `#e02030` is punctuation only: the heart, the count badge, the kicker dots, the focus ring. Never a button fill.
- No blush or pink anywhere in the interface. Header and footer use `img/logo-wordmark.png`: the client's own artwork with the blush ghost letters taken out (a concept variant the client approves before launch; `img/logo.png`, the original, stays in the folder). The only pink left is in product photos.
- Macaron swatches use the flavours on the shop's own assorted-box listing (raspberry, pistachio, chocolate, coffee, coconut).

## How a page is composed

Copy this skeleton. Keep the notice, the header with the bag button, the app bar and the pill on every page; the drawer and the live region are injected by `app.js`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Page name. iD Éclair concept preview.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..800;1,6..96,400..800&family=Nunito+Sans:ital,opsz,wght@0,6..12,400..800;1,6..12,400..800&display=swap">
<link rel="stylesheet" href="assets/site.css">
<script src="assets/app.js" defer></script>
</head>
<body data-home="index.html">
  <aside class="notice" aria-label="Concept preview"><div class="wrap"><b>Concept preview</b><span>…dated source line…</span></div></aside>
  <header class="top">… logo, .nav, .top-actions with .btn and a.cartbtn[data-cart-open] holding span.badge[data-cart-count] …</header>
  <main id="top"> sections </main>
  <footer>… four columns, then the bag pill: <button class="cartpill" type="button" data-cart-open data-cart-pill>… span[data-cart-summary] b[data-cart-total] …</button></footer>
  <nav class="bar" aria-label="Sections">… five tabs: Menu, Box, Bag (a[data-cart-open][data-section="pickup"] with span.badge[data-cart-count]), Cakes, Classes …</nav>
</body>
</html>
```

Copy the header, footer (with the pill inside it, so every element sits in a landmark) and bar from any page as they are; only `aria-current` and the same-page anchors (`#box`, `#pickup`, `#menu`, `#order`) change per page. Nav targets: Menu `menu.html`, Macarons `index.html#box`, Cakes `cakes.html`, Classes `classes.html`, La Cave `la-cave.html`, Chef Romy `story.html`; the footer adds Gifts that ship `menu.html#ships` and Merchandise `merch.html`. `data-home` tells the drawer where the pickup picker and menu live when the current page has neither.

Each page has exactly one `h1`, one element marked `data-grid-break`, no inline styles, and no hex colours outside `site.css`.

## The data-attribute contract

| Markup | What `app.js` does |
|---|---|
| `button.add[data-add][data-handle][data-title][data-price]` plus optional `data-variant`, `data-image` or `data-glyph`, `data-meta` | Adds one to the bag, then swaps the button for a − qty + stepper. Every button with the same handle stays in sync across the page. |
| `[data-cart-open]` | Opens the bag drawer (falls back to its `href` without JS). |
| `[data-cart-count]`, `[data-cart-total]`, `[data-cart-pill]` with `[data-cart-summary]` | Count, total and the desktop pill. |
| `[data-review]` | Hidden while the bag is empty. |
| `[data-next-slot]` | Text of the earliest pickup slot. |
| `[data-slot-picker]` containing `[data-days]`, `[data-times]`, `[data-slot-out]`, `[data-slot-note]` | Builds the day and time chips from today's date and saves the choice in the bag. |
| `[data-cats][data-target="gridId"]` with `button.cat[data-cat]` | Category filter with counts; `data-cat="all"` shows everything. Grid children are `.item[data-cat]`. |
| `[data-menu-grid][data-src="assets/menu.json"]`, empty, with optional `data-channel` (`cafe`, `shopify`, `booking`, `all`), `data-cats` (comma list), `data-limit` | Renders tiles from `menu.json`. A grid that already has `.item` children is left alone, so a page can ship static tiles for speed and search. |
| `[data-box][data-price][data-title][data-image]` with `[data-box-slots]`, `button[data-f][data-short]` (each holding an `i.f-<flavour>` swatch), `[data-box-add]`, `[data-box-clear]`, `[data-box-surprise]` | Box of six: tap to fill, tap a macaron to remove it, Surprise me fills the rest, the full box goes into the bag as one line with the flavours listed. |
| `nav.bar a[href="#id"]` or `a[data-section="id"]` | Marks the tab whose section is in view. |

`window.IDE` exposes `add`, `setQty`, `clear`, `open`, `close`, `state`, `slot`, `checkoutUrl` and `renderMenu`. Every change fires a `document` event `ide:bag` with the bag snapshot.

## The bag and the real checkout

- Stored in localStorage under `ide.bag.v1` (falls back to memory in private mode) and shared across pages and tabs. Item shape: `{handle, title, price, qty, variantId, image, glyph, meta}` plus `slot: {date, time}`.
- An item with a `variantId` exists on the client's Shopify store. Checkout builds the Shopify cart permalink `https://www.id-eclair.com/cart/<variantId>:<qty>,<variantId>:<qty>` for those items and opens it in a new tab. These purchases really happen on the client's store; the drawer says so, and says that the live store's pickup is "usually ready in 24 hours" and that the concept's pickup time does not carry over yet.
- Items without a `variantId` (the cafe menu) stay in the bag with this note: these move into the new checkout with the pickup app; in the live store they are ordered at the counter or on the menu app today. The menu app is linked.
- Variant ids and prices were re-read from the live `products.json` on 2026-10-22 and matched the 2026-10-21 capture exactly.

## Pickup slots (example data)

`SLOTS`, `LEAD_MIN` and `CLOSED` at the top of `app.js`. Today: eight example slots from 10:00 am to 5:30 pm, the earliest slot 30 minutes after ordering in Pasadena time (the plan's proposed rule), four day chips starting today, Mondays skipped (the shop's About page; to confirm). A day with no slot left shows Full. The chef's real hours, slot length and caps replace these; the plan picks Bird for the live version (plan sections 4.2 and 4.3).

## menu.json

Top level: `version`, `updated`, `store`, `checkout` (permalink pattern), `notes`, `categories` (id and label), `items`.

Each item: `handle`, `title`, `price`, `category`, `channel` (`cafe`, `shopify` or `booking`), `desc`, `glyph` and `label` (for the typographic tile when there is no photo), `image` (`img/…` from the demo root, otherwise the store's own CDN file), `variantId` (string, or null), `lead` (lead-time note quoting the store listing or the plan), `checked` (date the price was read) and `source`. Shopify items add `store_title`, `image_cdn` and `url`; products with options add `needs_choice`, `option_names` and `variants` (the menu renderer adds the first variant when all variants cost the same, and links to the product page when prices differ, as with the Thanksgiving box). The $0 Pickup leftover is in the file with `hidden: true` and never renders.

Cafe prices come from the client's menu app on 2026-10-21: 19 of its 113 items, plus the box of six at the menu's 6-for-$15 price. The rest arrive with the full menu export. Regenerate after any catalog change with `python3 brain_state/clients/eng-0002/site_audit/build_menu_json.py` (it reads `site_audit/products.json`; refresh that file from the live store first).

## Honesty rules every page keeps

- The slim Concept preview notice stays on top of every page.
- Real prices and facts carry their date, in the notice or next to the number.
- Example mechanics carry a visible Example label (slot picker, seat map) or say so in their own copy.
- No invented testimonials, hours, ratings or product details. Item descriptions quote the store listing, the menu or the research files.

## Checks before a page ships

```bash
python3 vael_tools/vael_design_qa.py gate brain_state/clients/eng-0002/demo --slug eng-0002
```

All 11 gates passed on 2026-10-22 across all seven pages; the QA pass and its fixes are in `QA_2026-10-22.md` beside the pages. The macOS drive writes `._*` shadow files beside every file in this folder; leave them out of any upload.
