/* Purpose with Presence: native MailerLite forms (contact page, studio newsletter). No MailerLite script.
   Each form is a plain HTML POST to MailerLite's form endpoint (double opt-in is on for every form, so
   MailerLite emails a confirmation link before anyone is added). With script on, this file checks the
   required fields with written messages, drops honeypot submissions, posts with fetch and shows the
   form's own thank-you block. Nothing is stored in the browser.
   Hygiene contract: reads only the form it enhances; writes only that form's status and thank-you text. */
(function () {
  "use strict";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  Array.prototype.forEach.call(document.querySelectorAll("form[data-ml]"), function (form) {
    var status = form.querySelector("[data-ml-status]"), done = form.querySelector("[data-ml-done]"), btn = form.querySelector("button[type=submit]");
    var label = btn ? btn.textContent : "";
    function fields() { return Array.prototype.slice.call(form.querySelectorAll("[data-ml-check]")); }
    function ok(el) {
      if (el.type === "email") return EMAIL.test(el.value.trim());
      if (el.type === "radio") return !!form.querySelector('input[name="' + el.name + '"]:checked');
      if (el.type === "checkbox") return el.checked;
      return el.value.trim().length > 1;
    }
    function validate() {
      var first = null, seen = {};
      fields().forEach(function (el) {
        if (el.type === "radio") { if (seen[el.name]) return; seen[el.name] = 1; }
        var good = ok(el), err = document.getElementById(el.getAttribute("data-ml-check"));
        if (err) err.hidden = good;
        el.setAttribute("aria-invalid", good ? "false" : "true");
        if (!good && !first) first = el;
      });
      return first;
    }
    form.addEventListener("input", function (ev) {
      var el = ev.target;
      if (el.hasAttribute && el.hasAttribute("data-ml-check") && el.getAttribute("aria-invalid") === "true" && ok(el)) {
        var err = document.getElementById(el.getAttribute("data-ml-check")); if (err) err.hidden = true;
        el.setAttribute("aria-invalid", "false");
      }
    });
    function finished() {
      Array.prototype.forEach.call(form.children, function (c) { if (c !== done) c.hidden = true; });
      if (done) { done.hidden = false; done.focus(); }
    }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var bad = validate();
      if (bad) { if (status) status.textContent = "A field needs a fix before we can send this."; bad.focus(); return; }
      var hp = form.querySelector("[data-ml-hp]");
      if (hp && hp.value) { finished(); return; }
      if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending"; }
      if (status) status.textContent = "Sending.";
      var data = new FormData(form);
      if (hp) data.delete(hp.name);
      fetch(form.getAttribute("action"), { method: "POST", body: data, mode: "no-cors" })
        .then(function () { finished(); })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = label; }
          if (status) status.textContent = "That did not go through, likely a connection problem. Try again, or email aivguide@gmail.com.";
        });
    });
  });
})();
