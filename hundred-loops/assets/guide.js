/* Hundred Loops guide: three small behaviours. The pages read fine without this file.
   1. Copy buttons on code and prompt blocks.  2. The contents drawer on a phone.  3. The shelf filter on "The hundred". */
(function () {
  "use strict";
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-copy]");
    if (!b) return;
    var pre = b.closest("figure").querySelector("pre");
    var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(done, function () { b.textContent = "Select and copy"; });
    else b.textContent = "Select and copy";
  });

  var menu = document.querySelector(".menu"), drawer = document.getElementById("index");
  if (menu && drawer) menu.addEventListener("click", function () {
    var open = drawer.classList.toggle("open");
    menu.setAttribute("aria-expanded", open ? "true" : "false");
  });

  var filter = document.querySelector(".filter");
  if (filter) filter.addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b) return;
    var want = b.getAttribute("data-shelf");
    Array.prototype.forEach.call(filter.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    Array.prototype.forEach.call(document.querySelectorAll(".shelf"), function (s) { s.hidden = !!want && s.getAttribute("data-shelf") !== want; });
  });
})();
