/* Purpose with Presence product lander: the three behaviours the static page needs.
   Built by vael_tools/vael_product_lander.py, which copies this file to /assets/pwp-lander.<hash>.js.
   1. Menu toggle (button.menu-btn, nav[data-open]); Escape closes it.
   2. Memory/storage helper: radios in .config, answers in #pwp-config (JSON), result in .rec.
   3. Sticky buy bar on phones: shows once the hero buy button scrolls away; the dismiss is remembered.
   No animation is started from here. Motion lives in CSS, which turns it off under
   prefers-reduced-motion; the reduce-motion class below lets CSS opt out of smooth scrolling too. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('reduce-motion');
  } catch (e) {}

  /* 1. menu */
  var nav = d.querySelector('.site-head nav');
  var btn = nav && nav.querySelector('.menu-btn');
  function setMenu(open) {
    nav.setAttribute('data-open', open ? 'true' : 'false');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var label = btn.querySelector('span');
    if (label) label.textContent = open ? 'Close' : 'Menu';
  }
  if (nav && btn) {
    btn.addEventListener('click', function () { setMenu(nav.getAttribute('data-open') !== 'true'); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') { setMenu(false); btn.focus(); }
    });
  }

  /* 2. memory/storage helper */
  var dataEl = d.getElementById('pwp-config');
  var form = d.querySelector('.config');
  if (dataEl && form) {
    var C = null;
    try { C = JSON.parse(dataEl.textContent); } catch (e) { C = null; }
    if (C && C.steps && C.recs) {
      var rec = form.querySelector('.rec');
      var update = function () {
        var key = C.steps.map(function (s) {
          var el = form.querySelector('input[name="cfg-' + s.key + '"]:checked');
          return el ? el.value : '';
        }).join('|');
        var r = C.recs[key];
        if (!r || !rec) return;
        (r.values || []).forEach(function (v, i) {
          var el = rec.querySelector('[data-rec="' + i + '"]');
          if (el) el.textContent = v;
        });
        var why = rec.querySelector('[data-rec="why"]');
        if (why) why.textContent = r.why || '';
        var a = rec.querySelector('a[data-rec="url"]');
        if (a && r.url) {
          a.href = r.url;
          var lab = a.querySelector('[data-rec="label"]');
          if (lab && r.label) lab.textContent = r.label;
        }
      };
      form.addEventListener('change', update);
      update();
    }
  }

  /* 3. sticky buy bar */
  var bar = d.querySelector('.buy-bar');
  var buy = d.querySelector('.product-hero .buy');
  if (bar && buy) {
    var KEY = 'pwp-buybar-dismissed';
    var dismissed = false;
    try { dismissed = window.localStorage.getItem(KEY) === '1'; } catch (e) {}
    var past = false;
    var focusables = bar.querySelectorAll('a, button');
    var render = function () {
      var show = past && !dismissed;
      bar.setAttribute('data-show', show ? 'true' : 'false');
      for (var i = 0; i < focusables.length; i++) focusables[i].setAttribute('tabindex', show ? '0' : '-1');
    };
    var x = bar.querySelector('.x-btn');
    if (x) x.addEventListener('click', function () {
      dismissed = true;
      try { window.localStorage.setItem(KEY, '1'); } catch (e) {}
      render();
      var main = d.getElementById('main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var e = entries[0];
        past = !e.isIntersecting && e.boundingClientRect.top < 0;
        render();
      }).observe(buy);
    }
    render();
  }
})();
