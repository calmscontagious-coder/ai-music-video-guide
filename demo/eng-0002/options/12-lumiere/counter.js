/* iD Éclair, the pastry counter, and the small services around the bag.
   Loaded after the page has painted. Everything the counter says comes from counter-facts.json, the menu and the
   opening hours; everything it adds goes through the shared bag (window.IDE). Nothing leaves the browser except
   the optional event names (no message text) when the page sets window.LUMIERE_TRACK_URL.
     - the counter sheet: answers as cards (photo, price, Add), the pickup picker inline, the cake request card,
       one next step at the end of every answer, the team's real contact when it cannot help;
     - the pop-up: one context-aware opener per page view (two per visit at most), never over a headline, a price
       or an Add button, never while typing or scrolling fast, never within ten seconds of being closed;
     - after an add: a confirmation with the pickup time and one pairing, once per pairing;
     - in the bag: one line from the counter, one pairing, the members line;
     - the gift finder, your last box on this device, the Bonjour pill.
   If a file cannot be read the counter still answers from the copy built in below, and any error shows the team's
   contact instead of a dead screen. */
(function () {
  'use strict';
  var V = '?v=20261105j', BASE = '../../', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HIST = 'lumiere.counter.v2', HELLO = 'lumiere.hello.v1', LAST = 'lumiere.lastbox.v1', PAIRS = 'lumiere.pairs.v1', POP = 'lumiere.pop.v1', ACTED = 'lumiere.acted.v1';
  var PIC = {"canele":"img/caneles-1-800.jpg","macaron":"img/macarons-1-800.jpg","macaron-box-6":"img/macarons-2-800.jpg","thanksgiving-box-for-2":"img/thanksgiving-box-for-2-800.jpg","golden-ticket":"img/golden-ticket-800.jpg","cheese-board":"img/cheese-board-1-800.jpg","dubai-chocolate-vegan":"img/dubai-chocolate-vegan-800.jpg","dark-truffles-wholesale":"img/dark-truffles-wholesale-800.jpg","white-chocolate-truffles":"img/white-chocolate-truffles-800.jpg","dark-chocolate-truffles":"img/dark-chocolate-truffles-800.jpg","kushyflakes":"img/kushyflakes-800.jpg","gift-basket-small":"img/gift-basket-small-800.jpg","gift-basket-large":"img/gift-basket-large-800.jpg","pineapple-vanilla-jam":"img/pineapple-vanilla-jam-800.jpg","caneles":"img/caneles-1-800.jpg","macarons":"img/macarons-2-800.jpg","chocolate-fingers-sables-poches":"img/chocolate-fingers-sables-poches-800.jpg","diamants-biscuit-by-6":"img/diamants-biscuit-by-6-800.jpg","cookie-spoon":"img/cookie-spoon-800.jpg","douceur-tropicale":"img/douceur-tropicale-800.jpg","noisette-toujours":"img/noisette-toujours-800.jpg","tropical-jam":"img/tropical-jam-800.jpg","raspberry-jam":"img/raspberry-jam-800.jpg","4-desserts-in-jar":"img/4-desserts-in-jar-2-800.jpg","caramel-je-taime":"img/caramel-je-taime-800.jpg","chocolat-mon-amour":"img/chocolat-mon-amour-800.jpg","framboise-cherie":"img/framboise-cherie-800.jpg","citron-ma-passion":"img/citron-ma-passion-800.jpg"};
  var FR = { Raspberry: 'Framboise', Pistachio: 'Pistache', Chocolate: 'Chocolat', Coffee: 'Café', Coconut: 'Coco' };
  var HEART = '<svg class="hrt" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.3 6c-2.3 4.4-9.3 9-9.3 9z"/></svg>';
  var X = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var TICK = '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var BAGI = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l-1.2 12.5H6.7z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
  var MARK = '<picture><source type="image/webp" srcset="counter-mark.webp"><img src="counter-mark.png" width="192" height="192" alt=""></picture>';

  /* the copy used when counter-facts.json cannot be read: enough to greet, answer the basics and hand over */
  var FALLBACK = {
    strings: { name: 'The pastry counter', short: 'At the counter', title: 'The pastry counter', sub: 'iD Éclair · 169 W Green St', greeting: 'Bonjour.',
      disclosure: 'This is the shop’s online counter, not a person. The team is a call away.', dont_know: 'That one is outside my counter, I’m afraid. I can help with the case, a cake, pickup or the class.',
      person: 'I’m iD Éclair’s online counter, not a person. To speak with the team: 626-365-1161 or contact@id-eclair.com.',
      complaint: 'I’m so sorry. Please call 626-365-1161 or write to contact@id-eclair.com with your name and order; the team will follow up with you directly.',
      rude: 'I’m sorry I haven’t helped yet. Tell me what you’d like, or the team is at 626-365-1161.', rules: 'I can only help with our menu, orders and pickup. Shall I show you today’s case?',
      error: 'Let me get the team for that: 626-365-1161 or contact@id-eclair.com.', offline: 'I can’t reach the menu just now. Let me get the team: 626-365-1161 or contact@id-eclair.com.',
      allergy_tail: 'Please ask the team before ordering for an allergy: 626-365-1161.', placeholder: 'Ask about the case, a cake, pickup…',
      after_add: 'Merci, it’s in your bag. Pickup {slot}?', bag_line: 'Anything else for the box before I hold your pickup?', bag_waiting: 'Your bag is ready: {n}, pickup {slot}. Shall I hold it for you?',
      closed_pre: 'We’re closed now. Order for pickup from {next}.', closed_off: 'We’re closed now and open again {next}. I can still answer questions.',
      signoff: ['Merci, it’s in your bag.', 'C’est noté. It’s in your bag.', 'Avec plaisir. Bonne journée.'] },
    starters: ['Fill my box', 'Today’s best', 'Gift ideas', 'Pickup times', 'Cakes'], chips: ['Is everything plant-based?', 'A birthday cake', 'Are you open?'], suggest: ['Is everything plant-based?', 'Are you open?', 'A birthday cake for 12'],
    popup: { variant: 'fallback', delay_ms: 4000, idle_empty_ms: 45000, idle_bag_ms: 60000, max_per_view: 2, max_per_visit: 99, cooldown_after_close_ms: 10000, typing_quiet_ms: 2000, fast_scroll_px_s: 1800, back_up_px_s: 1500, shimmer_ms: 600,
      openers: { hello: { line: 'Bonjour.', actions: ['best', 'box', 'pickup'] }, choose: { line: 'Need a hand choosing? Tell me who it’s for.', actions: ['forme', 'gift', 'table'] } }, sections: {} },
    handoff: { call: { label: 'Call 626-365-1161', href: 'tel:+16263651161' }, email: { label: 'Write to us', href: 'mailto:contact@id-eclair.com' }, directions: { label: 'Directions', href: 'https://maps.apple.com/?q=169+W+Green+St,+Pasadena,+CA+91105' } },
    facts: { plant_based: { text: 'Everything we make is plant-based: no butter, milk or eggs.' } }
  };
  var F = FALLBACK, S = FALLBACK.strings, P = FALLBACK.popup, engine = null, RAW = {}, last = null, opener = null, root, log, chipsEl, input, signoffN = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function get(store, k, d) { try { var v = window[store].getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function put(store, k, v) { try { window[store].setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: this visit only */ } }
  function bag() { try { return window.IDE.state().items; } catch (e) { return []; } }
  function count() { return bag().reduce(function (a, i) { return a + i.qty; }, 0); }
  function inBag(h) { return bag().some(function (i) { return i.handle === h; }); }
  function slotLabel() { try { return window.IDE.slot().label; } catch (e) { return null; } }
  function slotShort() { var l = slotLabel(); return l ? l.replace(/^Today/, 'today').replace(/, (\d)/, ' at $1') : 'at a time that suits you'; }
  function go(sel) { var t = $(sel); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return t; }
  function repaintPickers() { try { window.dispatchEvent(new StorageEvent('storage', { key: 'ide.bag.v1' })); } catch (e) { /* old engines */ } }
  function norm(s) { return window.ConciergeCore ? window.ConciergeCore.norm(s) : String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").trim(); }
  function fill(t, map) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); }
  function hours() { try { return window.LumiereHours ? window.LumiereHours.state() : null; } catch (e) { return null; } }
  function track(name, extra) {
    var d = { event: name, variant: P.variant || 'a', t: Date.now() }; if (extra) for (var k in extra) d[k] = extra[k];
    try { document.dispatchEvent(new CustomEvent('lumiere:track', { detail: d })); } catch (e) { /* old engines */ }
    try { if (window.LUMIERE_TRACK_URL && navigator.sendBeacon) navigator.sendBeacon(window.LUMIERE_TRACK_URL, JSON.stringify(d)); } catch (e) { /* never block the page */ }
  }
  function acted() { put('sessionStorage', ACTED, true); }
  function timed(p, ms) { return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, ms); })]); }
  function getJSON(url) { return timed(fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }), 6000); }

  /* ---------- an item as the bag stores it, with its photo where the shop has one ---------- */
  function bagItem(h) {
    var i = engine && engine.item(h); if (!i) return null;
    var b = engine.bagItem(i); if (PIC[h]) { b.image = PIC[h]; b.glyph = null; }
    return b;
  }
  function addBtn(b, label, cls) {
    return '<button class="' + (cls || 'add') + '" type="button" data-add data-handle="' + esc(b.handle) + '" data-title="' + esc(b.title) + '" data-price="' + b.price + '"' +
      (b.variantId ? ' data-variant="' + esc(b.variantId) + '"' : '') + (b.image ? ' data-image="' + esc(b.image) + '"' : ' data-glyph="' + esc(b.glyph || '') + '"') +
      ' data-track="counter_add" aria-label="Add ' + esc(b.title) + ', ' + money(b.price) + '">' + (label || 'Add') + '</button>';
  }
  function thumb(b) { return b.image ? '<img src="' + BASE + esc(b.image) + '" width="800" height="800" alt="" loading="lazy" decoding="async">' : '<span class="glyph" aria-hidden="true">' + esc(b.glyph || b.title.charAt(0)) + '</span>'; }
  function closedOff() { var s = hours(); return s && !s.open && s.mode === 'closed-off'; }
  function itemCard(h, added, qty, why) {
    var b = bagItem(h); if (!b) return '';
    var raw = RAW[h] || {}, where = b.variantId ? 'On our online store' : 'At the counter';
    var act = added ? '<span class="cc-in">' + TICK + 'In your bag' + (qty > 1 ? ' ×' + qty : '') + '</span>' : closedOff() ? '<span class="cc-in cc-off">Opens ' + esc((hours().next || {}).label || 'soon') + '</span>' : addBtn(b);
    return '<div class="cc-item' + (added ? ' is-added' : '') + '" data-card>' + thumb(b) +
      '<div class="cc-nm"><b>' + esc(b.title) + '</b><small>' + esc(engine.clean(raw.desc || '')) + '</small>' + (why ? '<small>' + esc(why) + '</small>' : '') + '<small class="cc-where">' + where + '</small></div>' +
      '<div class="cc-end"><span class="pr">' + money(b.price) + '</span>' + act + '</div></div>';
  }

  /* ---------- the shop's voice over the engine's words ---------- */
  var VOICE = [
    [/ It is a proposal for the chef’s approval\./g, ''], [/ Beyond that: I do not know that yet, the shop can tell you\./g, ''],
    [/The shop has not published an allergen chart\./g, 'We have not published an allergen chart yet.'],
    [/The shop has not published an age rule for the class\. I do not know that yet, the shop can tell you\. What it has said: /g, 'We have not published an age rule for the class yet; the team can tell you. '],
    [/I do not know that yet, the shop can tell you\./g, 'The team can tell you before you order.'],
    [/It is on the live store, so it checks out on id-eclair\.com today; /g, 'It’s on our online store, so it checks out on id-eclair.com; '],
    [/Labelled gluten free on the live store:/g, 'Labelled gluten-free on our online store:'], [/The live store labels/g, 'Our online store labels'],
    [/the person who receives it picks the date with the shop/g, 'whoever receives it picks the date with us'], [/ on the live store/g, ' on our online store'],
    [/Tell me which one and I will add it\./g, 'Tap the one you’d like.'],
    [/For a present built to a budget, the gift concierge below picks from the live store and shows the note as it will read\. /g, 'Our gift finder picks one box in three taps. '],
    [/Your bag is ready\. Live-store items check out on id-eclair\.com; counter items wait for the pickup app, and the bag says which is which\./g, 'Your bag is ready. Online-store items check out on id-eclair.com, and the bag marks the counter items.'],
    [/Your bag is empty\. Ask me for an éclair, a box of six or a gift first\./g, 'Your bag is empty for now. An éclair is a fine start.'],
    [/Your usual lives on this device only\. One tap puts it back in the bag\./g, 'Your last box is kept on this device only.'],
    [/I have put (.+?) in the box; (?:add it when you are happy|choose (\d) more)\./g, function (m, what, n) { return 'Avec plaisir. Tap below and I’ll put ' + what + ' in the box' + (n ? '; choose ' + n + ' more or let me fill it.' : '.'); }],
    [/ ?The composer below[^.]*\./g, ''], [/\b(the|The) paris-Brest/g, '$1 Paris-Brest'], [/\b(the|The) thanksgiving box/g, '$1 Thanksgiving box'],
    [/ It is in your bag\./g, ' Merci, it’s in your bag.'], [/ (\d+) are in your bag\./g, ' C’est noté: $1 in your bag.'], [/\s{2,}/g, ' ']
  ];
  function voice(t) { VOICE.forEach(function (r) { t = t.replace(r[0], r[1]); }); return t.trim(); }
  function blank(intent, reply) { return { intent: intent, reply: reply, items: [], links: [], go: [], asks: [], slot: false, cake: null, box: null, handoff: false }; }

  /* typos: each longer word is matched against the menu's own words and the counter's vocabulary */
  var VOCAB = null;
  function vocab() {
    if (VOCAB) return VOCAB;
    var w = {}; 'gluten allergy allergies vegan dairy pickup hours open closed cake birthday wedding class masterclass macaron macarons eclair eclairs croissant pistachio chocolate raspberry coffee coconut caramel lemon tea cannele canneles truffles jam basket gift delivery parking wine cave cheese board ticket golden box price menu today tomorrow plant based'.split(' ').forEach(function (x) { w[x] = 1; });
    if (engine) engine.items().forEach(function (i) { norm(i.title).split(/[^a-z]+/).forEach(function (x) { if (x.length > 3) w[x] = 1; }); });
    VOCAB = Object.keys(w); return VOCAB;
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var d = []; for (var i = 0; i <= a.length; i++) { d[i] = [i]; } for (var j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function mend(text) {
    var vs = vocab();
    return norm(text).split(/\s+/).map(function (w) {
      var core = w.replace(/[^a-z]/g, ''); if (core.length < 4 || vs.indexOf(core) >= 0) return w;
      var best = null, bd = core.length >= 7 ? 3 : 2;
      vs.forEach(function (v) { var d = lev(core, v); if (d < bd) { bd = d; best = v; } });
      return best || w;
    }).join(' ');
  }

  function soldOut(h) { var r = RAW[h]; return (r && (r.available === false || r.stock === 0)) || ((window.LUMIERE_SOLDOUT || []).indexOf(h) >= 0); }
  function fromEngine(text) {
    if (!engine) return null;
    var out = engine.answer(text, { bagCount: bag().length, slotLabel: slotLabel() });
    if (out.intent === 'unknown') return null;
    var d = blank(out.intent, voice(out.reply));
    (out.actions || []).forEach(function (a) {
      if (a.type === 'add' && a.handle) {
        if (soldOut(a.handle)) return;
        var added = false;
        if (a.auto && window.IDE && !closedOff()) { var b = bagItem(a.handle); if (b) { window.IDE.add(b, a.qty || 1); added = true; track('counter_popup_add', { from: 'sheet' }); acted(); } }
        if (d.items.length < 3) d.items.push({ h: a.handle, added: added, qty: a.qty || 1 });
      } else if (a.type === 'slot') d.slot = true;
      else if (a.type === 'compose') d.cake = { guests: (a.preset && a.preset.guests) || (out.preset && out.preset.guests) || null };
      else if (a.type === 'box') d.box = { flavours: a.flavours || [] };
      else if (a.type === 'checkout') d.go.push({ to: 'bag', label: 'Review your bag' });
      else if (a.type === 'open') d.go.push({ to: 'gift', label: 'Open the gift finder' });
      else if (a.type === 'usual') d.go.push({ to: 'last', label: 'Add your last box' });
      else if (a.type === 'link' && a.href) d.links.push({ href: a.href, label: a.label || 'More' });
    });
    var one = out.items && out.items.length === 1 ? out.items[0] : null;
    if (one && soldOut(one)) return soldAnswer(one);
    if (one && RAW[one] && RAW[one].channel === 'shopify' && /\b(available|in stock|still (have|got)|got any|left)\b/i.test(text)) {
      var av = engine.item(one); d = blank('available', 'Yes, the ' + av.title.charAt(0).toLowerCase() + av.title.slice(1) + ' is available, ' + money(av.price) + '. Shall I add it?'); d.items.push({ h: one }); return d;
    }
    if (d.intent === 'vegan') { d.reply = (F.facts.plant_based || FALLBACK.facts.plant_based).text + ' The croissants are laminated with plant butter.'; d.items = [{ h: 'chocolate-eclair' }]; }
    if (d.intent === 'gluten' && !one) d.reply = 'Our online store labels several pieces gluten-free, among them the assorted macaron box, the cannelés and the dessert jars; at the counter, the soup du jour and two salades without their crostini. We also bake croissants and baguettes, so for coeliac disease please ask the team first.';
    if (d.intent === 'allergy' || d.intent === 'gluten') { d.reply = d.reply.replace(/ The team can tell you before you order\.$/, ''); if (!/ask the team/.test(d.reply)) d.reply += ' ' + S.allergy_tail; d.handoff = 'call'; }
    if (d.intent === 'hours') return hoursAnswer();
    if (d.intent === 'where') d.links.push({ href: F.handoff.directions.href, label: 'Directions', ext: true });
    if (d.intent === 'loyalty') d.go.push({ to: 'members', label: 'About Members' });
    if (d.intent === 'payment' || d.intent === 'fees') d.go.push(bag().length ? { to: 'bag', label: 'Review your bag' } : { to: 'best', label: 'Today’s best' });
    if (d.items.some(function (x) { return x.added; })) d.signoff = S.signoff[signoffN++ % S.signoff.length];
    return d;
  }
  function soldAnswer(h) {
    var it = engine.item(h), alt = engine.items().filter(function (i) { return i.category === it.category && i.handle !== h && !soldOut(i.handle) && i.channel !== 'booking' && !i.needs_choice; })[0];
    var s = hours(), next = s && s.next ? s.next.label : 'tomorrow';
    var d = blank('soldout', 'The ' + it.title.charAt(0).toLowerCase() + it.title.slice(1) + ' is sold out today, I’m sorry. ' + (alt ? 'The ' + alt.title.charAt(0).toLowerCase() + alt.title.slice(1) + ', ' + money(alt.price) + ', is the closest; or I can set one aside for a later pickup.' : 'I can set one aside for a later pickup.'));
    if (alt) d.items.push({ h: alt.handle });
    d.slot = true; return d;
  }
  /* the greeting: "Bonjour." as the title line, then one calm hours note from the shop's own clock */
  function helloNote() {
    var s = hours();
    if (!s) return '';
    if (s.open) return 'We’re open until ' + s.today.close + '.';
    if (s.mode === 'closed-off') return fill(S.closed_off, { next: s.next ? s.next.label : 'soon' });
    var at = slotLabel() ? slotShort() : (s.next ? s.next.label : 'the next opening');
    return 'We open ' + at.replace(/^Today/, 'today') + '. I can set your order aside for pickup then.';
  }
  function hello() { var d = blank('hello', S.greeting); d.note = helloNote(); return d; }
  function hoursAnswer() {
    var s = hours();
    if (!s) return blank('hours', 'Our hours are being confirmed with the shop; please call 626-365-1161 before a special trip. We’re closed on Mondays.');
    var d;
    if (s.open) d = blank('hours', 'We’re open until ' + s.today.close + ' today; online orders close at ' + s.today.cutoff + '. Our listings show more than one set of hours, so a call before a special trip is wise.');
    else if (s.why === 'closure') d = blank('hours', 'We’re closed today' + (s.closure && s.closure.reason ? ' (' + s.closure.reason + ')' : '') + '. We open again ' + (s.next ? s.next.label : 'soon') + (s.mode === 'closed-off' ? '.' : ', and I can set your order aside for then.'));
    else d = blank('hours', 'We’re closed now. We open again ' + (s.next ? s.next.label : 'soon') + (s.mode === 'closed-off' ? '. I can still answer questions, and Members hear about the case first.' : ', and I can set your order aside for pickup from then.'));
    if (s.mode === 'closed-off' && !s.open) d.go.push({ to: 'members', label: 'Join Members' }); else d.slot = true;
    return d;
  }
  function best() {
    var three = engine ? engine.today(engine.laToday ? engine.laToday() : null) : [];
    var d = blank('today', three.length ? 'Three from the case today, each 100% plant-based and boxed for your pickup time. Shall I add one?' : S.offline);
    d.items = three.map(function (h) { return { h: h }; }); if (!three.length) d.handoff = true;
    return d;
  }
  function route(text) {
    var q = norm(text);
    if (!q) return hello();
    if (/\b(ignore|disregard|forget) (all |your |the |previous |prior |any )*(rules|instructions|prompt|guidelines)|system prompt|your prompt|developer mode|jailbreak|act as |pretend (to be|you)|you are now|reveal (your|the)|show (me )?(your|the) (prompt|rules|instructions|code|source)|what (are|is) your (rules|instructions|prompt)/.test(q)) {
      var r = blank('rules', S.rules); r.go.push({ to: 'best', label: 'Today’s best' }); return r;
    }
    if (/\b(are you|is this|am i (talking|speaking|chatting) (to|with)) (a |an )?(real |actual )?(person|human|robot|bot|ai|machine|computer|someone|people)\b|\b(talk|speak) to (a |an )?(person|human|someone|staff|manager)\b|\bwho (are|is) (you|this)\b/.test(q)) { var p = blank('person', S.person); p.handoff = true; return p; }
    if (/\b(complain|complaint|refund|my order was|order was wrong|wrong order|was missing|were missing|never (got|received|arrived|came)|disappointed|overcharged|charged twice|stale|food poisoning|got sick|made me sick|rude (staff|service)|bad service|terrible service)\b/.test(q)) { var c = blank('complaint', S.complaint); c.handoff = true; return c; }
    if (/\b(stupid|useless|idiot|dumb|shut up|hate (you|this)|sucks|garbage|trash|wtf|fuck|fucking|shit|crap|worst)\b/.test(q)) { var u = blank('rude', S.rude); u.asks = F.starters.slice(0, 3); return u; }
    if (/^(merci|thanks?|thank you|thx|ok thanks|great thanks|merci beaucoup)[\s!.]*$/.test(q)) { var m = blank('thanks', 'Avec plaisir. Bonne journée.'); if (count()) m.go.push({ to: 'bag', label: 'Review your bag' }); return m; }
    if (/^(bonjour|hello|hi|hey|salut|good (morning|afternoon|evening)|coucou)[\s!.]*$/.test(q)) { var g = blank('hello', 'Bonjour. What can I prepare for you today?'); g.asks = F.starters.slice(0, 3); return g; }
    if (/\b(are you open|open (now|today|tomorrow|on)|opening hours|your hours|hours today|what time do you (open|close)|closing time|when do you (open|close)|are you closed|still open)\b/.test(q)) return hoursAnswer();
    if (/quelle heure|ouvert|ouvrez|horaires|fermez|fermé|ferme a/.test(q)) return hoursAnswer();
    if (/\b(weather|rain|raining|snow|joke|poem|pizza|burger|sushi|tacos?|game|score|politics?|election|president|bitcoin|crypto|stocks?|homework|movie|song|lyrics|translate)\b/.test(q) || /\d\s*[-+*\/x×÷=]\s*\d/.test(String(text))) return unknown();
    if (/today.?s best|what.?s (good|best)|best today|what should i (get|try)|recommend|in the case today|what do you have|for me$/.test(q)) return best();
    if (/^fill my box$|fill (me )?a box|surprise box/.test(q)) { var fb = blank('box', 'Avec plaisir. Six macarons, $15.00. I’ve filled the box; tap a macaron to swap it, then add it.'); fb.box = { flavours: [], auto: true }; return fb; }
    if (/build a gift|gift box|gift finder|gift ideas?|^a gift$|^gifts?$/.test(q)) { var gf = blank('gift', 'With pleasure. Three taps: who it’s for, the occasion and the budget, and I’ll suggest one box.'); gf.gift = true; return gf; }
    if (/^cakes?$/.test(q)) return fromEngine('I need a celebration cake') || blank('cake', S.error);
    if (/for the table|for a table|to share|for sharing/.test(q)) { var t = blank('table', 'For the table, three that travel well: the four jars, the assorted macaron box and, for ten, the cheese board.'); t.items = [{ h: '4-desserts-in-jar' }, { h: 'macarons' }, { h: 'cheese-board' }]; return t; }
    if (/^pickup times?$|pickup time|pick ?up (time|slot)s?/.test(q)) return fromEngine('pick up') || hoursAnswer();
    if (/^(i.?d like a |a )?(celebration|birthday) cake$|start (a )?cake/.test(q)) return fromEngine('I need a celebration cake') || blank('cake', S.error);
    if (last && /^(yes|yes please|add it|add that|add one|add another|i.?ll take it|one more|another one|two of those|add two|oui)$/.test(q)) {
      var n = /two/.test(q) ? 2 : 1, b = bagItem(last); if (b && window.IDE && !closedOff()) window.IDE.add(b, n);
      var y = blank('add', 'C’est noté.'); y.items = [{ h: last, added: true, qty: n }]; y.signoff = S.signoff[signoffN++ % S.signoff.length]; return y;
    }
    if (!engine) { var off = blank('offline', S.offline); off.handoff = true; return off; }
    if (/\bbox\b/.test(q) && /raspberr|framboise|pistach|chocolat|coffee|cafe|coconut|coco\b/.test(q) && !/box of (six|6)/.test(q)) text = 'box of six ' + text;
    return fromEngine(text) || fromEngine(mend(text)) || menuSearch(mend(text)) || unknown();
  }
  function unknown() { var d = blank('unknown', S.dont_know); d.asks = F.starters.slice(0, 3); d.handoff = true; return d; }
  function menuSearch(text) {
    if (!engine) return null;
    var q = norm(text).split(' ').filter(function (w) { return w.length > 3; });
    if (!q.length) return null;
    var hits = engine.items().filter(function (i) {
      if (i.channel === 'booking' || i.needs_choice || i.category === 'wholesale') return false;
      var hay = norm(i.title + ' ' + i.desc);
      return q.some(function (w) { return hay.indexOf(w.replace(/s$/, '')) >= 0; });
    }).slice(0, 3);
    if (!hits.length) return null;
    var d = blank('items', 'From our menu: ' + hits.map(function (i) { return i.title + ', ' + money(i.price); }).join('; ') + '. Shall I add one?');
    d.items = hits.map(function (i) { return { h: i.handle }; }); return d;
  }
  /* every answer ends with one next step tied to the bag */
  function nextStep(d) {
    if (d.intent === 'hello' || d.items.length || d.slot || d.cake || d.box || d.gift || d.go.length || d.asks.length) return d;
    if (d.intent === 'complaint') return d;
    d.go.push(count() ? { to: 'bag', label: 'Review your bag' } : d.intent === 'person' || d.intent === 'unknown' ? { to: 'best', label: 'Today’s best' } : { to: 'pickup', label: 'Choose a pickup time' });
    return d;
  }

  /* ---------- the sheet ---------- */
  function build() {
    root = document.createElement('div');
    root.className = 'ctr'; root.hidden = true;
    root.innerHTML = '<div class="ctr-scrim" data-ctr-close></div><div class="ctr-sheet" role="dialog" aria-modal="true" aria-labelledby="ctr-t" aria-describedby="ctr-d">' +
      '<div class="ctr-head"><span class="ctr-av">' + MARK + '<i class="live" aria-hidden="true"></i></span><div><h2 id="ctr-t">' + esc(S.title) + '</h2><p>' + esc(S.sub) + '</p></div>' +
      '<button class="ctr-bag" type="button" data-ctr-bag aria-label="Your bag">' + BAGI + '<span data-ctr-n>0</span></button>' +
      '<button class="x" type="button" data-ctr-close aria-label="Close the counter">' + X + '</button></div>' +
      '<p class="ctr-disc" id="ctr-d">' + esc(S.disclosure) + '</p>' +
      '<div class="ctr-log" role="log" aria-live="polite" aria-relevant="additions" data-ctr-log></div>' +
      '<div class="ctr-foot"><div class="ctr-chips" role="group" aria-label="Suggested questions" data-ctr-chips></div>' +
      '<form class="ctr-in" data-ctr-form><label class="sr" for="ctr-q">Your question for the counter</label><input id="ctr-q" type="text" autocomplete="off" enterkeyhint="send" maxlength="200" placeholder="' + esc(S.placeholder) + '">' +
      '<button class="btn" type="submit">Ask</button></form></div></div>';
    document.body.appendChild(root);
    log = $('[data-ctr-log]', root); chipsEl = $('[data-ctr-chips]', root); input = $('#ctr-q', root);
    root.addEventListener('click', safe(onClick));
    $('[data-ctr-form]', root).addEventListener('submit', safe(function (e) { e.preventDefault(); var v = input.value.trim(); input.value = ''; chips(); if (v) ask(v); }));
    input.addEventListener('input', safe(function () { chips(input.value); }));
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])', $('.ctr-sheet', root)).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
  function open(seed, first) {
    if (!root) return;
    hidePop(true);
    opener = document.activeElement;
    root.hidden = false; requestAnimationFrame(function () { root.classList.add('is-open'); });
    document.body.classList.add('locked');
    $$('body > *').forEach(function (el) { if (el !== root && el.tagName !== 'SCRIPT' && !el.hasAttribute('aria-live')) el.inert = true; });
    if (!log.children.length) restore();
    if (!log.children.length) say(Object.assign(hello(), { asks: [], rail: true }), true);
    var n = $('[data-ctr-n]', root); if (n) n.textContent = count();
    chips('', seed);
    acted(); track('counter_popup_opened');
    if (first) ask(first); else setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 260);
  }
  function close() {
    if (!root || root.hidden) return;
    root.classList.remove('is-open'); root.hidden = true; document.body.classList.remove('locked');
    $$('body > *').forEach(function (el) { el.inert = false; });
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    pills(true); lastClose = Date.now();
  }
  function chips(typed, seed) {
    var list;
    if (typed && typed.trim().length > 1) {
      var t = norm(typed);
      list = F.suggest.filter(function (s) { var n = norm(s); return n.indexOf(t) >= 0 || t.split(' ').every(function (w) { return n.indexOf(w) >= 0; }); }).slice(0, 3);
    } else list = log.children.length <= 1 ? F.starters.slice(0, 5) : F.chips.slice(0, 4);
    if (seed) list = [seed].concat(list.filter(function (x) { return x !== seed; })).slice(0, 3);
    chipsEl.innerHTML = list.map(function (c) { return '<button type="button" class="ctr-chip" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  }

  /* ---------- messages ---------- */
  function me(t) { var m = document.createElement('div'); m.className = 'cm me'; m.innerHTML = '<p>' + esc(t) + '</p>'; log.appendChild(m); scroll(); }
  function scroll(top) { log.scrollTop = top ? 0 : log.scrollHeight; }
  function say(d, quiet) {
    nextStep(d);
    var h = '<span class="cm-av" aria-hidden="true">' + MARK + '</span><div class="cm-body"><p' + (d.note ? ' class="cm-hello"><b class="cm-t">' + esc(d.reply) + '</b><span class="cm-note">' + esc(d.note) + '</span>' : '>' + esc(d.reply)) + '</p>';
    if (d.items && d.items.length) h += '<div class="cc-list">' + d.items.map(function (x) { return itemCard(x.h, x.added, x.qty); }).join('') + '</div>';
    if (d.box) h += boxCard(d.box.flavours, d.box.auto);
    if (d.gift) h += giftCard();
    if (d.rail) h += rail();
    if (d.cake) h += cakeCard(d.cake);
    if (d.slot) h += slotCard();
    var acts = (d.go || []).map(function (g) { return '<button type="button" class="cc-go" data-go="' + g.to + '">' + esc(g.label) + '</button>'; })
      .concat((d.asks || []).map(function (a) { return '<button type="button" class="cc-go" data-q="' + esc(a) + '">' + esc(a) + '</button>'; }))
      .concat((d.links || []).map(function (l) { return '<a class="cc-go" href="' + esc(l.href) + '"' + (l.ext || /^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.label) + '</a>'; }));
    if (d.handoff) acts = acts.concat((d.handoff === 'call' ? ['call'] : ['call', 'email']).map(function (k) { return '<a class="cc-go" href="' + esc(F.handoff[k].href) + '">' + esc(F.handoff[k].label) + '</a>'; }));
    if (acts.length) h += '<div class="cc-acts">' + acts.join('') + '</div>';
    if (d.signoff) h += '<p class="cm-sign">' + esc(d.signoff) + '</p>';
    var m = document.createElement('div'); m.className = 'cm shop'; m.setAttribute('data-intent', d.intent); m.innerHTML = h + '</div>';
    log.appendChild(m);
    if (d.slot) repaintPickers();
    var single = (d.items || []).length === 1 ? d.items[0].h : null; if (single) last = single;
    if (!quiet) remember({ who: 'shop', d: strip(d) });
    scroll(d.intent === 'hello' && log.children.length === 1);
  }
  function strip(d) { return { intent: d.intent, reply: d.reply, note: d.note || null, items: (d.items || []).map(function (x) { return { h: x.h, added: x.added, qty: x.qty }; }), links: d.links || [], go: d.go || [], asks: d.asks || [], slot: !!d.slot, cake: d.cake || null, box: d.box ? { flavours: d.box.flavours } : null, gift: !!d.gift, rail: !!d.rail, handoff: d.handoff || false, signoff: d.signoff || null }; }
  function remember(entry) { var h = get('sessionStorage', HIST, []); h.push(entry); put('sessionStorage', HIST, h.slice(-30)); }
  function restore() { get('sessionStorage', HIST, []).forEach(function (e) { try { if (e.who === 'me') me(e.t); else say(e.d, true); } catch (x) { /* skip a broken entry */ } }); }
  var FL = ['Raspberry', 'Pistachio', 'Chocolate', 'Coffee', 'Coconut'], SW = { Raspberry: 'f-raspberry', Pistachio: 'f-pistachio', Chocolate: 'f-chocolate', Coffee: 'f-coffee', Coconut: 'f-coconut' };
  function boxCard(fl, auto) {
    var list = fl.slice(0, 6);
    if (auto) while (list.length < 6) list.push(FL[Math.floor(Math.random() * FL.length)]);
    if (closedOff()) return '<div class="cc-card"><b>Box of six · $15.00</b><p>Ordering opens ' + esc((hours().next || {}).label || 'soon') + '.</p></div>';
    return '<div class="cc-card cc-box" data-mbox="' + esc(list.join(',')) + '"><b>Your box of six · $15.00</b>' + boxInner(list) + '</div>';
  }
  function boxInner(list) {
    var w = '', i; for (i = 0; i < 6; i++) w += list[i] ? '<button type="button" class="mw ' + SW[list[i]] + '" data-mw="' + i + '" aria-label="' + esc(FR[list[i]]) + ', tap to take it out"></button>' : '<span class="mw" aria-hidden="true"></span>';
    var f = FL.map(function (x) { return '<button type="button" class="mf" data-mf="' + x + '"' + (list.length >= 6 ? ' disabled' : '') + '><i class="' + SW[x] + '"></i><span lang="fr">' + FR[x] + '</span></button>'; }).join('');
    return '<div class="mwells" aria-label="Your box, ' + list.length + ' of 6">' + w + '</div><div class="mflav">' + f + '</div>' +
      '<div class="mfoot"><button type="button" class="tbtn" data-msurprise>' + (list.length ? 'Fill the rest' : 'Surprise me') + '</button>' +
      '<button type="button" class="btn" data-madd' + (list.length < 6 ? ' disabled' : '') + '>' + (list.length < 6 ? (6 - list.length) + ' to go' : 'Add the box · $15.00') + '</button></div>';
  }
  function boxClick(t) {
    var card = t.closest('[data-mbox]'); if (!card) return false;
    var list = (card.getAttribute('data-mbox') || '').split(',').filter(Boolean);
    if (t.hasAttribute('data-mf') && list.length < 6) list.push(t.getAttribute('data-mf'));
    else if (t.hasAttribute('data-mw')) list.splice(+t.getAttribute('data-mw'), 1);
    else if (t.hasAttribute('data-msurprise')) while (list.length < 6) list.push(FL[Math.floor(Math.random() * FL.length)]);
    else if (t.hasAttribute('data-madd') && list.length === 6 && window.IDE) {
      var tally = {}; list.forEach(function (x) { tally[FR[x]] = (tally[FR[x]] || 0) + 1; });
      var keys = Object.keys(tally).sort();
      if (window.LumiereFly) window.LumiereFly(t, 'img/macarons-2-800.jpg');
      window.IDE.add({ handle: 'macaron-box-6:' + keys.map(function (k) { return k + tally[k]; }).join('-').toLowerCase().replace(/\s+/g, ''), title: 'Box of six macarons', price: 15, image: 'img/macarons-2-800.jpg', glyph: '6', meta: keys.map(function (k) { return k + (tally[k] > 1 ? ' ×' + tally[k] : ''); }).join(', ') });
      track('counter_popup_add', { from: 'minibox' }); acted();
      card.innerHTML = '<b>Your box of six · $15.00</b><p class="cc-in">' + TICK + 'Merci, it’s in your bag.</p>'; return true;
    } else return t.closest('.cc-box') ? true : false;
    card.setAttribute('data-mbox', list.join(','));
    card.innerHTML = '<b>Your box of six · $15.00</b>' + boxInner(list);
    var again = card.querySelector(t.hasAttribute('data-mf') ? '[data-mf="' + t.getAttribute('data-mf') + '"]' : '[data-msurprise]'); if (again && !again.disabled) again.focus({ preventScroll: true });
    return true;
  }
  /* the gift finder, inline */
  function giftCard() {
    var g = function (k, q, opts) { return '<div class="mg" data-gq="' + k + '"><p class="gf-q">' + q + '</p><div class="gf-opts">' + opts.map(function (o) { return '<button type="button" data-gk="' + k + '" data-gv="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join('') + '</div></div>'; };
    return '<div class="cc-card cc-gift" data-mgift>' + g('who', 'Who is it for?', [['host', 'A host'], ['colleague', 'A colleague'], ['family', 'Family'], ['sweetheart', 'Someone special']]) +
      g('occ', 'The occasion?', [['birthday', 'A birthday'], ['thanks', 'A thank-you'], ['holidays', 'The holidays'], ['because', 'Just because']]) +
      g('budget', 'Your budget?', [['20', 'Up to $20'], ['40', 'Up to $40'], ['60', 'Up to $60'], ['150', 'Up to $150']]) + '<div class="mg-out" aria-live="polite"></div></div>';
  }
  function giftClick(t) {
    var card = t.closest('[data-mgift]'); if (!card || !t.hasAttribute('data-gk')) return false;
    var k = t.getAttribute('data-gk');
    $$('[data-gk="' + k + '"]', card).forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); });
    card.setAttribute('data-' + k, t.getAttribute('data-gv'));
    var who = card.getAttribute('data-who'), occ = card.getAttribute('data-occ'), budget = card.getAttribute('data-budget'), out = $('.mg-out', card);
    if (!(who && occ && budget) || !engine) return true;
    var r = engine.gift(+budget, who), first = r.items.filter(function (i) { return !soldOut(i.handle); })[0];
    out.innerHTML = first ? '<p class="gf-k">The counter suggests</p>' + itemCard(first.handle) + '<p class="gf-note">For the note: <span lang="fr">' + esc(NOTE[occ] || NOTE.because) + '</span></p>' : '<p>Nothing on our online store fits that budget; the team can suggest something: <a href="tel:+16263651161">626-365-1161</a>.</p>';
    scroll(); return true;
  }
  function rail() {
    if (!engine) return '';
    var hs = engine.today(engine.laToday ? engine.laToday() : null).concat(['chocolate-eclair', 'macarons', '4-desserts-in-jar', 'caneles', 'golden-ticket']);
    hs = hs.filter(function (h, i) { return hs.indexOf(h) === i && engine.item(h) && !soldOut(h); }).slice(0, 6);
    return '<div class="cc-rail" role="list" aria-label="From the case today">' + hs.map(function (h) {
      var b = bagItem(h); if (!b) return '';
      return '<div class="rc" role="listitem" data-card>' + thumb(b) + '<b>' + esc(b.title) + '</b><span class="pr">' + money(b.price) + '</span>' + (closedOff() ? '' : addBtn(b)) + '</div>';
    }).join('') + '</div>';
  }
  function cakeCard(c) {
    var mc = bagItem('mousse-cake');
    return '<div class="cc-card cc-cake"><b>A celebration cake' + (c.guests ? ' for ' + c.guests : '') + '</b><ul><li>One week’s notice</li><li>A sketch and a price from the chef</li><li>A deposit on a Shopify invoice holds the date</li></ul>' +
      '<a class="btn" href="../../cakes.html">Start your cake request</a>' + (mc && !closedOff() ? '<p class="cc-soon">Sooner: a mousse cake with a message plaque, ' + money(mc.price) + '. ' + addBtn(mc) + '</p>' : '') + '</div>';
  }
  function slotCard() {
    return '<div class="cc-card cc-slot slot" role="group" data-slot-picker aria-label="Pickup time"><div class="days" role="group" aria-label="Day" data-days></div>' +
      '<div class="times" role="group" aria-label="Time" data-times></div><div class="slot-foot"><span data-slot-note></span><b data-slot-out></b></div></div>';
  }
  function ask(text) {
    me(text); remember({ who: 'me', t: text });
    var d;
    try { d = route(text); } catch (e) { d = blank('error', S.error); d.handoff = true; }
    var dots = null;
    if (!reduce) { dots = document.createElement('div'); dots.className = 'cm shop cm-typing'; dots.setAttribute('aria-hidden', 'true'); dots.innerHTML = '<span class="cm-av">' + MARK + '</span><p class="pop-typing"><i></i><i></i><i></i></p>'; log.appendChild(dots); scroll(); }
    setTimeout(function () {
      if (dots) dots.remove();
      try { say(d); chips(); } catch (e) { var m = document.createElement('div'); m.className = 'cm shop'; m.innerHTML = '<div class="cm-body"><p>' + esc(S.error) + '</p></div>'; log.appendChild(m); }
    }, reduce ? 0 : 420);
  }
  function fillBox(list, andAdd, from) {
    var box = $('#box'); if (!box) return;
    var clear = $('[data-box-clear]', box); if (clear) clear.click();
    if (andAdd) {
      var s = $('[data-box-surprise]', box); if (s) s.click();
      var a = $('[data-box-add]', box);
      if (a && !a.disabled) { if (from && window.LumiereFly) window.LumiereFly(from, 'img/macarons-2-800.jpg'); a.click(); track('counter_popup_add', { from: 'box' }); acted(); }
      return;
    }
    close(); go('#box');
    list.filter(Boolean).forEach(function (f, k) { setTimeout(function () { var b = $('[data-f="' + (FR[f] || f) + '"]', box); if (b) b.click(); }, reduce ? 0 : 120 * (k + 1)); });
  }
  function goTo(to) {
    if (to === 'best') { if (root.hidden) open('', 'Today’s best'); else ask('Today’s best'); return; }
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
    if (boxClick(t) || giftClick(t)) return;
    if (t.hasAttribute('data-ctr-bag')) { close(); if (window.IDE) window.IDE.open(); return; }
    if (t.hasAttribute('data-fill')) {
      if (t.hasAttribute('data-fill-add')) { fillBox([], true, t); t.outerHTML = '<span class="cc-in">' + HEART + 'In your bag</span>'; return; }
      fillBox(t.getAttribute('data-fill').split(','), false); return;
    }
    if (t.hasAttribute('data-add')) {
      last = t.getAttribute('data-handle'); track('counter_popup_add', { from: 'card' }); acted();
      if (window.LumiereFly) window.LumiereFly(t, t.getAttribute('data-image'));
      setTimeout(function () { var card = t.closest('.cc-item'); if (card) card.classList.add('is-added'); t.outerHTML = '<span class="cc-in">' + TICK + 'Merci, it’s in your bag</span>'; }, 0);
    }
  }
  function safe(fn) {
    return function (e) {
      try { return fn.apply(this, arguments); } catch (err) {
        if (log && root && !root.hidden) { var m = document.createElement('div'); m.className = 'cm shop'; m.innerHTML = '<span class="cm-av" aria-hidden="true">' + MARK + '</span><div class="cm-body"><p>' + esc(S.error) + '</p><div class="cc-acts"><a class="cc-go" href="tel:+16263651161">Call 626-365-1161</a></div></div>'; log.appendChild(m); scroll(); }
      }
    };
  }

  /* ---------- the pop-up: one opener per page view, chosen by where the visitor is ---------- */
  var pop = null, popTimer = null, lastClose = 0, lastType = 0, lastFast = 0, lastScrollY = scrollY, lastScrollT = Date.now(), shownThisView = 0, idleT = null, bagIdleDone = false, phone = function () { return innerWidth < 900; };
  var helloState = 'new';   /* per page load: a reload greets again */
  function pills() { $$('[data-bonjour]').forEach(function (p) { p.hidden = false; }); }
  /* the pill: the counter's mark and one live line that turns every few seconds, facts only */
  var pillTurns = 0, pillTimer = null, pillHeld = false, pillNext = null;
  function lines() {
    var out = [], s = hours(), slot = (slotLabel() || '').replace(/^Today/, 'today');
    if (pillNext) out.push(pillNext);
    if (s && !s.open) out.push({ t: 'Closed now · order for ' + (slot || (s.next ? s.next.label : 'later')), ask: 'Pickup times' });
    out.push({ t: 'Box of six, $15.00', ask: 'Fill my box' });
    if (engine) engine.today(engine.laToday ? engine.laToday() : null).forEach(function (h) { var i = engine.item(h); if (i && !soldOut(h)) out.push({ t: i.title + ', ' + money(i.price), ask: 'Today’s best' }); });
    if (slot && (!s || s.open)) out.push({ t: 'Pickup ' + slot + ' is open', ask: 'Pickup times' });
    out.push({ t: 'Celebrating? Cakes on a week’s notice', ask: 'Cakes' });
    out.push({ t: '100% plant-based, every piece', ask: 'Is everything plant-based?' });
    out.push({ t: 'The macaron class, Tuesdays 3:30 pm', ask: 'When is the macaron class?' });
    return out;
  }
  function setPill(l) {
    $$('[data-pill]').forEach(function (p) {
      var tx = $('.pill-txt', p); if (!tx) return;
      p.setAttribute('data-ask', l.ask || '');
      if (reduce || tx.textContent === l.t) { tx.textContent = l.t; return; }
      tx.classList.add('is-out');
      setTimeout(function () { tx.textContent = l.t; tx.classList.remove('is-out'); }, 200);
    });
  }
  function turnPill() {
    clearTimeout(pillTimer);
    var ls = lines(); setPill(ls[pillTurns % ls.length]);
    if (reduce || pillTurns >= (P.pill_max_turns || 6)) return;
    pillTimer = setTimeout(function () { if (!pillHeld && !document.hidden) pillTurns++; turnPill(); }, P.pill_every_ms || 8000);
  }
  function pillUp() {
    $$('[data-pill]').forEach(function (p) {
      p.hidden = false;
      p.addEventListener('pointerenter', function () { pillHeld = true; }); p.addEventListener('pointerleave', function () { pillHeld = false; });
      p.addEventListener('focus', function () { pillHeld = true; }); p.addEventListener('blur', function () { pillHeld = false; });
      p.addEventListener('click', safe(function () { var a = p.getAttribute('data-ask'); hidePop(true); open('', a || null); }));
    });
    turnPill();
    setInterval(placePill, 700); addEventListener('scroll', placePill, { passive: true });
  }
  /* the floating pill (desktop) steps aside while it would sit on a price, an Add button or the headline */
  function placePill() {
    var fp = $('.float-pill'); if (!fp || fp.hidden || getComputedStyle(fp).display === 'none') return;
    var r = fp.getBoundingClientRect(); fp.classList.remove('is-yield');
    var hit = $$('h1, .pr, .stg-pr, [data-add], .btn, .stepper').some(function (el) {
      if (el.closest('.ctr, .drawer, .dock, .sub, [hidden], .stg-slide:not(.is-on), .pop')) return false;
      var b = el.getBoundingClientRect(); return b.width && b.bottom > r.top - 8 && b.top < r.bottom + 8 && b.right > r.left - 8 && b.left < r.right + 8;
    });
    fp.classList.toggle('is-yield', hit);
  }
  var MUTE = 'lumiere.counter.mute.v1', dismissedView = false;
  function muted() { try { var u = JSON.parse(localStorage.getItem(MUTE) || 'null'); return !!u && Date.now() < u; } catch (e) { return false; } }
  function mute24() { try { localStorage.setItem(MUTE, JSON.stringify(Date.now() + 24 * 3600 * 1000)); } catch (e) { /* storage blocked: the dismissal still holds for this page load */ } dismissedView = true; }
  function forced() { try { return /[?&]counter=1(&|$)/.test(location.search); } catch (e) { return false; } }
  function searchActive() { return !!document.querySelector('.srch:focus-within, .srch.has-q'); }
  function visit() { return get('sessionStorage', POP, { n: 0, closed: 0 }); }
  function canAuto() {
    var v = visit(), now = Date.now();
    return !pop && !dismissedView && !muted() && shownThisView < P.max_per_view && now - Math.max(v.closed || 0, lastClose) > P.cooldown_after_close_ms &&
      now - lastType > P.typing_quiet_ms && !searchActive() && now - lastFast > 700 && root && root.hidden && !$('.drawer.open');
  }
  function context() {
    var y = innerHeight * 0.45, el = document.elementFromPoint(innerWidth / 2, y), sec = el && el.closest('section[id]');
    if (!sec) return 'hello';
    if (sec.id === 'eclairs') return el.closest('.hero-more') ? 'eclairs' : 'hello';
    return (P.sections && P.sections[sec.id]) || 'hello';
  }
  var ACT = {
    best: { label: 'Today’s best', run: function () { open('', 'Today’s best'); } },
    box: { label: 'Fill my box', run: function (b) { popAdd('box', b); } },
    fillbox: { label: 'Fill my box · $15.00', run: function (b) { popAdd('box', b); } },
    choosebox: { label: 'Choose the flavours', run: function () { hidePop(true); go('#box'); } },
    pickup: { label: 'Pickup times', run: function () { open('', 'Pickup times'); } },
    cake: { label: 'Start a cake request', run: function () { open('', 'A birthday cake'); } },
    forme: { label: 'For me', run: function () { open('', 'Today’s best'); } },
    gift: { label: 'A gift', run: function () { hidePop(true); goTo('gift'); } },
    table: { label: 'For the table', run: function () { open('', 'For the table'); } },
    bag: { label: 'Review your bag', run: function () { hidePop(true); if (window.IDE) window.IDE.open(); } },
    members: { label: 'Remind me: Members', run: function () { hidePop(true); goTo('members'); } }
  };
  function actLabel(a) {
    if (a.indexOf('add:') === 0) { var b = bagItem(a.slice(4)); return b ? 'Add ' + (b.title.charAt(0).toLowerCase() + b.title.slice(1)) + ' · ' + money(b.price) : null; }
    return ACT[a] ? ACT[a].label : null;
  }
  function popCard(kind, line, actions, note) {
    var acts = actions.map(function (a) { var l = actLabel(a); return l ? '<button type="button" class="pop-act" data-pop="' + esc(a) + '" data-track="counter_popup_action">' + esc(l) + '</button>' : ''; }).join('');
    return '<div class="pop-head"><span class="ctr-av">' + MARK + '<i class="live" aria-hidden="true"></i></span><b>' + esc(S.short || S.name) + '</b>' +
      '<button class="pop-x" type="button" aria-label="Close">' + X + '</button></div>' +
      '<div class="pop-body"><p class="pop-line' + (note ? ' is-title' : '') + '">' + esc(line) + '</p>' + (note ? '<p class="pop-note">' + esc(note) + '</p>' : '') + (acts ? '<div class="pop-acts">' + acts + '</div>' : '') + (kind === 'added' || kind === 'waiting' ? '' : '<button type="button" class="pop-mute" data-pop-mute>Don’t show again</button>') + '</div>';
  }
  function showPop(kind, opt) {
    opt = opt || {};
    var o = (P.openers && P.openers[kind]) || P.openers.hello, line = opt.line || o.line, actions = (opt.actions || o.actions || []).slice();
    var s = hours(), note = '';
    if (kind === 'hello' && !opt.line) note = helloNote();
    if (s && !s.open && !opt.keep) {
      var next = slotLabel() || (s.next ? s.next.label : 'the next opening');
      if (s.mode === 'closed-off') { actions = ['members']; if (kind !== 'hello' || opt.line) { line = ''; note = fill(S.closed_off, { next: s.next ? s.next.label : 'soon' }); } }
      else if (kind !== 'hello' || opt.line) note = fill(S.closed_pre, { next: next.replace(/^Today/, 'today') });
    }
    if (!line && note) { line = note; note = ''; }
    var closedNote = !!(s && !s.open && note);
    if (closedOff()) actions = actions.filter(function (a) { return a.indexOf('add:') !== 0 && a !== 'box' && a !== 'fillbox'; });
    hidePop(false);
    pop = document.createElement('div'); pop.className = 'pop is-yield'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'false'); pop.setAttribute('aria-label', S.title);
    pop.setAttribute('data-kind', kind);
    pop.innerHTML = popCard(kind, line, actions, note);
    if (closedNote) document.documentElement.setAttribute('data-pop-hours', '');
    var body = $('.pop-body', pop), ms = reduce ? 0 : (P.shimmer_ms || 600);
    if (ms) { body.hidden = true; body.insertAdjacentHTML('beforebegin', '<p class="pop-typing" aria-hidden="true"><i></i><i></i><i></i></p>'); setTimeout(function () { if (!pop) return; var t = $('.pop-typing', pop); if (t) t.remove(); body.hidden = false; queuePlace(); }, ms); }
    if (opt.extra) body.insertAdjacentHTML('beforeend', opt.extra);
    document.body.appendChild(pop);
    pop.addEventListener('click', safe(function (e) {
      var x = e.target.closest('.pop-x'); if (x) { dismissedView = true; closePop(); return; }
      if (e.target.closest('[data-pop-mute]')) { mute24(); track('counter_popup_muted'); closePop(); return; }
      var a = e.target.closest('[data-pop]'); if (a) { runAct(a.getAttribute('data-pop'), a); return; }
      var add = e.target.closest('[data-add]'); if (add) { track('counter_popup_add', { from: 'pop' }); acted(); setTimeout(function () { afterAdd(add.getAttribute('data-handle'), true); }, 0); return; }
      var ch = e.target.closest('[data-change-slot]'); if (ch) { open('', 'Pickup times'); }
      if (pop && (pop.classList.contains('is-compact') || pop.classList.contains('is-peek')) && e.target.closest('.pop-line, .pop-head b, .ctr-av')) { open(); }
    }));
    if (!opt.response) { shownThisView++; var v = visit(); v.n++; put('sessionStorage', POP, v); track('counter_popup_shown', { opener: kind }); }
    put('sessionStorage', HELLO, 'shown'); helloState = 'shown';
    requestAnimationFrame(function () { requestAnimationFrame(placePop); });
    var keep = setInterval(function () { if (!pop) clearInterval(keep); else placePop(); }, 1000);
    if (opt.autoHide) setTimeout(function () { if (pop && pop.getAttribute('data-kind') === kind && !pop.matches(':hover') && !pop.contains(document.activeElement)) hidePop(true); }, opt.autoHide);
  }
  function runAct(a, btn) {
    if (a.indexOf('add:') === 0) {
      var b = bagItem(a.slice(4)); if (!b || !window.IDE) return;
      if (window.LumiereFly) window.LumiereFly(btn, b.image);
      window.IDE.add(b, 1); track('counter_popup_add', { from: 'pop' }); acted(); afterAdd(b.handle, true); return;
    }
    if (ACT[a]) ACT[a].run(btn);
  }
  function popAdd(what, btn) { fillBox([], true, btn); setTimeout(function () { afterAdd('macaron-box-6', true); }, 60); }
  function closePop() { var v = visit(); v.closed = Date.now(); put('sessionStorage', POP, v); lastClose = Date.now(); hidePop(true); var p = $$('[data-bonjour]').filter(function (x) { return x.offsetParent; })[0]; if (p) p.focus({ preventScroll: true }); }
  function hidePop(done) {
    if (pop) { pop.remove(); pop = null; }
    document.documentElement.removeAttribute('data-pop-hours');
    if (done) { helloState = 'done'; put('sessionStorage', HELLO, 'done'); pills(true); }
  }
  /* after an add: the pickup time and one pairing, once per pairing */
  function afterAdd(h, fromPop) {
    if (closedOff()) return;
    var pr = engine && pairRule();
    if (pr && pr.h) { var pi = engine.item(pr.h); if (pi) { pillNext = { t: (pr.id === 'coffee' ? 'A coffee with that? ' : 'Goes well with it: ') + pi.title + ', ' + money(pi.price), ask: 'Add a ' + pi.title }; pillTurns = 0; turnPill(); } }
    var r = pairRule(), shown = get('sessionStorage', PAIRS, []), first = !get('sessionStorage', 'lumiere.confirmed.v1', false);
    var extra = '<p class="pop-slot"><button type="button" class="pop-chip" data-change-slot>' + esc(slotLabel() || 'Choose a pickup time') + '</button></p>';
    if (r && shown.indexOf(r.id) < 0) {
      shown.push(r.id); put('sessionStorage', PAIRS, shown);
      extra += r.note ? '<p class="pop-pair">Giving it? I can help with the gift note. <a href="#gift">Write the note</a></p>' : '<div class="pop-pair"><p class="pair-k">Goes well with</p>' + itemCard(r.h, false, 1, r.why) + '</div>';
    } else if (!first && !fromPop) return;
    put('sessionStorage', 'lumiere.confirmed.v1', true);
    showPop('added', { line: fill(S.after_add, { slot: '' }).replace(/ Pickup \?$/, '').replace(' Pickup ?', ''), actions: [], extra: extra, response: true, keep: true, autoHide: 12000 });
  }
  function covers(r) {
    return $$('h1, .pr, .stg-pr, [data-add], .add, .btn, [data-box-add], .chip, .stepper, input, .flavours button, .stg-pause, .stg-dot').some(function (el) {
      if (pop.contains(el) || el.closest('.ctr, .drawer, .dock, .sub, [hidden], .stg-slide:not(.is-on)')) return false;
      var b = el.getBoundingClientRect();
      return b.width && b.height && b.bottom > r.top - 8 && b.top < r.bottom + 8 && b.right > r.left - 8 && b.left < r.right + 8;
    });
  }
  function coversHero(r) {
    return $$('.stg-slides, .stg-cap, .stg-pr, .pr, [data-add], .add, .btn, [data-box-add], .stg-pause').some(function (el) {
      if (pop.contains(el) || el.closest('.ctr, .drawer, .dock, .sub, [hidden], .stg-slide:not(.is-on)')) return false;
      var b = el.getBoundingClientRect();
      return b.width && b.height && b.bottom > r.top - 4 && b.top < r.bottom + 4 && b.right > r.left && b.left < r.right;
    });
  }
  function placePop() {
    if (!pop) return;
    var dock = $('.dock'), onPhone = dock && getComputedStyle(dock).display !== 'none';
    var block = $('.drawer.open') || (root && !root.hidden) || searchActive();
    var spots = [], strict = false;
    if (onPhone) {
      /* the peek: full width less 8 px gutters, rising from the dock (or the bottom edge); on the first screen, where
         the hero photo, its caption and the order button fill the view, it takes the free strip at the top instead */
      strict = scrollY < innerHeight * 0.9;
      if (!dock.classList.contains('is-early') && !dock.classList.contains('is-yield')) spots.push({ bottom: dock.offsetHeight + 24, peek: true });
      spots.push({ bottom: 8, peek: true });
      if (strict) spots.push({ top: 8, peek: true, edge: 'top' });
    } else { var fp = $('.float-pill'), fr = fp && !fp.hidden && !fp.classList.contains('is-yield') && fp.getBoundingClientRect(); spots.push({ bottom: fr && fr.height ? innerHeight - fr.top + 12 : 24 }); }
    var ok = null;
    for (var i = 0; i < spots.length && !ok; i++) {
      var s = spots[i];
      pop.classList.toggle('is-peek', !!s.peek); pop.classList.remove('is-compact');
      pop.style.width = s.peek ? (innerWidth - 16) + 'px' : '';
      var h = pop.offsetHeight, w = pop.offsetWidth;
      var top = s.top != null ? s.top : innerHeight - s.bottom - h, left = s.peek ? 8 : innerWidth - w - 24;
      if (top + h > innerHeight - 4 || top < 0) continue;
      if (strict && onPhone && coversHero({ top: top, bottom: top + h, left: left, right: left + w })) continue;
      if (!onPhone && covers({ top: top, bottom: top + h, left: left, right: left + w })) continue;
      ok = s;
    }
    if (ok) {
      pop.classList.toggle('is-peek', !!ok.peek); pop.style.width = ok.peek ? (innerWidth - 16) + 'px' : '';
      pop.style.left = ok.peek ? '8px' : ''; pop.style.right = ok.peek ? 'auto' : '';
      pop.style.top = ok.top != null ? ok.top + 'px' : 'auto'; pop.style.bottom = ok.bottom != null ? 'calc(' + ok.bottom + 'px + env(safe-area-inset-bottom))' : 'auto';
      pop.classList.toggle('is-top', ok.edge === 'top');
    }
    pop.classList.toggle('is-yield', !!block || !ok);
  }
  var queuePlace = (function () { var t = false; return function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; placePop(); }); } }; })();
  function tryAuto(kind) { if (canAuto()) showPop(kind || context()); }
  function resetIdle() {
    clearTimeout(idleT);
    idleT = setTimeout(function () {
      if (count()) { if (!bagIdleDone) { bagIdleDone = true; if (canAuto()) showPop('waiting', { line: fill(S.bag_waiting, { n: count() + (count() === 1 ? ' item' : ' items'), slot: (slotLabel() || 'soon').replace(/^Today/, 'today') }), actions: ['bag'], keep: true }); } }
      else tryAuto('choose');
    }, count() ? P.idle_bag_ms : P.idle_empty_ms);
  }

  /* ---------- the gift finder: who, occasion, budget, then one box ---------- */
  var NOTE = { birthday: 'Joyeux anniversaire.', thanks: 'Merci pour tout.', holidays: 'Joyeuses fêtes.', because: 'Pour toi, un éclair par jour.' };
  function giftFinder() {
    var gf = $('[data-gf]'); if (!gf || !engine) return;
    var pick = {};
    gf.hidden = false;
    gf.addEventListener('click', safe(function (e) {
      var u = e.target.closest('[data-use-line]');
      if (u) { var l = $('#nt-line'); if (l) { l.value = u.getAttribute('data-use-line'); l.dispatchEvent(new Event('input', { bubbles: true })); l.focus(); } return; }
      var b = e.target.closest('button[data-k]'); if (!b) return;
      var k = b.getAttribute('data-k');
      $$('button[data-k="' + k + '"]', gf).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      pick[k] = b.getAttribute('data-v');
      var out = $('[data-gf-out]', gf), nextQ = ['who', 'occ', 'budget'].filter(function (x) { return !pick[x]; })[0];
      if (nextQ) { out.innerHTML = ''; var g = $('[data-step="' + nextQ + '"] button', gf); if (g) setTimeout(function () { g.focus({ preventScroll: true }); }, 0); return; }
      var r = engine.gift(+pick.budget, pick.who), first = r.items.filter(function (i) { return !soldOut(i.handle); })[0];
      if (!first) { out.innerHTML = '<p class="gf-none">Nothing on our online store fits that budget; the team can suggest something: <a href="tel:+16263651161">Call 626-365-1161</a>.</p>'; return; }
      var line = NOTE[pick.occ] || NOTE.because;
      out.innerHTML = '<p class="gf-k">The counter suggests</p>' + itemCard(first.handle) +
        '<p class="gf-note">For the note: <span lang="fr">' + esc(line) + '</span> <button type="button" class="tbtn" data-use-line="' + esc(line) + '">Use this line</button></p>';
    }));
  }

  /* ---------- in the bag ---------- */
  var JARS = ['4-desserts-in-jar', 'framboise-cherie', 'chocolat-mon-amour', 'citron-ma-passion', 'caramel-je-taime', 'noisette-toujours', 'douceur-tropicale'];
  var PASTRY = ['chocolate-eclair', 'pistachio-eclair', 'espresso-eclair', 'chefs-special-eclair', 'paris-brest', 'mousse-cake', 'mille-feuille', 'butter-croissant', 'canele', 'caneles', 'suisse'];
  function has(list) { return bag().some(function (i) { return list.indexOf(i.handle) >= 0; }); }
  function pairRule() {
    var items = bag();
    var drinks = items.some(function (i) { var r = RAW[i.handle]; return r && (r.category === 'drink' || r.category === 'tea'); });
    var rules = [
      { id: 'coffee', when: has(PASTRY) && !drinks, h: 'french-roast-drip', why: 'Made when you arrive, so it’s hot with the pastry.' },
      { id: 'spoons', when: has(JARS) && !inBag('cookie-spoon'), h: 'cookie-spoon', why: 'Edible spoons for the jars.' },
      { id: 'baguette', when: inBag('cheese-board') && !inBag('baguette'), h: 'baguette', why: 'One more for the board.' },
      { id: 'note', when: items.some(function (i) { return /^macaron-box-6|^macarons$/.test(i.handle); }), note: true }
    ];
    return rules.filter(function (r) { return r.when && !(r.h && (inBag(r.h) || soldOut(r.h))); })[0] || null;
  }
  function bagExtras() {
    var body = $('#bag .sheet-body'); if (!body) return;
    var box = $('[data-bag-extra]', body);
    if (!box) { box = document.createElement('div'); box.className = 'bag-extra'; box.setAttribute('data-bag-extra', ''); body.appendChild(box); }
    var items = bag(), h = '';
    if (items.length) {
      h += '<div class="bag-counter"><span class="cm-av" aria-hidden="true">' + MARK + '</span><p>' + esc(S.bag_line) + '</p></div>';
      var r = engine ? pairRule() : null, shown = get('sessionStorage', PAIRS, []);
      if (r && (shown.indexOf(r.id) < 0 || $('#bag [data-pair="' + r.id + '"]'))) {
        if (shown.indexOf(r.id) < 0) { shown.push(r.id); put('sessionStorage', PAIRS, shown); }
        if (r.note) h += '<div class="pair" data-pair="note"><p class="pair-k">Goes well with</p><p class="pair-t">Giving the box? Write a line for the gift note.</p><a class="tbtn" href="#gift" data-cart-close>Write the note</a></div>';
        else h += '<div class="pair" data-pair="' + r.id + '"><p class="pair-k">Goes well with</p>' + itemCard(r.h, false, 1, r.why) + '</div>';
      }
      if (items.some(function (i) { return !i.variantId; })) h += '<p class="mem-line"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10h18"/></svg><span>Members earn points when these counter items are ordered in our ordering app. <a href="#members" data-cart-close>About Members</a></span></p>';
      var s = hours(); if (s && !s.open) h += '<p class="mem-line closed-line">' + esc(fill(S.closed_pre, { next: (slotLabel() || (s.next ? s.next.label : 'the next opening')).replace(/^Today/, 'today') })) + '</p>';
    }
    h += '<button type="button" class="ask-bag" data-ask-open>Questions? Ask at the counter</button>';
    box.innerHTML = h;
  }
  document.addEventListener('click', safe(function (e) {
    var a = e.target.closest('[data-ask-open]');
    if (a) { if (window.IDE && $('.drawer.open')) window.IDE.close(true); open(a.getAttribute('data-ask') || ''); return; }
    var p = e.target.closest('[data-bonjour]'); if (p) { open(); return; }
    var c = e.target.closest('#bag .checkout'); if (c && get('sessionStorage', ACTED, false)) track('counter_popup_checkout');
  }));

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

  /* ---------- boot: the facts and the menu, each with a timeout and the built-in copy behind it ---------- */
  function boot(facts, menu) {
    if (facts && facts.strings) { F = facts; S = facts.strings; P = facts.popup || FALLBACK.popup; }
    if (menu && menu.items && window.ConciergeCore) {
      try { (menu.items || []).forEach(function (i) { RAW[i.handle] = i; }); engine = window.ConciergeCore.create({ menu: menu, facts: { facts: F.facts } }); } catch (e) { engine = null; }
    }
    build();
    $$('[data-ask-open]').forEach(function (b) { b.hidden = false; });
    pills(); pillUp();
    giftFinder(); lastBox();
    var before = count();
    document.addEventListener('ide:bag', function () {
      try {
        rememberBox(); bagExtras(); var cn = root && $('[data-ctr-n]', root); if (cn) cn.textContent = count();
        var n = count();
        if (n > before && (!root || root.hidden) && !(pop && pop.contains(document.activeElement))) {
          var it = bag()[bag().length - 1];
          if (!pop || pop.getAttribute('data-kind') !== 'added') setTimeout(function () { afterAdd(it && it.handle, false); }, 380);
        }
        before = n; resetIdle(); if (pop) queuePlace();
      } catch (e) { /* the bag keeps working without the extras */ }
    });
    new MutationObserver(function () { if ($('.drawer.open')) bagExtras(); if (pop) queuePlace(); }).observe($('#bag') || document.body, { attributes: true, attributeFilter: ['class'] });
    bagExtras();
    addEventListener('scroll', function () {
      var now = Date.now(), dt = Math.max(16, now - lastScrollT), v = (scrollY - lastScrollY) / dt * 1000;
      if (Math.abs(v) > P.fast_scroll_px_s) lastFast = now;
      if (phone() && v < -P.back_up_px_s && scrollY > innerHeight) setTimeout(function () { tryAuto('choose'); }, 800);
      lastScrollY = scrollY; lastScrollT = now; resetIdle(); if (pop) queuePlace();
    }, { passive: true });
    addEventListener('resize', function () { if (pop) queuePlace(); });
    ['pointerdown', 'keydown'].forEach(function (t) { addEventListener(t, resetIdle, { passive: true }); });
    document.addEventListener('keydown', function (e) { if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) lastType = Date.now(); }, true);
    resetIdle();
    if (forced()) { dismissedView = false; setTimeout(function () { shownThisView = 0; lastClose = 0; showPop('hello'); }, 300); }
    else if (helloState === 'new') popTimer = setTimeout(function wait() { if (canAuto()) showPop(context()); else if (helloState === 'new' && shownThisView < P.max_per_view) popTimer = setTimeout(wait, 1500); }, Math.max(0, P.delay_ms - (performance.now ? performance.now() : 0)));
    window.LumiereCounter = { open: open, prefill: function (q) { if (root.hidden) open(); if (input) { input.value = String(q || '').slice(0, 200); chips(input.value); setTimeout(function () { try { input.focus(); } catch (e) { /* nothing */ } }, 60); } }, close: close, ask: function (q) { if (root.hidden) open(); ask(q); }, popup: function (k) { shownThisView = 0; put('sessionStorage', POP, { n: 0, closed: 0 }); lastClose = 0; showPop(k || 'hello'); }, route: route };
  }
  /* live stock (assets/stock.json, written by tools/sync_shopify_stock.py every 15 min): fail-open, so a missing,
     broken or stale (> 6 h) file changes nothing; otherwise sold-out items and today's prices come from it */
  function applyStock(menu, st) {
    if (!menu || !menu.items || !st || !st.items) return;
    var age = Date.now() - Date.parse(st.updated_at); if (!(age < 6 * 3600 * 1000) || age < -600000) return;
    menu.items.forEach(function (i) {
      var s = i.channel === 'shopify' && st.items[i.handle]; if (!s) return;
      if (s.available === false) i.available = false;
      if (typeof s.price === 'number' && s.price >= 0 && s.price !== i.price) i.price = s.price;
    });
  }
  Promise.all([
    getJSON('counter-facts.json' + V).catch(function () { return null; }),
    getJSON(BASE + 'assets/menu.json').catch(function () { return null; }),
    getJSON(BASE + 'assets/stock.json' + V).catch(function () { return null; })
  ]).then(function (d) { try { applyStock(d[1], d[2]); boot(d[0], d[1]); } catch (e) { try { boot(null, null); } catch (x) { /* nothing more to do */ } } });
})();
