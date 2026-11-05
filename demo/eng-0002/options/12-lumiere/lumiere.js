/* iD Éclair: page behaviour around the shared bag (../../assets/app.js, loaded after this file, both deferred).
   app.js owns the bag, the box of six, the slot picker, the drawer and the Shopify cart link; this file only:
     1. points bag thumbnails at ../../img/ (the shared bag stores demo-root paths, img/...);
     2. the chapter bar: marks the chapter in view, keeps it in reach on a phone, draws the progress line
        where the browser lacks scroll timelines;
     3. the box tray: the 0-of-6 count and the fill meter follow the wells app.js paints;
     4. the dock: hidden on the first screen, rises after it, steps aside from the box add row and the picker,
        and shows the chosen pickup ("Ready Sat Nov 7, 11:00 am");
     5. the flight to the bag: on a pointer Add, the item's photo (or the heart) travels to the bag in 300 ms;
     6. the gift note preview; 7. the transform-only nudge where animation-timeline is missing;
     8. after the page has painted and gone idle, the pastry counter (counter-core.js, then counter.js);
     9. the stage's timing, holds, drag, colour band and the button that follows the slide;
     10. opening hours: the pickers, the closed notice and the closed modes.
   Reduced motion: no flight, no nudge, no smooth scroll. No dependencies. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function frame(fn) { var t = false; return function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; fn(); }); } }; }

  /* 1. bag thumbnails */
  function fix(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('img[src^="img/"]')) root.setAttribute('src', '../../' + root.getAttribute('src'));
    $$('img[src^="img/"]', root).forEach(function (im) { im.setAttribute('src', '../../' + im.getAttribute('src')); });
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) fix(n); }); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* 2. chapter bar */
  var sub = $('[data-sub]'), links = sub ? $$('a[href^="#"]', sub) : [];
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function mark(i) {
    links.forEach(function (a, k) { if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    var a = links[i]; if (!a || sub.scrollWidth <= sub.clientWidth) return;
    var left = a.offsetLeft - (sub.clientWidth - a.offsetWidth) / 2;
    sub.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
  }
  if ('IntersectionObserver' in window && links.length) {
    var seen = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      for (var k = targets.length - 1; k >= 0; k--) { if (targets[k] && seen[targets[k].id]) { mark(k); return; } }
    }, { rootMargin: '-35% 0px -60% 0px' });
    targets.forEach(function (t) { if (t) io.observe(t); });
  }
  var prog = $('[data-prog]');
  var cssProg = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()') && !reduce;
  var drawProg = frame(function () {
    var max = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
  });
  if (prog && !cssProg) { addEventListener('scroll', drawProg, { passive: true }); addEventListener('resize', drawProg); drawProg(); }

  /* 3. the box tray */
  var tray = $('[data-tray]'), wells = $('[data-box-slots]'), countEl = $('[data-box-n]'), gapEl = $('[data-box-gap]');
  if (tray && wells) {
    new MutationObserver(frame(function () {
      var n = $$('button.full', wells).length;
      tray.style.setProperty('--n', n);
      if (countEl) countEl.textContent = n;
      if (gapEl) gapEl.textContent = n === 0 ? 'Six wells, $15.00 for the box.' : n < 6 ? (6 - n) + ' to go; the box stays $15.00 for six.' : 'Full. Add it, or tap one to swap.';
      tray.classList.toggle('is-full', n === 6);
    })).observe(wells, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* 4. the dock */
  var dock = $('[data-dock]');
  if (dock) {
    var marks = $$('[data-box-add], #pickup [data-slot-picker]');
    var place = frame(function () {
      if (getComputedStyle(dock).display === 'none') return;
      var h = dock.offsetHeight + 24;
      dock.classList.toggle('is-early', scrollY < innerHeight - h);
      var top = innerHeight - h - 96;
      dock.classList.toggle('is-yield', marks.some(function (m) {
        var r = (m.closest('.bx-foot') || m).getBoundingClientRect();
        return r.height > 0 && r.bottom > top && r.top < innerHeight;
      }));
    });
    addEventListener('scroll', place, { passive: true });
    addEventListener('resize', place);
    place();
  }
  function slotLabels() {
    var I = window.IDE; if (!I) return;
    var l = I.slot().label || '';
    $$('[data-dock-when]').forEach(function (e) { e.textContent = l || 'Choose a time'; });
    $$('[data-ready]').forEach(function (e) { e.textContent = l ? l.replace(/^Today/, 'today') : 'when a slot opens'; });
  }
  document.addEventListener('ide:bag', slotLabels);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(slotLabels, 0); });

  /* 5. the flight to the bag */
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.3 6c-2.3 4.4-9.3 9-9.3 9z"/></svg>';
  function bagTarget() {
    var list = $$('.ctr:not([hidden]) .ctr-bag, .sub-bag, .dock-bag, .top .cartbtn');
    for (var i = 0; i < list.length; i++) {
      var el = list[i], r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).display === 'none') continue;
      if (el.closest('.dock') && (dock.classList.contains('is-early') || dock.classList.contains('is-yield'))) continue;
      if (r.bottom > 0 && r.top < innerHeight) return el;
    }
    return null;
  }
  function fly(from, img) {
    var to = bagTarget(); if (!to || !from.animate) return;
    var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    var el = document.createElement('div');
    el.className = 'fly'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = img ? '<img src="' + img + '" alt="">' : HEART;
    document.body.appendChild(el);
    var mid = { x: x0 + (x1 - x0) * 0.5, y: Math.min(y0, y1) - 56 };
    var anim = el.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1 },
      { transform: 'translate(' + mid.x + 'px,' + mid.y + 'px) scale(.9)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.4)', opacity: 0.2 }
    ], { duration: 300, easing: 'cubic-bezier(.3,0,0,1)', fill: 'forwards' });
    anim.onfinish = anim.oncancel = function () { el.remove(); };
  }
  document.addEventListener('click', function (e) {
    if (reduce || !e.detail) return;   /* pointer adds only: a keyboard add changes the count without a flight */
    var t = e.target.closest('[data-add], [data-box-add]'); if (!t || t.disabled || t.classList.contains('is-sold') || t.closest('.ctr, .pop')) return;
    var img = t.getAttribute('data-image');
    if (t.hasAttribute('data-box-add')) img = (t.closest('[data-box]') || t).getAttribute('data-image');
    fly(t, img ? '../../' + img : null);
  });

  /* 6. the gift note */
  var to = $('#nt-to'), line = $('#nt-line'), outTo = $('[data-note-to]'), outLine = $('[data-note-line]');
  function paintNote() {
    var n = (to.value || '').trim(), l = (line.value || '').trim();
    outTo.textContent = n || 'someone who loves macarons';
    outLine.textContent = l || 'Pour toi, un éclair par jour.';
    if (l) outLine.removeAttribute('lang'); else outLine.setAttribute('lang', 'fr');
  }
  if (to && line && outTo && outLine) { to.addEventListener('input', paintNote); line.addEventListener('input', paintNote); }

  /* 7. the nudge, only where scroll timelines are missing; content is never hidden */
  var cssView = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!reduce && !cssView && 'IntersectionObserver' in window) {
    var below = $$('.cmp-col, .proof div').filter(function (el) { return el.getBoundingClientRect().top > innerHeight; });
    below.forEach(function (el) { el.classList.add('nudge'); });
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); nio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    below.forEach(function (el) { nio.observe(el); });
  }

  window.LumiereFly = function (from, img) { try { if (!reduce && from) fly(from, img ? '../../' + img : null); } catch (e) { /* decoration only */ } };

  /* 8. the pastry counter, after first paint and an idle moment; the counter loads even if its engine does not */
  var VER = '?v=20261105k';
  function load(src, then) { var sc = document.createElement('script'); sc.src = src; sc.async = true; sc.onload = then; sc.onerror = then; document.head.appendChild(sc); }
  function counter() { load('counter-core.js' + VER, function () { load('counter.js' + VER); }); }
  function idle() { if ('requestIdleCallback' in window) requestIdleCallback(counter, { timeout: 2000 }); else setTimeout(counter, 600); }
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });

  /* 8b. live stock: ../../assets/stock.json (tools/sync_shopify_stock.py, every 15 min). Fail-open: a missing, broken
     or older-than-6-hours file changes nothing. Sold-out items get a calm "Sold out today", a disabled Add and the
     closest alternative; prices follow the file when they differ. */
  function money(n) { return '$' + Number(n).toFixed(2); }
  function applyStock(st, menu) {
    var age = Date.now() - Date.parse(st && st.updated_at);
    if (!st || !st.items || !(age < 6 * 3600 * 1000) || age < -600000) return;
    var byHandle = {}; ((menu && menu.items) || []).forEach(function (i) { byHandle[i.handle] = i; });
    function alt(h) {
      var me = byHandle[h]; if (!me) return null;
      return (menu.items || []).filter(function (i) { var s = st.items[i.handle]; return i.handle !== h && i.category === me.category && i.channel !== 'booking' && !i.needs_choice && !i.hidden && (!s || s.available !== false); })[0] || null;
    }
    window.LUMIERE_SOLDOUT = (window.LUMIERE_SOLDOUT || []).concat(Object.keys(st.items).filter(function (k) { return st.items[k].available === false && byHandle[k]; }));
    $$('[data-add]').forEach(function (b) {
      var h = b.getAttribute('data-handle'), s = st.items[h]; if (!s) return;
      var card = b.closest('[data-card], .item, article, li, .stg-slide') || b.parentNode;
      if (typeof s.price === 'number') {
        var old = parseFloat(b.getAttribute('data-price'));
        if (old && Math.abs(old - s.price) > 0.001) {
          b.setAttribute('data-price', s.price);
          $$('*', card).forEach(function (n) { if (!n.children.length && n.textContent.trim() === money(old)) n.textContent = money(s.price); });
          if (b.textContent.indexOf(money(old)) >= 0) b.textContent = b.textContent.replace(money(old), money(s.price));
          var al = b.getAttribute('aria-label') || '';
          if (al.indexOf(money(old)) >= 0) b.setAttribute('aria-label', al.replace(money(old), money(s.price)));
        }
      }
      if (s.available === false && !b.classList.contains('is-sold')) {
        b.disabled = true; b.classList.add('is-sold'); b.setAttribute('aria-label', (b.getAttribute('data-title') || h) + ', sold out today');
        b.textContent = 'Sold out today';
        var sib = b.nextElementSibling; if (sib && sib.classList.contains('stepper')) sib.hidden = true;
        b.hidden = false; card.classList.add('is-sold');
        var a = alt(h);
        if (a && !card.querySelector('.sold-note')) {
          var n = document.createElement('small'); n.className = 'sold-note';
          n.textContent = 'Closest today: ' + a.title + ', ' + money((st.items[a.handle] && st.items[a.handle].price) || a.price) + '.';
          b.insertAdjacentElement('afterend', n);
        }
      }
    });
  }
  var DATA = (function () {
    var q = '?v=20261105k', live = true;
    function get(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
    setTimeout(function () { live = false; }, 5000);
    var p = Promise.all([get('../../assets/stock.json' + q).catch(function () { return null; }), get('../../assets/menu.json' + q).catch(function () { return null; })])
      .then(function (d) { var st = d[0] && d[0].items && Date.now() - Date.parse(d[0].updated_at) < 6 * 3600 * 1000 ? d[0] : null; return { stock: st, menu: d[1] }; });
    p.then(function (d) { if (live && d.stock) applyStock(d.stock, d.menu); }).catch(function () { /* fail-open */ });
    return p;
  })();

  /* 8c. the menu search: one field under the chapter tabs (sticky with them), chips from the real menu, instant
     accent-insensitive typo-tolerant matching, stock from stock.json, and one line to the counter for questions. */
  (function () {
    var box = $('[data-search]'); if (!box) return;
    var input = $('#srch-q', box), clear = $('.srch-x', box), chipsEl = $('.srch-chips', box), out = $('.srch-out', box), subEl = $('.sub');
    var items = [], stock = null, active = {}, timer = null;
    function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function lev(a, b) { var m = a.length, n = b.length, d = [], i, j2; for (i = 0; i <= m; i++) d[i] = [i]; for (j2 = 1; j2 <= n; j2++) d[0][j2] = j2;
      for (i = 1; i <= m; i++) for (j2 = 1; j2 <= n; j2++) d[i][j2] = Math.min(d[i - 1][j2] + 1, d[i][j2 - 1] + 1, d[i - 1][j2 - 1] + (a[i - 1] === b[j2 - 1] ? 0 : 1)); return d[m][n]; }
    function pre(a, b) { var k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; }
    function wordHit(tok, w) {
      if (w.indexOf(tok) === 0 || (tok.length >= 3 && w.indexOf(tok) >= 0)) return true;
      if (tok.length >= 4 && lev(tok, w) <= (tok.length >= 7 ? 2 : 1)) return true;
      return tok.length >= 5 && pre(tok, w) >= Math.min(6, tok.length - 1);   /* pistachio / pistache */
    }
    function track(name, extra) {
      var d = { event: name, t: Date.now() }; for (var k in extra) d[k] = extra[k];
      try { document.dispatchEvent(new CustomEvent('lumiere:track', { detail: d })); } catch (e) { /* old engines */ }
      try { if (window.LUMIERE_TRACK_URL && navigator.sendBeacon) navigator.sendBeacon(window.LUMIERE_TRACK_URL, JSON.stringify(d)); } catch (e) { /* never block the page */ }
    }
    var GROUPS = [
      { id: 'eclair', label: 'Éclairs', f: function (i) { return i.category === 'eclair'; } },
      { id: 'macaron', label: 'Macarons', f: function (i) { return i.category === 'macaron'; } },
      { id: 'jars', label: 'Jars', f: function (i) { return i.category === 'cake' && i.handle !== 'mousse-cake'; } },
      { id: 'gifts', label: 'Gifts', f: function (i) { return i.category === 'gift'; } },
      { id: 'gf', label: 'Gluten-free', f: function (i) { return i.gf || /gluten.free/i.test([i.title, i.store_title, i.desc].join(' ')); } },
      { id: 'coffee', label: 'Coffee and tea', f: function (i) { return i.category === 'drink' || i.category === 'tea'; } }
    ];
    function sold(i) { var s = stock && stock.items && stock.items[i.handle]; return (s && s.available === false) || i.available === false || i.stock === 0; }
    function price(i) { var s = stock && stock.items && stock.items[i.handle]; return s && typeof s.price === 'number' ? s.price : i.price; }
    function match(i, toks) {
      var words = i.hay; var score = 0;
      for (var k = 0; k < toks.length; k++) {
        var best = 0;
        for (var w = 0; w < words.length; w++) if (wordHit(toks[k], words[w])) { best = Math.max(best, i.titleWords.indexOf(words[w]) >= 0 ? 2 : 1); }
        if (!best) return 0; score += best;
      }
      return score;
    }
    function isQuestion(q) { return /\?/.test(q) || /^(do|does|did|is|are|can|could|how|what|when|where|which|who|will|would|am|why)\b/.test(norm(q)) || /\b(do you have|is it|are you|can i|could i|i need|i want|looking for|help me)\b/.test(norm(q)); }
    function ask(q) {
      function go() { if (window.LumiereCounter && window.LumiereCounter.prefill) { window.LumiereCounter.prefill(q); return true; } return false; }
      if (go()) return; var n = 0, iv = setInterval(function () { if (go() || ++n > 24) clearInterval(iv); }, 250);
    }
    function row(i) {
      var s = sold(i), pr = price(i), title = i.title, act;
      if (i.needs_choice && i.price_note) act = '<a class="add" href="' + esc(i.url) + '" target="_blank" rel="noopener">Options</a>';
      else {
        if (i.needs_choice && i.variants) title += ' (' + i.variants[0].title + ')';
        act = s ? '<button class="add is-sold" type="button" disabled aria-label="' + esc(i.title) + ', sold out today">Sold out today</button>' :
          '<button class="add" type="button" data-add data-handle="' + esc(i.handle) + '" data-title="' + esc(title) + '" data-price="' + pr + '"' + (i.variantId ? ' data-variant="' + esc(i.variantId) + '"' : '') + (i.image ? ' data-image="' + esc(i.image) + '"' : ' data-glyph="' + esc(i.glyph || '') + '"') + '>Add</button>';
      }
      return '<li class="srch-it' + (s ? ' is-sold' : '') + '"><div><b>' + esc(i.title) + '</b><small>' + esc(i.desc || '') + '</small></div><span class="pr">' + money(pr) + (i.price_note ? '' : '') + '</span>' + act + '</li>';
    }
    function render() {
      var raw = input.value, q = norm(raw), toks = q.split(' ').filter(function (x) { return x.length > 1 || /\d/.test(x); });
      var gs = GROUPS.filter(function (g) { return active[g.id]; });
      box.classList.toggle('has-q', !!raw || gs.length > 0);
      clear.hidden = !raw;
      if (!raw && !gs.length) { out.hidden = true; out.innerHTML = ''; return; }
      var found = [];
      items.forEach(function (i) {
        if (gs.length && !gs.every(function (g) { return g.f(i); })) return;
        var sc = toks.length ? match(i, toks) : 1; if (sc) found.push({ i: i, s: sc });
      });
      found.sort(function (a, b) { return b.s - a.s; });
      var html = '', qn = raw.trim();
      var question = qn && isQuestion(qn);
      if (qn && (question || !found.length)) html += '<button type="button" class="srch-ask" data-srch-ask><img src="counter-mark.png" alt="" width="48" height="48">Ask the counter: “' + esc(qn.length > 60 ? qn.slice(0, 57) + '…' : qn) + '”</button>';
      if (found.length) html += '<ul class="srch-list">' + found.slice(0, 12).map(function (f) { return row(f.i); }).join('') + '</ul>';
      else html += '<p class="srch-none">Nothing in the case matches that.</p>';
      out.innerHTML = html; out.hidden = false;
      clearTimeout(timer);
      if (qn) timer = setTimeout(function () { track(found.length ? 'search_used' : 'search_no_result', { len: qn.length, n: found.length }); }, 900);
    }
    function reset() { input.value = ''; active = {}; $$('.srch-chip', chipsEl).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); render(); }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (input.value || Object.keys(active).length) { reset(); } else input.blur(); } });
    clear.addEventListener('click', function () { reset(); input.focus({ preventScroll: true }); });
    chipsEl.addEventListener('click', function (e) { var b = e.target.closest('.srch-chip'); if (!b) return; var id = b.getAttribute('data-g'); active[id] = !active[id]; b.setAttribute('aria-pressed', String(!!active[id])); render(); });
    out.addEventListener('click', function (e) {
      if (e.target.closest('[data-srch-ask]')) { var q = input.value.trim(); out.hidden = true; ask(q); return; }
      var a = e.target.closest('[data-add]'); if (a) { var o = a.textContent; a.textContent = 'Added'; setTimeout(function () { a.textContent = o; }, 1200); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !out.hidden && !e.defaultPrevented && !$('.drawer.open') && document.activeElement !== input) { reset(); } });
    document.addEventListener('click', function (e) { if (e.isTrusted && !out.hidden && !box.contains(e.target) && !e.target.closest('[data-search-open]')) out.hidden = true; });
    input.addEventListener('focus', function () { if (input.value || Object.keys(active).length) render(); });
    $$('[data-search-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        try { input.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { /* old engines */ }
        setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 350);
      });
    });
    /* the sticky bar reports its own height, so every sticky offset and scroll padding stays right */
    function sync() { if (subEl) document.documentElement.style.setProperty('--sub-h', subEl.offsetHeight + 'px'); }
    if (window.ResizeObserver && subEl) new ResizeObserver(sync).observe(subEl); sync();
    var hero = $('#eclairs');
    var stuckCheck = frame(function () { if (subEl && hero) subEl.classList.toggle('is-stuck', hero.getBoundingClientRect().bottom < (subEl.offsetHeight + 40)); });
    addEventListener('scroll', stuckCheck, { passive: true }); addEventListener('resize', stuckCheck); stuckCheck();
    DATA.then(function (d) {
      stock = d.stock;
      items = ((d.menu && d.menu.items) || []).filter(function (i) { return !i.hidden && i.channel !== 'booking' && i.price > 0; }).map(function (i) {
        var cat = (d.menu.categories || []).filter(function (c) { return c.id === i.category; })[0];
        i.titleWords = norm(i.title + ' ' + (i.store_title || '')).split(' ');
        i.hay = norm([i.title, i.store_title, i.desc, cat && cat.label, i.label].join(' ')).split(' ').filter(Boolean);
        return i;
      });
      var chips = GROUPS.filter(function (g) { return items.some(g.f); });
      chipsEl.innerHTML = chips.map(function (g) { return '<button type="button" class="srch-chip" data-g="' + g.id + '" aria-pressed="false">' + esc(g.label) + '</button>'; }).join('');
      chipsEl.hidden = !chips.length;
      sync(); if (input.value) render();
    });
  })();

  /* 9. the stage. stage.js draws the slides, swipes, the pause button and the arrow keys; its own interval is set
     to an hour in the markup, and this file keeps time: a new slide every 6 s on every device, whether or not the
     video plays, instant swaps under reduced motion, paused only by the pause button, a finger or pointer that is
     really down (one hold per pointer, released on up, cancel, lost capture or after 6 s; a scroll is not a hold)
     or keyboard focus inside, then resuming 4 s later. */
  var stage = $('[data-stage]');
  if (stage) {
    var EVERY = 6000, RESUME = 4000, SAFETY = 6000;
    var box = $('.stg-slides', stage), ctas = $$('[data-cta-for]'), cta = $('.hero-cta'), hero = $('.hero'), pauseB = $('.stg-pause', stage);
    var timer = null, lastOn = null, pointers = {}, kbd = false;
    function dots() { return $$('.stg-dot', stage).filter(function (d) { return d.offsetParent !== null; }); }
    function cur() { var d = dots(); for (var k = 0; k < d.length; k++) if (d[k].getAttribute('aria-current') === 'true') return k; return 0; }
    function step(n) { var d = dots(); if (d.length) d[(cur() + n + d.length) % d.length].click(); }
    function paused() { return pauseB && pauseB.getAttribute('aria-pressed') === 'true'; }
    function held() { return Object.keys(pointers).length > 0 || kbd; }
    function progress(ms) {
      stage.style.setProperty('--stg-every', ms + 'ms');
      $$('.stg-dot', stage).forEach(function (d) { d.classList.remove('run'); });
      var d = dots()[cur()]; if (d) { void d.offsetWidth; d.classList.add('run'); }
    }
    function schedule(ms) {
      clearTimeout(timer); timer = null;
      var hold = paused() || held();
      stage.classList.toggle('is-held', hold);
      if (hold) return;
      progress(ms);
      timer = setTimeout(function () { timer = null; if (document.hidden) { schedule(EVERY); return; } step(1); }, ms);
    }
    function freeze() { clearTimeout(timer); timer = null; stage.classList.add('is-held'); }
    /* the pointer holds */
    function release(id) {
      var p = pointers[id]; if (!p) return;
      clearTimeout(p.safety); delete pointers[id];
      if (!held()) schedule(RESUME);
    }
    function down(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (pointers[e.pointerId]) return;                                   /* one hold per pointer */
      pointers[e.pointerId] = { y: e.clientY, safety: setTimeout(function () { release(e.pointerId); }, SAFETY) };
      freeze();
    }
    function move(e) {
      var p = pointers[e.pointerId];
      if (p && Math.abs(e.clientY - p.y) > 10) release(e.pointerId);       /* a vertical scroll is not a hold */
    }
    function up(e) { release(e.pointerId); }
    [stage, cta].forEach(function (el) { if (el) el.addEventListener('pointerdown', down, { passive: true }); });
    addEventListener('pointermove', move, { passive: true });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { addEventListener(t, up, { passive: true, capture: true }); });
    function resetHolds() { Object.keys(pointers).forEach(function (id) { clearTimeout(pointers[id].safety); }); pointers = {}; kbd = false; schedule(EVERY); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) resetHolds(); });
    addEventListener('pageshow', resetHolds);
    addEventListener('blur', function () { pointers = {}; });
    /* keyboard focus inside holds; leaving resumes after 4 s */
    [stage, cta].forEach(function (el) {
      if (!el) return;
      el.addEventListener('focusin', function (e) { var fv = false; try { fv = e.target.matches(':focus-visible'); } catch (x) { fv = true; } if (fv) { kbd = true; freeze(); } });
      el.addEventListener('focusout', function (e) { if (e.relatedTarget && ((stage.contains(e.relatedTarget)) || (cta && cta.contains(e.relatedTarget)))) return; if (kbd) { kbd = false; schedule(RESUME); } });
    });
    /* visible arrows; the pause button is stage.js's own and this timer reads its state */
    var prev = $('[data-stg-prev]', stage), next = $('[data-stg-next]', stage);
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    if (pauseB) pauseB.addEventListener('click', function () { setTimeout(function () { if (paused()) freeze(); else schedule(EVERY); }, 0); });
    /* reduced motion keeps the rotation (WCAG 2.2.2: the pause button is there); swaps are instant in the CSS */
    /* stage.js pauses itself under reduced motion when it starts; only a pause the visitor asked for is kept */
    var asked = false;
    function unpause() { if (!asked && pauseB && pauseB.getAttribute('aria-pressed') === 'true') pauseB.click(); }
    if (pauseB) {
      ['pointerdown', 'keydown'].forEach(function (t) { pauseB.addEventListener(t, function () { asked = true; }); });
      new MutationObserver(unpause).observe(pauseB, { attributes: true, attributeFilter: ['aria-pressed'] });
      unpause(); addEventListener('load', unpause, { once: true });
    }
    /* the drag: the slide follows the finger a little, and a quick flick counts as a swipe */
    var drag = null;
    box.style.touchAction = 'pan-y';
    box.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; var on = $('.stg-slide.is-on picture', stage); drag = { x: e.clientX, y: e.clientY, t: Date.now(), el: on, dx: 0 }; }, { passive: true });
    box.addEventListener('pointermove', function (e) {
      if (!drag || !drag.el) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dy) > Math.abs(dx)) return;
      drag.dx = dx; if (!reduce) { drag.el.style.transition = 'none'; drag.el.style.transform = 'translateX(' + (dx * 0.35) + 'px)'; }
    }, { passive: true });
    function endDrag(e) {
      if (!drag) return;
      var d = drag; drag = null;
      if (d.el) { d.el.style.transition = ''; d.el.style.transform = ''; }
      var dt = Math.max(1, Date.now() - d.t), v = d.dx / dt;
      if (e.type === 'pointerup' && Math.abs(d.dx) <= 40 && Math.abs(v) > 0.35) step(d.dx < 0 ? 1 : -1);   /* stage.js handles the longer swipes */
    }
    ['pointerup', 'pointercancel'].forEach(function (t) { box.addEventListener(t, endDrag, { passive: true }); });
    /* each slide change: the button follows the slide, the band takes its colour, the next slide is drawn early */
    function follow() {
      var on = $('.stg-slide.is-on', stage), h = (on && on.getAttribute('data-cta')) || 'chocolate-eclair';
      if (!$('[data-cta-for="' + h + '"]')) h = 'chocolate-eclair';
      if (!(document.activeElement && cta && cta.contains(document.activeElement))) ctas.forEach(function (c) { c.hidden = c.getAttribute('data-cta-for') !== h; });
      if (on && hero) hero.style.setProperty('--band', on.getAttribute('data-ground') || '');
      var season = document.documentElement.getAttribute('data-season');
      var shown = $$('.stg-slide', stage).filter(function (s) { return !s.classList.contains('is-season') || s.getAttribute('data-for') === season; });
      var k = shown.indexOf(on);
      shown.forEach(function (s) { if (s.classList.contains('is-next') && s !== shown[(k + 1) % shown.length]) s.classList.remove('is-next'); });
      if (on && lastOn && lastOn !== on) { var gone = lastOn; gone.classList.add('was-on'); setTimeout(function () { gone.classList.remove('was-on'); }, 320); }
      lastOn = on;
      if (k >= 0 && shown.length > 1) shown[(k + 1) % shown.length].classList.add('is-next');
      schedule(EVERY);
    }
    var queueFollow = frame(follow);
    new MutationObserver(function (ms) {
      if (ms.some(function (m) {
        if (m.attributeName === 'aria-current') return true;
        var t = m.target;
        return t.classList.contains('stg-slide') && ((m.oldValue || '').split(' ').indexOf('is-on') >= 0) !== t.classList.contains('is-on');
      })) queueFollow();
    }).observe(stage, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'aria-current'] });
    follow();
    window.LumiereStage = { holds: function () { return Object.keys(pointers).length + (kbd ? 1 : 0); }, scheduled: function () { return !!timer; } };
  }

  /* 10. opening hours: one config (hours.json), computed in the shop's time zone. The pickup pickers never offer a
     slot outside hours, after the cutoff or on a closure date; when closed, ordering is a pre-order for the next open
     slot ("closed-preorder") or switched off with a calm notice ("closed-off"), as the config says. */
  function initHours(cfg) {
    if (!window.LumiereHoursCore) return;
    var H = window.LumiereHoursCore.create(cfg);
    window.LumiereHours = { state: function () { return H.state(new Date()); }, slotOk: function (k, t) { return H.slotOk(k, t, new Date()); }, cfg: H.cfg, core: H };
    var fixing = false;
    function enforce() {
      if (fixing) return;
      var bad = false;
      $$('[data-slot-picker]').forEach(function (p) {
        $$('[data-day]', p).forEach(function (b) {
          var k = b.getAttribute('data-day');
          if (!H.hours(k) && !b.hasAttribute('data-closed')) { b.setAttribute('data-closed', ''); b.setAttribute('aria-disabled', 'true'); b.tabIndex = -1; var bb = b.querySelector('b'); b.innerHTML = (bb ? bb.outerHTML : '') + 'Closed'; }
        });
        var dayB = $('[data-day][aria-pressed="true"]', p), key = dayB && dayB.getAttribute('data-day');
        $$('[data-time]', p).forEach(function (b) {
          var ok = key && H.slotOk(key, b.getAttribute('data-time'), new Date());
          if (!ok && b.getAttribute('aria-disabled') !== 'true') { b.setAttribute('aria-disabled', 'true'); b.tabIndex = -1; b.classList.add('is-closed'); b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/(, unavailable|, full)?$/, ', outside opening hours')); }
          if (!ok && b.getAttribute('aria-pressed') === 'true') bad = true;
        });
      });
      if (bad || !validNow()) moveSlot();
    }
    function validNow() { try { var s = window.IDE && window.IDE.slot(); return !s || !s.date || H.slotOk(s.date, s.time, new Date()); } catch (e) { return true; } }
    /* the chosen slot is outside hours: move it to the first open one the picker offers */
    function moveSlot() {
      var p = $('#pickup [data-slot-picker]') || $('[data-slot-picker]'); if (!p) return;
      var days = $$('[data-day]', p).map(function (b) { return b.getAttribute('data-day'); }), times = $$('[data-time]', p).map(function (b) { return b.getAttribute('data-time'); });
      for (var i = 0; i < days.length; i++) for (var j = 0; j < times.length; j++) {
        if (H.slotOk(days[i], times[j], new Date())) {
          try {
            var st = JSON.parse(localStorage.getItem('ide.bag.v1') || '{"items":[]}');
            if (st.slot && st.slot.date === days[i] && st.slot.time === times[j]) return;
            st.slot = { date: days[i], time: times[j] }; localStorage.setItem('ide.bag.v1', JSON.stringify(st));
            fixing = true; window.dispatchEvent(new StorageEvent('storage', { key: 'ide.bag.v1' })); fixing = false;
          } catch (e) { fixing = false; }
          return;
        }
      }
    }
    new MutationObserver(frame(enforce)).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('ide:bag', frame(enforce));
    enforce();
    /* the notice for when the shop is closed */
    function notice() {
      var s = H.state(new Date()), el = $('[data-hours-note]');
      document.documentElement.setAttribute('data-shop', s.open ? 'open' : s.mode);
      if (!el) return;
      if (s.open) { el.hidden = true; return; }
      var label = (window.IDE && window.IDE.slot().label) || (s.next ? s.next.label : '');
      el.textContent = s.mode === 'closed-off' ? 'We’re closed now and open again ' + (s.next ? s.next.label : 'soon') + '. Ordering opens then.' : 'We’re closed now. Order for pickup from ' + label.replace(/^Today/, 'today') + '.';
      el.hidden = false;
      $$('[data-add], [data-box-add]').forEach(function (b) {
        if (s.mode === 'closed-off') { b.disabled = true; b.setAttribute('aria-describedby', 'hours-note'); }
      });
    }
    notice(); setInterval(notice, 60000); document.addEventListener('ide:bag', frame(notice));
  }
  var hoursDone = false;
  function hoursFallback() { if (!hoursDone) { hoursDone = true; initHours(window.LumiereHoursCore && window.LumiereHoursCore.FALLBACK); } }
  var hoursTO = setTimeout(hoursFallback, 5000);
  fetch('hours.json' + VER).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (cfg) { if (hoursDone) return; hoursDone = true; clearTimeout(hoursTO); initHours(cfg); })
    .catch(function () { clearTimeout(hoursTO); hoursFallback(); });
  /* 11. how you'd like it (chef, 2026-11-05): pickup, local delivery or ships nationwide. The choice is inline under
     the headline, remembered on this device, and set on <html data-mode> before first paint (the head script), so
     the CSS can take the fresh chapters out of ship mode. Ship mode lists only what keeps: the gift, jam and cookie
     categories of menu.json. In the live build the pickup and local choices hand off to the shop's own ordering
     (Toast + Curate) and the shipped items check out on their own cart. */
  (function () {
    var KEY = 'lumiere.mode.v1', SHIP = { gift: 1, jam: 1, cookie: 1 };
    var NOTE = {
      pickup: 'Pickup at 169 W Green St, Old Pasadena, at the time you choose.',
      local: 'Delivered fresh from the shop to nearby addresses. Everything on the menu can come.',
      ship: 'Ships nationwide: chocolate, cookies, jams and gift baskets, packed and sealed at the shop.'
    };
    var root = document.documentElement, pick = $('[data-mode-pick]'); if (!pick) return;
    var note = $('[data-mode-note]', pick), built = false;
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    /* the shop's own menu (assets/curate_menu.json, tools/sync_curate_menu.py): what ships is the Pre-Packaged and Jam
       categories, in stock right now at the POS. Falls back to menu.json if the file is missing. */
    var curP = null;
    function curate() {
      if (!curP) curP = fetch('../../assets/curate_menu.json?v=20261105k').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (c) { var age = Date.now() - Date.parse(c && c.updated_at); return c && c.items && age < 7 * 24 * 3600 * 1000 ? c : null; }).catch(function () { return null; });
      return curP;
    }
    function build(menu) {
      var ul = $('[data-ship-list]'); if (!ul || built) return;
      var fromCurate = !!(menu && menu.source && /curate/.test(menu.source));
      var items = ((menu && menu.items) || []).filter(function (i) {
        return fromCurate ? i.ship && i.available && typeof i.price === 'number' : SHIP[i.category] && !i.hidden && i.variantId && i.available !== false;
      }).map(function (i) { return fromCurate ? { handle: i.handle, title: i.title, price: i.price, image: i.local_image || null, desc: '' } : i; });
      if (!items.length) { ul.innerHTML = '<li class="ship-wait">The shipped range is being updated. Call the shop: 626-365-1161.</li>'; return; }
      built = true;
      ul.innerHTML = items.map(function (i) {
        var title = i.title || i.handle;
        return '<li class="ship-card" data-card>' + (i.image ? '<img src="' + esc(i.image) + '" alt="" width="400" height="400" loading="lazy" decoding="async">' : '<span class="ship-ph" aria-hidden="true"><img src="counter-mark.png" alt="" width="192" height="192" loading="lazy"></span>') +
          '<h3>' + esc(title) + '</h3>' + (i.desc ? '<p>' + esc(i.desc) + '</p>' : '') +
          '<div class="row"><span class="pr">' + money(i.price) + '</span><button class="add" type="button" data-add data-handle="' + esc(i.handle) + '" data-title="' + esc(title) +
          '" data-price="' + Number(i.price) + '"' + (i.variantId ? ' data-variant="' + esc(i.variantId) + '"' : '') + (i.image ? ' data-image="' + esc(i.image) + '"' : '') +
          ' aria-label="Add ' + esc(title) + ', ' + money(i.price) + '">Add</button></div></li>';
      }).join('');
    }
    function set(m, user) {
      if (!NOTE[m]) m = 'pickup';
      root.setAttribute('data-mode', m);
      try { localStorage.setItem(KEY, m); } catch (e) { /* storage blocked: the choice holds for this page */ }
      $$('[data-mode]', pick).forEach(function (b) { var on = b.getAttribute('data-mode') === m; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
      if (note) note.textContent = NOTE[m];
      if (m === 'ship') curate().then(function (c) { if (c) build(c); else return DATA.then(function (d) { build(d.menu); }); }).catch(function () { build(null); });
      if (user && m === 'ship') { var t = $('#ship'); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    }
    pick.addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (b) set(b.getAttribute('data-mode'), true); });
    pick.addEventListener('keydown', function (e) {   /* radio group: arrows move and choose */
      var bs = $$('[data-mode]', pick), i = bs.indexOf(document.activeElement); if (i < 0) return;
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
      e.preventDefault(); var n = bs[(i + d + bs.length) % bs.length]; n.focus(); set(n.getAttribute('data-mode'), false);
    });
    set(root.getAttribute('data-mode') || 'pickup', false);
  })();
})();
