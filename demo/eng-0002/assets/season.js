/* Season layer, 28 Oct 2026. Loaded synchronously in <head> so the look is set before first paint (about 1 KB,
   no fetch). ?season=<id> previews a look; otherwise the window that holds today's Pasadena date, shortest window
   first; otherwise maison. The window table between the markers is written from assets/seasons.json by
   tools/regen_static.py (run it or --check before every publish). In the Shopify build the same table is a
   metaobject read in Liquid and one theme setting (Season: Auto or a named look). */
(function () {
  var T = /*SEASONS:START*/{"ids":["maison","toussaint","thanksgiving","noel","valentine","paques"],"windows":[["toussaint","2026-10-17","2026-11-02"],["thanksgiving","2026-11-03","2026-11-26"],["noel","2026-11-27","2026-12-26"],["valentine","2027-02-01","2027-02-14"],["paques","2027-03-14","2027-03-28"],["toussaint","2027-10-16","2027-11-02"],["thanksgiving","2027-11-02","2027-11-25"],["noel","2027-11-26","2027-12-26"],["valentine","2028-02-01","2028-02-14"],["paques","2028-04-02","2028-04-16"]]}/*SEASONS:END*/, ids = T.ids || ['maison'], W = T.windows || [];
  var q = /[?&]season=([a-z-]+)/.exec(location.search), want = q && q[1], pick = 'maison', preview = false;
  if (want && ids.indexOf(want) >= 0) { pick = want; preview = true; }
  else {
    var o = {}, today;
    try { new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); today = o.year + '-' + o.month + '-' + o.day; } catch (e) { today = new Date().toISOString().slice(0, 10); }
    var best = null, len = Infinity;
    for (var i = 0; i < W.length; i++) { var w = W[i]; if (w[1] <= today && today <= w[2]) { var d = Date.parse(w[2]) - Date.parse(w[1]); if (d < len) { len = d; best = w[0]; } } }
    if (best) pick = best;
  }
  document.documentElement.setAttribute('data-season', pick);
  window.IDE_SEASON = { id: pick, preview: preview };
})();
