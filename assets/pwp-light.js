/* Purpose with Presence, "Living Light": the small script behind the light. Vanilla, no dependencies, no storage,
   no third-party calls. Parts: tracking hook (same contract as before: data-track clicks go to window.pwpEvents and
   a "pwp:track" DOM event), phone menu, pointer light (--mx, --my on the hero), scroll progress (--p), foil-card tilt
   (--rx, --ry, --gx, --gy), and the pause button. With reduced motion, or after pause, nothing here moves anything. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function still() { return mq.matches || root.classList.contains("ll-still"); }

  /* tracking */
  var events = window.pwpEvents = window.pwpEvents || [];
  function track(name, detail) {
    if (!name) return;
    var row = { e: name, t: Math.round(performance.now()), d: detail || null };
    events.push(row);
    if (events.length > 300) events.shift();
    try { doc.dispatchEvent(new CustomEvent("pwp:track", { detail: row })); } catch (err) { /* old browsers */ }
  }
  if (!window.pwpTrack) {
    window.pwpTrack = track;
    doc.addEventListener("click", function (ev) {
      var el = ev.target.closest ? ev.target.closest("[data-track]") : null;
      if (el && el.tagName !== "FORM" && el.type !== "submit") track(el.getAttribute("data-track"));
    });
  }

  /* phone menu */
  var nav = doc.querySelector(".ll-nav"), btn = nav && nav.querySelector(".ll-menu-btn");
  function setMenu(open) {
    nav.setAttribute("data-open", open ? "true" : "false");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
  }
  if (btn) {
    btn.addEventListener("click", function () { setMenu(nav.getAttribute("data-open") !== "true"); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.getAttribute("data-open") === "true") { setMenu(false); btn.focus(); } });
    nav.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".ll-links a")) setMenu(false); });
  }

  /* pointer light on the hero: the headline's weight and the prism's turn */
  var hero = doc.querySelector("[data-ll-pointer]"), raf = 0, px = 0.5, py = 0.5;
  if (hero) {
    hero.addEventListener("pointermove", function (ev) {
      if (still()) return;
      var r = hero.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); py = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; hero.style.setProperty("--mx", px.toFixed(3)); hero.style.setProperty("--my", py.toFixed(3)); });
    }, { passive: true });
  }

  /* scroll progress over the first screen: the headline's lines slide apart, the prism turns */
  var sraf = 0;
  function onScroll() {
    sraf = 0;
    var p = still() ? 0 : Math.min(1, Math.max(0, window.scrollY / 520));
    root.style.setProperty("--p", p.toFixed(3));
  }
  if (hero) { window.addEventListener("scroll", function () { if (!sraf) sraf = requestAnimationFrame(onScroll); }, { passive: true }); onScroll(); }

  /* foil cards: tilt toward the pointer, glare follows it */
  Array.prototype.forEach.call(doc.querySelectorAll("[data-ll-tilt]"), function (card) {
    var t = 0;
    card.addEventListener("pointermove", function (ev) {
      if (still()) return;
      var r = card.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      if (t) return;
      t = requestAnimationFrame(function () {
        t = 0;
        card.style.setProperty("--rx", ((x - 0.5) * 12).toFixed(2)); card.style.setProperty("--ry", ((0.5 - y) * 10).toFixed(2));
        card.style.setProperty("--gx", (x * 100).toFixed(1)); card.style.setProperty("--gy", (y * 100).toFixed(1));
      });
    }, { passive: true });
    card.addEventListener("pointerleave", function () { card.style.setProperty("--rx", "0"); card.style.setProperty("--ry", "0"); card.style.setProperty("--gx", "50"); card.style.setProperty("--gy", "30"); });
  });

  /* pause: stops the aurora, the marquee, the shimmer and the kinetic type (WCAG 2.2.2) */
  var pause = doc.querySelector("[data-ll-still]");
  if (pause) {
    pause.hidden = false;
    pause.addEventListener("click", function () {
      var on = !root.classList.contains("ll-still");
      root.classList.toggle("ll-still", on);
      pause.setAttribute("aria-pressed", on ? "true" : "false");
      pause.querySelector("span").textContent = on ? "Play the light" : "Pause the light";
      if (on) { root.style.setProperty("--p", "0"); if (hero) { hero.style.setProperty("--mx", "0.5"); hero.style.setProperty("--my", "0.5"); } }
      track(on ? "home_motion_pause" : "home_motion_play");
    });
  }
})();
