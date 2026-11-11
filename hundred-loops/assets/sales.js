/* Hundred Loops sales page: selecting a plate on the wall shows that pattern in the reading panel.
   Without this file the panel shows pattern 001 and everything else reads the same. Nothing is stored or sent. */
(function () {
  "use strict";
  var reader = document.getElementById("reader");
  var wall = document.querySelector(".swall");
  if (!reader || !wall) return;
  var path = reader.querySelector(".plate-read path");
  var dots = reader.querySelectorAll(".plate-read .st");
  var field = function (name) { return reader.querySelector('[data-r="' + name + '"]'); };

  function show(btn) {
    var p = JSON.parse(btn.getAttribute("data-p"));
    Array.prototype.forEach.call(wall.querySelectorAll(".wp"), function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    path.setAttribute("d", btn.querySelector("path").getAttribute("d"));
    p.st.forEach(function (xy, i) { dots[i].setAttribute("cx", xy[0]); dots[i].setAttribute("cy", xy[1]); });
    field("n").textContent = p.n;
    field("name").textContent = p.name;
    field("shelf").textContent = "Shelf " + p.shelf;
    p.loop.forEach(function (text, i) { reader.querySelector('[data-loop="' + i + '"]').textContent = text; });
    var s = field("starter");
    s.hidden = !p.starter;
    if (p.starter) s.innerHTML = "Built in full, with the starter app <b translate=\"no\"></b>.", s.querySelector("b").textContent = p.starter;
  }
  wall.addEventListener("click", function (ev) {
    var b = ev.target.closest(".wp");
    if (b) { reader.classList.remove("intro"); show(b); }
  });

  /* The one orchestrated moment: the four stations of the first plate appear in order, once. Opacity only. */
  if (window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    reader.classList.add("intro");
    Array.prototype.forEach.call(dots, function (d, i) { setTimeout(function () { d.classList.add("on"); }, 300 + i * 260); });
  }
})();
