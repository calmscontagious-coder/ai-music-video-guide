/* iD Éclair, the pastry counter and the little services around the bag.
   Loaded after the page has painted. Everything it says comes from counter-facts.json and the menu;
   everything it adds goes through the shared bag (window.IDE). Nothing leaves the browser.
     - the counter: a quiet sheet opened from "Ask the pastry counter", the greeting, or the Bonjour pill;
       answer cards (photo, price, Add), the pickup picker inline, the cake request card, the box of six;
       one next step at the end of every answer, and the team's real contact when it does not know;
     - the greeting: once per visit, never over a headline, a price or an Add button;
     - the gift finder: who, occasion, budget, then one box with a one-tap Add;
     - goes-well-with in the bag: one suggestion at a time, dismissible;
     - your last box, remembered on this device only;
     - the members line in the bag. */
(function () {
  'use strict';
  var BASE = '../../', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HIST = 'lumiere.counter.v1', HELLO = 'lumiere.hello.v1', LAST = 'lumiere.lastbox.v1', PAIRX = 'lumiere.pair.v1';
  var PIC = {"canele":"img/caneles-1-800.jpg","macaron":"img/macarons-1-800.jpg","macaron-box-6":"img/macarons-2-800.jpg","thanksgiving-box-for-2":"img/thanksgiving-box-for-2-800.jpg","golden-ticket":"img/golden-ticket-800.jpg","cheese-board":"img/cheese-board-1-800.jpg","dubai-chocolate-vegan":"img/dubai-chocolate-vegan-800.jpg","dark-truffles-wholesale":"img/dark-truffles-wholesale-800.jpg","white-chocolate-truffles":"img/white-chocolate-truffles-800.jpg","dark-chocolate-truffles":"img/dark-chocolate-truffles-800.jpg","kushyflakes":"img/kushyflakes-800.jpg","gift-basket-small":"img/gift-basket-small-800.jpg","gift-basket-large":"img/gift-basket-large-800.jpg","pineapple-vanilla-jam":"img/pineapple-vanilla-jam-800.jpg","caneles":"img/caneles-1-800.jpg","macarons":"img/macarons-2-800.jpg","chocolate-fingers-sables-poches":"img/chocolate-fingers-sables-poches-800.jpg","diamants-biscuit-by-6":"img/diamants-biscuit-by-6-800.jpg","cookie-spoon":"img/cookie-spoon-800.jpg","douceur-tropicale":"img/douceur-tropicale-800.jpg","noisette-toujours":"img/noisette-toujours-800.jpg","tropical-jam":"img/tropical-jam-800.jpg","raspberry-jam":"img/raspberry-jam-800.jpg","4-desserts-in-jar":"img/4-desserts-in-jar-2-800.jpg","caramel-je-taime":"img/caramel-je-taime-800.jpg","chocolat-mon-amour":"img/chocolat-mon-amour-800.jpg","framboise-cherie":"img/framboise-cherie-800.jpg","citron-ma-passion":"img/citron-ma-passion-800.jpg"};
  var FR = { Raspberry: 'Framboise', Pistachio: 'Pistache', Chocolate: 'Chocolat', Coffee: 'Café', Coconut: 'Coco' };
  var HEART = '<svg class="hrt" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.3 6c-2.3 4.4-9.3 9-9.3 9z"/></svg>';
  var X = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var MARK = '<picture><source type="image/webp" srcset="counter-mark.webp"><img src="counter-mark.png" width="192" height="192" alt=""></picture>';
  var F = null, S = {}, engine = null, RAW = {}, last = null, opener = null, root, log, chipsEl, input, signoffN = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function get(store, k, d) { try { var v = window[store].getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function put(store, k, v) { try { window[store].setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: this visit only */ } }
  function bag() { try { return window.IDE.state().items; } catch (e) { return []; } }
  function inBag(h) { return bag().some(function (i) { return i.handle === h; }); }
  function slotLabel() { try { return window.IDE.slot().label; } catch (e) { return null; } }
  function go(sel) { var t = $(sel); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return t; }
  function repaintPickers() { try { window.dispatchEvent(new StorageEvent('storage', { key: 'ide.bag.v1' })); } catch (e) { /* old engines */ } }

  /* ---------- an item as the bag stores it, with its photo where the shop has one ---------- */
  function bagItem(h) {
    var i = engine && engine.item(h); if (!i) return null;
    var b = engine.bagItem(i); if (PIC[h]) { b.image = PIC[h]; b.glyph = null; }
    return b;
  }
  function addBtn(b, label) {
    return '<button class="add" type="button" data-add data-handle="' + esc(b.handle) + '" data-title="' + esc(b.title) + '" data-price="' + b.price + '"' +
      (b.variantId ? ' data-variant="' + esc(b.variantId) + '"' : '') + (b.image ? ' data-image="' + esc(b.image) + '"' : ' data-glyph="' + esc(b.glyph || '') + '"') +
      ' aria-label="Add ' + esc(b.title) + ', ' + money(b.price) + '">' + (label || 'Add') + '</button>';
  }
  function thumb(b) {
    return b.image ? '<img src="' + BASE + esc(b.image) + '" width="800" height="800" alt="" loading="lazy" decoding="async">' : '<span class="glyph" aria-hidden="true">' + esc(b.glyph || b.title.charAt(0)) + '</span>';
  }
  function itemCard(h, added, qty) {
    var b = bagItem(h); if (!b) return '';
    var raw = RAW[h] || {}, where = b.variantId ? 'On our online store' : 'At the counter';
    return '<div class="cc-item' + (added ? ' is-added' : '') + '" data-card>' + thumb(b) +
      '<div class="cc-nm"><b>' + esc(b.title) + '</b><small>' + esc(engine.clean(raw.desc || '')) + '</small><small class="cc-where">' + where + '</small></div>' +
      '<div class="cc-end"><span class="pr">' + money(b.price) + '</span>' +
      (added ? '<span class="cc-in">' + HEART + 'In your bag' + (qty > 1 ? ' ×' + qty : '') + '</span>' : addBtn(b)) + '</div></div>';
  }

  /* ---------- turning the engine's answer into the shop's voice, with one next step ---------- */
  var VOICE = [
    [/ It is a proposal for the chef’s approval\./g, ''], [/ Beyond that: I do not know that yet, the shop can tell you\./g, ''],
    [/The shop has not published an allergen chart\./g, 'We have not published an allergen chart yet.'],
    [/The shop has not published an age rule for the class\. I do not know that yet, the shop can tell you\. What it has said: /g, 'We have not published an age rule for the class yet; the team can tell you. What we can say: '],
    [/I do not know that yet, the shop can tell you\./g, 'The team can tell you before you order.'],
    [/It is on the live store, so it checks out on id-eclair\.com today; /g, 'It’s on our online store, so it checks out on id-eclair.com; '],
    [/Labelled gluten free on the live store:/g, 'Labelled gluten-free on our online store:'], [/The live store labels/g, 'Our online store labels'],
    [/the person who receives it picks the date with the shop/g, 'whoever receives it picks the date with us'], [/ on the live store/g, ' on our online store'],
    [/Tell me which one and I will add it\./g, 'Tap the one you’d like.'],
    [/For a present built to a budget, the gift concierge below picks from the live store and shows the note as it will read\. /g, 'Our gift finder picks one box in three taps. '],
    [/Your bag is ready\. Live-store items check out on id-eclair\.com; counter items wait for the pickup app, and the bag says which is which\./g, 'Your bag is ready. Online-store items check out on id-eclair.com, and the bag marks the counter items.'],
    [/Your bag is empty\. Ask me for an éclair, a box of six or a gift first\./g, 'Your bag is empty for now. An éclair is a fine start.'],
    [/Your usual lives on this device only\. One tap puts it back in the bag\./g, 'Your last box is kept on this device only.'],
    [/I have put (.+?) in the box; (?:add it when you are happy|choose (\d) more)\./g, function (m, what, n) { return 'Tap below and we put ' + what + ' in the box' + (n ? '; then choose ' + n + ' more.' : '.'); }],
    [/\b(the|The) paris-Brest/g, '$1 Paris-Brest'], [/\b(the|The) thanksgiving box/g, '$1 Thanksgiving box'], [/\s{2,}/g, ' ']
  ];
  function voice(t) { VOICE.forEach(function (r) { t = t.replace(r[0], r[1]); }); return t.trim(); }

  function fromEngine(text) {
    var out = engine.answer(text, { bagCount: bag().length, slotLabel: slotLabel() });
    var d = { intent: out.intent, reply: voice(out.reply), items: [], links: [], go: [], slot: false, cake: null, box: null, handoff: false };
    (out.actions || []).forEach(function (a) {
      if (a.type === 'add' && a.handle) {
        var added = false;
        if (a.auto && window.IDE) { var b = bagItem(a.handle); if (b) { window.IDE.add(b, a.qty || 1); added = true; } }
        if (d.items.length < 4) d.items.push({ h: a.handle, added: added, qty: a.qty || 1 });
      } else if (a.type === 'slot') d.slot = true;
      else if (a.type === 'compose') d.cake = { guests: (a.preset && a.preset.guests) || (out.preset && out.preset.guests) || null };
      else if (a.type === 'box') d.box = { flavours: a.flavours || [] };
      else if (a.type === 'checkout') d.go.push({ to: 'bag', label: 'Review your bag' });
      else if (a.type === 'open') d.go.push({ to: 'gift', label: 'Open the gift finder' });
      else if (a.type === 'usual') d.go.push({ to: 'last', label: 'Add your last box' });
      else if (a.type === 'link' && a.href) d.links.push({ href: a.href, label: a.label || 'More' });
    });
    if (d.intent === 'cake') d.reply = voice(d.reply.replace(/ ?The composer below[^.]*\./, ''));
    if (d.intent === 'vegan') { d.reply = F.facts.plant_based.text + ' For allergies, please tell the counter before you order.'; d.items.push({ h: 'chocolate-eclair' }); }
    if (d.intent === 'allergy' || d.intent === 'hours') d.handoff = true;
    if (d.intent === 'where') d.links.push({ href: S.handoff.directions.href, label: 'Directions', ext: true });
    if (d.intent === 'loyalty') d.go.push({ to: 'members', label: 'About Members' });
    if (d.intent === 'payment' || d.intent === 'fees') d.go.push(bag().length ? { to: 'bag', label: 'Review your bag' } : { to: 'box', label: 'Fill a box of six' });
    if (d.intent === 'unknown') return null;
    if (d.items.some(function (x) { return x.added; })) d.signoff = S.signoff[signoffN++ % S.signoff.length];
    return d;
  }
  /* things people ask that the engine's words do not catch: the menu itself, by name or description */
  function menuSearch(text) {
    var q = window.ConciergeCore.norm(text).split(' ').filter(function (w) { return w.length > 3; });
    if (!q.length) return null;
    var hits = engine.items().filter(function (i) {
      if (i.channel === 'booking' || i.needs_choice || i.category === 'wholesale') return false;
      var hay = window.ConciergeCore.norm(i.title + ' ' + i.desc);
      return q.some(function (w) { return hay.indexOf(w.replace(/s$/, '')) >= 0; });
    }).slice(0, 4);
    if (!hits.length) return null;
    return { intent: 'items', reply: 'Here is what the menu has: ' + hits.map(function (i) { return i.title + ' ' + money(i.price); }).join('; ') + '.', items: hits.map(function (i) { return { h: i.handle }; }), links: [], go: [], slot: false };
  }
  function route(text) {
    var q = window.ConciergeCore.norm(text);
    if (/\b(are you|is this|am i (talking|speaking|chatting) (to|with)) (a |an )?(real |actual )?(person|human|robot|bot|ai|machine|computer|someone)\b|\b(talk|speak) to (a |an )?(person|human|someone|staff)\b/.test(q))
      return { intent: 'person', reply: S.person, items: [], links: [], go: [], handoff: true };
    if (/what.?s best|best today|what should i (get|try)|recommend|in the case today|what do you have/.test(q)) {
      var three = engine.today(engine.laToday ? engine.laToday() : null);
      return { intent: 'today', reply: 'Three from the case today, each made from plants and boxed for your pickup time.', items: three.map(function (h) { return { h: h }; }), links: [], go: [], slot: false };
    }
    if (/build a gift|gift box|gift finder/.test(q)) return { intent: 'gift', reply: 'With pleasure. Three taps: who it’s for, the occasion and the budget, and we suggest one box.', items: [], links: [], go: [{ to: 'gift', label: 'Open the gift finder' }] };
    if (/^pickup times?$|pickup time/.test(q)) return fromEngine('pick up');
    if (last && /^(yes|yes please|add it|add that|add one|add another|i.?ll take it|one more|another one|two of those|add two)$/.test(q)) {
      var n = /two/.test(q) ? 2 : 1, b = bagItem(last); if (b && window.IDE) window.IDE.add(b, n);
      return { intent: 'add', reply: 'C’est noté.', items: [{ h: last, added: true, qty: n }], links: [], go: [], signoff: S.signoff[signoffN++ % S.signoff.length] };
    }
    if (/\bbox\b/.test(q) && /raspberr|framboise|pistach|chocolat|coffee|cafe|coconut|coco\b/.test(q) && !/box of (six|6)/.test(q)) text = 'box of six ' + text;
    return fromEngine(text) || menuSearch(text) || { intent: 'unknown', reply: S.dont_know, items: [], links: [], go: [], handoff: true };
  }
  /* every answer ends with one next step */
  function nextStep(d) {
    if (d.intent === 'hello' || d.items.length || d.slot || d.cake || d.box || d.go.length || d.links.length || d.handoff) return d;
    d.go.push(bag().length ? { to: 'bag', label: 'Review your bag' } : { to: 'pickup', label: 'Choose a pickup time' });
    return d;
  }

  /* ---------- the sheet ---------- */
  function build() {
    root = document.createElement('div');
    root.className = 'ctr'; root.hidden = true;
    root.innerHTML = '<div class="ctr-scrim" data-ctr-close></div><div class="ctr-sheet" role="dialog" aria-modal="true" aria-labelledby="ctr-t" aria-describedby="ctr-d">' +
      '<div class="ctr-head"><span class="ctr-av">' + MARK + '</span><div><h2 id="ctr-t">' + esc(S.title) + '</h2><p>' + esc(S.sub) + '</p></div>' +
      '<button class="x" type="button" data-ctr-close aria-label="Close the pastry counter">' + X + '</button></div>' +
      '<p class="ctr-disc" id="ctr-d">' + esc(S.disclosure) + '</p>' +
      '<div class="ctr-log" role="log" aria-live="polite" aria-relevant="additions" data-ctr-log></div>' +
      '<div class="ctr-foot"><div class="ctr-chips" role="group" aria-label="Suggested questions" data-ctr-chips></div>' +
      '<form class="ctr-in" data-ctr-form><label class="sr" for="ctr-q">Your question</label><input id="ctr-q" type="text" autocomplete="off" enterkeyhint="send" maxlength="200" placeholder="' + esc(S.placeholder) + '">' +
      '<button class="btn" type="submit">Ask</button></form></div></div>';
    document.body.appendChild(root);
    log = $('[data-ctr-log]', root); chipsEl = $('[data-ctr-chips]', root); input = $('#ctr-q', root);
    root.addEventListener('click', onClick);
    $('[data-ctr-form]', root).addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); input.value = ''; chips(); if (v) ask(v); });
    input.addEventListener('input', function () { chips(input.value); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])', $('.ctr-sheet', root)).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
  function open(seed) {
    if (!root) return;
    hideHello(true);
    opener = document.activeElement;
    root.hidden = false; requestAnimationFrame(function () { root.classList.add('is-open'); });
    document.body.classList.add('locked');
    $$('body > *').forEach(function (el) { if (el !== root && el.tagName !== 'SCRIPT' && !el.hasAttribute('aria-live')) el.inert = true; });
    if (!log.children.length) restore();
    if (!log.children.length) say({ intent: 'hello', reply: S.greeting, items: [], links: [], go: [] }, true);
    chips('', seed);
    setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 260);
  }
  function close() {
    if (!root || root.hidden) return;
    root.classList.remove('is-open'); root.hidden = true; document.body.classList.remove('locked');
    $$('body > *').forEach(function (el) { el.inert = false; });
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }
  function chips(typed, seed) {
    var list;
    if (typed && typed.trim().length > 1) {
      var t = window.ConciergeCore.norm(typed);
      list = F.suggest.filter(function (s) { return window.ConciergeCore.norm(s).indexOf(t) >= 0 || t.split(' ').every(function (w) { return window.ConciergeCore.norm(s).indexOf(w) >= 0; }); }).slice(0, 3);
    } else list = log.children.length <= 1 ? F.starters.slice() : F.chips.slice(0, 3);
    if (seed) list = [seed].concat(list.filter(function (x) { return x !== seed; })).slice(0, 3);
    chipsEl.innerHTML = list.map(function (c) { return '<button type="button" class="ctr-chip" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  }

  /* ---------- messages ---------- */
  function me(t) { var m = document.createElement('div'); m.className = 'cm me'; m.innerHTML = '<p>' + esc(t) + '</p>'; log.appendChild(m); scroll(); }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function say(d, quiet) {
    nextStep(d);
    var h = '<span class="cm-av" aria-hidden="true">' + MARK + '</span><div class="cm-body"><p>' + esc(d.reply) + '</p>';
    if (d.items && d.items.length) h += '<div class="cc-list">' + d.items.map(function (x) { return itemCard(x.h, x.added, x.qty); }).join('') + '</div>';
    if (d.box) h += boxCard(d.box.flavours);
    if (d.cake) h += cakeCard(d.cake);
    if (d.slot) h += slotCard();
    var acts = (d.go || []).map(function (g) { return '<button type="button" class="cc-go" data-go="' + g.to + '">' + esc(g.label) + '</button>'; })
      .concat((d.links || []).map(function (l) { return '<a class="cc-go" href="' + esc(l.href) + '"' + (l.ext || /^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.label) + '</a>'; }));
    if (d.handoff) acts = acts.concat(['call', 'email'].map(function (k) { return '<a class="cc-go" href="' + esc(S.handoff[k].href) + '">' + esc(S.handoff[k].label) + '</a>'; }));
    if (acts.length) h += '<div class="cc-acts">' + acts.join('') + '</div>';
    if (d.signoff) h += '<p class="cm-sign">' + esc(d.signoff) + '</p>';
    var m = document.createElement('div'); m.className = 'cm shop'; m.innerHTML = h + '</div>';
    log.appendChild(m);
    if (d.slot) repaintPickers();
    var single = (d.items || []).length === 1 ? d.items[0].h : null; if (single) last = single;
    if (!quiet || d.intent === 'hello') remember({ who: 'shop', d: strip(d) });
    scroll();
  }
  function strip(d) { return { intent: d.intent, reply: d.reply, items: (d.items || []).map(function (x) { return { h: x.h, added: x.added, qty: x.qty }; }), links: d.links || [], go: d.go || [], slot: !!d.slot, cake: d.cake || null, box: d.box || null, handoff: !!d.handoff, signoff: d.signoff || null }; }
  function remember(entry) { var h = get('sessionStorage', HIST, []); h.push(entry); put('sessionStorage', HIST, h.slice(-30)); }
  function restore() {
    get('sessionStorage', HIST, []).forEach(function (e) { if (e.who === 'me') me(e.t); else say(e.d, true); });
  }
  function boxCard(fl) {
    var tally = {}; fl.forEach(function (f) { tally[f] = (tally[f] || 0) + 1; });
    var said = Object.keys(tally).map(function (f) { return '<span lang="fr">' + esc(FR[f] || f) + '</span>' + (tally[f] > 1 ? ' ×' + tally[f] : ''); }).join(', ');
    return '<div class="cc-card"><b>Your box of six · $15.00</b><p>' + (fl.length ? said + (fl.length < 6 ? ', and ' + (6 - fl.length) + ' to choose' : '') : 'Five flavours, you choose the six.') + '</p>' +
      '<button type="button" class="btn" data-fill="' + esc(fl.join(',')) + '">' + (fl.length ? 'Put them in the box' : 'Open the box builder') + '</button></div>';
  }
  function cakeCard(c) {
    var mc = bagItem('mousse-cake');
    return '<div class="cc-card cc-cake"><b>A celebration cake' + (c.guests ? ' for ' + c.guests : '') + '</b><ul><li>One week’s notice</li><li>A sketch and a price from the chef</li><li>A deposit on a Shopify invoice holds the date</li></ul>' +
      '<a class="btn" href="../../cakes.html">Start your cake request</a>' + (mc ? '<p class="cc-soon">Sooner: a mousse cake with a message plaque, ' + money(mc.price) + '. ' + addBtn(mc) + '</p>' : '') + '</div>';
  }
  function slotCard() {
    return '<div class="cc-card cc-slot slot" role="group" data-slot-picker aria-label="Pickup time"><div class="days" role="group" aria-label="Day" data-days></div>' +
      '<div class="times" role="group" aria-label="Time" data-times></div><div class="slot-foot"><span data-slot-note></span><b data-slot-out></b></div></div>';
  }
  function ask(text) {
    me(text); remember({ who: 'me', t: text });
    var d = route(text);
    setTimeout(function () { say(d); chips(); }, reduce ? 0 : 220);
  }
  function fill(list) {
    close();
    var box = $('#box'); if (!box) return;
    go('#box');
    var clear = $('[data-box-clear]', box); if (clear) clear.click();
    list.filter(Boolean).forEach(function (f, k) { setTimeout(function () { var b = $('[data-f="' + (FR[f] || f) + '"]', box); if (b) b.click(); }, reduce ? 0 : 120 * (k + 1)); });
  }
  function goTo(to) {
    close();
    if (to === 'bag' && window.IDE) { window.IDE.open(); return; }
    if (to === 'last') { addLast(); return; }
    var t = go({ gift: '#gift-finder', members: '#members', box: '#box', pickup: '#pickup' }[to] || '#main');
    if (t) { var f = $('button, a, input', t); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, reduce ? 0 : 400); }
  }
  function onClick(e) {
    var t = e.target.closest('button, a'); if (!t) { if (e.target.hasAttribute('data-ctr-close')) close(); return; }
    if (t.hasAttribute('data-ctr-close')) { close(); return; }
    if (t.hasAttribute('data-q')) { ask(t.getAttribute('data-q')); return; }
    if (t.hasAttribute('data-go')) { goTo(t.getAttribute('data-go')); return; }
    if (t.hasAttribute('data-fill')) { fill(t.getAttribute('data-fill').split(',')); return; }
    if (t.hasAttribute('data-add')) {
      var h = t.getAttribute('data-handle'), card = t.closest('.cc-item');
      last = h;
      setTimeout(function () {
        if (card) { card.classList.add('is-added'); t.outerHTML = '<span class="cc-in">' + HEART + 'In your bag</span>'; }
        else t.outerHTML = '<span class="cc-in">' + HEART + 'In your bag</span>';
      }, 0);
    }
  }

  /* ---------- the greeting: once per visit, then a quiet Bonjour pill ---------- */
  var hello, helloState = get('sessionStorage', HELLO, 'new'), helloTimer = null;
  function pills(on) { $$('[data-bonjour]').forEach(function (p) { p.hidden = !on; }); }
  function covers(r) {
    return $$('h1, .pr, [data-add], .add, .btn, [data-box-add], .chip, .stepper, input, .flavours button').some(function (el) {
      if (hello.contains(el) || el.closest('.ctr, .drawer, .dock, .sub, [hidden]')) return false;
      var b = el.getBoundingClientRect();
      return b.width && b.height && b.bottom > r.top - 8 && b.top < r.bottom + 8 && b.right > r.left - 8 && b.left < r.right + 8;
    });
  }
  function placeHello() {
    if (!hello || hello.hidden) return;
    var dock = $('.dock'), phone = dock && getComputedStyle(dock).display !== 'none';
    if (phone) {
      var up = !dock.classList.contains('is-early') && !dock.classList.contains('is-yield');
      hello.style.setProperty('--lift', (up ? dock.offsetHeight + 24 : 12) + 'px');
    }
    var drawerOpen = $('.drawer.open'), r = hello.getBoundingClientRect(), off = hello.classList.contains('is-yield') && !reduce ? 16 : 0;
    var block = drawerOpen || (root && !root.hidden) || (phone && dock.classList.contains('is-early'));
    hello.classList.toggle('is-yield', !!block || covers({ top: r.top - off, bottom: r.bottom - off, left: r.left, right: r.right }));
  }
  var queuePlace = (function () { var t = false; return function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; placeHello(); }); } }; })();
  function showHello() {
    if (hello || helloState !== 'new') return;
    clearTimeout(helloTimer);
    hello = document.createElement('div'); hello.className = 'hello is-yield'; hello.setAttribute('role', 'region'); hello.setAttribute('aria-label', 'The pastry counter');
    hello.innerHTML = '<button class="hello-open" type="button"><span class="ctr-av">' + MARK + '</span><span>' + esc(S.greeting) + '</span></button>' +
      '<button class="hello-x" type="button" aria-label="Dismiss the greeting">' + X + '</button>';
    document.body.appendChild(hello);
    put('sessionStorage', HELLO, 'shown');
    $('.hello-open', hello).addEventListener('click', function () { open(); });
    $('.hello-x', hello).addEventListener('click', function () { hideHello(true); var p = $$('[data-bonjour]').filter(function (x) { return x.offsetParent; })[0]; if (p) p.focus({ preventScroll: true }); });
    addEventListener('scroll', queuePlace, { passive: true }); addEventListener('resize', queuePlace);
    requestAnimationFrame(function () { requestAnimationFrame(placeHello); });
  }
  function hideHello(done) {
    clearTimeout(helloTimer);
    if (hello) { hello.remove(); hello = null; removeEventListener('scroll', queuePlace); }
    if (done) { helloState = 'done'; put('sessionStorage', HELLO, 'done'); pills(true); }
  }

  /* ---------- the gift finder: who, occasion, budget, then one box ---------- */
  var NOTE = { birthday: 'Joyeux anniversaire.', thanks: 'Merci pour tout.', holidays: 'Joyeuses fêtes.', because: 'Pour toi, un éclair par jour.' };
  function giftFinder() {
    var gf = $('[data-gf]'); if (!gf) return;
    var pick = {};
    gf.hidden = false;
    gf.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b) return;
      var k = b.getAttribute('data-k');
      $$('button[data-k="' + k + '"]', gf).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      pick[k] = b.getAttribute('data-v');
      var nextQ = ['who', 'occ', 'budget'].filter(function (x) { return !pick[x]; })[0];
      var out = $('[data-gf-out]', gf);
      if (nextQ) { var g = $('[data-step="' + nextQ + '"] button', gf); if (g && k !== nextQ) setTimeout(function () { g.focus({ preventScroll: true }); }, 0); out.innerHTML = ''; return; }
      var r = engine.gift(+pick.budget, pick.who), first = r.items[0];
      if (!first) { out.innerHTML = '<p class="gf-none">Nothing on our online store fits that budget; the team can suggest something: <a href="' + esc(S.handoff.call.href) + '">' + esc(S.handoff.call.label) + '</a>.</p>'; return; }
      var line = NOTE[pick.occ] || NOTE.because;
      out.innerHTML = '<p class="gf-k">Our suggestion</p>' + itemCard(first.handle) +
        '<p class="gf-note">For the note: <span lang="fr">' + esc(line) + '</span> <button type="button" class="tbtn" data-use-line="' + esc(line) + '">Use this line</button></p>';
    });
    gf.addEventListener('click', function (e) {
      var u = e.target.closest('[data-use-line]'); if (!u) return;
      var l = $('#nt-line'); if (l) { l.value = u.getAttribute('data-use-line'); l.dispatchEvent(new Event('input', { bubbles: true })); l.focus({ preventScroll: false }); }
    });
  }

  /* ---------- in the bag: goes well with, members, ask the counter ---------- */
  var JARS = ['4-desserts-in-jar', 'framboise-cherie', 'chocolat-mon-amour', 'citron-ma-passion', 'caramel-je-taime', 'noisette-toujours', 'douceur-tropicale'];
  var PASTRY = ['chocolate-eclair', 'pistachio-eclair', 'espresso-eclair', 'chefs-special-eclair', 'paris-brest', 'mousse-cake', 'mille-feuille', 'butter-croissant'];
  function has(list) { return bag().some(function (i) { return list.indexOf(i.handle) >= 0; }); }
  function pairRule() {
    var no = get('sessionStorage', PAIRX, []), items = bag();
    var drinks = items.some(function (i) { var r = RAW[i.handle]; return r && (r.category === 'drink' || r.category === 'tea'); });
    var rules = [
      { id: 'coffee', when: has(PASTRY) && !drinks, h: 'french-roast-drip', why: 'Made when you arrive, so it is hot with the éclair.' },
      { id: 'spoons', when: has(JARS) && !inBag('cookie-spoon'), h: 'cookie-spoon', why: 'Edible spoons for the jars.' },
      { id: 'baguette', when: inBag('cheese-board') && !inBag('baguette'), h: 'baguette', why: 'One more for the board.' },
      { id: 'note', when: items.some(function (i) { return /^macaron-box-6|^macarons$/.test(i.handle); }), note: true }
    ];
    return rules.filter(function (r) { return r.when && no.indexOf(r.id) < 0 && !(r.h && inBag(r.h)); })[0] || null;
  }
  function bagExtras() {
    var body = $('#bag .sheet-body'); if (!body || !engine) return;
    var box = $('[data-bag-extra]', body);
    if (!box) { box = document.createElement('div'); box.className = 'bag-extra'; box.setAttribute('data-bag-extra', ''); body.appendChild(box); }
    var items = bag(), r = items.length ? pairRule() : null, h = '';
    if (r) {
      if (r.note) h += '<div class="pair" data-pair="note"><p class="pair-k">Goes well with</p><p class="pair-t">Giving the box? Write a line for the gift note.</p><a class="tbtn" href="#gift" data-cart-close>Write the note</a><button class="pair-x" type="button" data-pair-x="note" aria-label="Not this time">' + X + '</button></div>';
      else { var b = bagItem(r.h); if (b) h += '<div class="pair" data-pair="' + r.id + '"><p class="pair-k">Goes well with</p>' + itemCard(r.h).replace('<small class="cc-where">', '<small>' + esc(r.why) + '</small><small class="cc-where">') + '<button class="pair-x" type="button" data-pair-x="' + r.id + '" aria-label="Not this time">' + X + '</button></div>'; }
    }
    if (items.some(function (i) { return !i.variantId; })) h += '<p class="mem-line"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10h18"/></svg><span>Members earn points when these counter items are ordered in our ordering app. <a href="#members" data-cart-close>About Members</a></span></p>';
    h += '<button type="button" class="ask-bag" data-ask-open>Questions? Ask the pastry counter</button>';
    box.innerHTML = h;
  }
  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-pair-x]');
    if (x) { var no = get('sessionStorage', PAIRX, []); no.push(x.getAttribute('data-pair-x')); put('sessionStorage', PAIRX, no); bagExtras(); var c = $('#bag .x'); if (c) c.focus(); return; }
    var a = e.target.closest('[data-ask-open]');
    if (a) { if (window.IDE && $('.drawer.open')) window.IDE.close(true); open(a.getAttribute('data-ask') || ''); return; }
    var p = e.target.closest('[data-bonjour]');
    if (p) { open(); }
  });

  /* ---------- your last box, on this device only ---------- */
  function rememberBox() {
    var b = bag().filter(function (i) { return /^macaron-box-6:/.test(i.handle); }).pop();
    if (b) put('localStorage', LAST, { handle: b.handle, title: b.title, price: b.price, meta: b.meta, image: b.image || PIC['macaron-box-6'], glyph: '6' });
  }
  function addLast() {
    var l = get('localStorage', LAST, null); if (!l || !window.IDE) return;
    window.IDE.add({ handle: l.handle, title: l.title, price: l.price, meta: l.meta, image: l.image, glyph: l.glyph, variantId: null });
    var lb = $('[data-lastbox]'); if (lb) lb.innerHTML = '<p>' + HEART + 'Your last box is in your bag.</p>';
  }
  function lastBox() {
    var l = get('localStorage', LAST, null), lb = $('[data-lastbox]');
    if (!l || !lb || inBag(l.handle)) return;
    lb.innerHTML = '<p><b>Welcome back.</b> Your last box: ' + esc(l.meta || 'six macarons') + ', ' + money(l.price) + '.</p><button type="button" class="add" data-last-add>Add it again</button>';
    lb.hidden = false;
    $('[data-last-add]', lb).addEventListener('click', addLast);
  }

  /* ---------- boot ---------- */
  Promise.all([fetch('counter-facts.json?v=20261105a').then(function (r) { return r.json(); }), fetch(BASE + 'assets/menu.json').then(function (r) { return r.json(); })])
    .then(function (d) {
      F = d[0]; S = F.strings; S.handoff = F.handoff;
      (d[1].items || []).forEach(function (i) { RAW[i.handle] = i; });
      engine = window.ConciergeCore.create({ menu: d[1], facts: { facts: F.facts } });
      build();
      $$('[data-ask-open]').forEach(function (b) { b.hidden = false; });
      if (helloState === 'done' || helloState === 'shown') { helloState = 'done'; pills(true); }
      giftFinder(); lastBox();
      var before = bag().length;
      document.addEventListener('ide:bag', function () {
        rememberBox(); bagExtras();
        var n = bag().length; if (n > before && helloState === 'new') showHello(); before = n;
        if (hello) queuePlace();
      });
      new MutationObserver(function () { if ($('.drawer.open')) bagExtras(); if (hello) queuePlace(); }).observe($('#bag') || document.body, { attributes: true, attributeFilter: ['class'] });
      bagExtras();
      if (helloState === 'new') helloTimer = setTimeout(showHello, Math.max(0, 4000 - (performance.now ? performance.now() : 0)));
      window.LumiereCounter = { open: open, close: close, ask: function (q) { open(); ask(q); } };
    })
    .catch(function () { /* the page works without the counter; the entry buttons stay hidden */ });
})();
