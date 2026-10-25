/* Direction 11, Concierge: the page's behaviour. Written 2026-10-24.
   Loads after ../../assets/app.js (the shared bag, slot picker, box of six and Shopify cart link)
   and concierge-core.js (the rule engine). Reads two files, ../../assets/menu.json and facts.json,
   and sends nothing anywhere: no fetch leaves this origin, no analytics, no model call.
   In the real store, set data-cz-endpoint on the desk to the app proxy path (/apps/concierge) and
   questions the rules cannot answer go to the worker in concierge_worker/, which replies with the
   same action JSON. On this preview the attribute is absent, so everything stays in the browser. */
(function () {
  'use strict';
  var desk = document.querySelector('[data-cz]');
  if (!desk || !window.ConciergeCore) return;
  var IDE = window.IDE;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var USUAL_KEY = 'ide.concierge.usual.v1';
  var engine = null;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function go(target, focusSel) {
    var t = typeof target === 'string' ? $(target) : target; if (!t) return;
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (focusSel) setTimeout(function () { var f = $(focusSel); if (f) f.focus({ preventScroll: true }); }, reduce ? 0 : 420);
  }
  function bagCount() { try { return IDE.state().items.reduce(function (a, i) { return a + i.qty; }, 0); } catch (e) { return 0; } }
  function inBag(h) { try { var f = IDE.state().items.filter(function (i) { return i.handle === h; })[0]; return f ? f.qty : 0; } catch (e) { return 0; } }

  var log = $('[data-cz-log]', desk), form = $('[data-cz-form]', desk), input = $('[data-cz-input]', desk);
  var picker = $('#cz-picker'), slotBtn = $('[data-cz-slot]', desk);

  /* ---------- the in-desk pickup picker ---------- */
  function openPicker(focus) {
    picker.hidden = false; slotBtn.setAttribute('aria-expanded', 'true'); slotBtn.textContent = 'Done';
    if (focus !== false) setTimeout(function () { var c = $('.chip[aria-pressed="true"]', picker) || $('.chip', picker); if (c) c.focus({ preventScroll: false }); }, 30);
  }
  function closePicker() { picker.hidden = true; slotBtn.setAttribute('aria-expanded', 'false'); slotBtn.textContent = 'Change'; }
  slotBtn.addEventListener('click', function () { if (picker.hidden) openPicker(); else { closePicker(); slotBtn.focus(); } });

  /* ---------- messages ---------- */
  function scrollLog() { log.scrollTop = log.scrollHeight; }
  function userMsg(t) { var m = el('div', 'cz-msg me'); m.appendChild(el('p', null, t)); log.appendChild(m); scrollLog(); }
  function typing() { var m = el('div', 'cz-msg typing'); m.setAttribute('aria-hidden', 'true'); m.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(m); scrollLog(); return m; }
  function srcLine(cites) {
    if (!cites || !cites.length) return null;
    var p = el('p', 'cz-src'); p.appendChild(el('b', null, 'From '));
    cites.forEach(function (c, k) {
      if (k) p.appendChild(document.createTextNode(' · '));
      p.appendChild(document.createTextNode(c.label + (c.checked ? ', read ' + c.checked : '')));
      if (c.status && c.status !== 'published') p.appendChild(el('span', 'tag', c.status));
    });
    return p;
  }
  function sources(cites) {
    var d = el('details'), s = el('summary', null, 'Where this came from'), ul = el('ul');
    cites.forEach(function (c) { ul.appendChild(el('li', null, c.label + ': ' + c.source)); });
    d.appendChild(s); d.appendChild(ul); return d;
  }
  function actButton(a) {
    var b;
    if (a.type === 'link') { b = el('a', 'cz-act', a.label || 'Open'); b.href = a.href; return b; }
    b = el('button', 'cz-act'); b.type = 'button';
    if (a.type === 'add') {
      var q = inBag(a.handle);
      b.textContent = (q ? 'In your bag · ' + q + ', add one more' : 'Add ' + a.item.title + ' · ' + money(a.item.price));
      if (a.auto) { b.textContent = 'Added · ' + a.item.title; b.classList.add('done'); }
    } else b.textContent = ({ slot: 'Choose a pickup time', box: 'Open the box of six', compose: 'Open the cake composer', open: a.label || 'Open', checkout: 'Review the bag and pay', usual: 'Add the usual' })[a.type] || 'Open';
    b.addEventListener('click', function () { run(a, true, b); });
    return b;
  }
  function payLink() {
    var url = IDE.checkoutUrl && IDE.checkoutUrl();
    if (!url) return null;
    var a = el('a', 'cz-act pay', 'Pay the live-store items on id-eclair.com'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('data-cz-pay', '');
    return a;
  }
  function botMsg(r) {
    var m = el('div', 'cz-msg bot' + (r.intent === 'unknown' ? ' unknown' : ''));
    r.reply.split('\n').forEach(function (t) { if (t) m.appendChild(el('p', null, t)); });
    var acts = (r.actions || []).filter(function (a) { return a.type !== 'request'; });
    if (acts.length || r.intent === 'checkout') {
      var row = el('div', 'cz-acts'); acts.forEach(function (a) { row.appendChild(actButton(a)); });
      if (r.intent === 'checkout' || (r.intent === 'add' && acts.some(function (a) { return a.auto && a.item && a.item.variantId; }))) { var p = payLink(); if (p) row.appendChild(p); }
      m.appendChild(row);
    }
    var s = srcLine(r.cites); if (s) m.appendChild(s);
    if (r.cites && r.cites.length) m.appendChild(sources(r.cites));
    if (r.source === 'worker') m.appendChild(el('p', 'cz-src', 'Answered by the worker, checked against these rows before it reached you.'));
    log.appendChild(m); scrollLog();
  }

  /* ---------- actions: the same JSON the worker returns ---------- */
  function fillBox(flavours) {
    var root = $('[data-box]'); if (!root) return;
    var clear = $('[data-box-clear]', root); if (clear) clear.click();
    (flavours || []).forEach(function (f) { var b = $('button[data-f="' + f + '"]', root); if (b && !b.disabled) b.click(); });
  }
  function run(a, manual, btn) {
    if (a.type === 'add') { IDE.add(a.item, manual ? 1 : a.qty); if (btn) { btn.textContent = 'In your bag · ' + inBag(a.handle) + ', add one more'; btn.classList.add('done'); } }
    else if (a.type === 'slot') openPicker();
    else if (a.type === 'box') { fillBox(a.flavours); go('#box', (a.flavours && a.flavours.length === 6) ? '[data-box-add]' : '#box .flav button:not([disabled])'); }
    else if (a.type === 'compose') { applyPreset(a.preset || {}); go('#composer', '#composer input:checked'); }
    else if (a.type === 'open') { if (a.target === '#cadeau' && a.preset && a.preset.budget) setBudget(a.preset.budget); go(a.target, a.target + ' input:checked'); }
    else if (a.type === 'checkout') IDE.open();
    else if (a.type === 'usual') addUsual();
  }
  function ctx() { return { slotLabel: IDE.slot().label, bagCount: bagCount() }; }

  /* the real store asks the worker when the rules have no answer; this preview has no endpoint */
  function askWorker(text) {
    var ep = desk.getAttribute('data-cz-endpoint');
    if (!ep) return Promise.resolve(null);
    return fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text, bag: { count: bagCount() } }) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function ask(text) {
    text = String(text || '').trim().slice(0, 240); if (!text || !engine) return;
    userMsg(text);
    var t = typing(), r = engine.answer(text, ctx());
    var next = r.confident ? Promise.resolve(r) : askWorker(text).then(function (w) {
      if (w && w.reply) { w.actions = engine.hydrate(w); w.source = 'worker'; return w; }
      return r;
    });
    next.then(function (res) {
      setTimeout(function () {
        t.remove();
        (res.actions || []).forEach(function (a) { if (a.auto && a.type === 'add') run(a, false); });
        botMsg(res);
        (res.actions || []).forEach(function (a) { if (a.auto && a.type !== 'add') run(a, false); });
      }, reduce ? 0 : 220);
    });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; ask(v); });
  $$('[data-cz-q]', desk).forEach(function (b) { b.addEventListener('click', function () { ask(b.getAttribute('data-cz-q')); input.focus({ preventScroll: true }); }); });

  /* ---------- voice in, where the browser has it ---------- */
  (function voice() {
    var mic = $('[data-cz-mic]', desk), note = $('[data-cz-voice]', desk), label = $('[data-cz-mic-label]', desk);
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, on = false;
    function off(msg) { mic.disabled = true; mic.setAttribute('aria-pressed', 'false'); label.textContent = 'Voice input is not available here'; note.textContent = msg; }
    if (!SR) { off('Voice input is not available in this browser. Type your question instead; Chrome and Safari offer voice.'); return; }
    try { rec = new SR(); } catch (e) { off('Voice input could not start in this browser. Type your question instead.'); return; }
    rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    note.textContent = 'Voice uses your browser’s own speech service; Chrome sends the audio to Google to turn it into words. Typing keeps everything on this page.';
    var heard = '';
    rec.onresult = function (e) {
      heard = Array.prototype.map.call(e.results, function (x) { return x[0].transcript; }).join(' ');
      input.value = heard;
    };
    rec.onerror = function (e) {
      on = false; mic.setAttribute('aria-pressed', 'false'); label.textContent = 'Speak your question';
      note.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'The microphone is blocked for this page. Type your question instead.' : 'I did not catch that. Try again, or type it.';
    };
    rec.onend = function () {
      var was = on; on = false; mic.setAttribute('aria-pressed', 'false'); label.textContent = 'Speak your question';
      if (was && heard.trim()) { input.value = ''; ask(heard); }
      heard = '';
    };
    mic.addEventListener('click', function () {
      if (on) { try { rec.stop(); } catch (e) { /* already stopped */ } return; }
      try { rec.start(); on = true; mic.setAttribute('aria-pressed', 'true'); label.textContent = 'Listening. Press again to stop'; }
      catch (e) { note.textContent = 'Voice input could not start. Type your question instead.'; }
    });
  })();

  /* ---------- today's three in the greeting ---------- */
  /* built once; a bag change only relabels the buttons, so focus stays where it was */
  function renderThree() {
    var ul = $('[data-cz-three]', desk); if (!ul) return;
    if (!ul.children.length) engine.today().map(engine.item).filter(Boolean).forEach(function (i) {
      var li = el('li'), nm = el('span', 'nm', i.title); nm.appendChild(el('small', null, i.desc));
      li.appendChild(nm); li.appendChild(el('span', 'price', money(i.price)));
      var b = el('button', 'cz-act'); b.type = 'button'; b.setAttribute('data-cz-h', i.handle);
      b.addEventListener('click', function () { IDE.add(engine.bagItem(i), 1); });
      li.appendChild(b); ul.appendChild(li);
    });
    $$('button[data-cz-h]', ul).forEach(function (b) {
      var h = b.getAttribute('data-cz-h'), q = inBag(h), i = engine.item(h);
      b.textContent = q ? 'In bag · ' + q : 'Add';
      b.classList.toggle('done', q > 0);
      b.setAttribute('aria-label', (q ? 'Add one more ' : 'Add ') + i.title + ', ' + money(i.price) + (q ? '; ' + q + ' in your bag' : ''));
    });
  }
  document.addEventListener('ide:bag', function () { if (engine) { renderThree(); renderMem(); } });

  /* ---------- le composeur de gâteau ---------- */
  var comp = $('[data-cz-compform]'), cake = $('[data-cz-cake]'), cg = $('[data-cz-cake-g]'), NS = 'http://www.w3.org/2000/svg';
  function val(f, n) { var c = $('input[name="' + n + '"]:checked', f); return c ? c.value : ''; }
  function svg(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || cg).appendChild(e); return e; }
  function todayKey() { return engine.laToday(); }
  function spec() {
    var tiers = val(comp, 'tiers'), size = tiers === '2' ? '2t' : tiers === '3' ? '3t' : val(comp, 'size') || '8';
    return { occasion: val(comp, 'occasion'), tiers: +tiers, size: size, flavour: val(comp, 'flavour'), finish: val(comp, 'finish'),
      inscription: $('#cz-ins').value.trim(), date: $('#cz-date').value, allergy: $('#cz-allergy').value.trim() };
  }
  function drawCake(e, s) {
    while (cg.firstChild) cg.removeChild(cg.firstChild);
    var widths = { '6': [150], '8': [190], '10': [228], '2t': [228, 160], '3t': [236, 176, 116] }[e.size.id] || [190];
    var H = 58, baseY = 238, cx = 160, flav = e.flavour ? e.flavour.tone : 'chocolate', fin = e.finish ? e.finish.id : 'gold';
    cake.setAttribute('data-tone', flav); cake.setAttribute('data-finish', fin);
    svg('ellipse', { 'class': 'shadow', cx: cx, cy: baseY + 16, rx: widths[0] / 2 + 34, ry: 9 });
    svg('ellipse', { 'class': 'board', cx: cx, cy: baseY + 8, rx: widths[0] / 2 + 26, ry: 10 });
    var top = baseY;
    widths.forEach(function (w, k) {
      var y = baseY - H * (k + 1), g = svg('g', { 'class': 'tier d' + k });
      svg('rect', { 'class': 'sponge', x: cx - w / 2, y: y, width: w, height: H, rx: 10 }, g);
      svg('rect', { 'class': 'band', x: cx - w / 2, y: y + H * 0.48, width: w, height: 5 }, g);
      svg('rect', { 'class': 'glaze', x: cx - w / 2, y: y, width: w, height: 12, rx: 8 }, g);
      if (fin === 'gold' || fin === 'chef') for (var n = 0; n < Math.round(w / 34); n++) svg('rect', { 'class': 'gold', x: cx - w / 2 + 14 + n * 34 + (k % 2) * 8, y: y + 18 + (n % 2) * 10, width: 7, height: 4, rx: 1, transform: 'rotate(' + (n % 3 * 18 - 18) + ' ' + (cx - w / 2 + 17 + n * 34) + ' ' + (y + 20) + ')' }, g);
      if (fin === 'feather') for (var m = 0; m < 3; m++) svg('path', { 'class': 'feather', d: 'M' + (cx - w / 2 + 12) + ' ' + (y + 22 + m * 11) + ' q ' + (w / 8) + ' -6 ' + (w / 4) + ' 0 t ' + (w / 4) + ' 0 t ' + (w / 4) + ' 0 t ' + (w / 4 - 24) + ' 0' }, g);
      if (fin === 'chantilly') for (var c = 0; c < Math.round(w / 18); c++) svg('circle', { 'class': 'chantilly', cx: cx - w / 2 + 9 + c * 18, cy: y + 3, r: 7 }, g);
      top = y;
    });
    var tw = widths[widths.length - 1];
    if (e.inscription) {
      var pw = Math.min(tw - 16, Math.max(84, e.inscription.length * 7.2 + 26));
      svg('ellipse', { 'class': 'plaque', cx: cx, cy: top + H * 0.62, rx: pw / 2, ry: 14 });
      var tx = svg('text', { 'class': 'plaque-t', x: cx, y: top + H * 0.62 + 4.5, 'text-anchor': 'middle' }); tx.textContent = e.inscription;
    }
    svg('path', { 'class': 'heart', d: 'M' + cx + ' ' + (top - 4) + 'c-5-3.5-9-6.5-9-10.5a4.6 4.6 0 0 1 9-1.6a4.6 4.6 0 0 1 9 1.6c0 4-4 7-9 10.5z' });
    var t = svg('text', { 'class': 'lbl', x: 16, y: 22 }); t.textContent = e.size.label + ' · ' + e.size.min + ' to ' + e.size.max + ' guests';
    $('[data-cz-cake-t]').textContent = 'Drawing of a ' + e.size.label.toLowerCase() + ' cake' + (e.flavour ? ', ' + e.flavour.title : '') + (e.finish ? ', ' + e.finish.title.toLowerCase() : '') + (e.inscription ? ', plaque reading ' + e.inscription : '');
  }
  function renderComp() {
    var s = spec(), e = engine.estimateCake(s, todayKey());
    $('[data-cz-sizes]').disabled = s.tiers > 1;
    drawCake(e, s);
    $('[data-cz-from]').textContent = e.priceText;
    $('[data-cz-lead]').textContent = (e.lead === 28 ? 'Four weeks’ notice for a wedding (proposed)' : 'One week’s notice, the shop’s rule') + ': the earliest pickup is ' + new Date(e.earliest + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) + '.';
    var date = $('#cz-date'); date.min = e.earliest;
    $('[data-cz-date-min]').textContent = 'from ' + e.earliest;
    $('[data-cz-ins-n]').textContent = s.inscription.length + ' of 24';
    var box = $('[data-cz-summary]'); box.innerHTML = '';
    var ul = el('ul'); e.lines.forEach(function (l) { ul.appendChild(el('li', null, l)); }); box.appendChild(ul);
    box.appendChild(el('p', null, e.route));
    e.problems.forEach(function (p) { box.appendChild(el('p', 'bad', p)); });
    date.setAttribute('aria-invalid', s.date && e.problems.some(function (p) { return /date/.test(p); }) ? 'true' : 'false');
    return e;
  }
  function applyPreset(p) {
    if (p.occasion) { var o = $('#oc-' + (p.occasion === 'anniversary' ? 'anniv' : p.occasion)); if (o) o.checked = true; }
    if (p.guests) {
      var sz = engine.sizeFor(p.guests);
      if (sz.tiers === 1) { $('#ti-1').checked = true; var r = $('#sz-' + sz.id); if (r) r.checked = true; }
      else $('#ti-' + sz.tiers).checked = true;
    }
    renderComp();
  }
  function buildComp() {
    var fl = $('[data-cz-flavs]'), fi = $('[data-cz-finishes]');
    engine.cakeFlavours.forEach(function (f, k) {
      var s = el('span', 'cz-opt'), i = el('input'), l = el('label');
      i.type = 'radio'; i.name = 'flavour'; i.id = 'fl-' + f.id; i.value = f.id; if (!k) i.checked = true;
      l.htmlFor = i.id; l.appendChild(el('i', 't-' + f.tone)); l.appendChild(document.createTextNode(f.title)); l.appendChild(el('small', null, f.note));
      l.firstChild.setAttribute('aria-hidden', 'true');
      s.appendChild(i); s.appendChild(l); fl.appendChild(s);
    });
    engine.cakeFinishes.forEach(function (f, k) {
      var s = el('span', 'cz-opt'), i = el('input'), l = el('label', null, f.title);
      i.type = 'radio'; i.name = 'finish'; i.id = 'fi-' + f.id; i.value = f.id; if (!k) i.checked = true;
      l.htmlFor = i.id; l.appendChild(el('small', null, f.note)); s.appendChild(i); s.appendChild(l); fi.appendChild(s);
    });
    comp.addEventListener('input', renderComp); comp.addEventListener('change', renderComp);
    comp.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var out = $('[data-cz-save-out]'), s = spec();
      if (!s.date) { out.textContent = 'Choose a pickup date first; the earliest is ' + engine.estimateCake(s, todayKey()).earliest + '.'; $('#cz-date').setAttribute('aria-invalid', 'true'); $('#cz-date').focus(); return; }
      var req = engine.cakeRequest(s, todayKey());
      if (!req.ok) { out.textContent = req.problems.join(' '); $('#cz-date').focus(); return; }
      IDE.add(req.action.item, 1);
      out.textContent = 'Saved to your bag as a request at $0.00, not a purchase. ' + req.estimate.priceText + ' is an example estimate; the shop replies with a sketch and a price.';
    });
    renderComp();
  }

  /* ---------- trouve-moi ---------- */
  function buildQuiz() {
    var f = $('[data-cz-quiz]'), list = $('[data-cz-picks]'), note = $('[data-cz-picks-note]');
    function render() {
      var r = engine.quiz({ occasion: val(f, 'occasion'), who: val(f, 'who'), budget: val(f, 'budget'), diet: val(f, 'diet') });
      list.innerHTML = '';
      r.picks.forEach(function (p) {
        var li = el('li', 'cz-pickrow'), body = el('div');
        body.appendChild(el('h3', null, p.title)); body.appendChild(el('p', null, p.desc));
        body.appendChild(el('p', 'why', 'Why: ' + p.reason + '.'));
        var row = el('div', 'row'); row.appendChild(el('span', 'price', money(p.price)));
        var b = el('button', 'cz-act'); b.type = 'button';
        if (p.box) { b.textContent = 'Fill the box'; b.addEventListener('click', function () { go('#box', '#box .flav button'); }); }
        else if (p.addable) { b.textContent = 'Add · ' + money(p.price); b.addEventListener('click', function () { IDE.add(p.item, 1); b.textContent = 'In your bag'; b.classList.add('done'); }); }
        else { b = el('a', 'cz-act', 'Ask the shop'); b.href = '../../classes.html'; }
        row.appendChild(b); body.appendChild(row); li.appendChild(body); list.appendChild(li);
      });
      note.textContent = (r.picks.length < 3 ? 'Only ' + r.picks.length + ' items fit all four answers. ' : '') + (r.note || '') + ' Picks from menu.json, read 21 and 22 October 2026.';
    }
    f.addEventListener('submit', function (e) { e.preventDefault(); render(); var first = $('.cz-pickrow h3', list); if (first) { first.setAttribute('tabindex', '-1'); first.focus(); } });
  }

  /* ---------- cadeau ---------- */
  var budgetIn = $('#cz-budget');
  function setBudget(b) { budgetIn.value = Math.round(b / 5) * 5; renderGift(); }
  var giftNow = null;
  function renderGift() {
    var f = $('[data-cz-giftform]'), b = +budgetIn.value, g = engine.gift(b, val(f, 'who'));
    giftNow = g;
    $('[data-cz-budget-out]').textContent = '$' + b;
    var ul = $('[data-cz-basket]'); ul.innerHTML = '';
    g.items.forEach(function (i) { var li = el('li'); li.appendChild(el('b', null, i.title)); li.appendChild(el('span', 'price', money(i.price))); li.appendChild(el('small', null, i.desc)); ul.appendChild(li); });
    $('[data-cz-gift-total]').textContent = money(g.total);
    $('[data-cz-gift-left]').textContent = g.items.length ? money(g.left) + ' under the budget · live-store prices, 22 October 2026' : 'Nothing on the live store fits that budget yet';
    var to = $('#cz-to').value.trim(), msg = $('#cz-msgtext').value.trim(), from = $('#cz-from').value.trim();
    $('[data-cz-note-to]').textContent = 'Pour ' + (to || 'Camille') + ',';
    $('[data-cz-note-msg]').textContent = msg || 'Merci for Saturday. The cannelés are for the morning.';
    $('[data-cz-note-from]').textContent = from || 'Jules';
    $('[data-cz-note-n]').textContent = msg.length + ' of 140';
    $('[data-cz-gift-add]').disabled = !g.items.length;
  }
  function buildGift() {
    var f = $('[data-cz-giftform]');
    f.addEventListener('input', renderGift); f.addEventListener('change', renderGift); f.addEventListener('submit', function (e) { e.preventDefault(); });
    $('[data-cz-gift-add]').addEventListener('click', function () {
      if (!giftNow || !giftNow.items.length) return;
      IDE.addSet(giftNow.items.map(function (i) { return i.item; }));
      var url = IDE.checkoutUrl(), out = $('[data-cz-gift-out]');
      out.textContent = 'In your bag: ' + giftNow.items.length + ' live-store items, ' + money(giftNow.total) + '. Pay opens id-eclair.com with them in the cart' + (url ? '.' : ' once the bag has a live-store item.');
    });
    renderGift();
  }

  /* ---------- la mémoire: the usual, on this device only ---------- */
  function readUsual() { try { var u = JSON.parse(localStorage.getItem(USUAL_KEY) || 'null'); return u && Array.isArray(u.items) && u.items.length ? u : null; } catch (e) { return null; } }
  function writeUsual(items, why) {
    var keep = items.filter(function (i) { return !/^cake-request:/.test(i.handle); }).map(function (i) { return { handle: i.handle, title: i.title, price: i.price, qty: i.qty, variantId: i.variantId || null, glyph: i.glyph || null, meta: i.meta || null }; });
    if (!keep.length) return false;
    try { localStorage.setItem(USUAL_KEY, JSON.stringify({ v: 1, saved: new Date().toISOString().slice(0, 10), why: why, items: keep })); return true; } catch (e) { return false; }
  }
  function addUsual() {
    var u = readUsual(), out = $('[data-cz-mem-out]');
    if (!u) { if (out) out.textContent = 'No usual is saved on this device yet.'; return; }
    u.items.forEach(function (i) { IDE.add(i, i.qty); });
    if (out) out.textContent = 'Your usual is back in the bag: ' + u.items.map(function (i) { return i.title + (i.qty > 1 ? ' ×' + i.qty : ''); }).join(', ') + '.';
  }
  function renderMem() {
    var u = readUsual(), box = $('[data-cz-mem-box]'), n = bagCount();
    box.innerHTML = '';
    if (!u) box.appendChild(el('p', 'cz-mem-empty', 'No usual yet. Add a few things, then keep the bag.'));
    else {
      var ul = el('ul');
      u.items.forEach(function (i) { var li = el('li'); li.appendChild(el('b', null, i.title + (i.qty > 1 ? ' ×' + i.qty : ''))); li.appendChild(el('span', 'price', money(i.price * i.qty))); ul.appendChild(li); });
      box.appendChild(ul);
      box.appendChild(el('p', 'cz-mem-when', 'Kept on this device on ' + u.saved + (u.why === 'checkout' ? ', when you opened a live-store checkout.' : '.')));
    }
    $('[data-cz-usual-add]').disabled = !u;
    $('[data-cz-usual-forget]').disabled = !u;
    $('[data-cz-usual-keep]').disabled = !n;
  }
  function buildMem() {
    $('[data-cz-usual-add]').addEventListener('click', addUsual);
    $('[data-cz-usual-keep]').addEventListener('click', function () {
      var ok = writeUsual(IDE.state().items, 'kept');
      $('[data-cz-mem-out]').textContent = ok ? 'Kept as your usual, on this device only.' : 'This browser will not store it (private mode or storage off), so nothing was kept.';
      renderMem();
    });
    $('[data-cz-usual-forget]').addEventListener('click', function () {
      try { localStorage.removeItem(USUAL_KEY); } catch (e) { /* nothing stored */ }
      $('[data-cz-mem-out]').textContent = 'Forgotten. Nothing about your usual is left in this browser.';
      renderMem();
    });
    /* opening a live-store checkout keeps the bag as the usual */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="id-eclair.com/cart/"]');
      if (a) { writeUsual(IDE.state().items, 'checkout'); renderMem(); }
    }, true);
    renderMem();
  }

  /* ---------- boot ---------- */
  Promise.all([
    fetch('../../assets/menu.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch('facts.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  ]).then(function (d) {
    engine = window.ConciergeCore.create({ menu: d[0], facts: d[1] });
    renderThree(); buildComp(); buildQuiz(); buildGift(); buildMem();
    desk.setAttribute('data-cz-ready', '');
  }).catch(function () {
    var m = el('div', 'cz-msg bot unknown');
    m.appendChild(el('p', null, 'Le Concierge reads menu.json and facts.json from this site. Open the page from a web server to talk to it; the bag and the box of six still work.'));
    log.appendChild(m);
  });
  window.CZ = { ask: ask, engine: function () { return engine; } };
})();
