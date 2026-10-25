/* Le Concierge, the rule engine. Written 2026-10-24 for eng-0002, direction 11.
   Runs in the visitor's browser (window.ConciergeCore) and inside the Cloudflare Worker
   (concierge_worker/src/core.cjs is a byte-for-byte copy, checked by the worker's tests).
   Every answer comes from two files: demo/assets/menu.json (items, prices, gf flags, lead notes)
   and options/11-concierge/facts.json (hours, classes, cakes, gifts; each fact names its source).
   Nothing is recalled or invented: when no rule matches, the answer is
   "I do not know that yet, the shop can tell you."
   Answers return the same action JSON the worker returns:
     {type:'add', handle, qty} {type:'slot'} {type:'box', flavours?} {type:'compose', preset?}
     {type:'request', kind:'cake', spec} {type:'checkout'} {type:'open', target} {type:'usual'} {type:'link', href, label}
   No dependencies, no network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ConciergeCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '2026-10-24';
  var DONT_KNOW = 'I do not know that yet, the shop can tell you.';
  var ACTIONS = ['add', 'slot', 'box', 'compose', 'request', 'checkout', 'open', 'usual', 'link'];
  var FLAVOURS = ['Raspberry', 'Pistachio', 'Chocolate', 'Coffee', 'Coconut'];
  var NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, dozen: 12, half: 6 };
  var STOP = ['the', 'and', 'with', 'for', 'how', 'much', 'what', 'whats', 'is', 'are', 'can', 'you', 'your', 'have', 'has', 'any', 'some', 'one', 'please', 'does', 'do', 'get', 'want', 'like', 'would', 'add', 'put', 'give', 'bag', 'cost', 'costs', 'price', 'there', 'that', 'this', 'from', 'into', 'today', 'need', 'buy', 'order', 'box', 'menu', 'day', 'du', 'jour', 'les', 'des', 'aux', 'to', 'of', 'in', 'on', 'it', 'me', 'my', 'an', 'a', 'i', 'll', 'id', 'im', 'thanks', 'merci', 'bonjour', 'hello', 'hi', 'two', 'three', 'four', 'five', 'six'];
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  /* spellings people type, mapped to the word in the item titles */
  var ALIAS = { canele: 'cannele', caneles: 'cannele', canneles: 'cannele', eclairs: 'eclair', croissants: 'croissant', macaroons: 'macaron', macaroon: 'macaron', macarons: 'macaron', pistache: 'pistachio', choc: 'chocolate', chocolat: 'chocolate', cafe: 'coffee', espressos: 'espresso', truffle: 'truffles', jars: 'jar', cookie: 'cookies', baguettes: 'baguette', lattes: 'latte', tarts: 'tart', millefeuille: 'mille', napoleon: 'mille', brest: 'brest', cocoa: 'chocolate' };
  var CASE_E = ['chocolate-eclair', 'pistachio-eclair', 'espresso-eclair', 'chefs-special-eclair', 'paris-brest'];
  var CASE_V = ['butter-croissant', 'suisse', 'cruffin-du-jour', 'canele', 'mille-feuille', 'fruit-tart'];

  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[‘’`]/g, "'").replace(/[^a-z0-9$'.:\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function cents(n) { return Math.round(n * 100); }
  /* the owners' names stay off this page: product names that carry them read "the chef" instead */
  function clean(s) {
    return String(s == null ? '' : s).replace(/Romy’s hot chocolate/g, 'The chef’s hot chocolate')
      .replace(/Romy's hot chocolate/g, 'The chef’s hot chocolate').replace(/with Chef Romy/g, 'with the chef')
      .replace(/Chef Romy/g, 'the chef').replace(/Romuald\s+(?:“Romy”\s+)?Guiot/g, 'the chef');
  }
  function stem(t) { t = ALIAS[t] || t; if (t.length > 4 && /s$/.test(t) && !/ss$/.test(t)) t = t.slice(0, -1); return ALIAS[t] || t; }
  function tokens(s) {
    return norm(s).replace(/['.:$]/g, ' ').split(/[\s-]+/).filter(function (t) { return t && !STOPSET[t] && (t.length > 2 || /^\d+$/.test(t)); }).map(stem);
  }
  function has(q, re) { return re.test(q); }
  function firstSentence(s) { var m = String(s || '').match(/^[^.]*\./); return m ? m[0] : String(s || ''); }
  function lcFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
  function addDays(key, n) { var d = new Date(Date.parse(key + 'T12:00:00Z') + n * 864e5); return d.toISOString().slice(0, 10); }
  function isMonday(key) { return new Date(Date.parse(key + 'T12:00:00Z')).getUTCDay() === 1; }
  function laToday(now) {
    var o = {};
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(now || new Date()).forEach(function (p) { o[p.type] = p.value; });
      return o.year + '-' + o.month + '-' + o.day;
    } catch (e) { return (now || new Date()).toISOString().slice(0, 10); }
  }

  function create(opts) {
    var menu = opts.menu, F = (opts.facts && opts.facts.facts) || {};
    var items = (menu.items || []).filter(function (i) { return !i.hidden; }).map(function (i) {
      var t = tokens(i.title + ' ' + i.handle.replace(/-/g, ' '));
      var uniq = []; t.forEach(function (x) { if (uniq.indexOf(x) < 0) uniq.push(x); });
      return { raw: i, handle: i.handle, title: clean(i.title), desc: clean(i.desc || ''), price: i.price, channel: i.channel,
        category: i.category, variantId: i.variantId || null, lead: i.lead || '', gf: i.gf === true, price_note: i.price_note || null,
        needs_choice: !!i.needs_choice, variants: i.variants || null, tok: uniq, ntitle: norm(clean(i.title)), checked: i.checked || '', source: i.source || '' };
    });
    var byHandle = {}; items.forEach(function (i) { byHandle[i.handle] = i; });
    var gfStore = (F.gluten_store && F.gluten_store.handles) || [];

    function item(h) { return byHandle[h] || null; }
    function fact(k) { return F[k] || null; }
    function citeItem(i) { return { label: 'menu.json › ' + i.handle, source: i.source || 'demo/assets/menu.json', checked: i.checked }; }
    function citeFact(k) { var f = F[k]; return f ? { label: 'facts.json › ' + k, source: f.source, checked: f.checked, status: f.status } : null; }
    function cites(list) { return list.filter(Boolean); }
    function isGfStore(i) { return gfStore.indexOf(i.handle) >= 0; }
    /* sets whose contents are listed elsewhere or not at all count as naming a nut: nothing is promised nut-free */
    var MIXED = ['4-desserts-in-jar', 'gift-basket-small', 'gift-basket-large', 'macaron-box-6', 'macarons', 'tea-party-for-two', 'cheese-board', 'golden-ticket'];
    function nutsNamed(i) { return MIXED.indexOf(i.handle) >= 0 || /almond|hazelnut|pistachio|praline|nut\b|nuts|peanut|walnut|pine nut|macaron|noisette/i.test(i.title + ' ' + i.desc); }
    function addTitle(i) { return i.needs_choice && i.variants && i.variants[0] ? i.title + ' (' + i.variants[0].title + ')' : i.title; }
    /* the shape app.js puts in the bag; glyph tiles, so the drawer needs no image path */
    function bagItem(i) {
      return { handle: i.handle, title: addTitle(i), price: i.price, variantId: i.variantId, glyph: (i.raw.glyph || i.title.charAt(0)), meta: null };
    }
    function canAdd(i) { return i && i.channel !== 'booking' && !(i.needs_choice && i.price_note) && i.handle !== 'custom-logo-vegan-cookie'; }
    var THE = ['eclair', 'vienn', 'drink', 'bread', 'savory', 'salad', 'juice', 'macaron', 'class', 'occasion'];
    function named(i) { return THE.indexOf(i.category) >= 0 && !/^(The |Box |Assorted )/.test(i.title) ? 'The ' + lcFirst(i.title) : i.title; }
    function priceLine(i) {
      var p = named(i) + ' is ' + money(i.price);
      if (i.price_note && i.handle !== 'thanksgiving-box-for-2') p += ' (' + i.price_note.replace(/\s*\(.*\)$/, '') + ')';
      if (i.handle === 'thanksgiving-box-for-2') p = named(i) + ' runs ' + i.price_note;
      return p;
    }

    /* ---------- item matching over titles and handles ---------- */
    function matchItems(text) {
      var q = norm(text), qt = tokens(text), set = {};
      qt.forEach(function (t) { set[t] = 1; });
      var out = [];
      items.forEach(function (i) {
        var hit = i.tok.filter(function (t) { return set[t]; }).length;
        if (!hit) return;
        var score = hit / i.tok.length;
        if (q.indexOf(i.ntitle) >= 0) score += 1;
        out.push({ i: i, score: score, hit: hit });
      });
      out.sort(function (a, b) { return b.score - a.score || b.hit - a.hit || (a.i.channel === 'cafe' ? -1 : 1); });
      return out.filter(function (r) { return r.score >= 0.5; });
    }
    function best(text) {
      var m = matchItems(text);
      if (!m.length) return { one: null, many: [] };
      var top = m[0].score, ties = m.filter(function (r) { return r.score === top; });
      if (ties.length === 1 || top >= 1) return { one: m[0].i, many: m.slice(0, 6).map(function (r) { return r.i; }) };
      return { one: null, many: ties.slice(0, 6).map(function (r) { return r.i; }) };
    }
    function qtyFrom(text, handle) {
      var q = norm(text), m = q.match(/\b(\d{1,2}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|dozen|half dozen)\b(?=\s+[a-z])/);
      if (!m) return 1;
      var n = /^\d+$/.test(m[1]) ? +m[1] : (m[1] === 'half dozen' ? 6 : NUMBERS[m[1]] || 1);
      return Math.max(1, Math.min(n, 24));
    }
    function wantsAdd(q) { return /\b(add|i'?ll have|i'?ll take|i want|i'?d like|give me|get me|put)\b/.test(q); }
    var CATS = { tea: 'tea', teas: 'tea', eclair: 'eclair', macaron: 'macaron', jam: 'jam', salade: 'salad', salad: 'salad', juice: 'juice', truffles: 'gift', jar: 'cake', coffee: 'drink', viennoiserie: 'vienn', pastry: 'vienn', pastrie: 'vienn' };
    function catList(text) {
      var c = null; tokens(text).forEach(function (t) { if (!c && CATS[t]) c = CATS[t]; });
      if (!c) return null;
      var list = items.filter(function (i) { return i.category === c && !i.needs_choice && i.channel !== 'booking'; });
      if (c === 'gift') list = list.filter(function (i) { return /truffle/i.test(i.title); });
      if (c === 'cake') list = list.filter(function (i) { return /jar/i.test(i.desc + i.title); });
      return list.length > 1 ? list.sort(function (a, b) { return a.price - b.price; }) : null;
    }

    /* ---------- answer builders ---------- */
    function R(intent, text, actions, cite, extra) {
      var r = { intent: intent, reply: text, actions: actions || [], cites: cites(cite || []), confident: intent !== 'unknown', source: 'rules', version: VERSION };
      if (extra) for (var k in extra) r[k] = extra[k];
      return r;
    }
    function addAction(i, qty, auto) { return { type: 'add', handle: i.handle, qty: qty || 1, auto: !!auto, item: bagItem(i) }; }

    function aItem(text, q) {
      var b = best(text);
      if (!b.one && !b.many.length) return null;
      var m0 = matchItems(text)[0], cl = (!b.one || (m0 && m0.score < 1)) && catList(text);
      if (cl) b.one = null;
      if (cl) b.many = cl.slice(0, 8);
      if (!b.one) {
        var lo = Math.min.apply(null, b.many.map(function (i) { return i.price; })), hi = Math.max.apply(null, b.many.map(function (i) { return i.price; }));
        var list = b.many.map(function (i) { return i.title + ' ' + money(i.price); }).join('; ');
        return R('items', 'From ' + money(lo) + (hi > lo ? ' to ' + money(hi) : '') + ': ' + list + '. Tell me which one and I will add it.',
          b.many.filter(canAdd).slice(0, 4).map(function (i) { return addAction(i, 1, false); }), b.many.map(citeItem), { items: b.many.map(function (i) { return i.handle; }) });
      }
      var i = b.one, qty = qtyFrom(text, i.handle), add = wantsAdd(q) && canAdd(i);
      var t = priceLine(i) + '. ' + (i.desc ? i.desc.replace(/[.;]?$/, '') + '. ' : '');
      if (i.handle === 'macaron-box-6') return aBox(text, q);
      if (i.channel === 'shopify' && i.variantId) t += 'It is on the live store, so it checks out on id-eclair.com today; ' + lcFirst(firstSentence(i.lead.replace(/^Live store: /, '')));
      else if (i.channel === 'booking') t += firstSentence(i.lead);
      else t += firstSentence(i.lead);
      if (add) t += ' ' + (qty > 1 ? qty + ' are' : 'It is') + ' in your bag.';
      var acts = [];
      if (canAdd(i)) acts.push(addAction(i, qty, add));
      if (i.handle === 'macaron-masterclass') { acts.push({ type: 'link', href: '../../classes.html', label: 'See the class dates' }); }
      if (i.handle === 'mousse-cake') acts.push({ type: 'compose', preset: {} });
      return R(add ? 'add' : 'item', t.trim(), acts, [citeItem(i)], { items: [i.handle] });
    }

    function aGluten(text, q) {
      var b = best(text.replace(/gluten[- ]?free|gluten|celiac|coeliac|\bgf\b|wheat/gi, ''));
      var fs = ['gluten_board', 'gluten_store', 'gluten_caution'];
      if (b.one) {
        var i = b.one, t;
        if (i.gf) t = 'Yes: the counter board marks the ' + lcFirst(i.title) + ' gluten-free' + (/crostini/i.test(i.desc) ? ' without its crostini' : '') + '. ';
        else if (isGfStore(i)) t = 'The live store labels the ' + lcFirst(i.title) + ' gluten free. ';
        else return R('gluten', 'The menu does not mark the ' + lcFirst(i.title) + ' gluten-free. ' + DONT_KNOW, canAdd(i) ? [] : [], [citeItem(i), citeFact('gluten_board'), citeFact('gluten_store')]);
        t += fact('gluten_caution').text;
        return R('gluten', t, canAdd(i) ? [addAction(i, 1, false)] : [], [citeItem(i), citeFact(i.gf ? 'gluten_board' : 'gluten_store'), citeFact('gluten_caution')]);
      }
      var board = items.filter(function (i) { return i.gf; });
      var store = gfStore.map(item).filter(Boolean);
      var t2 = 'At the counter: ' + board.map(function (i) { return i.title + ' ' + money(i.price) + (/crostini/i.test(i.desc) ? ' (without the crostini)' : ''); }).join(', ') + '. ' +
        'Labelled gluten free on the live store: ' + store.map(function (i) { return i.title + ' ' + money(i.price); }).join(', ') + '. ' + fact('gluten_caution').text;
      var picks = ['macarons', 'caneles', 'chocolat-mon-amour'].map(item).filter(Boolean);
      return R('gluten', t2, picks.map(function (i) { return addAction(i, 1, false); }), fs.map(citeFact), { items: board.concat(store).map(function (i) { return i.handle; }) });
    }
    function aVegan() {
      return R('vegan', fact('plant_based').text + ' Allergens are another question: ' + lcFirst(fact('allergens').text.split('; the nine')[0]) + '.', [], [citeFact('plant_based'), citeFact('allergens')]);
    }
    function aAllergy(text) {
      var b = best(text.replace(/allerg\w*|nut[- ]?free|nuts?\b|almonds?|peanuts?|sesame|soy|coconut|dairy|eggs?/gi, ''));
      if (b.one) return R('allergy', 'Here is what the menu says about the ' + lcFirst(b.one.title) + ': ' + (b.one.desc || 'no ingredients listed') + '. The shop has not published an allergen chart. ' + DONT_KNOW, [], [citeItem(b.one), citeFact('allergens')]);
      return R('allergy', fact('allergens').text + ' Beyond that: ' + DONT_KNOW, [], [citeFact('allergens')]);
    }
    function aHours() {
      return R('hours', fact('hours_bakery').text + ' La Cave next door opens Wednesday to Sunday, 3 to 9 pm.', [{ type: 'slot' }], [citeFact('hours_bakery'), citeFact('la_cave')]);
    }
    function aCave(q) {
      var b = item('cheese-board'), acts = [{ type: 'link', href: '../../la-cave.html', label: 'La Cave page' }];
      if (b) acts.unshift(addAction(b, 1, false));
      return R('cave', fact('la_cave').text + (b ? ' The cheese board for 10 is ' + money(b.price) + ' on the live store, pickup only.' : ''), acts, [citeFact('la_cave'), b && citeItem(b)]);
    }
    function aClass(q) {
      var g = item('golden-ticket'), m = item('macaron-masterclass');
      var t = (/\b(kids?|child|children|age|teens?|years? old)\b/.test(q) ? 'The shop has not published an age rule for the class. ' + DONT_KNOW + ' What it has said: ' : '') + fact('masterclass').text + ' ' + fact('class_cutoff').text + (g ? ' To give a seat, the Golden Ticket is ' + money(g.price) + ' on the live store; the person who receives it picks the date with the shop.' : '');
      var acts = [{ type: 'link', href: '../../classes.html', label: 'Class dates' }];
      if (g) acts.unshift(addAction(g, 1, /golden|ticket/.test(q) && wantsAdd(q)));
      return R('class', t, acts, [citeFact('masterclass'), citeFact('class_cutoff'), citeFact('golden_ticket'), m && citeItem(m)]);
    }
    function aCake(text, q) {
      var preset = {}, g = q.match(/\b(\d{1,3})\s*(people|guests|persons|servings|slices)\b/);
      if (g) preset.guests = +g[1];
      if (/wedding/.test(q)) preset.occasion = 'wedding';
      else if (/birthday/.test(q)) preset.occasion = 'birthday';
      var t = fact('custom_cake_notice').text + ' ' + fact('menu_cake_notice').text + ' ' + fact('wedding_cake_notice').text +
        ' The composer below draws your cake, gives a price-from estimate and saves it to your bag as a request, not a purchase.';
      var mc = item('mousse-cake');
      var acts = [{ type: 'compose', preset: preset, auto: true }];
      if (mc) acts.push(addAction(mc, 1, false));
      return R('cake', t, acts, [citeFact('custom_cake_notice'), citeFact('menu_cake_notice'), citeFact('wedding_cake_notice'), citeFact('cake_estimate_rule')], { preset: preset });
    }
    function parseFlavours(q) {
      var out = [], left = 6;
      FLAVOURS.forEach(function (f) {
        var re = new RegExp('(\\d|one|two|three|four|five|six)?\\s*' + f.toLowerCase()), m = q.match(re);
        if (m) { var n = m[1] ? (/^\d$/.test(m[1]) ? +m[1] : NUMBERS[m[1]]) : 1; n = Math.min(n, left); for (var k = 0; k < n; k++) out.push(f); left -= n; }
      });
      return out;
    }
    function aBox(text, q) {
      var fl = parseFlavours(q), live = item('macarons');
      var tally = {}; fl.forEach(function (f) { tally[f] = (tally[f] || 0) + 1; });
      var said = Object.keys(tally).map(function (f) { return tally[f] + ' ' + f.toLowerCase(); }).join(' and ');
      var t = fact('box_of_six').text + (fl.length ? ' I have put ' + said + ' in the box; ' + (fl.length < 6 ? 'choose ' + (6 - fl.length) + ' more.' : 'add it when you are happy.') : ' The box builder is open for you.');
      var acts = [{ type: 'box', flavours: fl, auto: true }];
      if (live) acts.push(addAction(live, 1, false));
      return R('box', t, acts, [citeFact('box_of_six'), item('macaron-box-6') && citeItem(item('macaron-box-6'))]);
    }
    function aTea() {
      var tp = item('tea-party-for-two');
      return R('tea', fact('afternoon_tea').text + ' A pot of Palais des Thés tea on its own is $6.50 to $7.50.', [{ type: 'link', href: '../../classes.html', label: 'Tea sittings' }], [citeFact('afternoon_tea'), tp && citeItem(tp)]);
    }
    function aPickup(ctx) {
      var s = ctx && ctx.slotLabel ? ' Your pickup is set for ' + ctx.slotLabel.replace(/^Today/, 'today') + '; change it here.' : '';
      return R('pickup', fact('pickup_lead').text + ' ' + fact('closed_mondays').text + s + ' The slots on this preview are examples; the kitchen sets the real ones.', [{ type: 'slot', auto: true }], [citeFact('pickup_lead'), citeFact('closed_mondays')]);
    }
    function aGift(q) {
      var t = 'For a present built to a budget, the gift concierge below picks from the live store and shows the note as it will read. ' + fact('gift_cards').text;
      var b = item('gift-basket-small');
      if (b) t += ' The small gift basket is ' + money(b.price) + ': ' + lcFirst(b.desc) + '.';
      var bm = q.match(/\$\s?(\d{2,3})\b|\b(\d{2,3})\s?(?:dollars|bucks)\b|under (\d{2,3})\b/), budget = bm ? +(bm[1] || bm[2] || bm[3]) : null;
      var acts = [{ type: 'open', target: '#cadeau', label: 'Build a gift', auto: true, preset: budget ? { budget: Math.max(15, Math.min(budget, 150)) } : null }];
      if (b) acts.push(addAction(b, 1, false));
      return R('gift', t, acts, [citeFact('gift_cards'), b && citeItem(b)]);
    }
    function aDelivery() { return R('delivery', fact('delivery').text, [{ type: 'slot' }], [citeFact('delivery')]); }
    function aWhere() { return R('where', 'iD Éclair is at ' + fact('address').text + ' ' + fact('parking').text, [], [citeFact('address'), citeFact('parking')]); }
    function aFees() { return R('fees', fact('fees').text, [], [citeFact('fees')]); }
    function aLoyalty() { return R('loyalty', fact('carnet').text + ' It is a proposal for the chef’s approval.', [], [citeFact('carnet')]); }
    function aCheckout(ctx) {
      var n = ctx && ctx.bagCount;
      return R('checkout', n ? 'Your bag is ready. Live-store items check out on id-eclair.com; counter items wait for the pickup app, and the bag says which is which.' : 'Your bag is empty. Ask me for an éclair, a box of six or a gift first.', n ? [{ type: 'checkout', auto: true }] : [], []);
    }
    function aHello(ctx) {
      var three = today(ctx && ctx.date).map(item).filter(Boolean);
      return R('hello', 'Bonjour. Ask me about the case, a cake, a class seat, La Cave or a gift. Three from the case today: ' + three.map(function (i) { return i.title + ' ' + money(i.price); }).join(', ') + '.',
        three.map(function (i) { return addAction(i, 1, false); }), three.map(citeItem));
    }
    function aUsual() { return R('usual', 'Your usual lives on this device only. One tap puts it back in the bag.', [{ type: 'usual', auto: true }], []); }

    function answer(text, ctx) {
      var q = norm(text);
      if (!q) return aHello(ctx);
      if (/^(hi|hello|hey|bonjour|salut|good (morning|afternoon|evening)|coucou)\b[\s!.]*$/.test(q)) return aHello(ctx);
      if (has(q, /\b(the usual|my usual|same as (last|before)|reorder|order again)\b/)) return aUsual();
      if (has(q, /apple pay|google pay|shop pay|credit card|debit|\bcash\b|pay with|payment/)) return R('payment', fact('payment').text + ' ' + fact('fees').text, [], [citeFact('payment'), citeFact('fees')]);
      if (has(q, /\b(pay|checkout|check out)\b/)) return aCheckout(ctx);
      if (has(q, /gluten|celiac|coeliac|\bgf\b|wheat/)) return aGluten(text, q);
      if (has(q, /\bvegan\b|plant[- ]based|dairy|\bmilk\b|\beggs?\b|butter\b(?! croissant)/) && !has(q, /allerg/)) return aVegan();
      if (has(q, /allerg|nut[- ]?free|\bnuts?\b|almond|peanut|sesame|\bsoy\b|coconut/)) return aAllergy(text);
      if (has(q, /\bla cave\b|\bcave\b|\bwines?\b|\bvin\b|wine bar/)) return aCave(q);
      if (has(q, /masterclass|\bclass(es)?\b|lesson|workshop|\bcourse\b|golden ticket/)) return aClass(q);
      if (has(q, /afternoon tea|tea party|high tea|\bgouter\b|tea for (two|2)/)) return aTea();
      if (has(q, /box of (six|6)|\b(six|6) macarons?|macaron box|box.*macaron|macaron.*\bbox\b/)) return aBox(text, q);
      if (has(q, /\bcakes?\b|\bgateaux?\b/) && has(q, /custom|birthday|wedding|anniversary|design|tier|inscription|celebration|order|notice|ahead|people|guests|whole|for \d+/)) return aCake(text, q);
      if (has(q, /\b(hours|open|opening|close|closing|closed)\b/)) return aHours();
      if (has(q, /deliver|uber|doordash|grubhub|\bship/)) return aDelivery();
      if (has(q, /pick ?up|collect|\bslot\b|\bready\b|what time|when can i|tomorrow|order ahead|in advance|pre-?order/)) return aPickup(ctx);
      if (has(q, /\bgift|present|basket|cadeau/)) return aGift(q);
      if (has(q, /where|address|parking|\bpark\b|find you|located/)) return aWhere();
      if (has(q, /\bfees?\b|\btip\b|tipping|service charge/)) return aFees();
      if (has(q, /points|loyalty|rewards|carnet|member/)) return aLoyalty();
      var it = aItem(text, q);
      if (it) return it;
      if (has(q, /\bcakes?\b|\bgateaux?\b/)) return aCake(text, q);
      if (has(q, /\btea\b/)) return aTea();
      return R('unknown', DONT_KNOW, [], []);
    }

    /* ---------- today's three: one éclair and two from the viennoiserie, turning daily ---------- */
    function today(dateKey) {
      var key = dateKey || laToday(), d = Math.floor(Date.parse(key + 'T12:00:00Z') / 864e5);
      var e = CASE_E[d % CASE_E.length], v1 = CASE_V[d % CASE_V.length], v2 = CASE_V[(d + 3) % CASE_V.length];
      return [e, v1, v2].filter(function (h) { return byHandle[h]; });
    }

    /* ---------- cake composer: estimate and request ---------- */
    var CAKE_FLAVOURS = [
      { id: 'chocolat', title: 'Chocolat mon amour', note: 'Chocolate crumble, ganache and mousse', from: 'chocolat-mon-amour', tone: 'chocolate' },
      { id: 'framboise', title: 'Framboise chérie', note: 'Raspberry mousse, raspberry jam, almond streusel', from: 'framboise-cherie', tone: 'raspberry' },
      { id: 'citron', title: 'Citron ma passion', note: 'Lemon curd, meringue, almond streusel', from: 'citron-ma-passion', tone: 'lemon' },
      { id: 'caramel', title: 'Caramel je t’aime', note: 'Caramel mousse, almond crumble, vanilla chantilly', from: 'caramel-je-taime', tone: 'caramel' },
      { id: 'noisette', title: 'Noisette toujours', note: 'Hazelnut crisp, hazelnut cream', from: 'noisette-toujours', tone: 'hazelnut' },
      { id: 'tropicale', title: 'Douceur tropicale', note: 'Passion fruit and mango mousse, coconut crumble', from: 'douceur-tropicale', tone: 'mango' },
      { id: 'pistache', title: 'Pistache', note: 'Pistachio, as in the pistachio éclair', from: 'pistachio-eclair', tone: 'pistachio' },
      { id: 'praline', title: 'Praliné', note: 'Praline cream, as in the Paris-Brest', from: 'paris-brest', tone: 'praline' }
    ];
    var CAKE_FINISHES = [
      { id: 'gold', title: 'Gold leaf', note: 'As on the éclairs' },
      { id: 'feather', title: 'Feathered icing', note: 'As on the mille-feuille' },
      { id: 'chantilly', title: 'Vanilla chantilly', note: 'As in Caramel je t’aime' },
      { id: 'chef', title: 'Chef’s choice', note: 'Decided with the sketch' }
    ];
    function sizes() { return (F.cake_sizes && F.cake_sizes.sizes) || []; }
    function sizeFor(guests) { var s = sizes(); for (var k = 0; k < s.length; k++) if (guests <= s[k].max) return s[k]; return s[s.length - 1]; }
    function estimateCake(spec, todayKey) {
      spec = spec || {};
      var all = sizes(), size = null;
      all.forEach(function (s) { if (s.id === spec.size) size = s; });
      if (!size) size = sizeFor(+spec.guests || 8);
      var per = (F.cake_estimate_rule && F.cake_estimate_rule.per_guest) || 15;
      var wedding = spec.occasion === 'wedding', bespoke = wedding || size.tiers > 1;
      var lead = wedding ? 28 : 7, key = todayKey || laToday(), earliest = addDays(key, lead);
      if (isMonday(earliest)) earliest = addDays(earliest, 1);
      var from = size.tiers >= 3 ? null : size.min * per;
      var fl = null, fin = null;
      CAKE_FLAVOURS.forEach(function (f) { if (f.id === spec.flavour) fl = f; });
      CAKE_FINISHES.forEach(function (f) { if (f.id === spec.finish) fin = f; });
      var ins = String(spec.inscription || '').slice(0, 24);
      var lines = [];
      lines.push(size.label + ', for ' + size.min + ' to ' + size.max + ' guests');
      lines.push('Flavour: ' + (fl ? fl.title : 'not chosen yet'));
      lines.push('Finish: ' + (fin ? fin.title : 'not chosen yet'));
      if (ins) lines.push('Plaque: “' + ins + '”, a priced add-on');
      if (spec.allergy) lines.push('Allergy note: ' + String(spec.allergy).slice(0, 200));
      var dateOk = !spec.date || daysBetween(key, spec.date) >= lead;
      var problems = [];
      if (!fl) problems.push('Choose a flavour.');
      if (spec.date && dateOk && isMonday(spec.date)) problems.push('The shop is closed on Mondays; choose another day.');
      if (spec.date && !dateOk) problems.push('That date is inside the ' + (wedding ? 'four-week' : 'one-week') + ' notice; the earliest is ' + earliest + '.');
      var priceText = from == null ? 'Priced at the consultation' : 'From ' + money(from);
      var route = bespoke ? 'Bespoke: a $50 consultation (proposed), credited to the cake, then a sketch and a quote.' : 'Design your cake: the shop replies with a sketch and a price.';
      return { size: size, flavour: fl, finish: fin, inscription: ins, from: from, priceText: priceText, perGuest: per, lead: lead, earliest: earliest,
        bespoke: bespoke, route: route, lines: lines, problems: problems, ok: !problems.length,
        summary: 'Cake request: ' + lines.join('; ') + '. ' + priceText + ' (example estimate). ' + (spec.date ? 'Pickup ' + spec.date + '. ' : '') + route,
        cites: cites([citeFact('cake_estimate_rule'), citeFact('cake_sizes'), citeFact('custom_cake_notice'), bespoke ? citeFact('bespoke_consult') : null, wedding ? citeFact('wedding_cake_notice') : null, ins ? citeFact('cake_addons') : null]) };
    }
    /* a request is not a purchase: price 0 in the bag, the estimate in the line's note */
    function cakeRequest(spec, todayKey) {
      var e = estimateCake(spec, todayKey);
      if (!e.ok) return { ok: false, problems: e.problems, estimate: e };
      var id = 'cake-request:' + [e.size.id, e.flavour.id, e.finish ? e.finish.id : 'x', spec.date || 'date'].join('-');
      return { ok: true, estimate: e, action: { type: 'request', kind: 'cake', spec: spec,
        item: { handle: id, title: 'Cake request, ' + e.size.label + ' ' + e.flavour.title, price: 0, variantId: null, glyph: 'G',
          meta: e.priceText + ' (example) · request, not a purchase · ' + (spec.date ? 'pickup ' + spec.date : 'earliest ' + e.earliest) } } };
    }

    /* ---------- Trouve-moi: four answers, three picks with reasons ---------- */
    var POOL = [
      { h: 'butter-croissant', occ: ['breakfast'], who: ['me', 'two'] },
      { h: 'pistachio-eclair', occ: ['treat'], who: ['me', 'two'] },
      { h: 'chocolate-eclair', occ: ['treat', 'breakfast'], who: ['me', 'two'] },
      { h: 'canele', occ: ['breakfast', 'treat'], who: ['me'] },
      { h: 'caneles', occ: ['treat', 'gift'], who: ['two', 'host'] },
      { h: 'mille-feuille', occ: ['treat'], who: ['me', 'two'] },
      { h: 'suisse', occ: ['breakfast'], who: ['me'] },
      { h: 'latte', occ: ['breakfast'], who: ['me'] },
      { h: 'macaron-box-6', occ: ['treat', 'gift', 'party'], who: ['two', 'group', 'host'] },
      { h: 'macarons', occ: ['gift', 'party'], who: ['host', 'two'] },
      { h: 'chocolat-mon-amour', occ: ['treat', 'gift'], who: ['me', 'two'] },
      { h: 'citron-ma-passion', occ: ['treat'], who: ['me'] },
      { h: '4-desserts-in-jar', occ: ['gift', 'party', 'treat'], who: ['two', 'group', 'host'] },
      { h: 'dark-chocolate-truffles', occ: ['gift'], who: ['host', 'two'] },
      { h: 'white-chocolate-truffles', occ: ['gift'], who: ['host'] },
      { h: 'gift-basket-small', occ: ['gift'], who: ['host', 'group'] },
      { h: 'gift-basket-large', occ: ['gift'], who: ['host', 'group'] },
      { h: 'cheese-board', occ: ['party'], who: ['group'] },
      { h: 'golden-ticket', occ: ['gift'], who: ['two', 'me'] },
      { h: 'soup', occ: ['lunch'], who: ['me'] },
      { h: 'endive-salade', occ: ['lunch'], who: ['me'] },
      { h: 'cookie-spoon', occ: ['treat', 'party'], who: ['group', 'me'] }
    ];
    var CAPS = { '15': 15, '40': 40, more: Infinity };
    var OCC_WHY = { breakfast: 'a morning piece', treat: 'one of the case\u2019s treats', gift: 'made to give', party: 'made to share' };
    var WHO_WHY = { me: 'sized for one', two: 'easy to split for two', group: 'goes round a table', host: 'easy to hand over' };
    function gfOf(i) { return i.gf || isGfStore(i); }
    function quiz(ans) {
      ans = ans || {};
      var cap = CAPS[ans.budget] || Infinity, diet = ans.diet || 'none';
      var scored = POOL.map(function (p, idx) {
        var i = item(p.h); if (!i) return null;
        if (diet === 'gf' && !gfOf(i)) return null;
        if (diet === 'nut' && nutsNamed(i)) return null;
        var s = 0, why = [];
        if (p.occ.indexOf(ans.occasion) >= 0) { s += 3; why.push(OCC_WHY[ans.occasion]); }
        if (p.who.indexOf(ans.who) >= 0) { s += 2; why.push(WHO_WHY[ans.who]); }
        if (i.price <= cap) { s += 2; if (cap !== Infinity) why.push('fits a ' + money(cap).replace('.00', '') + ' budget'); }
        else s -= 4;
        if (ans.budget === 'more' && i.price >= 40) s += 1;
        if (diet === 'gf') why.push(i.gf ? 'marked gluten-free on the counter board' : 'labelled gluten free on the live store');
        if (diet === 'nut') why.push('no nut named in its description');
        if (i.channel === 'shopify' && i.variantId) why.push('on the live store now');
        if (/serves 10/.test(i.desc)) why.push('serves 10');
        if (ans.occasion === 'gift' && /box|basket|ticket|truffles/i.test(i.title + i.desc)) why.push('comes boxed');
        if (i.channel === 'cafe' && i.category !== 'savory' && i.category !== 'salad') why.push('same day from the case');
        if (i.handle === 'macaron-box-6') why.push('you choose the six');
        return { i: i, s: s, why: why, idx: idx };
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s || a.idx - b.idx; });
      var picks = scored.slice(0, 3).map(function (r) {
        return { handle: r.i.handle, title: addTitle(r.i), price: r.i.price, desc: r.i.desc, reason: r.why.length ? r.why.join(', ') : 'a house favourite on the menu', addable: canAdd(r.i), item: bagItem(r.i), box: r.i.handle === 'macaron-box-6' };
      });
      var note = diet === 'nut' ? 'The shop has not published an allergen chart; these name no nut in their description, which is not the same as nut-free. Ask the counter.' :
        diet === 'gf' ? (F.gluten_caution ? F.gluten_caution.text : '') : '';
      return { picks: picks, note: note, cites: cites([citeFact(diet === 'nut' ? 'allergens' : diet === 'gf' ? 'gluten_store' : null)]).concat(picks.map(function (p) { return citeItem(item(p.handle)); })) };
    }

    /* ---------- Cadeau: a basket from live-store items, to a budget ---------- */
    var GIFT = {
      host: ['macarons', 'gift-basket-small', 'caneles', 'raspberry-jam', 'chocolate-fingers-sables-poches', 'dark-chocolate-truffles'],
      colleague: ['dark-chocolate-truffles', 'diamants-biscuit-by-6', 'kushyflakes', 'chocolate-fingers-sables-poches', 'cookie-spoon'],
      family: ['4-desserts-in-jar', 'gift-basket-large', 'gift-basket-small', 'macarons', 'pineapple-vanilla-jam', 'tropical-jam'],
      sweetheart: ['golden-ticket', 'dubai-chocolate-vegan', 'chocolat-mon-amour', 'white-chocolate-truffles', 'macarons', 'caramel-je-taime']
    };
    function gift(budget, who) {
      var list = (GIFT[who] || GIFT.host).map(item).filter(function (i) { return i && i.variantId; });
      var others = items.filter(function (i) { return i.channel === 'shopify' && i.variantId && !i.needs_choice && i.category !== 'wholesale' && i.category !== 'occasion' && list.indexOf(i) < 0; })
        .sort(function (a, b) { return b.price - a.price; });
      var left = cents(budget), picked = [];
      var anchor = list.filter(function (i) { return cents(i.price) <= left; }).sort(function (a, b) { return b.price - a.price; })[0];
      if (anchor) { picked.push(anchor); left -= cents(anchor.price); }
      list.concat(others).forEach(function (i) { if (picked.indexOf(i) < 0 && cents(i.price) <= left && picked.length < 5) { picked.push(i); left -= cents(i.price); } });
      var total = picked.reduce(function (a, i) { return a + i.price; }, 0);
      return { items: picked.map(function (i) { return { handle: i.handle, title: addTitle(i), price: i.price, desc: i.desc, item: bagItem(i) }; }),
        total: Math.round(total * 100) / 100, left: left / 100, budget: budget,
        cites: cites([citeFact('gift_note')]).concat(picked.map(citeItem)) };
    }

    /* ---------- grounding for the worker's model call, and the check on what comes back ---------- */
    var FACT_WORDS = {
      address: /where|address|located|find/, plant_based: /vegan|plant|dairy|milk|egg|butter/, hours_bakery: /hour|open|close|sunday|monday|time/,
      la_cave: /cave|wine|bar|evening/, masterclass: /class|lesson|workshop|course|macaron/, golden_ticket: /ticket|gift|class/,
      custom_cake_notice: /cake|birthday|wedding/, menu_cake_notice: /cake/, wedding_cake_notice: /wedding/, bespoke_consult: /wedding|tier|bespoke|consult/,
      pickup_lead: /pick|ready|slot|when|time/, box_of_six: /macaron|box|six/, afternoon_tea: /tea/, gluten_board: /gluten|celiac|coeliac|wheat/,
      gluten_store: /gluten|celiac|coeliac|wheat/, gluten_caution: /gluten|celiac|coeliac|wheat|allerg/, allergens: /allerg|nut|almond|sesame|soy|coconut/,
      fees: /fee|tip|charge/, delivery: /deliver|ship|uber|doordash/, gift_cards: /gift|card/, carnet: /point|loyal|reward|member/, parking: /park|dog|outside|terrace/
    };
    function retrieve(text) {
      var q = norm(text), its = matchItems(text).slice(0, 6).map(function (r) { return r.i; });
      var fs = Object.keys(FACT_WORDS).filter(function (k) { return F[k] && FACT_WORDS[k].test(q); });
      return {
        items: its.map(function (i) { return { handle: i.handle, title: i.title, price: i.price, desc: i.desc, channel: i.channel, gluten_free_board: i.gf, gluten_free_store_label: isGfStore(i), lead: i.lead }; }),
        facts: fs.map(function (k) { return { id: k, text: F[k].text, status: F[k].status }; })
      };
    }
    function allowedNumbers(ret) {
      var s = ret.items.map(function (i) { return money(i.price) + ' ' + i.desc + ' ' + i.lead; }).join(' ') + ' ' + ret.facts.map(function (f) { return f.text; }).join(' ');
      return s;
    }
    function guard(out, ret) {
      var why = [];
      if (!out || typeof out.reply !== 'string' || !out.reply.trim()) return { ok: false, why: ['no reply text'] };
      var allowed = allowedNumbers(ret), hand = ret.items.map(function (i) { return i.handle; });
      (out.reply.match(/\$\s?\d+(?:\.\d{1,2})?/g) || []).forEach(function (p) {
        var v = parseFloat(p.replace(/[$\s]/g, '')), ok = ret.items.some(function (i) { return cents(i.price) === cents(v); }) ||
          new RegExp('\\$' + String(v).replace('.', '\\.') + '(?:\\.00|0)?\\b').test(allowed) || allowed.indexOf(money(v)) >= 0 || allowed.indexOf('$' + v) >= 0;
        if (!ok) why.push('price not in the records: ' + p);
      });
      (out.reply.match(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi) || []).forEach(function (t) {
        if (norm(allowed).indexOf(norm(t).replace(/\s/g, ' ')) < 0 && norm(allowed).replace(/\s/g, '').indexOf(norm(t).replace(/\s/g, '')) < 0) why.push('time not in the records: ' + t);
      });
      if (/gluten|celiac|coeliac/i.test(out.reply) && !ret.facts.some(function (f) { return /gluten/.test(f.id); })) why.push('gluten claim with no gluten record');
      if (/allerg|nut[- ]free/i.test(out.reply) && !ret.facts.some(function (f) { return f.id === 'allergens' || /gluten/.test(f.id); })) why.push('allergen claim with no allergen record');
      var acts = Array.isArray(out.actions) ? out.actions : [];
      acts.forEach(function (a) {
        if (!a || ACTIONS.indexOf(a.type) < 0) why.push('unknown action');
        else if (a.type === 'add' && hand.indexOf(a.handle) < 0) why.push('add for an item not in the records: ' + a.handle);
        else if (a.type === 'link' && !/^\.\.\/\.\.\/[a-z-]+\.html(#[a-z-]+)?$|^\/(pages|collections|products)\/[a-z0-9-]+$/.test(String(a.href || ''))) why.push('link outside the site');
      });
      return { ok: !why.length, why: why };
    }
    /* turns a checked model answer into the same action JSON the rules return */
    function hydrate(out) {
      return (out.actions || []).map(function (a) {
        if (a.type === 'add') { var i = item(a.handle); return i && canAdd(i) ? addAction(i, Math.max(1, Math.min(+a.qty || 1, 24)), false) : null; }
        return { type: a.type, href: a.href, label: a.label, target: a.target, flavours: Array.isArray(a.flavours) ? a.flavours.filter(function (f) { return FLAVOURS.indexOf(f) >= 0; }).slice(0, 6) : undefined, preset: a.preset && typeof a.preset === 'object' ? a.preset : undefined };
      }).filter(Boolean);
    }

    return {
      version: VERSION, DONT_KNOW: DONT_KNOW, answer: answer, today: today, item: item, items: function () { return items.slice(); },
      matchItems: matchItems, estimateCake: estimateCake, cakeRequest: cakeRequest, cakeFlavours: CAKE_FLAVOURS, cakeFinishes: CAKE_FINISHES,
      sizes: sizes, sizeFor: sizeFor, quiz: quiz, gift: gift, retrieve: retrieve, guard: guard, hydrate: hydrate, bagItem: bagItem, money: money, clean: clean, laToday: laToday
    };
  }

  return { create: create, norm: norm, clean: clean, money: money, version: VERSION, DONT_KNOW: DONT_KNOW, ACTIONS: ACTIONS };
});
