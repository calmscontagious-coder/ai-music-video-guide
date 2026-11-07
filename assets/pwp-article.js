/* Purpose with Presence article pages (LQ-139, 2026-11-07): mobile menu, reading progress, contents-rail
   highlight. No dependencies, deferred; every part is optional and the page works without it. */
(function () {
  var d = document, nav = d.querySelector('.site-head nav'), btn = nav && nav.querySelector('.menu-btn');
  function setOpen(o) {
    nav.setAttribute('data-open', o ? 'true' : 'false');
    btn.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (btn.firstElementChild) btn.firstElementChild.textContent = o ? 'Close' : 'Menu';
  }
  if (btn) {
    btn.addEventListener('click', function () { setOpen(nav.getAttribute('data-open') !== 'true'); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') { setOpen(false); btn.focus(); } });
  }
  var bar = d.querySelector('.site-head .progress'), art = d.querySelector('main article, main .page');
  if (bar && art) {
    var raf = 0;
    var upd = function () {
      raf = 0;
      var r = art.getBoundingClientRect(), h = r.height - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, -r.top / h)) : 0) + ')';
    };
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    upd();
  }
  var links = [].slice.call(d.querySelectorAll('.toc a[href^="#"]'));
  if (links.length) {
    var heads = links.map(function (a) { return d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
    var cur = -1, spyRaf = 0;
    var spy = function () {
      spyRaf = 0;
      var line = innerHeight * 0.3, i = -1;
      for (var k = 0; k < heads.length; k++) { if (heads[k] && heads[k].getBoundingClientRect().top < line) i = k; }
      if (i === cur) return;
      if (cur >= 0) links[cur].removeAttribute('aria-current');
      if (i >= 0) links[i].setAttribute('aria-current', 'true');
      cur = i;
    };
    addEventListener('scroll', function () { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, { passive: true });
    spy();
  }
})();
