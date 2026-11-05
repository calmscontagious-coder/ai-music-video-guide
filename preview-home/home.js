/* Purpose with Presence home v2. Vanilla, no dependencies, no storage, no third-party calls.
   Parts: tracking hook, hero field (Canvas 2D), hero counters, plan configurator, box builder,
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

  /* ── hero field: nearby searches travel the street grid to a lit shop ── */
  var canvas = $("[data-field]");
  if (canvas && canvas.getContext) (function () {
    var ctx = canvas.getContext("2d");
    var C = { line: tokenRGB("--color-line"), soft: tokenRGB("--color-line-soft"), dot: tokenRGB("--color-muted"), faint: tokenRGB("--color-faint"), accent: tokenRGB("--color-accent") };
    var QUERIES = ["bakery near me", "open now", "vegan birthday cake", "coffee and a pastry", "gift box to order", "catering for 20", "gluten-free bread", "pickup before 8"];
    var w = 0, h = 0, dpr = 1, G = 44, shop = { x: 0, y: 0 }, walkers = [], rings = [], running = false, visible = true, last = 0;
    var labelMin = 0, labelMaxY = 1e9, pointer = { x: 0, y: 0, tx: 0, ty: 0 }, scrollK = 1, qi = 0, mapLayer = null, font = "12px ui-monospace, monospace";

    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      G = w < 600 ? 34 : 44;
      var wide = w >= 900;
      shop.x = snap(wide ? w * 0.74 : w * 0.7);
      shop.y = snap(wide ? h * 0.46 : h * 0.55);
      labelMin = wide ? w * 0.6 : 0; labelMaxY = wide ? h - 230 : h;
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
      var label = null;
      if (Math.random() < 0.32) { label = QUERIES[qi % QUERIES.length]; qi++; }
      var hFirst = Math.random() < 0.5;
      var wk = { x: sx, y: sy, way: hFirst ? [{ x: shop.x, y: sy }, { x: shop.x, y: shop.y }] : [{ x: sx, y: shop.y }, { x: shop.x, y: shop.y }], step: 0, v: 26 + Math.random() * 30, label: label, trail: [] };
      if (initial) { var adv = Math.random() * 0.8; wk.x = sx + (wk.way[0].x - sx) * adv; wk.y = sy + (wk.way[0].y - sy) * adv; }
      return wk;
    }
    function update(dt) {
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
      for (var i = 0; i < walkers.length; i++) {
        var k = walkers[i], t = k.way[k.step], dx = t.x - k.x, dy = t.y - k.y, d = Math.abs(dx) + Math.abs(dy), mv = k.v * dt * scrollK;
        k.trail.push(k.x, k.y); if (k.trail.length > 16) k.trail.splice(0, 2);
        if (d <= mv) { k.x = t.x; k.y = t.y; k.step++; if (k.step >= k.way.length) { rings.push(0); walkers[i] = spawn(false); } }
        else { k.x += Math.sign(dx) * Math.min(Math.abs(dx), mv); k.y += Math.sign(dy) * Math.min(Math.abs(dy), mv); }
      }
      for (var j = rings.length - 1; j >= 0; j--) { rings[j] += dt; if (rings[j] > 1.4) rings.splice(j, 1); }
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (mapLayer) ctx.drawImage(mapLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var lx = shop.x + pointer.x * 30, ly = shop.y + pointer.y * 30;
      if (glowLayer) ctx.drawImage(glowLayer, lx - GR, ly - GR, GR * 2, GR * 2);
      for (var i = 0; i < walkers.length; i++) {
        var k = walkers[i], tr = k.trail;
        if (tr.length > 3) { ctx.strokeStyle = rgba(k.label ? C.accent : C.dot, 0.35); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tr[0], tr[1]); for (var p = 2; p < tr.length; p += 2) ctx.lineTo(tr[p], tr[p + 1]); ctx.lineTo(k.x, k.y); ctx.stroke(); }
        ctx.fillStyle = rgba(k.label ? C.accent : C.dot, k.label ? 1 : 0.8);
        ctx.fillRect(k.x - 2, k.y - 2, 4, 4);
        if (k.label && k.x > labelMin && k.x < w - 150 && k.y < labelMaxY && k.y > 24) { ctx.font = font; ctx.fillStyle = rgba(C.dot, 0.95); ctx.fillText("“" + k.label + "”", k.x + 8, k.y - 8); }
      }
      for (var j = 0; j < rings.length; j++) { var t = rings[j] / 1.4; ctx.strokeStyle = rgba(C.accent, (1 - t) * 0.8); ctx.lineWidth = 1.5; ctx.strokeRect(shop.x - 8 - t * 34, shop.y - 8 - t * 34, 16 + t * 68, 16 + t * 68); }
      ctx.fillStyle = rgba(C.accent, 1); ctx.fillRect(shop.x - 7, shop.y - 7, 14, 14);
      ctx.strokeStyle = rgba(C.accent, 0.9); ctx.lineWidth = 1; ctx.strokeRect(shop.x - 12.5, shop.y - 12.5, 25, 25);
      ctx.font = font; ctx.fillStyle = rgba(C.dot, 1); ctx.fillText("your shop", shop.x + 18, shop.y + 4);
    }
    function frame(now) {
      if (!running) return;
      if (now - last < 32) { requestAnimationFrame(frame); return; }
      var dt = Math.min(0.06, (now - last) / 1000 || 0.033); last = now;
      update(dt); draw();
      requestAnimationFrame(frame);
    }
    function start() { if (running || still() || !visible || doc.hidden) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }
    function staticFrame() { for (var s = 0; s < 40; s++) update(0.05); rings = []; draw(); }

    size();
    staticFrame();
    if (!still()) { if (doc.readyState === "complete") setTimeout(start, 300); else window.addEventListener("load", function () { setTimeout(start, 300); }); }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (!running) staticFrame(); }, 150); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
    if (mq.addEventListener) mq.addEventListener("change", function () { if (still()) { stop(); staticFrame(); } else start(); });
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
      1: { name: "Essentials", m: "$950", f3: "$5,350", setup: "$2,500", hours: "3", why: "For a shop that wants its site, customer list and Google presence run properly." },
      2: { name: "Growth", m: "$1,750", f3: "$10,450", setup: "$5,200", hours: "6.5", why: "For a shop ready to grow repeat visits and be found." },
      3: { name: "Signature", m: "$2,450", f3: "$13,850", setup: "$6,500", hours: "12", why: "For a shop that wants every channel, paid ads and outreach." }
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

  /* ── 01 box builder ── */
  var box = $("[data-box]");
  if (box) (function () {
    var MAX = 6, picks = [];
    var rows = $$("li", box), slots = $$("[data-box-slots] rect"), status = $("[data-box-status]"), bag = $("[data-box-bag]"), resetB = $("[data-box-reset]");
    function counts() { var c = {}; picks.forEach(function (i) { c[i] = (c[i] || 0) + 1; }); return c; }
    function render(msg) {
      var c = counts(), total = 0;
      rows.forEach(function (li, i) {
        var n = c[i] || 0; total += n * parseFloat(li.getAttribute("data-price"));
        li.querySelector(".bi-count").textContent = String(n);
        li.querySelector('[data-op="-1"]').disabled = n === 0;
        li.querySelector('[data-op="1"]').disabled = picks.length >= MAX;
      });
      slots.forEach(function (s, i) { s.setAttribute("class", i < picks.length ? "t" + rows[picks[i]].getAttribute("data-tone") : ""); });
      bag.disabled = picks.length !== MAX;
      status.textContent = msg || (picks.length === MAX ? "Box full: 6 of 6. Total " + fmt(total) + "." : (picks.length ? picks.length + " of 6 picked. " + (MAX - picks.length) + " to go. So far " + fmt(total) + "." : "Pick six. 0 of 6 so far."));
    }
    rows.forEach(function (li, i) {
      $$(".step-btn", li).forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.getAttribute("data-op") === "1" && picks.length < MAX) picks.push(i);
          else if (b.getAttribute("data-op") === "-1") { var at = picks.lastIndexOf(i); if (at > -1) picks.splice(at, 1); }
          render();
          if (b.disabled) { var other = li.querySelector('.step-btn:not([disabled])'); if (other) other.focus(); }
        });
      });
    });
    bag.addEventListener("click", function () {
      var c = counts(), lines = [], total = 0;
      rows.forEach(function (li, k) { if (c[k]) { lines.push(c[k] + " x " + li.querySelector(".bi-name").textContent); total += c[k] * parseFloat(li.getAttribute("data-price")); } });
      var text = "Box of six: " + lines.join(", ") + ". Total " + fmt(total) + ".";
      copyText(text).then(function () { render("Copied to your clipboard: " + text); }, function () { render("Your browser blocked copying. The order: " + text); });
    });
    resetB.addEventListener("click", function () { picks = []; render(); });
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
    var EXTRA = { "bakery": "where to order a birthday cake", "café": "quiet café to work from", "restaurant": "restaurant open late", "shop": "where to buy a local gift" };
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
      var qs = ["best " + type + " in " + town, type + " open now in " + town, EXTRA[type] + " in " + town, type + " with vegan options in " + town, type + " in " + town + " that takes preorders"];
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
    var status = $("[data-lead-status]"), btn = $(".lead-btn", lead), done = $("[data-lead-done]"), hp = $("#lf-hp", lead), THANKS = "/preview-home/free-check/thanks/";
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
