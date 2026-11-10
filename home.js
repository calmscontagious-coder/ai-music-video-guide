/* Purpose with Presence home v2. Vanilla, no dependencies, no storage, no third-party calls.
   Parts: tracking hook, hero field (Canvas 2D street grid plus DOM wins moved by transform and opacity), hero counters, plan configurator, Google profile check,
   redesign slider, AI-question check (simulated), speed dial (real browser numbers), free-check form.
   Every interactive element carries data-track; events go to window.pwpEvents and a "pwp:track"
   DOM event, so the site's event Worker can count them later. Reduced motion: static field, no
   counting, no tilt, no roll. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function still() { return mq.matches; }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) {
      var ta = doc.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.className = "sr";
      doc.body.appendChild(ta); ta.select();
      var done = false; try { done = doc.execCommand("copy"); } catch (err) { done = false; }
      ta.parentNode.removeChild(ta);
      if (done) ok(); else no(new Error("copy failed"));
    });
  }
  function fmt(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ── tracking ── */
  var events = window.pwpEvents = window.pwpEvents || [];
  function track(name, detail) {
    if (!name) return;
    var row = { e: name, t: Math.round(performance.now()), d: detail || null };
    events.push(row);
    if (events.length > 300) events.shift();
    try { doc.dispatchEvent(new CustomEvent("pwp:track", { detail: row })); } catch (err) { /* old browsers */ }
  }
  window.pwpTrack = track;
  doc.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-track]") : null;
    if (el && el.tagName !== "FORM" && el.type !== "submit" && el.type !== "range" && el.tagName !== "SELECT") track(el.getAttribute("data-track"));
  });
  doc.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el && (el.type === "range" || el.tagName === "SELECT") && el.hasAttribute("data-track")) track(el.getAttribute("data-track"), { v: el.value });
  });

  /* Resolve a token colour to rgb so Canvas 2D can use it in every engine. */
  var probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
  function tokenRGB(name) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    if (!probe || !v) return [200, 200, 200];
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "rgb(1,2,3)";
    probe.fillStyle = v;
    probe.fillRect(0, 0, 1, 1);
    var d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  /* ── hero field: everyday wins travel the street grid into the business square ──
     Canvas 2D draws the street grid, walkers, the flight trail and the square's reaction. Each win is
     one DOM phrase moved only by transform and opacity (Web Animations). Strictly one phrase at a
     time: a lock (busy) and a generation counter (gen) gate every step, so the next phrase starts
     only after the last one has landed, opened the square, sat inside it and cleared. Any stop
     (hidden tab, hero off screen, resize, reduced-motion change) cancels the running phrase, its
     animations and its timers outright. Variety: wins come from a shuffled bag (no repeat until the
     whole pool is spent), and every cycle picks a flight path, an entry, an exit, a glow colour, a
     way into the square and a square reaction that differ from the previous cycle's.
     Reduced motion: a static field and the open square showing one win at a time, faded out, then in. */
  var canvas = $("[data-field]");
  if (canvas && canvas.getContext) (function () {
    var ctx = canvas.getContext("2d");
    var C = { line: tokenRGB("--color-line"), soft: tokenRGB("--color-line-soft"), dot: tokenRGB("--color-muted"), faint: tokenRGB("--color-faint"), accent: tokenRGB("--color-accent"), plus: tokenRGB("--color-plus"), sky: tokenRGB("--color-sky") };
    /* Every win maps to a line of the packages canon (Essentials, Growth or Signature). */
    var WINS = [
      "Get found on Google Maps", "Hours right on Google, Apple and Bing", "Holiday hours set before the rush", "Every review answered in two days",
      "Ask every customer for a review", "A welcome email for every sign-up", "Birthday treats sent on the day", "Win back last year’s customers",
      "Nudge the carts people left behind", "Thank buyers, then ask for a review", "Holiday pre-orders open early", "Two email campaigns a month",
      "One customer list, not five", "See which posts bring people in", "Know which ads pay for themselves", "Show up in AI answers",
      "Answer the 20 questions people ask", "A Google post every week", "Fresh photos every quarter", "Twelve posts and four videos a month",
      "Text perks people asked for", "Texts that respect quiet hours", "A rewards ladder worth climbing", "Referrals that thank both sides",
      "Fill your classes from the website", "A waitlist for the busy nights", "Your events on the local calendars", "Pages that load in under 2.5 s",
      "A site that works by keyboard", "A Monday digest, one change to try", "A one-page report every month", "Sold out? Change it from your phone",
      "Today’s stock on the front page", "Answer customers at 2 a.m.", "Group orders from 50 local offices", "Merch with a QR price card",
      "A new offer tested each month", "Stop what isn’t working", "Emails that land in the inbox", "One-click unsubscribe, always",
      "Consent first, then tracking", "Ad tests with a stop rule", "Seasonal looks ready ahead of time", "A 12-month calendar with lead times",
      "Structured data search engines read", "Pitched to the local best-of lists", "Real photos of your own place", "Every account in your name",
      "Let people book from their phone", "Fill slow Tuesdays", "Your profile complete, top to bottom", "Apple and Bing listings in step"
    ];
    var GLOWS = [["accent", "--color-accent"], ["plus", "--color-plus"], ["sky", "--color-sky"]];
    var PATHS = ["arc", "swoop", "scurve", "street", "orbit"], ENTRIES = ["rise-letters", "rise-words", "drop-letters", "sweep", "type"];
    var EXITS = ["fold", "fold-back", "fold-words", "squeeze"], INTOS = ["lift", "drop", "zoom", "letters"], REACTS = ["ring", "ripple", "burst", "beam", "turn"];
    var inE = "cubic-bezier(0.2,0,0,1)", outE = "cubic-bezier(0.55,0,0.85,0.35)";
    var layer = $("[data-wins]");
    var w = 0, h = 0, dpr = 1, G = 44, wide = false, shop = { x: 0, y: 0 }, box = { w: 0, h: 0, pad: 12 }, walkers = [], rings = [], sparks = [], react = null;
    var pulse = 9, running = false, visible = true, last = 0, labelA = 1, pointer = { x: 0, y: 0, tx: 0, ty: 0 }, scrollK = 1, ai = 0, mapLayer = null, font = "12px ui-monospace, monospace";
    var timers = [], gen = 0, busy = false, cur = null, prev = {}, bag = [], lastWin = "";
    var canAnimate = !!(layer && layer.animate);
    if (layer) layer.setAttribute("data-pool", String(WINS.length));

    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      G = w < 600 ? 34 : 44;
      wide = w >= 900;
      box.w = Math.round(wide ? Math.min(236, Math.max(176, w * 0.15)) : Math.min(176, Math.max(124, w * 0.42)));
      box.h = wide ? 100 : 78; box.pad = wide ? 14 : 10;
      shop.x = snap(wide ? w * 0.74 : w * 0.7);
      for (var k = 0; k < 8 && shop.x + box.w / 2 > w - 10; k++) shop.x -= G;
      for (k = 0; k < 8 && shop.x - box.w / 2 < 10; k++) shop.x += G;
      shop.y = snap(wide ? h * 0.46 : h * 0.55);
      for (k = 0; k < 8 && shop.y + box.h / 2 > h - 12; k++) shop.y -= G;
      for (k = 0; k < 8 && shop.y - box.h / 2 < 12; k++) shop.y += G;
      var mono = getComputedStyle(root).getPropertyValue("--font-mono").trim() || "monospace";
      font = (w < 600 ? 11 : 12) + "px " + mono;
      drawMap(); drawGlow();
      walkers = [];
      var n = w < 600 ? 10 : 18;
      for (var i = 0; i < n; i++) walkers.push(spawn(true));
    }
    function snap(v) { return Math.round(v / G) * G; }
    function drawMap() {
      mapLayer = doc.createElement("canvas");
      mapLayer.width = canvas.width; mapLayer.height = canvas.height;
      var m = mapLayer.getContext("2d");
      m.scale(dpr, dpr);
      var x, y, i = 0;
      for (x = 0; x <= w; x += G) { m.strokeStyle = rgba(i % 4 === 0 ? C.line : C.soft, i % 4 === 0 ? 0.9 : 0.7); m.lineWidth = 1; m.beginPath(); m.moveTo(x + 0.5, 0); m.lineTo(x + 0.5, h); m.stroke(); i++; }
      i = 0;
      for (y = 0; y <= h; y += G) { m.strokeStyle = rgba(i % 4 === 0 ? C.line : C.soft, i % 4 === 0 ? 0.9 : 0.7); m.beginPath(); m.moveTo(0, y + 0.5); m.lineTo(w, y + 0.5); m.stroke(); i++; }
      m.fillStyle = rgba(C.faint, 0.9); m.font = font;
      for (x = G * 4, i = 1; x < w; x += G * 4, i++) m.fillText(String(i).padStart(2, "0"), x + 4, 14);
    }
    var glowLayer = null, GR = 0;
    function drawGlow() {
      GR = Math.round(Math.min(260, w * 0.4));
      glowLayer = doc.createElement("canvas");
      glowLayer.width = glowLayer.height = Math.round(GR * 2 * dpr);
      var g = glowLayer.getContext("2d"), r = GR * dpr;
      var grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, rgba(C.accent, 0.28)); grad.addColorStop(1, rgba(C.accent, 0));
      g.fillStyle = grad; g.fillRect(0, 0, r * 2, r * 2);
    }
    function spawn(initial) {
      var cols = Math.floor(w / G), rows = Math.floor(h / G), sx, sy, tries = 0;
      do { sx = Math.floor(Math.random() * (cols + 1)) * G; sy = Math.floor(Math.random() * (rows + 1)) * G; tries++; }
      while (Math.abs(sx - shop.x) + Math.abs(sy - shop.y) < G * 5 && tries < 20);
      var hFirst = Math.random() < 0.5;
      var wk = { x: sx, y: sy, way: hFirst ? [{ x: shop.x, y: sy }, { x: shop.x, y: shop.y }] : [{ x: sx, y: shop.y }, { x: shop.x, y: shop.y }], step: 0, v: 26 + Math.random() * 30, lit: Math.random() < 0.22, trail: [] };
      if (initial) { var adv = Math.random() * 0.8; wk.x = sx + (wk.way[0].x - sx) * adv; wk.y = sy + (wk.way[0].y - sy) * adv; }
      return wk;
    }

    /* ── variety: the bag of wins and the look of each cycle ── */
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function nextWin() {
      if (!bag.length) {
        bag = shuffle(WINS.slice());
        if (bag[bag.length - 1] === lastWin) { var t = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = t; }
      }
      lastWin = bag.pop();
      return lastWin;
    }
    function other(list, was) { var o = list.filter(function (x) { return x !== was; }); return o[Math.floor(Math.random() * o.length)]; }
    function look() {
      var l = { path: other(PATHS, prev.path), entry: other(ENTRIES, prev.entry), exit: other(EXITS, prev.exit), glow: other(GLOWS, prev.glow), into: other(INTOS, prev.into), react: other(REACTS, prev.react) };
      prev = l;
      return l;
    }

    /* ── the lock: timers and animations belong to one generation ── */
    function later(fn, ms) {
      var g = gen, id = setTimeout(function () { var i = timers.indexOf(id); if (i > -1) timers.splice(i, 1); if (g === gen) fn(); }, ms);
      timers.push(id);
    }
    function after(list, fn) {
      var g = gen;
      Promise.all(list.map(function (a) { return a.finished; })).then(function () { if (g === gen) fn(); }, function () { /* cancelled */ });
    }
    function A(node, kf, opt) { var a = node.animate(kf, opt); if (cur) cur.anims.push(a); return a; }
    function halt() {
      gen++; busy = false;
      timers.forEach(clearTimeout); timers = [];
      if (cur) cur.anims.forEach(function (a) { try { a.cancel(); } catch (err) { /* gone */ } });
      cur = null; react = null; rings = []; sparks = [];
      if (layer) while (layer.firstChild) layer.removeChild(layer.firstChild);
    }

    /* ── paths ── */
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function bez(p, u) { var v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y }; }
    var ANGLES = [-2.3, -1.45, -0.6, 0.75, 2.45, 3.05, -2.75, 1.9];
    function pickStart(tw) {
      var R = wide ? Math.min(320, w * 0.22) : Math.min(230, w * 0.55);
      var xmin = wide ? w * 0.56 : 12, xmax = Math.max(xmin, w - tw - 24), ymin = wide ? 64 : h * 0.3, ymax = wide ? Math.max(ymin + 40, Math.min(h - 340, shop.y + R * 0.7)) : h * 0.72;
      for (var k = 0; k < ANGLES.length; k++) {
        var a = ANGLES[(ai + k) % ANGLES.length];
        var x = Math.max(xmin, Math.min(xmax, shop.x + Math.cos(a) * R)), y = Math.max(ymin, Math.min(ymax, shop.y + Math.sin(a) * R * (wide ? 0.85 : 0.5)));
        if (Math.hypot(x - shop.x, y - shop.y) > R * 0.55) { ai = (ai + k + 3) % ANGLES.length; return { x: x, y: y }; }
      }
      ai++;
      return { x: xmin, y: ymin + Math.random() * (ymax - ymin) };
    }
    function pathFrom(s, kind, tw) {
      var e = { x: shop.x, y: shop.y }, dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1, side = Math.random() < 0.5 ? -1 : 1;
      var nx = -dy / d * side, ny = dx / d * side, p1, p2;
      function at(fx, fy, k) { return { x: s.x + dx * fx + nx * d * k, y: s.y + dy * fy + ny * d * k }; }
      if (kind === "street") {
        var c = Math.random() < 0.5 ? { x: s.x, y: e.y } : { x: e.x, y: s.y };
        p1 = { x: s.x + (c.x - s.x) * 0.92, y: s.y + (c.y - s.y) * 0.92 }; p2 = { x: c.x + (e.x - c.x) * 0.08, y: c.y + (e.y - c.y) * 0.08 };
      } else if (kind === "swoop") { p1 = at(0.1, 0.1, 0.62); p2 = at(0.7, 0.7, 0.22); }
      else if (kind === "scurve") { p1 = at(0.33, 0.33, 0.42); p2 = at(0.66, 0.66, -0.42); }
      else if (kind === "orbit") { p1 = { x: e.x + dx * 0.45 + nx * d * 0.35, y: e.y + dy * 0.45 + ny * d * 0.35 }; p2 = { x: e.x + nx * d * 0.5, y: e.y + ny * d * 0.5 }; }
      else { p1 = at(0.2, 0.2, 0.32); p2 = Math.abs(dx) > Math.abs(dy) ? { x: e.x - Math.sign(dx) * d * 0.38, y: e.y } : { x: e.x, y: e.y - Math.sign(dy) * d * 0.38 }; }
      function keep(p) { return { x: Math.max(8, Math.min(w - tw * 0.8 - 12, p.x)), y: Math.max(14, Math.min(h - 14, p.y)) }; }
      return [s, keep(p1), keep(p2), e];
    }
    function el(tag, cls, text) { var n = doc.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; }

    /* ── the square that opens: fit the phrase inside its padding, 1 to 3 lines ── */
    function capBox() {
      var b = el("div", "cap"), t = el("p", "cap-text");
      b.style.left = (shop.x - box.w / 2) + "px"; b.style.top = (shop.y - box.h / 2) + "px";
      b.style.width = box.w + "px"; b.style.height = box.h + "px"; b.style.padding = box.pad + "px";
      b.appendChild(t);
      return { box: b, text: t, parts: [] };
    }
    function capText(cap, text, letters) {
      var t = cap.text; t.textContent = ""; cap.parts = [];
      text.split(" ").forEach(function (word, i) {
        if (i) t.appendChild(doc.createTextNode(" "));
        var wd = el("span", "cw");
        if (letters) word.split("").forEach(function (ch) { var c = el("span", "cl", ch); wd.appendChild(c); cap.parts.push(c); });
        else { wd.textContent = word; cap.parts.push(wd); }
        t.appendChild(wd);
      });
      fit(t);
    }
    function fit(t) {
      var iw = box.w - box.pad * 2 - 2, ih = box.h - box.pad * 2 - 2, hi = wide ? 21 : 17, lo = 8;
      t.style.width = iw + "px";
      for (var s = hi; s >= lo; s -= 0.5) {
        t.style.fontSize = s + "px";
        var th = t.getBoundingClientRect().height, lines = Math.round(th / (s * 1.15));
        if (t.scrollWidth <= iw && th <= ih - 1 && lines <= 3) return s;
      }
      return lo;
    }

    /* test hook: fit every win into the square at the current size and report any that spill */
    if (layer) layer.pwpFitAll = function () {
      var probe = capBox(), out = [], inset = box.pad + 1;
      probe.box.style.visibility = "hidden"; probe.box.style.opacity = "1"; layer.appendChild(probe.box);
      WINS.forEach(function (t) {
        [false, true].forEach(function (letters) {
          capText(probe, t, letters);
          var r = probe.box.getBoundingClientRect(), rg = doc.createRange(); rg.selectNodeContents(probe.text);
          var q = rg.getBoundingClientRect(), lines = Math.round(probe.text.offsetHeight / (parseFloat(probe.text.style.fontSize) * 1.15));
          out.push({ t: t, letters: letters, fs: probe.text.style.fontSize, lines: lines, ok: q.left >= r.left + inset - 0.5 && q.right <= r.right - inset + 0.5 && q.top >= r.top + inset - 0.5 && q.bottom <= r.bottom - inset + 0.5 && lines <= 3 });
        });
      });
      layer.removeChild(probe.box);
      return out;
    };

    /* ── one cycle: fly, land, open, hold, close, then and only then the next ── */
    function cycle() {
      if (!canAnimate || !running || busy || still() || !layer) return;
      busy = true;
      var text = nextWin(), L = look();
      var node = el("div", "win-cycle");
      node.setAttribute("data-phrase", text); node.setAttribute("data-state", "fly");
      node.style.setProperty("--glow", "var(" + L.glow[1] + ")");
      var fly = el("div", "win"), dot = el("span", "win-dot"), ghost = el("span", "win-ghost", text), line = el("span", "win-text");
      var letters = [], wi = 0;
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i), c = el("span", "", ch);
        if (ch === " ") wi++;
        c.wi = wi; letters.push(c); line.appendChild(c);
      }
      fly.appendChild(ghost); fly.appendChild(line); fly.appendChild(dot);
      fly.style.opacity = "0";
      node.appendChild(fly);
      var cap = capBox(); node.appendChild(cap.box);
      layer.appendChild(node);
      capText(cap, text, L.into === "letters");
      cur = { node: node, anims: [], look: L, path: null, dur: 0, flyA: null };
      var tw = line.offsetWidth + 16;
      var xs = letters.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
      var path = pathFrom(pickStart(tw), L.path, tw), dur = Math.round((wide ? 3100 : 2800) + Math.random() * 600), K = 40, frames = [];
      for (var k = 0; k <= K; k++) {
        var u = ease(k / K), p = bez(path, u), s = 1 - 0.3 * Math.max(0, (u - 0.62) / 0.38);
        frames.push({ transform: "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")" });
      }
      fly.style.opacity = "";
      cur.path = path; cur.dur = dur;
      cur.flyA = A(fly, frames, { duration: dur, easing: "linear", fill: "both" });
      A(ghost, [{ opacity: 0, transform: "translateY(-50%) scale(1.06)" }, { opacity: 0.85, transform: "translateY(-50%) scale(1.02)", offset: 0.3 }, { opacity: 0, transform: "translateY(-50%) scale(1)" }], { duration: 1100, easing: inE, fill: "both" });
      var n = letters.length, words = wi + 1;
      letters.forEach(function (c, i) {
        var e = L.entry, kf, d, dl;
        if (e === "rise-words") { kf = [{ opacity: 0, transform: "translate3d(0,0.7em,0)" }, { opacity: 1, transform: "none" }]; d = 560; dl = 80 + c.wi * 110; }
        else if (e === "drop-letters") { kf = [{ opacity: 0, transform: "translate3d(0,-0.7em,0) scale(0.9)" }, { opacity: 1, transform: "none" }]; d = 560; dl = 80 + (n - 1 - i) * 20; }
        else if (e === "sweep") { kf = [{ opacity: 0, transform: "translate3d(-0.5em,0,0)" }, { opacity: 1, transform: "none" }]; d = 380; dl = 60 + i * 14; }
        else if (e === "type") { kf = [{ opacity: 0 }, { opacity: 1 }]; d = 80; dl = 120 + i * 36; }
        else { kf = [{ opacity: 0, transform: "translate3d(0,0.6em,0) scale(0.92)" }, { opacity: 1, transform: "none" }]; d = 620; dl = 80 + i * 24; }
        A(c, kf, { duration: d, delay: dl, easing: e === "type" ? "steps(1,end)" : inE, fill: "backwards" });
      });
      var fold = dur - 380, step = Math.min(16, 300 / n), outs = [];
      letters.forEach(function (c, i) {
        var x = "translate3d(" + (-(xs[i] + 12)).toFixed(1) + "px,0,0) scale(0.15)", dl, d = 420;
        if (L.exit === "fold-back") dl = fold + (n - 1 - i) * step;
        else if (L.exit === "fold-words") dl = fold + c.wi * Math.min(90, 320 / words);
        else if (L.exit === "squeeze") { dl = fold + 60 + i * 3; d = 360; }
        else dl = fold + i * step;
        outs.push(A(c, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: x }], { duration: d, delay: dl, easing: outE, fill: "forwards" }));
      });
      outs.push(A(dot, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(2.4)" }], { duration: 260, delay: dur - 40, easing: outE, fill: "forwards" }));
      after([cur.flyA], function () {
        node.setAttribute("data-state", "land");
        landFx(L);
        var sx = (26 / box.w).toFixed(3), sy = (26 / box.h).toFixed(3);
        cap.text.style.opacity = "0";
        var open = A(cap.box, [{ opacity: 0, transform: "scale(" + sx + "," + sy + ")" }, { opacity: 1, transform: "none" }], { duration: 300, easing: inE, fill: "both" });
        after(outs.concat([open]), function () {
          var ins = into(cap, L.into);
          after(ins, function () {
            node.setAttribute("data-state", "held");
            later(function () {
              node.setAttribute("data-state", "out");
              var fade = A(cap.text, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: outE, fill: "forwards" });
              after([fade], function () {
                var close = A(cap.box, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(" + sx + "," + sy + ")" }], { duration: 280, easing: outE, fill: "forwards" });
                after([close], function () {
                  if (node.parentNode) node.parentNode.removeChild(node);
                  cur = null; busy = false;
                  later(cycle, 500 + Math.random() * 500);
                });
              });
            }, 1500 + Math.random() * 500);
          });
        });
      });
    }
    function into(cap, kind) {
      var parts = cap.parts, list = [], m = parts.length;
      cap.text.style.opacity = "";
      parts.forEach(function (p, i) {
        var kf, d = 300, dl;
        if (kind === "drop") { kf = [{ opacity: 0, transform: "translate3d(0,-0.45em,0)" }, { opacity: 1, transform: "none" }]; dl = i * 70; }
        else if (kind === "zoom") { kf = [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "none" }]; dl = (m - 1 - i) * 60; }
        else if (kind === "letters") { kf = [{ opacity: 0, transform: "translate3d(0,0.35em,0)" }, { opacity: 1, transform: "none" }]; d = 240; dl = i * Math.min(22, 420 / m); }
        else { kf = [{ opacity: 0, transform: "translate3d(0,0.45em,0)" }, { opacity: 1, transform: "none" }]; dl = i * 80; }
        list.push(A(p, kf, { duration: d, delay: dl, easing: inE, fill: "backwards" }));
      });
      return list;
    }
    function landFx(L) {
      pulse = 0;
      var col = C[L.glow[0]] || C.accent, type = L.react, bw = box.w / 2, bh = box.h / 2;
      react = { type: type, t: 0, col: col };
      var n = type === "burst" ? 22 : type === "ring" ? 14 : 0;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, ex = Math.cos(a), ey = Math.sin(a), edge = { x: shop.x + ex * bw, y: shop.y + ey * bh };
        var far = { x: shop.x + ex * (bw + 30 + Math.random() * 50), y: shop.y + ey * (bh + 30 + Math.random() * 50) };
        sparks.push(type === "burst" ? { a: edge, b: far, t: -i * 0.01, d: 0.6 + Math.random() * 0.5, col: col } : { a: far, b: edge, t: -i * 0.018, d: 0.5 + Math.random() * 0.4, col: col });
      }
    }

    /* ── reduced motion: the open square, one win at a time, faded out then in ── */
    function staticWins() {
      halt();
      if (!layer) return;
      var g = gen, node = el("div", "win-cycle is-still"), cap = capBox();
      node.setAttribute("data-state", "held"); node.style.setProperty("--glow", "var(--color-accent)");
      node.appendChild(cap.box); layer.appendChild(node);
      cap.box.style.opacity = "1";
      function show() {
        if (g !== gen) return;
        var text = nextWin();
        node.setAttribute("data-phrase", text);
        capText(cap, text, false);
        if (cap.text.animate) cap.text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "both" });
        later(function () {
          if (!cap.text.animate) { show(); return; }
          cap.text.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }).finished.then(function () { if (g === gen) show(); }, function () { /* cancelled */ });
        }, 4200);
      }
      show();
    }

    function update(dt) {
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
      for (var i = 0; i < walkers.length; i++) {
        var k = walkers[i], t = k.way[k.step], dx = t.x - k.x, dy = t.y - k.y, d = Math.abs(dx) + Math.abs(dy), mv = k.v * dt * scrollK;
        k.trail.push(k.x, k.y); if (k.trail.length > 16) k.trail.splice(0, 2);
        if (d <= mv) { k.x = t.x; k.y = t.y; k.step++; if (k.step >= k.way.length) { if (k.lit && !cur) rings.push(0); walkers[i] = spawn(false); } }
        else { k.x += Math.sign(dx) * Math.min(Math.abs(dx), mv); k.y += Math.sign(dy) * Math.min(Math.abs(dy), mv); }
      }
      for (var j = rings.length - 1; j >= 0; j--) { rings[j] += dt; if (rings[j] > 1.4) rings.splice(j, 1); }
      for (var q = sparks.length - 1; q >= 0; q--) { sparks[q].t += dt; if (sparks[q].t > sparks[q].d) sparks.splice(q, 1); }
      if (react) { react.t += dt; if (react.t > 1.5) react = null; }
      pulse += dt;
      var target = 1;
      if (cur) {
        var st = cur.node.getAttribute("data-state"), ct = cur.flyA ? cur.flyA.currentTime : null;
        if (st !== "fly") target = 0;
        else if (ct != null) { var gp = bez(cur.path, ease(Math.min(1, ct / cur.dur))); target = Math.max(0, Math.min(1, (Math.hypot(gp.x - shop.x, gp.y - shop.y) - 24) / 110)); }
      }
      labelA += (target - labelA) * Math.min(1, dt * 8);
    }
    function drawReact() {
      var R = react, t = Math.min(1, R.t / 1.2), col = R.col, bw = box.w / 2, bh = box.h / 2, sp;
      ctx.lineWidth = 1.5;
      if (R.type === "ring" || R.type === "burst") {
        sp = 1 - Math.pow(1 - t, 3);
        ctx.strokeStyle = rgba(col, (1 - t) * 0.9); ctx.lineWidth = 2;
        ctx.strokeRect(shop.x - bw - 4 - sp * 44, shop.y - bh - 4 - sp * 44, (bw + 4 + sp * 44) * 2, (bh + 4 + sp * 44) * 2);
      } else if (R.type === "ripple") {
        for (var k = 0; k < 3; k++) {
          var tk = (R.t - k * 0.18) / 1.0; if (tk <= 0 || tk >= 1) continue;
          sp = 1 - Math.pow(1 - tk, 2);
          ctx.strokeStyle = rgba(col, (1 - tk) * 0.75);
          ctx.strokeRect(shop.x - bw - 4 - sp * 30, shop.y - bh - 4 - sp * 30, (bw + 4 + sp * 30) * 2, (bh + 4 + sp * 30) * 2);
        }
      } else if (R.type === "beam") {
        sp = 1 - Math.pow(1 - t, 3);
        var L = Math.max(w, h) * 0.6 * sp;
        ctx.strokeStyle = rgba(col, (1 - t) * 0.85);
        ctx.beginPath();
        ctx.moveTo(shop.x + bw, shop.y + 0.5); ctx.lineTo(shop.x + bw + L, shop.y + 0.5);
        ctx.moveTo(shop.x - bw, shop.y + 0.5); ctx.lineTo(shop.x - bw - L, shop.y + 0.5);
        ctx.moveTo(shop.x + 0.5, shop.y - bh); ctx.lineTo(shop.x + 0.5, shop.y - bh - L);
        ctx.moveTo(shop.x + 0.5, shop.y + bh); ctx.lineTo(shop.x + 0.5, shop.y + bh + L);
        ctx.stroke();
      } else if (R.type === "turn") {
        sp = 1 - Math.pow(1 - t, 3);
        var s = Math.max(bw, bh) + 8 + sp * 26;
        ctx.save(); ctx.translate(shop.x, shop.y); ctx.rotate(sp * Math.PI / 4);
        ctx.strokeStyle = rgba(col, (1 - t) * 0.8); ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (mapLayer) ctx.drawImage(mapLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pk = pulse < 0.7 ? Math.sin(Math.PI * Math.min(1, pulse / 0.32)) * (1 - pulse / 0.7) : 0;
      var lx = shop.x + pointer.x * 30, ly = shop.y + pointer.y * 30, gs = GR * (1 + 0.22 * pk);
      if (glowLayer) ctx.drawImage(glowLayer, lx - gs, ly - gs, gs * 2, gs * 2);
      for (var i = 0; i < walkers.length; i++) {
        var k = walkers[i], tr = k.trail;
        if (tr.length > 3) { ctx.strokeStyle = rgba(k.lit ? C.accent : C.dot, 0.3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tr[0], tr[1]); for (var p = 2; p < tr.length; p += 2) ctx.lineTo(tr[p], tr[p + 1]); ctx.lineTo(k.x, k.y); ctx.stroke(); }
        ctx.fillStyle = rgba(k.lit ? C.accent : C.dot, k.lit ? 0.9 : 0.8);
        ctx.fillRect(k.x - 2, k.y - 2, 4, 4);
      }
      /* the glow trail behind the travelling win, sampled from the same eased path the text rides */
      ctx.lineCap = "round";
      if (cur && cur.flyA && cur.flyA.currentTime != null) {
        var col = C[cur.look.glow[0]] || C.accent, tau = Math.min(1, cur.flyA.currentTime / cur.dur), t0 = Math.max(0, tau - 0.2), n = 14, prev0 = bez(cur.path, ease(t0));
        if (tau > 0.01 && tau < 1) for (var s = 1; s <= n; s++) {
          var pt = bez(cur.path, ease(t0 + (tau - t0) * s / n)), al = s / n;
          ctx.strokeStyle = rgba(col, 0.1 * al); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(prev0.x, prev0.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          ctx.strokeStyle = rgba(col, 0.75 * al); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(prev0.x, prev0.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          prev0 = pt;
        }
      }
      for (var j = 0; j < rings.length; j++) {
        var rt = rings[j] / 1.4;
        ctx.strokeStyle = rgba(C.accent, (1 - rt) * 0.6); ctx.lineWidth = 1.5;
        ctx.strokeRect(shop.x - 8 - rt * 34, shop.y - 8 - rt * 34, 16 + rt * 68, 16 + rt * 68);
      }
      if (react) drawReact();
      for (var q = 0; q < sparks.length; q++) {
        var sk = sparks[q]; if (sk.t < 0) continue;
        var m = Math.min(1, sk.t / sk.d), e = 1 - Math.pow(1 - m, 3), x = sk.a.x + (sk.b.x - sk.a.x) * e, y = sk.a.y + (sk.b.y - sk.a.y) * e;
        ctx.fillStyle = rgba(sk.col, 0.95 * (1 - m * m)); ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      var sq = 7 + 4 * pk, fr = 12.5 + 6 * pk;
      ctx.fillStyle = rgba(C.accent, 1); ctx.fillRect(shop.x - sq, shop.y - sq, sq * 2, sq * 2);
      ctx.strokeStyle = rgba(C.accent, 0.9); ctx.lineWidth = 1; ctx.strokeRect(shop.x - fr, shop.y - fr, fr * 2, fr * 2);
      if (labelA > 0.02) { ctx.font = font; ctx.fillStyle = rgba(C.dot, labelA); ctx.fillText("your business", shop.x + 18, shop.y + 4); }
    }
    function frame(now) {
      if (!running) return;
      if (!cur && !react && !sparks.length && pulse > 0.7 && now - last < 32) { requestAnimationFrame(frame); return; }
      var dt = Math.min(0.06, (now - last) / 1000 || 0.016); last = now;
      update(dt); draw();
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || still() || !visible || doc.hidden) return;
      running = true; last = performance.now(); requestAnimationFrame(frame);
      cycle();
    }
    function stop() { running = false; halt(); }
    function staticFrame() { for (var s = 0; s < 40; s++) update(0.05); rings = []; sparks = []; react = null; pulse = 9; labelA = still() ? 0 : 1; draw(); }

    size();
    staticFrame();
    if (still()) staticWins();
    else {
      /* phrases are fitted to the square with the real font, so wait for it (or the load event) first */
      var go = function () { setTimeout(start, 300); };
      if (doc.readyState === "complete") go(); else window.addEventListener("load", go);
    }
    var rt = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var r = canvas.getBoundingClientRect();
        if (Math.round(r.width) === w && Math.round(r.height) === h) return;
        var keep = running;
        stop(); size();
        if (still()) { staticFrame(); staticWins(); return; }
        staticFrame();
        if (keep || visible) start();
      }, 150);
    });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (still()) return; if (visible) start(); else stop(); }).observe(canvas);
    doc.addEventListener("visibilitychange", function () { if (still()) return; if (doc.hidden) stop(); else start(); });
    function onMotionPref() { stop(); staticFrame(); if (still()) staticWins(); else start(); }
    if (mq.addEventListener) mq.addEventListener("change", onMotionPref); else if (mq.addListener) mq.addListener(onMotionPref);
    var hero = canvas.closest(".hero");
    if (hero && window.matchMedia("(hover: hover)").matches) hero.addEventListener("pointermove", function (ev) {
      var r = hero.getBoundingClientRect();
      pointer.tx = ((ev.clientX - r.left) / r.width - 0.5) * 2; pointer.ty = ((ev.clientY - r.top) / r.height - 0.5) * 2;
    });
    window.addEventListener("scroll", function () { scrollK = Math.max(0.35, 1 - window.scrollY / 900); }, { passive: true });
  })();

  /* ── hero counters: count once on load, part of the same opening moment ── */
  $$("[data-count]").forEach(function (el) {
    var to = parseInt(el.getAttribute("data-count"), 10);
    if (still() || to < 3) return;
    var t0 = performance.now(), dur = 700;
    el.textContent = "0";
    (function tick(now) { var p = Math.min(1, (now - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); })(t0);
  });

  /* ── samples: fictional businesses in real towns, different on every load and every cycle ──
     The names are invented; the towns span every region and size. The first pick comes from the
     clock (two loads a quarter-second apart already differ), the rest follow a shuffled order, so the
     same example never shows twice in a row and the lab tools never share one. Nothing is stored. */
  var SAMPLE = (function () {
    var TOWNS = [["Bozeman", "MT"], ["Asheville", "NC"], ["Duluth", "MN"], ["Tulsa", "OK"], ["Burlington", "VT"], ["Boise", "ID"], ["Savannah", "GA"],
      ["Flagstaff", "AZ"], ["Eau Claire", "WI"], ["Lancaster", "PA"], ["Chattanooga", "TN"], ["Bend", "OR"], ["Lafayette", "LA"], ["Provo", "UT"],
      ["Missoula", "MT"], ["Portland", "ME"], ["Fort Collins", "CO"], ["Sioux Falls", "SD"], ["Ithaca", "NY"], ["Wilmington", "NC"], ["Spokane", "WA"],
      ["Lexington", "KY"], ["Ann Arbor", "MI"], ["Santa Fe", "NM"], ["Fargo", "ND"], ["Charleston", "SC"], ["Des Moines", "IA"], ["Galveston", "TX"],
      ["Marquette", "MI"], ["Taos", "NM"], ["Bangor", "ME"], ["Cedar Rapids", "IA"], ["Pensacola", "FL"], ["Rapid City", "SD"], ["Albany", "NY"],
      ["Kalamazoo", "MI"], ["Juneau", "AK"], ["Hilo", "HI"], ["Paducah", "KY"], ["Durango", "CO"], ["Omaha", "NE"], ["Little Rock", "AR"]];
    var BIZ = [["Copper Kettle Plumbing", "Plumber", "plumber"], ["Tidewater Pipe Works", "Plumber", "plumber"], ["The Velvet Chair", "HairSalon", "hair salon"],
      ["Fern & Fringe Studio", "HairSalon", "hair salon"], ["Juniper Street Dental", "Dentist", "dental clinic"], ["Lakeshore Family Dentistry", "Dentist", "dental clinic"],
      ["Ironleaf Strength Club", "ExerciseGym", "gym"], ["North Fork Fitness", "ExerciseGym", "gym"], ["Two Rivers Auto Care", "AutoRepair", "auto repair shop"],
      ["Gearhouse Garage", "AutoRepair", "auto repair shop"], ["The Painted Fig", "Restaurant", "restaurant"], ["Marigold Noodle Bar", "Restaurant", "restaurant"],
      ["Wren & Ember Coffee", "CafeOrCoffeeShop", "café"], ["Little Owl Café", "CafeOrCoffeeShop", "café"], ["Paper Moon Books", "BookStore", "bookshop"],
      ["Thistle & Thread", "Store", "fabric shop"], ["Greenhouse Plant Co.", "GardenStore", "plant shop"], ["Brick & Bloom Florist", "Florist", "florist"],
      ["Sparrow Lane Bakery", "Bakery", "bakery"], ["Northstar Pet Grooming", "LocalBusiness", "pet groomer"], ["Cobalt Needle Tattoo", "TattooParlor", "tattoo studio"],
      ["Clearwater Physical Therapy", "Physiotherapy", "physical therapy clinic"], ["Maple Row Barbers", "HairSalon", "barbershop"], ["Silver Pine Massage", "DaySpa", "massage studio"],
      ["Harbor Key Locksmith", "Locksmith", "locksmith"], ["Riverbend Pilates", "ExerciseGym", "pilates studio"], ["Quarry Hill Climbing", "ExerciseGym", "climbing gym"],
      ["Bright Wire Electric", "Electrician", "electrician"], ["Summit Ridge Roofing", "RoofingContractor", "roofer"], ["Cedar Hollow Animal Clinic", "VeterinaryCare", "vet clinic"],
      ["Spoke & Sprocket Bikes", "BikeStore", "bike shop"], ["Polished Nail Lounge", "NailSalon", "nail salon"], ["Clear Sight Eyecare", "Optician", "optician"],
      ["Fresh Press Cleaners", "DryCleaningOrLaundry", "dry cleaner"], ["Stone Arch Hardware", "HardwareStore", "hardware store"], ["Two Scoops Creamery", "IceCreamShop", "ice cream shop"],
      ["Tall Grass Landscaping", "LocalBusiness", "landscaper"], ["Blue Note Music Lessons", "LocalBusiness", "music school"], ["Hearth & Hops Taproom", "BarOrPub", "taproom"],
      ["Evenkeel Bookkeeping", "AccountingService", "bookkeeper"]];
    var base = Math.floor(Date.now() / 250);
    function order(len, first) {
      var rest = [];
      for (var i = 0; i < len; i++) if (i !== first) rest.push(i);
      for (var j = rest.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), t = rest[j]; rest[j] = rest[k]; rest[k] = t; }
      return [first].concat(rest);
    }
    var bo = order(BIZ.length, base % BIZ.length), tor = order(TOWNS.length, (base * 7 + 3) % TOWNS.length), n = 0;
    return {
      next: function () {
        var b = BIZ[bo[n % bo.length]], t = TOWNS[tor[n % tor.length]]; n++;
        return { name: b[0], type: b[1], kind: b[2], town: t[0], st: t[1] };
      },
      pick: function (list) { return list[(base + Math.floor(Math.random() * list.length)) % list.length]; }
    };
  })();
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function ensureOption(select, value, label) {
    if (!select) return;
    var has = Array.prototype.some.call(select.options, function (o) { return o.value === value; });
    if (!has) { var o = doc.createElement("option"); o.value = value; o.textContent = label; select.appendChild(o); }
    select.value = value;
  }
  (function seedLab() {
    var s1 = SAMPLE.next(), sf0 = $("[data-schema]");
    if (sf0) {
      var hours = SAMPLE.pick([["08:00", "17:00"], ["09:00", "18:00"], ["07:30", "16:00"], ["10:00", "20:00"], ["06:00", "14:00"], ["11:00", "21:00"]]);
      var setv = function (n, v) { var f = sf0.elements.namedItem(n); if (f) f.value = v; };
      setv("name", s1.name); setv("town", s1.town); setv("region", s1.st); setv("opens", hours[0]); setv("closes", hours[1]);
      setv("days", SAMPLE.pick(["wk", "ws", "all"]));
      ensureOption(sf0.elements.namedItem("type"), s1.type, s1.type === "LocalBusiness" ? "Other local business" : cap1(s1.kind));
    }
    var s2 = SAMPLE.next(), aeo0 = $("[data-aeo]");
    if (aeo0) {
      aeo0.elements.namedItem("town").value = s2.town + ", " + s2.st;
      ensureOption(aeo0.elements.namedItem("type"), s2.kind, s2.kind);
    }
    var nm = $(".ba-after .m-name"), meta = $(".ba-after .m-meta");
    if (nm) nm.textContent = SAMPLE.pick(["The Velvet Chair", "Maple Row Barbers", "Saltgrass Salon", "Golden Hour Hair", "Copperline Cuts", "Juniper Hair House", "Willow & Wave Salon", "Fern & Fringe Studio", "Bluebird Hair Co."]);
    if (meta) meta.textContent = SAMPLE.pick(["Open today 9:00 to 18:00 · walk-ins until 17:00", "Open today 10:00 to 19:00 · walk-ins until 18:00", "Open today 8:30 to 17:30 · walk-ins until 16:30", "Open today 9:30 to 20:00 · walk-ins until 19:00"]);
  })();

  /* Price text that rolls when it changes. */
  function roll(el, text) {
    if (!el || el.textContent === text) return;
    if (still()) { el.textContent = text; return; }
    el.classList.add("is-out");
    setTimeout(function () { el.textContent = text; el.classList.remove("is-out"); el.classList.add("is-pre"); void el.offsetWidth; el.classList.remove("is-pre"); }, 120);
  }

  /* ── 01 configurator ── */
  var matrix = $("[data-matrix]");
  if (matrix) (function () {
    var PLANS = {
      1: { name: "Essentials", m: "$1,200", f3: "$6,100", setup: "$2,500", hours: "3", why: "For a business that wants its site, customer list and Google presence run properly." },
      2: { name: "Growth", m: "$2,400", f3: "$12,400", setup: "$5,200", hours: "6.5", why: "For a business ready to win repeat visits and be found." },
      3: { name: "Signature", m: "$3,600", f3: "$17,300", setup: "$6,500", hours: "12", why: "For a business that wants every channel, paid ads and outreach." }
    };
    var chips = $$("[data-chips] .chip"), segs = $$(".seg[data-view]"), reset = $("[data-reset]"), out = $("[data-pick-out]");
    var view = "monthly";
    function render() {
      var need = 0, count = 0, wants = {};
      chips.forEach(function (c) { if (c.getAttribute("aria-pressed") === "true") { count++; need = Math.max(need, +c.getAttribute("data-tier")); wants[c.getAttribute("data-need")] = 1; } });
      $$("tbody tr", matrix).forEach(function (tr) { tr.classList.toggle("is-want", !!wants[tr.getAttribute("data-need")]); });
      if (need) matrix.setAttribute("data-fit", String(need)); else matrix.removeAttribute("data-fit");
      var p = PLANS[need || 2];
      $("[data-pick-state]").textContent = need ? "Fits what you picked" : "Recommended";
      $("[data-pick-name]").textContent = p.name;
      roll($("[data-pick-price]"), view === "monthly" ? p.m : p.f3);
      $("[data-pick-per]").textContent = view === "monthly" ? "a month" : "for the first 3 months, setup included";
      $("[data-pick-meta]").textContent = view === "monthly" ? "Setup " + p.setup + " · about " + p.hours + " director hours a month" : p.m + " a month after setup " + p.setup + " · 3-month minimum";
      $("[data-pick-why]").textContent = p.why;
      var cta = $("[data-pick-cta]");
      cta.textContent = "Ask about " + p.name;
      cta.setAttribute("data-track", "home_plan_pick_" + p.name.toLowerCase());
      reset.hidden = !count;
      out.textContent = need ? p.name + " covers " + (count === 1 ? "that" : count === 2 ? "both" : "all " + count) + ", from " + p.m + " a month." : "";
    }
    chips.forEach(function (c) { c.addEventListener("click", function () { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); render(); }); });
    reset.addEventListener("click", function () { chips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); }); render(); if (chips[0]) chips[0].focus(); });
    segs.forEach(function (s) {
      s.addEventListener("click", function () {
        view = s.getAttribute("data-view");
        segs.forEach(function (o) { o.setAttribute("aria-pressed", o === s ? "true" : "false"); });
        $$("[data-monthly]", matrix).forEach(function (el) { var t = el.getAttribute(view === "monthly" ? "data-monthly" : "data-first3"); if (el.classList.contains("roll")) roll(el, t); else el.textContent = t; });
        render();
      });
    });
    /* Tilt: the summary card leans toward the pointer, a few degrees at most. */
    var pick = $("[data-tilt]");
    if (pick && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      pick.addEventListener("pointermove", function (ev) {
        if (still()) return;
        var r = pick.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        pick.style.setProperty("--ry", (x * 6).toFixed(2) + "deg"); pick.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
      });
      pick.addEventListener("pointerleave", function () { pick.style.setProperty("--ry", "0deg"); pick.style.setProperty("--rx", "0deg"); });
    }
  })();

  /* ── bench: instruments light when they come into view ── */
  var insts = $$("[data-inst]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-live"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -15% 0px" });
    insts.forEach(function (i) { io.observe(i); });
  } else insts.forEach(function (i) { i.classList.add("is-live"); });

  /* ── lab 05: Google profile completeness. Weighted ticks; the unticked items become a fix list. ── */
  var gbp = $("[data-gbp]");
  if (gbp) (function () {
    var boxes = $$("input[type=checkbox]", gbp), fill = $("[data-gbp-fill]"), status = $("[data-gbp-status]");
    var next = $("[data-gbp-next]"), todo = $("[data-gbp-todo]"), copyB = $("[data-gbp-copy]"), resetB = $("[data-gbp-reset]");
    var total = boxes.reduce(function (s, b) { return s + (+b.getAttribute("data-w")); }, 0);
    var exB = $("[data-gbp-example]"), example = null;
    function label(b) { return gbp.querySelector('label[for="' + b.id + '"]').textContent; }
    function missing() { return boxes.filter(function (b) { return !b.checked; }).sort(function (x, y) { return y.getAttribute("data-w") - x.getAttribute("data-w"); }); }
    function say(text) { status.textContent = text; }
    function render(msg) {
      var got = boxes.reduce(function (s, b) { return s + (b.checked ? +b.getAttribute("data-w") : 0); }, 0), score = Math.round(got / total * 100), miss = missing();
      fill.style.transform = "scaleX(" + (score / 100) + ")";
      var verdict = score === 100 ? "Complete. Keep it that way: a post a week and a reply to every review." : score >= 75 ? "Close. The list below is what is left." : score >= 40 ? "Half there. Start at the top of the list below." : got ? "Most of the profile is still open. The top items below matter most." : "Tick what your profile already has.";
      if (!msg && example) msg = "Example: " + example + " scores " + score + " of 100. Start over to check your own profile.";
      say(msg || ("Score " + score + " of 100. " + verdict));
      todo.textContent = "";
      miss.slice(0, 5).forEach(function (b) { var li = doc.createElement("li"); li.textContent = label(b); todo.appendChild(li); });
      next.hidden = !miss.length || !got;
    }
    function loadExample() {
      var x = SAMPLE.next(), keep = 0.35 + Math.random() * 0.45;
      example = x.name + " in " + x.town + ", " + x.st;
      boxes.forEach(function (b) { b.checked = Math.random() < keep; });
      render();
    }
    boxes.forEach(function (b) { b.addEventListener("change", function () { example = null; render(); }); });
    if (exB) exB.addEventListener("click", loadExample);
    copyB.addEventListener("click", function () {
      var miss = missing();
      var text = miss.length ? "Google profile fix list:\n" + miss.map(function (b, i) { return (i + 1) + ". " + label(b); }).join("\n") : "Google profile: every item on the checklist is done.";
      copyText(text).then(function () { render("Copied the fix list (" + miss.length + " items) to your clipboard."); }, function () { render("Your browser blocked copying. The top of the list is shown below."); next.hidden = false; });
    });
    resetB.addEventListener("click", function () { example = null; boxes.forEach(function (b) { b.checked = false; }); render(); if (boxes[0]) boxes[0].focus(); });
    loadExample();
  })();

  /* ── 02 redesign slider ── */
  var ba = $("[data-ba]");
  if (ba) (function () {
    var frame = $(".ba-frame", ba), range = $(".ba-range", ba);
    function set(v) {
      v = Math.max(0, Math.min(100, v));
      frame.style.setProperty("--pos", v + "%");
      range.value = String(Math.round(v));
      range.setAttribute("aria-valuetext", Math.round(v) + "% before, " + (100 - Math.round(v)) + "% after");
    }
    range.addEventListener("input", function () { set(+range.value); });
    var drag = false;
    function at(ev) { var r = frame.getBoundingClientRect(); set(((ev.clientX - r.left) / r.width) * 100); }
    frame.addEventListener("pointerdown", function (ev) { drag = true; frame.setPointerCapture(ev.pointerId); at(ev); });
    frame.addEventListener("pointermove", function (ev) { if (drag) at(ev); });
    frame.addEventListener("pointerup", function () { if (drag) { drag = false; track("home_demo_slider_drag", { v: range.value }); } });
    frame.addEventListener("pointercancel", function () { drag = false; });
    set(50);
  })();

  /* ── lab 02: AI-visibility self-check. Real: the links open each assistant with the question filled in. ── */
  var aeo = $("[data-aeo]");
  if (aeo) (function () {
    var list = $("[data-aeo-list]"), status = $("[data-aeo-status]"), marks = {};
    var EXTRA = { "dental clinic": ["dentist taking new patients", "emergency dentist open Saturday"], "hair salon": ["hair salon that takes walk-ins", "where to get a haircut today"], "plumber": ["plumber for an emergency leak", "plumber with upfront prices"], "gym": ["gym with a free first class", "gym open early before work"], "auto repair shop": ["same-day car repair", "honest mechanic for a check engine light"], "restaurant": ["restaurant open late", "restaurant for a group dinner"], "café": ["quiet café to work from", "café with outdoor seating"], "shop": ["where to buy a local gift", "shop with same-day pickup"] };
    var ENGINES = [["ChatGPT", "https://chatgpt.com/?q="], ["Perplexity", "https://www.perplexity.ai/search?q="], ["Google", "https://www.google.com/search?q="]];
    var LABELS = [["yes", "named"], ["part", "wrong details"], ["no", "not named"]];
    function clean(v) { return v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40); }
    function tally() {
      var y = 0, pt = 0, n = 0;
      Object.keys(marks).forEach(function (k) { n++; if (marks[k] === "yes") y++; else if (marks[k] === "part") pt++; });
      status.textContent = n ? "Marked " + n + " of 5. Named in " + y + ", with wrong details in " + pt + ", missing from " + (n - y - pt) + "." : "Open a question in an assistant, then mark what it said.";
    }
    function build(announce) {
      var type = aeo.elements.namedItem("type").value, town = clean(aeo.elements.namedItem("town").value) || "my town";
      var ex = EXTRA[type] || ["best-reviewed " + type, type + " that books online"];
      var qs = ["best " + type + " in " + town, type + " open now in " + town, ex[0] + " in " + town, ex[1] + " in " + town, type + " near " + town + " with good reviews"];
      list.textContent = ""; marks = {};
      qs.forEach(function (q, i) {
        var li = doc.createElement("li"), qp = doc.createElement("p"), links = doc.createElement("p"), grp = doc.createElement("div");
        qp.className = "aq-q"; qp.textContent = "“" + q + "”";
        links.className = "aq-links";
        ENGINES.forEach(function (e) {
          var a = doc.createElement("a");
          a.href = e[1] + encodeURIComponent(q); a.target = "_blank"; a.rel = "noopener";
          a.textContent = e[0]; a.setAttribute("data-track", "home_lab_aeo_open_" + e[0].toLowerCase());
          var sr = doc.createElement("span"); sr.className = "sr"; sr.textContent = ", question " + (i + 1) + ", opens in a new tab"; a.appendChild(sr);
          links.appendChild(a);
        });
        var cp = doc.createElement("button");
        cp.type = "button"; cp.className = "aq-copy"; cp.textContent = "Copy for Gemini"; cp.setAttribute("data-track", "home_lab_aeo_copy");
        cp.setAttribute("aria-label", "Copy for Gemini: question " + (i + 1));
        cp.addEventListener("click", function () { copyText(q).then(function () { cp.textContent = "Copied"; setTimeout(function () { cp.textContent = "Copy for Gemini"; }, 1600); }, function () { cp.textContent = "Copy blocked"; }); });
        links.appendChild(cp);
        grp.className = "aq-marks"; grp.setAttribute("role", "group"); grp.setAttribute("aria-label", "What the assistants said for question " + (i + 1));
        LABELS.forEach(function (l) {
          var b = doc.createElement("button");
          b.type = "button"; b.className = "aq-mark aq-" + l[0]; b.setAttribute("aria-pressed", "false"); b.textContent = l[1];
          b.setAttribute("data-track", "home_lab_aeo_mark_" + l[0]);
          b.addEventListener("click", function () {
            var on = b.getAttribute("aria-pressed") !== "true";
            $$(".aq-mark", grp).forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
            if (on) { b.setAttribute("aria-pressed", "true"); marks[i] = l[0]; } else delete marks[i];
            tally();
          });
          grp.appendChild(b);
        });
        li.appendChild(qp); li.appendChild(links); li.appendChild(grp); list.appendChild(li);
      });
      if (announce) status.textContent = "Five questions written for " + town + ". Open each in an assistant, then mark what it said.";
    }
    aeo.addEventListener("submit", function (ev) { ev.preventDefault(); build(true); });
    build(false);
  })();

  /* ── lab 01: schema snippet. Real: valid JSON-LD from the fields, copied with one tap. ── */
  var sf = $("[data-schema]");
  if (sf) (function () {
    var out = $("[data-schema-out]"), status = $("[data-schema-status]"), copyB = $("[data-schema-copy]"), text = "";
    var DAYS = { wk: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], ws: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], all: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] };
    function v(n) { return (sf.elements.namedItem(n).value || "").replace(/\s+/g, " ").trim(); }
    function render() {
      var o = { "@context": "https://schema.org", "@type": v("type") || "LocalBusiness", "name": v("name") || "Your business" };
      var url = v("url"); if (url) o.url = /^https?:\/\//i.test(url) ? url : "https://" + url;
      var addr = { "@type": "PostalAddress" };
      if (v("street")) addr.streetAddress = v("street");
      if (v("town")) addr.addressLocality = v("town");
      if (v("region")) addr.addressRegion = v("region");
      if (v("zip")) addr.postalCode = v("zip");
      addr.addressCountry = "US";
      o.address = addr;
      if (v("phone")) o.telephone = v("phone");
      var opens = v("opens"), closes = v("closes");
      if (opens && closes) o.openingHoursSpecification = [{ "@type": "OpeningHoursSpecification", "dayOfWeek": DAYS[v("days")] || DAYS.ws, "opens": opens, "closes": closes }];
      var json = JSON.stringify(o, null, 2).replace(/</g, "\\u003c");
      JSON.parse(json);
      text = '<script type="application/ld+json">\n' + json + "\n</" + "script>";
      out.textContent = text;
    }
    sf.addEventListener("input", function () { render(); status.textContent = "Valid JSON-LD, updated as you type. Paste it into your page’s head."; });
    sf.addEventListener("change", render);
    sf.addEventListener("submit", function (ev) { ev.preventDefault(); });
    copyB.addEventListener("click", function () {
      copyText(text).then(function () { status.textContent = "Copied. Paste it inside the head of your home page, then test it at validator.schema.org."; },
        function () { status.textContent = "Your browser blocked copying. Select the code above and copy it by hand."; });
    });
    render();
  })();

  /* ── 04 speed dial: real numbers from this browser ── */
  var dial = $("[data-needle]");
  if (dial) (function () {
    var lcp = null, cls = 0, fcp = null, types = (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) || [];
    try {
      if (types.indexOf("largest-contentful-paint") > -1) new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) lcp = e[e.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      if (types.indexOf("layout-shift") > -1) new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (!e.hadRecentInput) cls += e.value; }); }).observe({ type: "layout-shift", buffered: true });
      if (types.indexOf("paint") > -1) new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === "first-contentful-paint") fcp = e.startTime; }); }).observe({ type: "paint", buffered: true });
    } catch (err) { /* unsupported */ }
    function set(sel, text) { var el = $('[data-m="' + sel + '"]'); if (el) el.textContent = text; }
    function measure() {
      var paint = lcp != null ? lcp : fcp, label = lcp != null ? "" : " (first paint)";
      if (paint == null) { var nav0 = performance.getEntriesByType("navigation")[0]; paint = nav0 ? nav0.domContentLoadedEventEnd : 0; label = " (page ready)"; }
      var s = paint / 1000, f = Math.max(0, Math.min(1, s / 4));
      dial.style.transform = "rotate(" + ((f - 0.5) * 180).toFixed(1) + "deg)";
      $("[data-dial-num]").textContent = s.toFixed(1);
      set("lcp", s.toFixed(2) + " s" + label);
      set("cls", types.indexOf("layout-shift") > -1 ? cls.toFixed(3) : "not reported here");
      var origin = location.origin, kb = 0, js = 0, nav = performance.getEntriesByType("navigation")[0];
      if (nav) kb += nav.transferSize || nav.encodedBodySize || 0;
      performance.getEntriesByType("resource").forEach(function (r) {
        if (r.name.indexOf(origin) !== 0) return;
        kb += r.transferSize || r.encodedBodySize || 0;
        if (r.initiatorType === "script") js += r.decodedBodySize || r.encodedBodySize || 0;
      });
      set("kb", kb ? Math.round(kb / 1024) + " KB" : "cached");
      set("js", js ? Math.round(js / 1024) + " KB" : "cached");
    }
    var run = $("[data-dial-run]");
    if (run) run.addEventListener("click", measure);
    if (doc.readyState === "complete") setTimeout(measure, 600); else window.addEventListener("load", function () { setTimeout(measure, 600); });
  })();

  /* ── free-check form: plain HTML POST to MailerLite (no MailerLite script), enhanced with fetch ── */
  var lead = $("[data-lead]");
  if (lead) (function () {
    var status = $("[data-lead-status]"), btn = $(".lead-btn", lead), done = $("[data-lead-done]"), hp = $("#lf-hp", lead), THANKS = "/free-check/thanks/";
    var checks = [
      { el: $("#lf-name", lead), err: $("#lf-name-err", lead), ok: function (el) { return el.value.trim().length > 1; } },
      { el: $("#lf-city", lead), err: $("#lf-city-err", lead), ok: function (el) { return el.value.trim().length > 1; } },
      { el: $("#lf-email", lead), err: $("#lf-email-err", lead), ok: function (el) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()); } },
      { el: $("#lf-consent", lead), err: $("#lf-consent-err", lead), ok: function (el) { return el.checked; } }
    ];
    function validate() {
      var first = null;
      checks.forEach(function (c) { var good = c.ok(c.el); c.err.hidden = good; c.el.setAttribute("aria-invalid", good ? "false" : "true"); if (!good && !first) first = c.el; });
      return first;
    }
    checks.forEach(function (c) { c.el.addEventListener(c.el.type === "checkbox" ? "change" : "input", function () { if (c.el.getAttribute("aria-invalid") === "true" && c.ok(c.el)) { c.err.hidden = true; c.el.setAttribute("aria-invalid", "false"); } }); });
    function finished() {
      $$(".lf, .lead-btn, .lead-title", lead).forEach(function (el) { el.hidden = true; });
      status.textContent = "";
      done.hidden = false; done.focus();
    }
    lead.addEventListener("submit", function (ev) {
      ev.preventDefault();
      track("home_form_freecheck_submit");
      var bad = validate();
      if (bad) { status.textContent = "A field needs a fix before we can send this."; bad.focus(); return; }
      if (hp && hp.value) { finished(); return; }
      var action = lead.getAttribute("action") || "";
      if (action.indexOf("{{") > -1) {
        status.textContent = "Staged preview: this form is not connected to MailerLite yet, so nothing was sent. ";
        var a = doc.createElement("a"); a.href = THANKS; a.textContent = "See the thank-you page"; a.setAttribute("data-track", "home_form_freecheck_staged_thanks");
        status.appendChild(a);
        track("home_form_freecheck_staged");
        return;
      }
      btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending";
      status.textContent = "Sending your details to our mailing list.";
      fetch(action, { method: "POST", body: new FormData(lead), mode: "no-cors" })
        .then(function () { track("home_form_freecheck_sent"); finished(); })
        .catch(function () {
          btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = "Send me the free check";
          status.textContent = "That did not go through, likely a connection problem. Try again, or use the contact page.";
          track("home_form_freecheck_error");
        });
    });
  })();
  /* ── motion layer: supporting motion around the one hero signature ──
     Transform and opacity only (plus a clip-path wipe on headings), all off for reduced motion:
     section reveals with depth numerals (parallax by CSS scroll timelines where supported), a soft
     light that follows the pointer (a slow drift on touch screens), magnetic buttons, a spotlight
     that follows the pointer across plan and lab cards, numbers that count up when first seen, a
     page tint that shifts from section to section, film grain, and cross-page View Transitions (CSS). */
  (function motionLayer() {
    if (!doc.body) return;
    var fine = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false;
    var hasIO = "IntersectionObserver" in window;

    /* backdrop: three section tints and the light, behind everything; grain on top, never clickable */
    var back = doc.createElement("div");
    back.className = "fx-back"; back.setAttribute("aria-hidden", "true");
    ["accent", "plus", "sky"].forEach(function (t) { var s = doc.createElement("span"); s.className = "fx-tint"; s.setAttribute("data-tone", t); back.appendChild(s); });
    var light = doc.createElement("span"); light.className = "fx-light"; back.appendChild(light);
    doc.body.appendChild(back);
    var grain = doc.createElement("div"); grain.className = "fx-grain"; grain.setAttribute("aria-hidden", "true"); doc.body.appendChild(grain);

    /* section-to-section tint */
    var TONES = { plans: "accent", compare: "sky", work: "plus", lab: "sky", "free-check": "accent", how: "plus", art: "sky", faq: "accent", start: "plus" };
    root.setAttribute("data-tone", "accent");
    var bands = $$("main section[id], body > section[id], section.band[id]");
    if (hasIO) {
      var tio = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) root.setAttribute("data-tone", TONES[e.target.id] || "accent"); });
      }, { rootMargin: "-45% 0px -50% 0px" });
      bands.forEach(function (b) { tio.observe(b); });
      var hero = $(".hero"); if (hero) tio.observe(hero);
    }

    /* depth numerals: the section number, large and outlined, drifting slower than the page */
    $$("section.band").forEach(function (sec) {
      var idx = $(".idx", sec), m = idx && /^\s*(\d{2})\b/.exec(idx.textContent);
      if (!m) return;
      var n = doc.createElement("span"); n.className = "depth-n"; n.setAttribute("aria-hidden", "true"); n.textContent = m[1];
      sec.classList.add("has-depth"); sec.insertBefore(n, sec.firstChild);
    });

    if (still()) return;

    /* reveals: heads wipe in, cards rise in a short stagger; never on the hero */
    var groups = [".section-head", ".svc", ".config-side", ".bench-grid", ".work-list", ".rail", ".faq", ".free-copy", ".got", ".diff-list", ".art-grid"];
    var items = [];
    groups.forEach(function (g) {
      $$("section.band " + g).forEach(function (wrap) {
        var kids = Array.prototype.slice.call(wrap.children).filter(function (k) { return !k.classList.contains("pick") && k.tagName !== "SCRIPT"; });
        kids.forEach(function (k, i) {
          k.classList.add(k.tagName === "H2" ? "rv-wipe" : "rv");
          k.style.setProperty("--i", String(Math.min(i, 6)));
          items.push(k);
        });
      });
    });
    if (hasIO) {
      /* a clipped heading reports no visible area, so it is watched through its parent */
      var watch = new Map();
      items.forEach(function (k) {
        var t = k.classList.contains("rv-wipe") ? k.parentNode : k;
        if (!watch.has(t)) watch.set(t, []);
        watch.get(t).push(k);
      });
      var rio = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          watch.get(e.target).forEach(function (k) { if (k === e.target || k.classList.contains("rv-wipe")) k.classList.add("is-in"); });
          if (e.target.classList.contains("rv")) e.target.classList.add("is-in");
          rio.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
      watch.forEach(function (list, t) { rio.observe(t); });
    } else items.forEach(function (k) { k.classList.add("is-in"); });

    /* numbers count up the first time they are seen (figure spaces hold the width, so nothing shifts) */
    var FS = " ";
    var nums = $$("section.band .num").filter(function (el) {
      return /^\d{2,4}$/.test(el.textContent.trim()) && !/^0/.test(el.textContent.trim()) && !el.closest(".matrix, .pick, .dial-list, .dial-read, .rail-n, .svc-n, .got-n, [data-m], label, button, .readout, .w-status");
    });
    if (hasIO && nums.length) {
      var nio = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          nio.unobserve(e.target);
          var el = e.target, to = parseInt(el.textContent.trim(), 10), len = String(to).length, t0 = performance.now(), dur = 900;
          el.setAttribute("aria-label", String(to));
          (function tick(now) {
            var p = Math.min(1, (now - t0) / dur), v = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
            el.textContent = new Array(len - v.length + 1).join(FS) + v;
            if (p < 1) requestAnimationFrame(tick); else { el.textContent = String(to); el.removeAttribute("aria-label"); }
          })(t0);
        });
      }, { threshold: 0.6 });
      nums.forEach(function (el) { nio.observe(el); });
    }

    /* the light: follows a fine pointer; drifts slowly on touch screens */
    var R = 360, lx = innerWidth * 0.7, ly = innerHeight * 0.3, tx = lx, ty = ly, moving = false;
    function place() { light.style.transform = "translate3d(" + (lx - R).toFixed(1) + "px," + (ly - R).toFixed(1) + "px,0)"; }
    place();
    if (fine) {
      var step = function () {
        lx += (tx - lx) * 0.12; ly += (ty - ly) * 0.12; place();
        if (Math.abs(tx - lx) + Math.abs(ty - ly) > 0.5) requestAnimationFrame(step); else moving = false;
      };
      window.addEventListener("pointermove", function (ev) { tx = ev.clientX; ty = ev.clientY; if (!moving && !still()) { moving = true; requestAnimationFrame(step); } }, { passive: true });
    } else if (light.animate) {
      var vw = innerWidth, vh = innerHeight;
      light.animate([
        { transform: "translate3d(" + (vw * 0.6 - R) + "px," + (vh * 0.1 - R) + "px,0)" },
        { transform: "translate3d(" + (vw * 0.1 - R) + "px," + (vh * 0.45 - R) + "px,0)" },
        { transform: "translate3d(" + (vw * 0.8 - R) + "px," + (vh * 0.8 - R) + "px,0)" }
      ], { duration: 26000, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    }

    if (!fine) return;

    /* magnetic buttons: lean a few pixels toward the pointer, spring back on leave */
    $$(".button").forEach(function (b) {
      b.addEventListener("pointermove", function (ev) {
        if (still()) return;
        var r = b.getBoundingClientRect(), x = (ev.clientX - r.left - r.width / 2) * 0.18, y = (ev.clientY - r.top - r.height / 2) * 0.3;
        b.style.translate = Math.max(-8, Math.min(8, x)).toFixed(1) + "px " + Math.max(-6, Math.min(6, y)).toFixed(1) + "px";
      });
      b.addEventListener("pointerleave", function () { b.style.translate = ""; });
    });

    /* spotlight across plan, service and lab cards */
    var spots = $$(".svc li, .inst, .work-row, .pick, .rail li, .faq details");
    spots.forEach(function (s) { s.classList.add("spot"); });
    doc.addEventListener("pointermove", function (ev) {
      var s = ev.target.closest ? ev.target.closest(".spot") : null;
      if (!s) return;
      var r = s.getBoundingClientRect();
      s.style.setProperty("--mx", (ev.clientX - r.left).toFixed(0) + "px");
      s.style.setProperty("--my", (ev.clientY - r.top).toFixed(0) + "px");
    }, { passive: true });
  })();
})();
