/* Purpose with Presence Studio: the "what do you need?" picker lights the plan that covers every need
   tapped (instrument-panel state, no motion beyond a 200 ms state change). No dependencies, no network calls, no storage.
   Tracking: elements carry data-track="studio_cta_*"; the site's event Worker can count them later. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");

  /* Picker: the highest plan any tapped need requires is the plan that covers them all. */
  var picker = document.querySelector("[data-picker]");
  if (!picker) return;
  var NAMES = { 1: "Essentials", 2: "Growth", 3: "Signature" };
  var PRICES = { 1: "$1,200", 2: "$2,400", 3: "$3,300" };
  var IDS = { 1: "tier-essentials", 2: "tier-growth", 3: "tier-signature" };
  var chips = picker.querySelectorAll(".chip");
  var out = picker.querySelector(".picker-out");
  var reset = picker.querySelector("[data-picker-reset]");
  var cards = document.querySelectorAll("[data-tier-card]");
  var toggle = picker.querySelector(".picker-toggle");
  var body = document.getElementById(toggle.getAttribute("aria-controls"));
  picker.hidden = false;
  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    body.hidden = !open;
  });

  function render() {
    var need = 0, count = 0;
    chips.forEach(function (c) {
      if (c.getAttribute("aria-pressed") === "true") {
        count += 1;
        need = Math.max(need, parseInt(c.getAttribute("data-tier"), 10));
      }
    });
    cards.forEach(function (card) {
      var n = parseInt(card.getAttribute("data-tier-card"), 10);
      var note = card.querySelector(".fit-note");
      if (!need) { card.removeAttribute("data-fit"); if (note) note.hidden = true; return; }
      card.setAttribute("data-fit", n === need ? "yes" : "no");
      if (note) note.hidden = n !== need;
    });
    var tiersEl = document.querySelector("[data-tiers]");
    if (tiersEl) tiersEl.classList.toggle("has-fit", !!need);
    picker.classList.toggle("has-pick", !!count);
    reset.hidden = !count;
    out.textContent = "";
    if (!need) return;
    var what = count === 1 ? "that" : count === 2 ? "both" : "all " + count;
    out.appendChild(document.createTextNode(NAMES[need] + " covers " + what + ", from " + PRICES[need] + " a month. "));
    var a = document.createElement("a");
    a.href = "#" + IDS[need];
    a.textContent = "See " + NAMES[need];
    a.setAttribute("data-track", "studio_cta_picker_result");
    out.appendChild(a);
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true");
      render();
    });
  });
  reset.addEventListener("click", function () {
    chips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
    render();
    if (chips[0]) chips[0].focus();
  });
})();
