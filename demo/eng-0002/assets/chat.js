/* Chat assistant for the demo home (2 November 2026). Mount: <div data-chef-chat data-src="assets/assistant.json">.
   Grounded only in assets/menu.json and assets/assistant.json, through the rule engine ConciergeCore
   (options/11-concierge/concierge-core.js, the same engine the Cloudflare Worker runs). Static site, no backend:
   everything answers in the browser. Backend hook: window.CHEF_CHAT_ENDPOINT (or endpoint in assistant.json) is
   POSTed {message, history, page, bag} and must return {reply, actions, cites}; the engine's guard vets that reply
   (no price, time, item or link outside the records) before it is shown, else the rules answer. Telemetry: counts
   per intent in localStorage only, never the visitor's words. No dependencies. */
(function () {
  'use strict';
  var mount = document.querySelector('[data-chef-chat]');
  if (!mount || !window.ConciergeCore) return;
  var SRC = mount.getAttribute('data-src') || 'assets/assistant.json', MENU = 'assets/menu.json';
  var STATS = 'ide.chat.stats.v1', MSGS = 'ide.chat.msgs.v1';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = null, engine = null, history = [], lastFocus = null;
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function stat(k) { try { var s = JSON.parse(localStorage.getItem(STATS) || '{}'); s[k] = (s[k] || 0) + 1; localStorage.setItem(STATS, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function bagCount() { try { return window.IDE.state().items.reduce(function (a, i) { return a + i.qty; }, 0); } catch (e) { return 0; } }
  function slotLabel() { try { var s = window.IDE.slot(); return s && s.label; } catch (e) { return null; } }

  /* ---------- the UI ---------- */
  var bubble = el('button', 'ch-bubble'); bubble.type = 'button'; bubble.setAttribute('aria-label', 'Chat with the shop assistant'); bubble.setAttribute('aria-haspopup', 'dialog');
  bubble.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M8 9h8M8 12h5"/></svg>';
  var root = el('div', 'ch'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'ch-title'); root.hidden = true;
  root.innerHTML = '<div class="ch-back" data-ch-back></div><div class="ch-panel"><div class="ch-head"><h2 id="ch-title"></h2><button class="ch-x" type="button" aria-label="Close the chat" data-ch-x><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><p data-ch-disc></p></div><div class="ch-log" data-ch-log role="log" aria-live="polite" aria-relevant="additions"></div><div class="ch-foot"><div class="ch-chips" data-ch-chips role="group" aria-label="Quick questions"></div><form class="ch-in" data-ch-form><label class="sr" for="ch-input">Your question</label><input id="ch-input" type="text" autocomplete="off" enterkeyhint="send" maxlength="240" data-ch-input><button type="submit">Ask</button></form></div></div>';
  mount.appendChild(bubble); mount.appendChild(root);
  var log = $('[data-ch-log]', root), chips = $('[data-ch-chips]', root), form = $('[data-ch-form]', root), input = $('[data-ch-input]', root);

  function open() {
    lastFocus = document.activeElement; root.hidden = false; root.classList.add('is-open'); bubble.hidden = true; document.body.classList.add('ch-lock');
    if (!log.children.length) bot({ reply: A.strings.greeting, actions: [], cites: [] });
    setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 260); stat('opened');
  }
  function close() { root.classList.remove('is-open'); root.hidden = true; bubble.hidden = false; document.body.classList.remove('ch-lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); else bubble.focus(); }
  bubble.addEventListener('click', open);
  $('[data-ch-x]', root).addEventListener('click', close);
  $('[data-ch-back]', root).addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });

  function scrollLog() { log.scrollTop = log.scrollHeight; }
  function me(t) { var m = el('div', 'ch-msg me'); m.appendChild(el('p', null, t)); log.appendChild(m); scrollLog(); }
  function typing() { var t = el('div', 'ch-typing'); t.setAttribute('aria-hidden', 'true'); t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); scrollLog(); return t; }
  /* the engine was written for direction 11; two of its pointers name that page's own panels, so they become links here */
  function adapt(out) {
    var r = out.reply.replace('the gift concierge below picks from the live store and shows the note as it will read. ', 'the gift cards page has the Golden Ticket, the baskets and the jars. ')
      .replace('The composer below draws your cake, gives a price-from estimate and saves it to your bag as a request, not a purchase.', 'The cakes page asks the occasion, the guests and the flavour, and the chef answers with a sketch and a price.')
      .replace(' Beyond that: I do not know that yet, the shop can tell you.', '');
    var acts = (out.actions || []).map(function (a) {
      if (a.type === 'open' && a.target === '#cadeau') return { type: 'link', href: 'gift-cards.html', label: 'Gift cards and boxed gifts' };
      if (a.type === 'compose') return { type: 'link', href: 'cakes.html', label: 'Start a cake' };
      if (a.type === 'usual') return null;
      if (a.type === 'link') return { type: 'link', href: String(a.href || '').replace(/^(\.\.\/)+/, ''), label: a.label };
      return a;
    }).filter(Boolean);
    /* an item sold by option (the Thanksgiving box, the printed cookie) has no Add; the live listing is the next step */
    if (!acts.length && out.items && out.items.length === 1) { var it = engine.item(out.items[0]); if (it && it.needs_choice && it.url) acts.push({ type: 'link', href: it.url, label: 'Choose the option on the live store', ext: true }); }
    return { intent: out.intent, reply: r, actions: acts, cites: out.cites || [], confident: out.confident, handoff: out.intent === 'allergy' };
  }
  function run(a, btn) {
    if (a.type === 'add' && window.IDE) { window.IDE.add(a.item); btn.textContent = 'Added · ' + a.item.title; btn.classList.add('done'); btn.disabled = true; return; }
    if (a.type === 'slot') { close(); var s = $('[data-os-slot-btn]'); if (s) { s.click(); s.focus(); } else { var p = $('#pickup'); if (p) p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } return; }
    if (a.type === 'box') { close(); var b = $('#box'); if (b) b.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
    if (a.type === 'checkout') { close(); if (window.IDE) window.IDE.open(); return; }
    if (a.type === 'open') { close(); var t = $(a.target); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  }
  function actButton(a) {
    if (a.type === 'link') { var l = el('a', 'ch-act', a.label || 'Open'); l.href = a.href; if (a.ext || /^https?:/.test(a.href)) { l.target = '_blank'; l.rel = 'noopener'; } return l; }
    var b = el('button', 'ch-act'); b.type = 'button';
    b.textContent = a.type === 'add' ? 'Add ' + a.item.title + ' · ' + money(a.item.price) : ({ slot: 'Choose a pickup time', box: 'Open the box of six', checkout: 'Review the bag and pay', open: a.label || 'Open' })[a.type] || 'Open';
    b.addEventListener('click', function () { run(a, b); });
    return b;
  }
  function handoff(withForm) {
    var c = el('div', 'ch-card'), h = A.handoff; c.appendChild(el('b', null, A.strings.handoff_title));
    var acts = el('div', 'ch-acts');
    ['order', 'call', 'email', 'directions'].forEach(function (k) { var l = el('a', 'ch-act', h[k].label); l.href = h[k].href; if (/^https?:/.test(h[k].href)) { l.target = '_blank'; l.rel = 'noopener'; } acts.appendChild(l); });
    var lv = el('button', 'ch-act', A.strings.leave_title); lv.type = 'button'; lv.addEventListener('click', function () { lv.disabled = true; c.appendChild(leaveForm()); scrollLog(); });
    acts.appendChild(lv); c.appendChild(acts);
    if (withForm) c.appendChild(leaveForm());
    stat('handoff'); return c;
  }
  function leaveForm() {
    var f = el('form', 'ch-form'); f.noValidate = true;
    f.innerHTML = '<p class="note-sm">' + A.strings.leave_note + '</p><label for="ch-ln">Your name</label><input id="ch-ln" name="name" type="text" maxlength="60" autocomplete="name"><label for="ch-lc">Email or phone, so the kitchen can answer</label><input id="ch-lc" name="contact" type="text" maxlength="80" autocomplete="email"><label for="ch-lm">Your message</label><textarea id="ch-lm" name="message" maxlength="600"></textarea><div class="ch-acts"><button class="ch-act" type="submit">Save and open my mail app</button></div><p class="ch-ok">' + A.strings.sent + '</p>';
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = { name: f.name.value.trim(), contact: f.contact.value.trim(), message: f.message.value.trim(), at: new Date().toISOString(), page: location.pathname };
      if (!d.message) { f.message.focus(); return; }
      try { var all = JSON.parse(localStorage.getItem(MSGS) || '[]'); all.push(d); localStorage.setItem(MSGS, JSON.stringify(all.slice(-20))); } catch (err) { /* memory only */ }
      f.classList.add('is-sent'); stat('left_message');
      var body = d.message + '\n\n' + (d.name ? d.name + '\n' : '') + (d.contact ? d.contact + '\n' : '') + 'Sent from the concept preview, ' + location.href;
      location.href = A.handoff.email.href + '?subject=' + encodeURIComponent('Message from the website') + '&body=' + encodeURIComponent(body);
    });
    return f;
  }
  function bot(out) {
    var m = el('div', 'ch-msg bot'); m.appendChild(el('p', null, out.reply));
    if (out.cites && out.cites.length) {
      var s = el('p', 'ch-src'); s.appendChild(document.createTextNode('From the shop’s own listings'));
      var tags = {}; out.cites.forEach(function (c) { if (c.status && c.status !== 'published' && !tags[c.status]) { tags[c.status] = 1; s.appendChild(el('span', 'tag', c.status)); } });
      m.appendChild(s);
    }
    if (out.actions && out.actions.length) { var acts = el('div', 'ch-acts'); out.actions.slice(0, 4).forEach(function (a) { acts.appendChild(actButton(a)); }); m.appendChild(acts); }
    if (out.intent === 'unknown' || out.handoff) m.appendChild(handoff(false));
    log.appendChild(m); scrollLog();
  }
  /* the backend hook: a Worker answers first when one is configured; its answer must pass the engine's guard */
  function remote(text) {
    var ep = window.CHEF_CHAT_ENDPOINT || A.endpoint; if (!ep || !window.fetch) return Promise.resolve(null);
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl && ctl.signal,
      body: JSON.stringify({ message: text, history: history.slice(-6), page: location.pathname, bag: { count: bagCount() } }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (out) { clearTimeout(t); if (!out || !out.reply) return null; var g = engine.guard(out); if (!g.ok) { stat('veto'); return null; } return { intent: out.intent || 'model', reply: engine.clean(out.reply), actions: engine.hydrate(out), cites: out.cites || [], confident: true }; })
      .catch(function () { clearTimeout(t); return null; });
  }
  function ask(text) {
    text = String(text || '').trim(); if (!text) return;
    me(text); history.push({ role: 'user', content: text }); stat('asked');
    var tp = typing();
    remote(text).then(function (out) {
      if (!out) out = engine.answer(text, { bagCount: bagCount(), slotLabel: slotLabel() });
      out = adapt(out); if (out.intent === 'unknown') out.reply = A.strings.dont_know;
      stat('intent:' + out.intent); history.push({ role: 'assistant', content: out.reply });
      setTimeout(function () { tp.remove(); bot(out); }, reduce ? 0 : 350);
    });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; ask(v); });

  /* ---------- boot: the two files, then the engine ---------- */
  Promise.all([fetch(SRC).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }), fetch(MENU).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })])
    .then(function (d) {
      A = d[0]; engine = window.ConciergeCore.create({ menu: d[1], facts: { facts: A.facts } });
      $('#ch-title', root).textContent = A.strings.title; $('[data-ch-disc]', root).textContent = A.strings.disclosure; input.placeholder = A.strings.placeholder;
      (A.chips || []).forEach(function (c) { var b = el('button', null, c); b.type = 'button'; b.addEventListener('click', function () { ask(c); }); chips.appendChild(b); });
      bubble.hidden = false;
      window.CHEF_CHAT = { ask: ask, open: open, close: close, engine: engine };
    })
    .catch(function () { bubble.remove(); root.remove(); });
})();
