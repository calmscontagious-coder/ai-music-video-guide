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
     8. after the page has painted and gone idle, the pastry counter (counter-core.js, then counter.js).
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
    var list = $$('.sub-bag, .dock-bag, .top .cartbtn');
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
    var t = e.target.closest('[data-add], [data-box-add]'); if (!t || t.disabled || t.classList.contains('is-sold') || t.closest('.ctr')) return;
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

  /* 8. the pastry counter, after first paint and an idle moment */
  function load(src, then) { var sc = document.createElement('script'); sc.src = src; sc.async = true; sc.onload = then; document.head.appendChild(sc); }
  function counter() { load('counter-core.js', function () { load('counter.js'); }); }
  function idle() { if ('requestIdleCallback' in window) requestIdleCallback(counter, { timeout: 2000 }); else setTimeout(counter, 600); }
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
})();
