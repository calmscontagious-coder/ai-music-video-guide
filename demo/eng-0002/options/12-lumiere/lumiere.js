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
  var VER = '?v=20261105c';
  function load(src, then) { var sc = document.createElement('script'); sc.src = src; sc.async = true; sc.onload = then; sc.onerror = then; document.head.appendChild(sc); }
  function counter() { load('counter-core.js' + VER, function () { load('counter.js' + VER); }); }
  function idle() { if ('requestIdleCallback' in window) requestIdleCallback(counter, { timeout: 2000 }); else setTimeout(counter, 600); }
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });

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
})();
