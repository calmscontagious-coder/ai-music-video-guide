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

  /* ── hero field: everyday wins travel the street grid to a lit business ──
     The street grid and walkers are Canvas 2D. The wins are DOM text moved only by transform and
     opacity (Web Animations, compositor-friendly): letters rise in from a soft glow, the line
     arcs along a cubic path and settles onto a street, then folds letter by letter into the
     square, which pulses, rings and gathers a few settling sparks. Reduced motion: a static
     field and a plain crossfade between wins beside the square. */
  var canvas = $("[data-field]");
  if (canvas && canvas.getContext) (function () {
    var ctx = canvas.getContext("2d");
    var C = { line: tokenRGB("--color-line"), soft: tokenRGB("--color-line-soft"), dot: tokenRGB("--color-muted"), faint: tokenRGB("--color-faint"), accent: tokenRGB("--color-accent") };
    var WINS = ["Book more appointments", "Get found on Google Maps", "Answer customers at 2 a.m.", "Fill slow Tuesdays", "Turn reviews into regulars", "Show up in AI answers", "Keep your hours right everywhere", "Win back last year’s customers", "Let people book from their phone", "See which posts bring people in"];
    var layer = $("[data-wins]");
    var w = 0, h = 0, dpr = 1, G = 44, wide = false, shop = { x: 0, y: 0 }, walkers = [], rings = [], sparks = [], flights = [], pulse = 9, running = false, visible = true, last = 0;
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 }, scrollK = 1, wi = 0, ai = 0, mapLayer = null, font = "12px ui-monospace, monospace", schedT = 0, staticT = 0;
    var canAnimate = !!(layer && layer.animate);

    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      G = w < 600 ? 34 : 44;
      wide = w >= 900;
      shop.x = snap(wide ? w * 0.74 : w * 0.7);
      shop.y = snap(wide ? h * 0.46 : h * 0.55);
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

    /* ── the wins: path, easing and the fold into the square ── */
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function bez(p, u) { var v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y }; }
    var ANGLES = wideAngles();
    function wideAngles() { return [-2.3, -1.45, -0.6, 0.75, 2.45, 3.05, -2.75, 1.9]; }
    function pickStart(tw) {
      var R = wide ? Math.min(300, w * 0.22) : Math.min(230, w * 0.55);
      var xmin = wide ? w * 0.58 : 12, xmax = w - tw - 24, ymin = wide ? 64 : h * 0.3, ymax = wide ? Math.max(ymin + 40, Math.min(h - 340, shop.y + R * 0.7)) : h * 0.72;
      for (var k = 0; k < ANGLES.length; k++) {
        var a = ANGLES[(ai + k) % ANGLES.length];
        var x = Math.max(xmin, Math.min(xmax, shop.x + Math.cos(a) * R)), y = Math.max(ymin, Math.min(ymax, shop.y + Math.sin(a) * R * (wide ? 0.85 : 0.5)));
        if (Math.hypot(x - shop.x, y - shop.y) > R * 0.55) { ai = (ai + k + 3) % ANGLES.length; return { x: x, y: y }; }
      }
      ai++;
      return { x: xmin, y: ymin + Math.random() * (ymax - ymin) };
    }
    function pathFrom(s) {
      var e = { x: shop.x, y: shop.y }, dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1, side = Math.random() < 0.5 ? -1 : 1;
      var nx = -dy / d, ny = dx / d;
      var p1 = { x: s.x + dx * 0.2 + nx * d * 0.32 * side, y: s.y + dy * 0.2 + ny * d * 0.32 * side };
      var p2 = Math.abs(dx) > Math.abs(dy) ? { x: e.x - Math.sign(dx) * d * 0.38, y: e.y } : { x: e.x, y: e.y - Math.sign(dy) * d * 0.38 };
      return [s, p1, p2, e];
    }
    function el(tag, cls, text) { var n = doc.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; }
    function launch() {
      if (!canAnimate || !running) return;
      var text = WINS[wi % WINS.length]; wi++;
      var box = el("div", "win"), dot = el("span", "win-dot"), ghost = el("span", "win-ghost", text), line = el("span", "win-text");
      var letters = [];
      for (var i = 0; i < text.length; i++) { var c = el("span", "", text.charAt(i)); letters.push(c); line.appendChild(c); }
      box.appendChild(ghost); box.appendChild(line); box.appendChild(dot);
      box.style.opacity = "0";
      layer.appendChild(box);
      var tw = line.offsetWidth + 16;
      var xs = letters.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
      var path = pathFrom(pickStart(tw)), dur = wide ? 3400 : 3000, K = 36, frames = [];
      for (var k = 0; k <= K; k++) {
        var t = k / K, u = ease(t), p = bez(path, u), s = 1 - 0.3 * Math.max(0, (u - 0.62) / 0.38);
        frames.push({ transform: "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")" });
      }
      box.style.opacity = "";
      var f = { box: box, path: path, dur: dur, landed: false, anim: box.animate(frames, { duration: dur, easing: "linear", fill: "both" }) };
      var inE = "cubic-bezier(0.2,0,0,1)", outE = "cubic-bezier(0.55,0,0.85,0.35)", fold = dur - 360, step = Math.min(16, 300 / letters.length);
      ghost.animate([{ opacity: 0, transform: "translateY(-50%) scale(1.06)" }, { opacity: 0.85, transform: "translateY(-50%) scale(1.02)", offset: 0.3 }, { opacity: 0, transform: "translateY(-50%) scale(1)" }], { duration: 1100, easing: inE, fill: "both" });
      var lastOut = null;
      letters.forEach(function (c, i) {
        c.animate([{ opacity: 0, transform: "translate3d(0,0.6em,0) scale(0.92)" }, { opacity: 1, transform: "none" }], { duration: 620, delay: 80 + i * 24, easing: inE, fill: "backwards" });
        lastOut = c.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translate3d(" + (-(xs[i] + 12)).toFixed(1) + "px,0,0) scale(0.15)" }], { duration: 420, delay: fold + i * step, easing: outE, fill: "forwards" });
      });
      dot.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(2.4)" }], { duration: 260, delay: dur - 40, easing: outE, fill: "forwards" });
      flights.push(f);
      var done = function () { var j = flights.indexOf(f); if (j > -1) flights.splice(j, 1); if (box.parentNode) box.parentNode.removeChild(box); };
      if (lastOut && lastOut.finished) lastOut.finished.then(done, done); else setTimeout(done, dur + 800);
    }
    function land(f) {
      f.landed = true; pulse = 0; rings.push(-0.0001);
      for (var i = 0; i < 14; i++) {
        var a = Math.random() * Math.PI * 2, r = 26 + Math.random() * 46;
        sparks.push({ x: shop.x + Math.cos(a) * r, y: shop.y + Math.sin(a) * r, t: -i * 0.018, d: 0.5 + Math.random() * 0.4 });
      }
    }
    function schedule() {
      clearTimeout(schedT);
      if (!running || still()) return;
      schedT = setTimeout(function () { launch(); schedule(); }, wide ? 2600 : 3400);
    }
    function clearWins() {
      clearTimeout(schedT); clearTimeout(staticT); flights = []; sparks = [];
      if (layer) while (layer.firstChild) layer.removeChild(layer.firstChild);
    }
    function staticWins() {
      clearWins();
      if (!layer) return;
      var a = el("span", "win-static"), b = el("span", "win-static"), cur = a, n = 0;
      layer.appendChild(a); layer.appendChild(b);
      function place(node) {
        var tw = node.offsetWidth, x = Math.max(12, Math.min(shop.x + 18, w - tw - 12)), y = shop.y - 28;
        node.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      }
      function show() {
        var next = cur === a ? b : a;
        next.textContent = WINS[n % WINS.length]; n++;
        place(next);
        if (next.animate) { next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: "forwards" }); cur.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }); }
        else { next.style.opacity = "1"; cur.style.opacity = "0"; }
        cur = next;
        staticT = setTimeout(show, 4200);
      }
      a.style.opacity = "0"; b.style.opacity = "0";
      show();
    }

    function update(dt) {
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
      for (var i = 0; i < walkers.length; i++) {
        var k = walkers[i], t = k.way[k.step], dx = t.x - k.x, dy = t.y - k.y, d = Math.abs(dx) + Math.abs(dy), mv = k.v * dt * scrollK;
        k.trail.push(k.x, k.y); if (k.trail.length > 16) k.trail.splice(0, 2);
        if (d <= mv) { k.x = t.x; k.y = t.y; k.step++; if (k.step >= k.way.length) { if (k.lit) rings.push(0); walkers[i] = spawn(false); } }
        else { k.x += Math.sign(dx) * Math.min(Math.abs(dx), mv); k.y += Math.sign(dy) * Math.min(Math.abs(dy), mv); }
      }
      for (var j = rings.length - 1; j >= 0; j--) { rings[j] += rings[j] < 0 ? -dt : dt; if (Math.abs(rings[j]) > 1.4) rings.splice(j, 1); }
      for (var q = sparks.length - 1; q >= 0; q--) { sparks[q].t += dt; if (sparks[q].t > sparks[q].d) sparks.splice(q, 1); }
      pulse += dt;
      for (var f = 0; f < flights.length; f++) { var fl = flights[f], ct = fl.anim.currentTime; if (!fl.landed && ct != null && ct >= fl.dur - 30) land(fl); }
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
      /* glow trails behind each travelling win, sampled from the same eased path the text rides */
      ctx.lineCap = "round";
      for (var f = 0; f < flights.length; f++) {
        var fl = flights[f], ct = fl.anim.currentTime; if (ct == null) continue;
        var tau = Math.min(1, ct / fl.dur), t0 = Math.max(0, tau - 0.2), n = 14, prev = bez(fl.path, ease(t0));
        if (tau <= 0.01 || tau >= 1) continue;
        for (var s = 1; s <= n; s++) {
          var pt = bez(fl.path, ease(t0 + (tau - t0) * s / n)), al = s / n;
          ctx.strokeStyle = rgba(C.accent, 0.1 * al); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          ctx.strokeStyle = rgba(C.accent, 0.75 * al); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          prev = pt;
        }
      }
      for (var j = 0; j < rings.length; j++) {
        var big = rings[j] < 0, t = Math.abs(rings[j]) / 1.4, sp = big ? 1 - Math.pow(1 - t, 3) : t, ext = big ? 60 : 34;
        ctx.strokeStyle = rgba(C.accent, (1 - t) * (big ? 0.95 : 0.6)); ctx.lineWidth = big ? 2 : 1.5;
        ctx.strokeRect(shop.x - 8 - sp * ext, shop.y - 8 - sp * ext, 16 + sp * ext * 2, 16 + sp * ext * 2);
      }
      for (var q = 0; q < sparks.length; q++) {
        var sk = sparks[q]; if (sk.t < 0) continue;
        var m = Math.min(1, sk.t / sk.d), e = 1 - Math.pow(1 - m, 3), x = sk.x + (shop.x - sk.x) * e, y = sk.y + (shop.y - sk.y) * e;
        ctx.fillStyle = rgba(C.accent, 0.95 * (1 - m * m)); ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      var sq = 7 + 4 * pk, fr = 12.5 + 6 * pk;
      ctx.fillStyle = rgba(C.accent, 1); ctx.fillRect(shop.x - sq, shop.y - sq, sq * 2, sq * 2);
      ctx.strokeStyle = rgba(C.accent, 0.9); ctx.lineWidth = 1; ctx.strokeRect(shop.x - fr, shop.y - fr, fr * 2, fr * 2);
      var la = 1;
      for (var g = 0; g < flights.length; g++) { var gf = flights[g], gt = gf.anim.currentTime; if (gt == null || gt >= gf.dur + 420) continue; if (gt >= gf.dur) { la = Math.min(la, (gt - gf.dur) / 420); continue; } var gp = bez(gf.path, ease(gt / gf.dur)); la = Math.min(la, Math.max(0, (Math.hypot(gp.x - shop.x, gp.y - shop.y) - 24) / 110)); }
      if (la > 0.02) { ctx.font = font; ctx.fillStyle = pk > 0.08 ? rgba(C.accent, la) : rgba(C.dot, la); ctx.fillText("your business", shop.x + 18 + 6 * pk, shop.y + 4); }
    }
    function frame(now) {
      if (!running) return;
      if (!flights.length && pulse > 0.7 && now - last < 32) { requestAnimationFrame(frame); return; }
      var dt = Math.min(0.06, (now - last) / 1000 || 0.016); last = now;
      update(dt); draw();
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || still() || !visible || doc.hidden) return;
      running = true; last = performance.now(); requestAnimationFrame(frame);
      if (canAnimate) { launch(); schedule(); }
    }
    function stop() { running = false; clearTimeout(schedT); }
    function staticFrame() { for (var s = 0; s < 40; s++) update(0.05); rings = []; sparks = []; pulse = 9; draw(); }

    size();
    staticFrame();
    if (still()) staticWins();
    else { if (doc.readyState === "complete") setTimeout(start, 300); else window.addEventListener("load", function () { setTimeout(start, 300); }); }
    var rt = 0, lastW = w, lastH = h;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () {
      size(); ANGLES = wideAngles();
      if (still()) { staticFrame(); staticWins(); return; }
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; var keep = running; stop(); clearWins(); if (keep) start(); }
      if (!running) staticFrame();
    }, 150); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
    if (mq.addEventListener) mq.addEventListener("change", function () { if (still()) { stop(); clearWins(); staticFrame(); staticWins(); } else { clearWins(); start(); } });
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
      1: { name: "Essentials", m: "$950", f3: "$5,350", setup: "$2,500", hours: "3", why: "For a business that wants its site, customer list and Google presence run properly." },
      2: { name: "Growth", m: "$1,750", f3: "$10,450", setup: "$5,200", hours: "6.5", why: "For a business ready to win repeat visits and be found." },
      3: { name: "Signature", m: "$2,450", f3: "$13,850", setup: "$6,500", hours: "12", why: "For a business that wants every channel, paid ads and outreach." }
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
    function label(b) { return gbp.querySelector('label[for="' + b.id + '"]').textContent; }
    function missing() { return boxes.filter(function (b) { return !b.checked; }).sort(function (x, y) { return y.getAttribute("data-w") - x.getAttribute("data-w"); }); }
    function say(text) { status.textContent = text; }
    function render(msg) {
      var got = boxes.reduce(function (s, b) { return s + (b.checked ? +b.getAttribute("data-w") : 0); }, 0), score = Math.round(got / total * 100), miss = missing();
      fill.style.transform = "scaleX(" + (score / 100) + ")";
      var verdict = score === 100 ? "Complete. Keep it that way: a post a week and a reply to every review." : score >= 75 ? "Close. The list below is what is left." : score >= 40 ? "Half there. Start at the top of the list below." : got ? "Most of the profile is still open. The top items below matter most." : "Tick what your profile already has.";
      say(msg || ("Score " + score + " of 100. " + verdict));
      todo.textContent = "";
      miss.slice(0, 5).forEach(function (b) { var li = doc.createElement("li"); li.textContent = label(b); todo.appendChild(li); });
      next.hidden = !miss.length || !got;
    }
    boxes.forEach(function (b) { b.addEventListener("change", function () { render(); }); });
    copyB.addEventListener("click", function () {
      var miss = missing();
      var text = miss.length ? "Google profile fix list:\n" + miss.map(function (b, i) { return (i + 1) + ". " + label(b); }).join("\n") : "Google profile: every item on the checklist is done.";
      copyText(text).then(function () { render("Copied the fix list (" + miss.length + " items) to your clipboard."); }, function () { render("Your browser blocked copying. The top of the list is shown below."); next.hidden = false; });
    });
    resetB.addEventListener("click", function () { boxes.forEach(function (b) { b.checked = false; }); render(); if (boxes[0]) boxes[0].focus(); });
    render();
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
})();
