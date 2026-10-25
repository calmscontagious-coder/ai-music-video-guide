/* eng-0002 concept site: shared behaviour, no dependencies. Composition rules: assets/README.md.
   One bag in localStorage across pages; live-store items check out on the client's real Shopify store
   through a cart permalink; cafe items wait for the pickup app and say so. */
(function () {
  'use strict';
  var STORE = 'https://www.id-eclair.com';
  var MENU_APP = 'https://id-eclair.curated.menu/restaurant-locator/6a34661c2d34bb209e3d6780';
  var KEY = 'ide.bag.v1';
  var TZ = 'America/Los_Angeles';
  /* example slots for the concept; real hours and caps come from the kitchen (plan 4.3) */
  var SLOTS = ['10:00', '11:00', '12:30', '1:30', '2:30', '3:30', '4:30', '5:30'];
  var LEAD_MIN = 30;   /* proposed: earliest pickup 30 minutes after ordering (plan 4.3) */
  var CLOSED = [1];    /* Monday, per the shop's About page (plan 4.3); to confirm */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var home = document.body.getAttribute('data-home') || 'index.html';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function pop(el, cls) { if (!el || reduce) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  var ICON = {
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
    x: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    clock: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };

  /* ---------- state ---------- */
  var mem = null;
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.items)) return s; } catch (e) { /* private mode */ }
    return mem || { items: [], slot: null };
  }
  var state = load();
  function save() {
    state.updated = Date.now(); mem = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* memory only */ }
    renderAll();
    document.dispatchEvent(new CustomEvent('ide:bag', { detail: snapshot() }));
  }
  function snapshot() { return JSON.parse(JSON.stringify(state)); }
  function find(h) { for (var i = 0; i < state.items.length; i++) if (state.items[i].handle === h) return state.items[i]; return null; }
  function count() { return state.items.reduce(function (a, i) { return a + i.qty; }, 0); }
  function total(list) { return (list || state.items).reduce(function (a, i) { return a + i.qty * i.price; }, 0); }
  function live() { return state.items.filter(function (i) { return i.variantId; }); }
  function counter() { return state.items.filter(function (i) { return !i.variantId; }); }

  function put(item, qty) {
    var f = find(item.handle);
    if (f) f.qty += qty || 1;
    else state.items.push({ handle: item.handle, title: item.title, price: +item.price, qty: qty || 1,
      variantId: item.variantId ? String(item.variantId) : null, image: item.image || null,
      glyph: item.glyph || null, meta: item.meta || null });
  }
  function add(item, qty) {
    put(item, qty);
    save();
    say('Added ' + item.title + '. ' + plural(count(), 'item') + ' in your bag.');
    $$('[data-cart-count]').forEach(function (b) { pop(b, 'bump'); });
  }
  /* a one-tap set: every item in one save, one announcement */
  function addSet(items) {
    items.forEach(function (i) { put(i, 1); });
    save();
    say('Added ' + items.map(function (i) { return i.title; }).join(' and ') + '. ' + plural(count(), 'item') + ' in your bag.');
    $$('[data-cart-count]').forEach(function (b) { pop(b, 'bump'); });
  }
  function setQty(h, q) {
    var f = find(h); if (!f) return;
    if (q <= 0) { state.items = state.items.filter(function (i) { return i.handle !== h; }); say(f.title + ' removed.'); }
    else f.qty = q;
    save();
  }
  function clear() { state.items = []; save(); say('Your bag is empty.'); }

  /* Shopify cart permalink: /cart/<variant>:<qty>,... opens the live checkout with these lines.
     The chosen pickup slot rides along as cart attributes plus the order note, so it shows in the
     order's Notes section in Shopify admin (shopify.dev/docs/apps/build/checkout/create-cart-permalinks:
     `attributes[name]=value`, `note=`). Before 2026-10-24 the slot was shown on the page and dropped here. */
  function slotParams() {
    var s = slot();
    if (!s.day) return '';
    var label = slotText(s), q = encodeURIComponent;
    return '?attributes[Pickup]=' + q(label) + '&attributes[Pickup%20date]=' + q(s.day.key) +
      '&attributes[Pickup%20time]=' + q(tlabel(s.time)) + '&note=' + q('Pickup at 169 W Green St: ' + label);
  }
  function checkoutUrl() {
    var m = {}, order = [];
    live().forEach(function (i) { if (!m[i.variantId]) { m[i.variantId] = 0; order.push(i.variantId); } m[i.variantId] += i.qty; });
    return order.length ? STORE + '/cart/' + order.map(function (v) { return v + ':' + m[v]; }).join(',') + slotParams() : null;
  }

  var liveRegion;
  function say(t) { if (!liveRegion) return; liveRegion.textContent = ''; setTimeout(function () { liveRegion.textContent = t; }, 30); }

  /* ---------- pickup slots ---------- */
  function laNow() {
    var o = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, min: (+o.hour % 24) * 60 + (+o.minute) };
  }
  function mins(t) { var p = t.split(':'), h = +p[0]; if (h < 9) h += 12; return h * 60 + (+p[1]); }
  function tlabel(t) { return t + (mins(t) >= 720 ? ' pm' : ' am'); }
  function days() {
    var n = laNow(), out = [];
    for (var i = 0; out.length < 4 && i < 10; i++) {
      var dt = new Date(Date.UTC(n.y, n.m - 1, n.d + i)), dow = dt.getUTCDay(), open = CLOSED.indexOf(dow) < 0;
      if (i > 0 && !open) continue;
      var times = SLOTS.map(function (t) { return { t: t, ok: open && (i > 0 || mins(t) >= n.min + LEAD_MIN) }; });
      out.push({ key: dt.toISOString().slice(0, 10), i: i, top: i === 0 ? 'Today' : DOW[dow], sub: MON[dt.getUTCMonth()] + ' ' + dt.getUTCDate(),
        open: open, times: times, any: times.some(function (x) { return x.ok; }) });
    }
    return out;
  }
  function slot() {
    var ds = days(), s = state.slot, d = s && ds.filter(function (x) { return x.key === s.date; })[0];
    if (d && d.times.some(function (x) { return x.ok && x.t === s.time; })) return { day: d, time: s.time, days: ds };
    var first = ds.filter(function (x) { return x.any; })[0];
    if (!first) return { day: null, time: null, days: ds };
    var t = first.times.filter(function (x) { return x.ok; })[0].t;
    if (d && d.any && d.times.filter(function (x) { return x.ok; })[0]) { first = d; t = d.times.filter(function (x) { return x.ok; })[0].t; }
    return { day: first, time: t, days: ds };
  }
  function slotText(s) {
    if (!s.day) return 'No slot open';
    return (s.day.i === 0 ? 'Today' : s.day.top + ' ' + s.day.sub) + ', ' + tlabel(s.time);
  }
  function setSlot(date, time) { state.slot = { date: date, time: time }; save(); }

  function renderPicker(root, s) {
    var dEl = $('[data-days]', root), tEl = $('[data-times]', root), out = $('[data-slot-out]', root), note = $('[data-slot-note]', root);
    if (dEl) dEl.innerHTML = s.days.map(function (d) {
      var on = s.day && d.key === s.day.key, dis = !d.any;
      return '<button class="chip" type="button" data-day="' + d.key + '" aria-pressed="' + on + '"' + (dis ? ' aria-disabled="true" tabindex="-1"' : '') + '><b>' + d.top + '</b>' + (d.open ? (dis ? 'Full' : d.sub) : 'Closed') + '</button>';
    }).join('');
    if (tEl && s.day) tEl.innerHTML = s.day.times.map(function (x) {
      var on = x.t === s.time;
      return '<button class="chip" type="button" data-time="' + x.t + '" aria-pressed="' + on + '"' + (x.ok ? '' : ' aria-disabled="true" tabindex="-1"') + ' aria-label="' + tlabel(x.t) + (x.ok ? '' : ', unavailable') + '">' + x.t + '</button>';
    }).join('');
    if (out) out.textContent = slotText(s);
    if (note && s.day) note.textContent = s.day.i === 0 && s.day.times.some(function (x) { return !x.ok; }) ? 'Earlier times are inside today’s bake' : 'Slots close themselves when the kitchen is full';
  }

  /* ---------- add buttons and steppers ---------- */
  function itemFrom(el) {
    var d = el.dataset;
    return { handle: d.handle, title: d.title, price: parseFloat(d.price), variantId: d.variant || null, image: d.image || null, glyph: d.glyph || null, meta: d.meta || null };
  }
  function stepperHTML(h, title, q) {
    return '<button type="button" data-dec aria-label="One less ' + esc(title) + '">−</button><b aria-live="off">' + q + '</b><button type="button" data-inc aria-label="One more ' + esc(title) + '">+</button>';
  }
  function enhanceAdds(root) {
    $$('[data-add]', root).forEach(function (b) {
      if (b._ide) return; b._ide = 1;
      if (!b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', ICON.plus);
      var st = document.createElement('span');
      st.className = 'stepper'; st.hidden = true; st.setAttribute('data-handle', b.dataset.handle);
      st.setAttribute('role', 'group'); st.setAttribute('aria-label', b.dataset.title + ' in your bag');
      st.innerHTML = stepperHTML(b.dataset.handle, b.dataset.title, 0);
      b.insertAdjacentElement('afterend', st);
    });
  }
  function syncAdds() {
    $$('[data-add]').forEach(function (b) {
      var f = find(b.dataset.handle), st = b.nextElementSibling;
      if (!st || !st.classList.contains('stepper')) return;
      var q = f ? f.qty : 0;
      b.hidden = q > 0; st.hidden = q === 0; st.querySelector('b').textContent = q;
      var card = b.closest('[data-card]'); if (card) card.classList.toggle('in-bag', q > 0);   /* the frame follows the choice */
    });
  }

  /* ---------- drawer ---------- */
  var drawer, opener;
  function buildDrawer() {
    if (drawer) return;
    liveRegion = document.createElement('div');
    liveRegion.className = 'sr'; liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
    drawer = document.createElement('div');
    drawer.className = 'drawer'; drawer.id = 'bag'; drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = '<div class="scrim" data-cart-close></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="bag-h">' +
      '<div class="sheet-head"><h2 id="bag-h">Your order<span data-bag-n></span></h2><button class="x" type="button" data-cart-close aria-label="Close the bag">' + ICON.x + '</button></div>' +
      '<div class="sheet-body"><div class="pick">' + ICON.clock + '<div><span class="note-sm">Pickup</span><b data-bag-slot></b></div><button class="link" type="button" data-slot-change>Change</button>' +
      '<small>Example slots for the concept; the kitchen sets the real ones.</small></div>' +
      '<ul class="lines" data-bag-lines></ul><div class="sheet-notes" data-bag-notes></div></div><div class="sheet-foot" data-bag-foot></div></div>';
    document.body.appendChild(drawer);
  }
  function lineHTML(i) {
    var pic = i.image ? '<img src="' + esc(i.image) + '" alt="" width="56" height="56" loading="lazy">' : '<span class="mini" aria-hidden="true">' + esc(i.glyph || i.title.charAt(0)) + '</span>';
    return '<li class="line">' + pic + '<div><h3>' + esc(i.title) + '</h3>' + (i.meta ? '<p class="meta">' + esc(i.meta) + '</p>' : '') +
      '<span class="src' + (i.variantId ? ' on">On id-eclair.com' : '">Counter item') + ' · ' + money(i.price) + '</span></div>' +
      '<div class="end"><span class="price">' + money(i.price * i.qty) + '</span><span class="stepper" role="group" aria-label="' + esc(i.title) + '" data-handle="' + esc(i.handle) + '">' + stepperHTML(i.handle, i.title, i.qty) + '</span></div></li>';
  }
  function renderDrawer(s) {
    if (!drawer) return;
    var n = count(), L = live(), C = counter(), url = checkoutUrl();
    $('[data-bag-n]', drawer).textContent = n ? ' · ' + plural(n, 'item') : '';
    $('[data-bag-slot]', drawer).textContent = slotText(s);
    var lines = $('[data-bag-lines]', drawer), foot = $('[data-bag-foot]', drawer), notes = $('[data-bag-notes]', drawer);
    if (!n) {
      lines.innerHTML = '<li class="empty"><h3>Your bag is empty.</h3><p>Start with an éclair; the chocolate one is $6.50 at the counter.</p><a class="btn btn-brand btn-sm" href="' + ($('#menu') ? '#menu' : home + '#menu') + '" data-cart-close>See the menu</a></li>';
      notes.innerHTML = ''; foot.innerHTML = ''; foot.hidden = true; return;
    }
    foot.hidden = false;
    lines.innerHTML = state.items.map(lineHTML).join('');
    var lq = L.reduce(function (a, i) { return a + i.qty; }, 0), cq = C.reduce(function (a, i) { return a + i.qty; }, 0), nt = '';
    if (L.length) nt += '<p class="bag-note"><b>Live store items (' + lq + ', ' + money(total(L)) + ').</b> These purchases really happen on the client’s store, with pickup at 169 W Green St, usually ready in 24 hours. The pickup time above is part of the concept and does not carry over yet.</p>';
    if (C.length) nt += '<p class="bag-note"><b>Counter items (' + cq + ', ' + money(total(C)) + ').</b> These move into the new checkout with the pickup app; in the live store they are ordered at the counter or on the <a href="' + MENU_APP + '" target="_blank" rel="noopener">menu app</a> today.</p>';
    notes.innerHTML = nt + '<button class="link" type="button" data-bag-clear>Empty the bag</button>';
    var h = '<div class="sum"><span>Subtotal</span><b>' + money(total()) + '</b></div>';
    h += url ? '<a class="btn btn-brand checkout" href="' + url + '" target="_blank" rel="noopener">Checkout on id-eclair.com · ' + money(total(L)) + '</a><p class="fine">Opens the live store in a new tab with ' + plural(lq, 'item') + '. These are real orders.</p>'
      : '<button class="btn checkout" type="button" disabled>Nothing here is on the live store yet</button><p class="fine">Counter items wait for the pickup app; see the note above.</p>';
    foot.innerHTML = h;
  }
  function focusables() { return $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', $('.sheet', drawer)).filter(function (e) { return e.offsetParent !== null; }); }
  function openBag(e) {
    if (e) e.preventDefault();
    if (strip) strip.close(false);
    buildDrawer(); renderAll();
    opener = document.activeElement;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('locked');
    $$('body > *').forEach(function (el) { if (el !== drawer && el !== liveRegion && el.tagName !== 'SCRIPT') el.inert = true; });
    setTimeout(function () { var x = $('.x', drawer); if (x) x.focus(); }, 40);
  }
  function closeBag(go) {
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked');
    $$('body > *').forEach(function (el) { el.inert = false; });
    if (go) return;
    if (opener && opener.focus) opener.focus();
  }

  /* ---------- category filter ---------- */
  function initCats(root) {
    var grid = root.getAttribute('data-target') ? document.getElementById(root.getAttribute('data-target')) : $('[data-menu-grid]');
    if (!grid) return;
    var items = $$('.item[data-cat]', grid);
    $$('.cat', root).forEach(function (c) {
      var cat = c.getAttribute('data-cat'), n = cat === 'all' ? items.length : items.filter(function (i) { return i.getAttribute('data-cat') === cat; }).length;
      if (!c.querySelector('.n')) c.insertAdjacentHTML('beforeend', ' <span class="n">' + n + '</span>');
      if (!n && cat !== 'all') c.hidden = true;
    });
    root._grid = grid;
  }
  function filter(c) {
    var root = c.closest('[data-cats]'), cat = c.getAttribute('data-cat');
    $$('.cat', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
    $$('.item[data-cat]', root._grid || document).forEach(function (it) { it.hidden = cat !== 'all' && it.getAttribute('data-cat') !== cat; });
  }

  /* ---------- menu rendered from menu.json (for pages that ask for it) ---------- */
  function card(i) {
    var pic = i.image ? '<img src="' + esc(i.image) + '" width="600" height="600" alt="' + esc(i.title) + '" loading="lazy">' : '<div class="tile" aria-hidden="true">' + esc(i.glyph || i.title.charAt(0)) + '<small>' + esc(i.label || '') + '</small></div>';
    var title = i.title, act;
    if (i.needs_choice && i.price_note) act = '<a class="add" href="' + esc(i.url) + '" target="_blank" rel="noopener">Options</a>';
    else {
      if (i.needs_choice && i.variants) title += ' (' + i.variants[0].title + ')';
      act = '<button class="add" type="button" data-add data-handle="' + esc(i.handle) + '" data-title="' + esc(title) + '" data-price="' + i.price + '"' + (i.variantId ? ' data-variant="' + esc(i.variantId) + '"' : '') + (i.image ? ' data-image="' + esc(i.image) + '"' : ' data-glyph="' + esc(i.glyph || '') + '"') + '>Add</button>';
    }
    return '<article class="item" data-cat="' + esc(i.category) + '">' + (i.variantId ? '<span class="live">On the live store</span>' : '') + pic +
      '<div class="body"><h3>' + esc(i.title) + '</h3><p class="meta">' + esc(i.desc || '') + (i.price_note ? ' · ' + esc(i.price_note) : '') + '</p><div class="row"><span class="price">' + money(i.price) + '</span>' + act + '</div></div></article>';
  }
  function renderMenu(grid) {
    var src = grid.getAttribute('data-src'), ch = grid.getAttribute('data-channel'), cats = (grid.getAttribute('data-cats') || '').split(',').filter(Boolean), lim = +grid.getAttribute('data-limit') || 0;
    return fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
      var list = data.items.filter(function (i) { return !i.hidden && (!ch || ch === 'all' || i.channel === ch) && (!cats.length || cats.indexOf(i.category) >= 0); });
      if (lim) list = list.slice(0, lim);
      grid.innerHTML = list.map(card).join('');
      enhanceAdds(grid); syncAdds();
      var c = $('[data-cats][data-target="' + grid.id + '"]'); if (c) initCats(c);
      return list;
    }).catch(function () {
      grid.innerHTML = '<p class="note-sm">The menu loads from ' + esc(src) + '. Open this page from a web server to see it.</p>';
    });
  }

  /* ---------- box of six ---------- */
  function initBox(root) {
    var slotsEl = $('[data-box-slots]', root), addB = $('[data-box-add]', root), box = [];
    var flav = $$('[data-f]', root), price = parseFloat(root.getAttribute('data-price') || '15');
    var short = {}; flav.forEach(function (b) { short[b.dataset.f] = b.dataset.short || b.dataset.f.slice(0, 4); });
    slotsEl.innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) { return '<button type="button" disabled aria-label="Slot ' + (i + 1) + ', empty">' + (i + 1) + '</button>'; }).join('');
    var cells = $$('button', slotsEl);
    function cls(f) { var b = flav.filter(function (x) { return x.dataset.f === f; })[0]; return b ? b.querySelector('i').className : ''; }
    function paint() {
      cells.forEach(function (c, i) {
        var f = box[i];
        c.className = f ? 'full ' + cls(f) + (/coconut/.test(cls(f)) ? ' light' : '') : '';
        c.disabled = !f; c.textContent = f ? short[f] : String(i + 1);
        c.setAttribute('aria-label', f ? 'Slot ' + (i + 1) + ', ' + f + '. Remove' : 'Slot ' + (i + 1) + ', empty');
      });
      var full = box.length === 6;
      flav.forEach(function (b) { b.disabled = full; });
      addB.disabled = !full;
      addB.textContent = full ? 'Add the box, ' + money(price) : box.length ? 'Add ' + (6 - box.length) + ' more' : 'Fill the box first';
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t || !root.contains(t)) return;
      if (t.dataset.f && box.length < 6) { box.push(t.dataset.f); paint(); }
      else if (t.parentNode === slotsEl && !t.disabled) { box.splice(cells.indexOf(t), 1); paint(); }
      else if (t.hasAttribute('data-box-clear')) { box = []; paint(); }
      else if (t.hasAttribute('data-box-surprise')) { while (box.length < 6) box.push(flav[Math.floor(Math.random() * flav.length)].dataset.f); paint(); }
      else if (t === addB && box.length === 6) {
        var tally = {}; box.forEach(function (f) { tally[f] = (tally[f] || 0) + 1; });
        var keys = Object.keys(tally).sort(), meta = keys.map(function (k) { return k + (tally[k] > 1 ? ' ×' + tally[k] : ''); }).join(', ');
        add({ handle: 'macaron-box-6:' + keys.map(function (k) { return k + tally[k]; }).join('-').toLowerCase().replace(/\s+/g, ''), title: root.getAttribute('data-title') || 'Box of six macarons', price: price, image: root.getAttribute('data-image') || null, glyph: '6', meta: meta });
        addB.textContent = 'In your bag'; addB.disabled = true;
        setTimeout(function () { box = []; paint(); }, 1200);
      }
    });
    paint();
  }

  /* ---------- app bar: highlight the section in view ---------- */
  function initBar() {
    var links = $$('.bar a'), map = {};
    links.forEach(function (a) {
      var id = a.getAttribute('data-section') || ((a.getAttribute('href') || '').charAt(0) === '#' ? a.getAttribute('href').slice(1) : '');
      if (id && document.getElementById(id)) map[id] = a;
    });
    if (!('IntersectionObserver' in window) || !Object.keys(map).length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        map[e.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ---------- order strip: Slot, Add, Pay (only on pages that carry [data-ostrip]) ----------
     Phones: fixed above the app bar. Desktop: docked under the header. Both appear once the element named
     in data-after has scrolled away, and step aside whenever the box-of-six add button would sit under them.
     Pay links straight to the Shopify cart permalink when every item is on the live store, and opens the
     bag (the review sheet) otherwise, so counter items never fall out of an order unannounced. */
  var strip = null;
  function initStrip() {
    var el = $('[data-ostrip]'); if (!el) return;
    var btn = $('[data-os-slot-btn]', el), panel = $('[data-os-panel]', el), pay = $('[data-os-pay]', el), html = document.documentElement;
    var desk = window.matchMedia ? matchMedia('(min-width: 900px)') : { matches: false };
    var head = $('.top'), sel = el.getAttribute('data-after'), after = sel ? $(sel) : null, on = !after, ticking = false;
    strip = { el: el, btn: btn, panel: panel, pay: pay, seen: null,
      day: $('[data-os-day]', el), time: $('[data-os-time]', el), count: $('[data-os-count]', el), add: $('[data-os-add]', el), where: $('[data-os-where]', el),
      step: { slot: $('[data-os-step="slot"]', el), add: $('[data-os-step="add"]', el) } };
    if (pay) pay.setAttribute('data-href', pay.getAttribute('href') || '#');
    html.classList.add('has-ostrip');
    var bar = $('.bar');
    function measure() {
      if (head) html.style.setProperty('--top-h', head.offsetHeight + 'px');
      if (bar && bar.offsetHeight) html.style.setProperty('--bar-real', bar.offsetHeight + 'px');   /* the app bar's true height, labels included */
    }
    /* the docked band, read from layout (top and height), so the slide-away transform never skews it */
    function covered() {
      var top = parseFloat(getComputedStyle(el).top) || 0, bottom = top + el.offsetHeight, pad = 8;
      return $$('[data-box-add]').some(function (b) {
        var r = (b.closest('.foot') || b).getBoundingClientRect();
        return r.width > 0 && r.bottom > top - pad && r.top < bottom + pad;
      });
    }
    function update() {
      ticking = false;
      /* "the hero has scrolled away": what is left of it would fit under the docked strip */
      if (after) on = after.getBoundingClientRect().bottom <= (head ? head.offsetHeight : 0) + el.offsetHeight + 24;
      el.classList.toggle('is-on', on);
      el.classList.toggle('is-yield', on && covered());
      html.classList.toggle('os-on', on && !el.classList.contains('is-yield'));
    }
    function queue() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    strip.update = update;
    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', function () { measure(); queue(); });
    document.addEventListener('ide:bag', queue);

    function outside(e) { if (!panel.contains(e.target) && !btn.contains(e.target)) close(false); }
    function open() {
      if (!panel) return false;
      panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); el.classList.add('is-open');
      setTimeout(function () { var c = $('.chip[aria-pressed="true"]', panel) || $('.chip:not([aria-disabled="true"])', panel); if (c) c.focus({ preventScroll: true }); }, 30);
      document.addEventListener('click', outside, true);
      return true;
    }
    function close(back) {
      if (!panel || panel.hidden) return;
      panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); el.classList.remove('is-open');
      document.removeEventListener('click', outside, true);
      if (back) btn.focus({ preventScroll: true });
    }
    strip.open = open; strip.close = close;
    if (btn) btn.addEventListener('click', function () {
      if (!panel) { goPicker(); return; }
      if (panel.hidden) open(); else close(true);
    });
    if (panel) {
      panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(true); } });
      var done = $('[data-os-done]', panel);
      if (done) done.addEventListener('click', function () { close(true); say('Pickup set for ' + slotText(slot()) + '.'); });
    }
  }
  /* with no strip panel: the page's own picker, or the home page's */
  function goPicker() {
    var all = $$('[data-slot-picker]').filter(function (x) { return !x.closest('[data-os-panel]'); });
    var p = all.filter(function (x) { return x.offsetParent !== null; })[0] || all[0];
    if (p) { p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); var c = $('.chip[aria-pressed="true"]', p); if (c) setTimeout(function () { c.focus({ preventScroll: true }); }, 300); }
    else location.href = home + '#pickup';
  }
  function renderStrip(s, n, t) {
    if (!strip) return;
    var url = checkoutUrl(), liveOnly = !!(n && url && !counter().length), p = strip.pay;
    if (strip.day) strip.day.textContent = !s.day ? 'Pickup' : 'Pickup ' + (s.day.i === 0 ? 'today' : s.day.top + ' ' + s.day.sub.replace(/^[A-Z][a-z]{2} /, ''));
    if (strip.time) strip.time.textContent = s.day ? tlabel(s.time) : 'No slot open';
    if (strip.btn) strip.btn.setAttribute('aria-label', 'Pickup ' + slotText(s) + '. Change the pickup time');
    if (strip.step.slot) strip.step.slot.classList.toggle('is-done', !!s.day);
    if (strip.step.add) strip.step.add.classList.toggle('is-done', n > 0);
    if (strip.count) strip.count.textContent = n ? plural(n, 'item') : 'None yet';
    if (strip.add) {
      if (n) strip.add.setAttribute('data-cart-open', ''); else strip.add.removeAttribute('data-cart-open');
      strip.add.setAttribute('aria-label', n ? plural(n, 'item') + ' in your bag, ' + money(t) + '. Open the bag' : 'Your bag is empty. Go to the case');
    }
    if (p) {
      if (liveOnly) {
        p.setAttribute('href', url); p.setAttribute('target', '_blank'); p.setAttribute('rel', 'noopener'); p.removeAttribute('data-cart-open');
        p.setAttribute('aria-label', 'Pay ' + money(t) + ' on id-eclair.com. Opens the live store in a new tab');
      } else {
        p.setAttribute('href', p.getAttribute('data-href')); p.removeAttribute('target'); p.removeAttribute('rel'); p.setAttribute('data-cart-open', '');
        p.setAttribute('aria-label', n ? 'Review your bag and pay, ' + money(t) : 'Open your bag. It is empty');
      }
      p.classList.toggle('is-ready', n > 0);
      if (strip.seen === 0 && n > 0) pop(p, 'pop');
    }
    if (strip.where) strip.where.textContent = liveOnly ? ' on id-eclair.com' : n ? ' after review' : '';
    strip.el.setAttribute('data-mode', liveOnly ? 'live' : 'review');
    strip.seen = n;
    strip.update();
  }

  /* ---------- right now: the one-tap set for the hour you collect ---------- */
  function renderNow(s) {
    $$('[data-now]').forEach(function (box) {
      var sets = $$('[data-part]', box); if (!sets.length) return;
      var m = s.day ? mins(s.time) : laNow().min, part = m < 660 ? 'matin' : m < 840 ? 'midi' : 'gouter';
      sets.forEach(function (x) { x.hidden = x.getAttribute('data-part') !== part; });
      var w = $('[data-now-when]', box);
      if (w && s.day) w.textContent = 'For pickup ' + (s.day.i === 0 ? 'today' : s.day.top + ' ' + s.day.sub) + ' at ' + tlabel(s.time) + '. One tap adds both, at counter prices.';
    });
  }

  /* ---------- render everything that shows the bag ---------- */
  function refocus(sel, fallback, root) { setTimeout(function () { var el = $(sel, root) || (fallback && $(fallback)); if (el) el.focus({ preventScroll: true }); }, 0); }
  function renderAll() {
    var s = slot(), n = count(), t = total();
    $$('[data-cart-count]').forEach(function (b) { b.textContent = n; b.classList.toggle('on', n > 0); });
    $$('.cartbtn').forEach(function (b) { b.setAttribute('aria-label', 'Your bag, ' + plural(n, 'item')); });
    $$('[data-cart-total]').forEach(function (el) { el.textContent = money(t); });
    $$('[data-review]').forEach(function (el) { el.hidden = n === 0; });
    $$('[data-cart-pill]').forEach(function (p) {
      p.classList.toggle('on', n > 0);
      var txt = $('[data-cart-summary]', p); if (txt) txt.textContent = plural(n, 'item') + (s.day ? ' · ' + slotText(s) : '');
    });
    $$('[data-next-slot]').forEach(function (el) { el.textContent = s.day ? 'Next pickup ' + slotText(s).replace(/^Today/, 'today') : 'Next pickup tomorrow'; });
    $$('[data-slot-picker]').forEach(function (p) { renderPicker(p, s); });
    syncAdds(); renderDrawer(s); renderStrip(s, n, t); renderNow(s);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a,button,[data-cart-close]'); if (!t) return;
    if (t.hasAttribute('data-add')) {
      var had = document.activeElement === t, st = t.nextElementSibling;
      add(itemFrom(t));
      if (st && st.classList.contains('stepper')) { pop(st, 'pop'); if (had) st.querySelector('[data-inc]').focus({ preventScroll: true }); }
      return;
    }
    if (t.hasAttribute('data-set-items')) {   /* option 05 keeps its own data-set buttons; this one carries its items */
      if (t.getAttribute('aria-disabled') === 'true') return;
      var items; try { items = JSON.parse(t.getAttribute('data-set-items') || '[]'); } catch (x) { items = []; }
      if (!items.length) return;
      addSet(items);
      var lab = t.textContent; t.textContent = 'Added'; t.setAttribute('aria-disabled', 'true');
      setTimeout(function () { t.textContent = lab; t.removeAttribute('aria-disabled'); }, 1300);
      return;
    }
    if (t.hasAttribute('data-inc') || t.hasAttribute('data-dec')) {
      var h = t.closest('[data-handle]').getAttribute('data-handle'), f = find(h); if (!f) return;
      var inc = t.hasAttribute('data-inc'), wasLast = !inc && f.qty === 1, holder = t.closest('.stepper'), inBag = drawer && drawer.contains(t);
      setQty(h, f.qty + (inc ? 1 : -1));
      var q = '[data-handle="' + h.replace(/"/g, '') + '"] [' + (inc ? 'data-inc' : 'data-dec') + ']';
      if (inBag) refocus('#bag ' + q, wasLast ? '#bag .x' : null);
      else if (wasLast && holder && holder.previousElementSibling && holder.previousElementSibling.hasAttribute('data-add')) holder.previousElementSibling.focus();
      return;
    }
    if (t.hasAttribute('data-cart-open')) { openBag(e); return; }
    if (t.hasAttribute('data-cart-close')) { var href = t.getAttribute('href'); closeBag(!!href); if (!href) e.preventDefault(); return; }
    if (t.hasAttribute('data-bag-clear')) { clear(); var x = $('.x', drawer); if (x) x.focus(); return; }
    if (t.hasAttribute('data-slot-change')) {
      closeBag(true);
      if (strip && strip.open()) return;   /* the strip's own picker opens where you are */
      goPicker();
      return;
    }
    if (t.hasAttribute('data-day')) {
      if (t.getAttribute('aria-disabled') === 'true') return;
      var d = days().filter(function (x) { return x.key === t.dataset.day; })[0]; if (!d) return;
      var cur = slot().time, keep = d.times.some(function (x) { return x.ok && x.t === cur; }), dp = t.closest('[data-slot-picker]');
      setSlot(d.key, keep ? cur : d.times.filter(function (x) { return x.ok; })[0].t);
      refocus('[data-day="' + d.key + '"]', null, dp); return;
    }
    if (t.hasAttribute('data-time')) {
      if (t.getAttribute('aria-disabled') === 'true') return;
      var sd = slot().day; if (!sd) return;
      var tp = t.closest('[data-slot-picker]'), inStrip = !!t.closest('[data-os-panel]');
      setSlot(sd.key, t.dataset.time); refocus('[data-time="' + t.dataset.time + '"]', null, tp);
      /* a time completes the choice: the strip's panel closes itself a beat later */
      if (inStrip && strip) setTimeout(function () { strip.close(true); say('Pickup set for ' + slotText(slot()) + '.'); }, 280);
      return;
    }
    if (t.classList.contains('cat') && t.closest('[data-cats]')) { filter(t); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (!drawer || !drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { closeBag(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { state = load(); renderAll(); } });

  /* ---------- boot ---------- */
  buildDrawer();
  enhanceAdds(document);
  $$('[data-cats]').forEach(initCats);
  $$('[data-box]').forEach(initBox);
  $$('[data-menu-grid][data-src]').forEach(function (g) { if (!g.querySelector('.item')) renderMenu(g); });
  initBar();
  initStrip();
  renderAll();

  window.IDE = { add: add, addSet: addSet, setQty: setQty, clear: clear, open: openBag, close: closeBag, state: snapshot, checkoutUrl: checkoutUrl, renderMenu: renderMenu, slot: function () { var s = slot(); return { date: s.day && s.day.key, time: s.time, label: slotText(s) }; } };
})();
