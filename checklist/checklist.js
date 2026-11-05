/* Checklist page: a print button and a running tally. No storage: ticks last only while the page is open. */
(function () {
  "use strict";
  var btn = document.querySelector("[data-print]");
  if (btn && window.print) { btn.hidden = false; btn.addEventListener("click", function () { window.print(); }); }
  var boxes = Array.prototype.slice.call(document.querySelectorAll(".points input[type=checkbox]"));
  var tally = document.querySelector("[data-tally]"), text = document.querySelector("[data-tally-text]");
  function render() {
    var n = boxes.filter(function (b) { return b.checked; }).length;
    tally.hidden = false;
    text.textContent = n === 12 ? "All 12 points pass." : n + " of 12 points pass. " + (12 - n) + " to fix.";
  }
  boxes.forEach(function (b) { b.addEventListener("change", render); });
  var ev = window.pwpEvents = window.pwpEvents || [];
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-track]") : null;
    if (!el) return;
    var row = { e: el.getAttribute("data-track"), t: Math.round(performance.now()), d: null };
    ev.push(row);
    try { document.dispatchEvent(new CustomEvent("pwp:track", { detail: row })); } catch (err) { /* old browsers */ }
  });
})();
