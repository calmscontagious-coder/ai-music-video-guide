/* iD Éclair opening hours: one config (hours.json), computed in the shop's own time zone, never the visitor's.
   Used by the page (window.LumiereHours) and by the tests (require). No dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LumiereHoursCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* the copy used only if hours.json cannot be read; keep it equal to hours.json */
  var FALLBACK = { timezone: 'America/Los_Angeles', assumed: 'about_page', week: { mon: null, tue: ['06:00', '15:00'], wed: ['06:00', '20:00'], thu: ['06:00', '20:00'], fri: ['06:00', '20:00'], sat: ['06:00', '20:00'], sun: ['06:00', '20:00'] }, cutoff_min: 30, lead_min: 30, closures: [], when_closed: 'closed-preorder' };
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function hm(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  /* the shared picker writes times as 10:00, 12:30, 1:30 ... 5:30 (afternoon without am/pm) */
  function slotMin(t) { var p = String(t).split(':'), h = +p[0]; if (h < 9) h += 12; return h * 60 + (+p[1] || 0); }
  function clock(m) { var h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + (mm < 10 ? '0' : '') + mm + (h >= 12 ? ' pm' : ' am'); }
  function keyOf(y, m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
  function addDays(key, n) { var d = new Date(Date.parse(key + 'T12:00:00Z') + n * 864e5); return d.toISOString().slice(0, 10); }
  function dowOf(key) { return new Date(Date.parse(key + 'T12:00:00Z')).getUTCDay(); }
  function label(key) { var d = new Date(Date.parse(key + 'T12:00:00Z')); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }

  function create(cfg) {
    cfg = cfg && cfg.week ? cfg : FALLBACK;
    var tz = cfg.timezone || 'America/Los_Angeles', cut = +cfg.cutoff_min || 0, lead = +cfg.lead_min || 0;
    function local(now) {
      var o = {};
      new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(now || new Date()).forEach(function (p) { o[p.type] = p.value; });
      var key = keyOf(+o.year, +o.month, +o.day);
      return { key: key, dow: dowOf(key), min: (+o.hour % 24) * 60 + (+o.minute) };
    }
    function closure(key) { var c = (cfg.closures || []).filter(function (x) { return x.date === key; })[0]; return c || null; }
    function hours(key) {
      if (closure(key)) return null;
      var w = cfg.week[DAYS[dowOf(key)]];
      return w ? { open: hm(w[0]), close: hm(w[1]) } : null;
    }
    /* can a pickup at this slot be ordered at this moment? */
    function slotOk(key, t, now) {
      var h = hours(key); if (!h) return false;
      var m = slotMin(t);
      if (m < h.open || m > h.close - cut) return false;
      var n = local(now);
      if (key < n.key) return false;
      if (key === n.key && m < n.min + lead) return false;
      return true;
    }
    function state(now) {
      var n = local(now), h = hours(n.key), c = closure(n.key);
      var open = !!h && n.min >= h.open && n.min < h.close - cut;
      var why = open ? 'open' : c ? 'closure' : !h ? 'closed-day' : n.min < h.open ? 'before-open' : 'after-cutoff';
      var next = null;
      if (!open) {
        for (var i = 0; i < 14 && !next; i++) {
          var k = addDays(n.key, i), hh = hours(k);
          if (!hh) continue;
          if (i === 0 && n.min >= hh.close - cut) continue;
          var at = i === 0 ? Math.max(hh.open, n.min) : hh.open;
          next = { key: k, min: at, label: (i === 0 ? 'today' : i === 1 ? 'tomorrow' : LONG[dowOf(k)]) + ' at ' + clock(at), day: label(k) };
        }
      }
      return { open: open, why: why, closure: c, now: n, today: h ? { open: clock(h.open), close: clock(h.close), cutoff: clock(h.close - cut) } : null,
        next: next, mode: open ? 'open' : (cfg.when_closed || 'closed-preorder') };
    }
    return { cfg: cfg, local: local, hours: hours, slotOk: slotOk, state: state, clock: clock, label: label, slotMin: slotMin };
  }
  return { create: create, FALLBACK: FALLBACK };
});
