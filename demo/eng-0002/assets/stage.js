/* The stage's behaviour (3 Nov 2026). Autoplay every 5 s with a 300 ms fade, as on the shop's own home page; dots;
   a pause button (WCAG 2.2.2); swipe on touch; arrow keys when a control has focus; paused while the tab is hidden
   or focus is inside the slides. Reduced motion: no autoplay and no video, the poster stays. The Golden Ticket
   video loads only after the page has painted and the visitor has stayed 4 s or touched the page, never on
   Save-Data, and plays only while its slide shows. Pickup or delivery: one toggle, the line under it follows.
   The phone's sticky Order pill appears once the panel's button scrolls away, on pages with no order bar of
   their own. No dependencies. */
(function () {
  'use strict';
  var st = document.querySelector('[data-stage]'); if (!st) return;
  /* the visible set: the season's lead slide (when its season is on) and the page's own slides */
  var season = document.documentElement.getAttribute('data-season');
  function shown(el) { return !el.classList.contains('is-season') && !el.classList.contains('is-season-dot') || el.getAttribute('data-for') === season || (el.classList.contains('is-season-dot') && !!st.querySelector('.stg-slide.is-season[data-for="' + season + '"]')); }
  var slides = [].slice.call(st.querySelectorAll('.stg-slide')).filter(shown), dots = [].slice.call(st.querySelectorAll('.stg-dot')).filter(shown);
  slides.forEach(function (s, k) { s.setAttribute('aria-label', (k + 1) + ' of ' + slides.length + s.getAttribute('aria-label').replace(/^\d+ of \d+/, '')); });
  dots.forEach(function (d, k) { d.setAttribute('aria-label', d.getAttribute('aria-label').replace(/slide \d+/, 'slide ' + (k + 1))); });
  st.classList.add('stg-run');
  var pause = st.querySelector('.stg-pause'), box = st.querySelector('.stg-slides');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var every = +st.getAttribute('data-interval') || 5000, i = 0, timer = null, paused = reduce, held = false;
  function show(n, by) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === i; s.classList.toggle('is-on', on); s.setAttribute('aria-hidden', String(!on));
      if ('inert' in s) s.inert = !on;
      var v = s.querySelector('video'); if (v && v.src) { if (on) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
    });
    dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === i)); });
    var g = slides[i].getAttribute('data-ground'); if (g) box.style.setProperty('--stg-g', g);
    if (by) restart();
  }
  function tick() { if (!paused && !held && !document.hidden) show(i + 1); }
  function restart() { clearInterval(timer); if (slides.length > 1) timer = setInterval(tick, every); }
  dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k, true); }); });
  if (pause) {
    pause.setAttribute('aria-pressed', String(paused));
    pause.addEventListener('click', function () { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); pause.setAttribute('aria-label', paused ? 'Play the slideshow' : 'Pause the slideshow'); });
    pause.setAttribute('aria-label', paused ? 'Play the slideshow' : 'Pause the slideshow');
  }
  st.addEventListener('focusin', function (e) { if (box.contains(e.target) || (e.target.closest && e.target.closest('.stg-ctl'))) held = true; });
  st.addEventListener('focusout', function () { held = false; });
  st.addEventListener('keydown', function (e) {
    if (!e.target.closest || !e.target.closest('.stg-ctl')) return;
    if (e.key === 'ArrowRight') { show(i + 1, true); e.preventDefault(); } else if (e.key === 'ArrowLeft') { show(i - 1, true); e.preventDefault(); }
  });
  var x0 = null;
  box.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') x0 = e.clientX; }, { passive: true });
  box.addEventListener('pointerup', function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1), true); }, { passive: true });
  show(0);
  function live() { st.classList.add('stg-live'); restart(); }
  if (document.readyState === 'complete') live(); else addEventListener('load', live, { once: true });
  /* the video, late and light */
  var vids = [].slice.call(st.querySelectorAll('video[data-tall]'));
  function loadVideos() {
    if (reduce || saveData || !vids.length) return;
    var wide = window.matchMedia && matchMedia('(min-width: 900px)').matches;
    vids.forEach(function (v) {
      if (v.src) return;
      v.src = v.getAttribute(wide ? 'data-wide' : 'data-tall');
      v.addEventListener('playing', function () { v.classList.add('is-ready'); }, { once: true });
      if (v.closest('.stg-slide').classList.contains('is-on')) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }
  var armed = false;
  function arm() { if (armed) return; armed = true; ['pointerdown', 'scroll', 'keydown'].forEach(function (t) { removeEventListener(t, arm); }); loadVideos(); }
  if (vids.length) {
    ['pointerdown', 'scroll', 'keydown'].forEach(function (t) { addEventListener(t, arm, { passive: true, once: true }); });
    addEventListener('load', function () { setTimeout(arm, 4000); });
  }
  /* pickup or delivery */
  var choice = st.querySelector('.stg-choice');
  if (choice) choice.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-how]'); if (!b) return;
    [].forEach.call(choice.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    [].forEach.call(st.querySelectorAll('.stg-how'), function (p) { p.hidden = p.getAttribute('data-how') !== b.getAttribute('data-how'); });
  });
  /* the phone's sticky Order pill: shown once the panel's button has scrolled away, and only while no order bar of
     the page's own is on screen at the bottom (the strip, an option's dock); drawers and full-height sheets do not count */
  var pill = document.querySelector('.stg-sticky'), go = st.querySelector('.stg-go'), past = false, queued = false;
  function ownOnScreen() {
    return [].some.call(document.querySelectorAll('body *'), function (el) {
      if (el === pill || pill.contains(el)) return false;
      var cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return false;
      var r = el.getBoundingClientRect();
      return r.height > 36 && r.height < innerHeight * .5 && r.width > innerWidth * .6 && r.bottom >= innerHeight - 2 && r.top < innerHeight - 8;
    });
  }
  function update() { queued = false; pill.classList.toggle('is-on', past && !ownOnScreen()); }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  if (pill && go && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { past = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; queue(); }).observe(go);
    addEventListener('scroll', function () { if (past) queue(); }, { passive: true });
  }
})();
