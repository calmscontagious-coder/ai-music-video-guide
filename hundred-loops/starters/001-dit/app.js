/* Dit: the streak lesson pattern, in one file you can read top to bottom.
   Pattern 001 of Hundred Loops. Plain JavaScript, no libraries, no network.
   The loop: a prompt you chose (opening the app) -> a two-minute lesson -> a visible gain
   (two new letters, streak +1) -> a reason to return (tomorrow's letters are shown, not hidden).
   Rename it, change the subject, change the art. The rules below are yours to keep. */
(function () {
  "use strict";

  // #region data
  // The subject matter. Morse code is public domain, which is why it is the example.
  // To teach something else, replace CODE and LESSONS; nothing else needs to change.
  const CODE = { E: ".", T: "-", A: ".-", N: "-.", I: "..", M: "--", S: "...", O: "---", R: ".-.", K: "-.-",
    D: "-..", U: "..-", G: "--.", W: ".--", H: "....", L: ".-..", B: "-...", C: "-.-.", F: "..-.", P: ".--.",
    J: ".---", V: "...-", Q: "--.-", X: "-..-", Y: "-.--", Z: "--.." };
  const LESSONS = ["ET", "AN", "IM", "SO", "RK", "DU", "GW", "HL", "BC", "FP", "JV", "QX", "YZ"];
  const MAX_RESTS = 2;
  // #endregion data

  // #region clock
  // One source of "today". Add ?day=2026-03-02 to the address to visit another day,
  // which is how you (and the test) check what happens after a missed day without waiting.
  const params = new URLSearchParams(location.search);
  function today() {
    const forced = params.get("day");
    if (forced && /^\d{4}-\d{2}-\d{2}$/.test(forced)) return forced;
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function daysBetween(a, b) { // whole days from a to b, both "YYYY-MM-DD"
    return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  }
  // #endregion clock

  // #region storage
  // Everything the app knows about you, in one object, on this device only.
  const KEY = "hl.dit.v1";
  const fresh = () => ({ v: 1, streak: 0, best: 0, lastDone: null, rests: MAX_RESTS, lesson: 0, known: [], sound: true });
  function load() {
    if (params.has("fresh")) localStorage.removeItem(KEY);
    try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return fresh(); }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
  let S = load();
  // #endregion storage

  // #region streak
  // The streak rule, and the part that makes it one you can defend:
  // a missed day spends a rest day instead of wiping the count, and a real break
  // restarts the streak without taking away anything you learned.
  function finishDay(state, day) {
    if (state.lastDone === day) return { changed: false, usedRests: 0, restarted: false };
    const gap = state.lastDone ? daysBetween(state.lastDone, day) : 1;
    const missed = Math.max(0, gap - 1);
    let usedRests = 0, restarted = false;
    if (missed === 0) state.streak += 1;
    else if (missed <= state.rests) { state.rests -= missed; usedRests = missed; state.streak += 1; }
    else { state.streak = 1; restarted = true; }
    if (state.streak % 7 === 0 && state.rests < MAX_RESTS) state.rests += 1; // earn one back each week
    state.best = Math.max(state.best, state.streak);
    state.lastDone = day;
    return { changed: true, usedRests: usedRests, restarted: restarted };
  }
  // What the home screen should say about the streak right now, before any lesson.
  function streakStatus(state, day) {
    if (!state.lastDone) return { shown: 0, note: "A streak counts the days you did a lesson." };
    const gap = daysBetween(state.lastDone, day);
    if (gap <= 0) return { shown: state.streak, note: "Done for today. Best so far: " + state.best + "." };
    if (gap === 1) return { shown: state.streak, note: "Today's lesson keeps it going." };
    if (gap - 1 <= state.rests) return { shown: state.streak, note: "You missed " + (gap - 1) + (gap === 2 ? " day" : " days") + ". A rest day covers it if you do today's lesson." };
    return { shown: 0, note: "Welcome back. The streak starts again today; the " + state.known.length + " letters you know are still yours." };
  }
  // #endregion streak

  // #region lesson
  // A small random number generator with a seed, so a given day always asks the same
  // questions. That makes the app testable, and nobody can reload until the questions get easy.
  function rng(seedText) {
    let h = 2166136261;
    for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  }
  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function buildLesson(state, day, practice) {
    const rand = rng(day + (practice ? "p" : "l") + state.lesson);
    const fresh2 = practice || state.lesson >= LESSONS.length ? [] : LESSONS[state.lesson].split("");
    const pool = Array.from(new Set(state.known.concat(fresh2)));
    const steps = fresh2.map((L) => ({ kind: "show", letter: L }));
    const quizzed = shuffle(fresh2.concat(shuffle(pool, rand).slice(0, 2)), rand).slice(0, practice ? 5 : 4);
    quizzed.forEach((L) => {
      const others = shuffle(Object.keys(CODE).filter((x) => x !== L), rand).slice(0, 3);
      steps.push({ kind: "pick", letter: L, options: shuffle(others.concat(L), rand) });
    });
    shuffle(pool, rand).slice(0, 2).forEach((L) => steps.push({ kind: "key", letter: L }));
    return steps;
  }
  // #endregion lesson

  // #region sound
  // Morse is sound first. Built with the Web Audio API so there are no audio files.
  let audio = null;
  function play(code) {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      let t = audio.currentTime + 0.05;
      for (const mark of code) {
        const len = mark === "." ? 0.09 : 0.27;
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.frequency.value = 620; osc.connect(gain); gain.connect(audio.destination);
        gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        gain.gain.setValueAtTime(0.25, t + len - 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
        osc.start(t); osc.stop(t + len + 0.02); t += len + 0.09;
      }
    } catch (e) { /* no sound available: the lesson still works by sight */ }
  }
  // #endregion sound

  // ---------- screens ----------
  const $ = (id) => document.getElementById(id);
  const pretty = (code) => code.replace(/\./g, "·").replace(/-/g, "–");
  let steps = [], at = 0, typed = "", practice = false, answered = false, missed = 0;

  function show(name) { ["home", "lesson", "done"].forEach((n) => { $(n).hidden = n !== name; }); window.scrollTo(0, 0); }

  function renderHome() {
    const day = today(), st = streakStatus(S, day), doneToday = S.lastDone === day, finished = S.lesson >= LESSONS.length;
    $("streak-n").textContent = st.shown;
    $("streak-word").textContent = st.shown === 1 ? "day" : "days";
    $("streak-note").textContent = st.note;
    $("today-kicker").textContent = doneToday ? "Tomorrow" : finished ? "Today: review" : "Today: lesson " + (S.lesson + 1) + " of " + LESSONS.length;
    $("today-letters").textContent = finished ? "All 26" : LESSONS[S.lesson].split("").join("  ");
    $("start").hidden = doneToday; $("today-done").hidden = !doneToday;
    $("practice").hidden = !(doneToday && S.known.length > 1);
    $("known").innerHTML = S.known.map((L) => "<li><b>" + L + "</b><span>" + pretty(CODE[L]) + "</span></li>").join("");
    $("known-empty").hidden = S.known.length > 0;
    show("home");
  }

  function startLesson(isPractice) {
    practice = isPractice; steps = buildLesson(S, today(), practice); at = 0; missed = 0;
    show("lesson"); renderStep();
  }

  function renderStep() {
    const s = steps[at]; answered = false; typed = "";
    $("q-i").textContent = at + 1; $("q-n").textContent = steps.length;
    $("bar-fill").style.width = Math.round((at / steps.length) * 100) + "%";
    $("feedback").textContent = ""; $("feedback").className = "feedback";
    $("choices").hidden = s.kind !== "pick"; $("keyer").hidden = s.kind !== "key";
    $("hear").hidden = s.kind === "key"; $("next").hidden = s.kind !== "show";
    $("next").textContent = "Got it";
    if (s.kind === "show") {
      $("q-h").textContent = "New letter: " + s.letter; $("q-code").textContent = pretty(CODE[s.letter]); play(CODE[s.letter]);
    } else if (s.kind === "pick") {
      $("q-h").textContent = "Which letter is this?"; $("q-code").textContent = pretty(CODE[s.letter]); play(CODE[s.letter]);
      $("choices").innerHTML = s.options.map((L) => '<button class="choice" type="button" data-letter="' + L + '">' + L + "</button>").join("");
    } else {
      $("q-h").textContent = "Key the letter " + s.letter; $("q-code").textContent = ""; $("typed").textContent = "";
    }
  }

  function answer(ok, rightText) {
    if (answered) return; answered = true; if (!ok) missed += 1;
    $("feedback").textContent = ok ? "Right." : "Not quite. " + rightText;
    $("feedback").className = "feedback " + (ok ? "right" : "wrong");
    $("next").hidden = false; $("next").textContent = at === steps.length - 1 ? "Finish" : "Next"; $("next").focus();
  }

  function next() {
    if (at < steps.length - 1) { at += 1; renderStep(); return; }
    if (practice) { renderHome(); return; }
    const learned = S.lesson < LESSONS.length ? LESSONS[S.lesson].split("") : [];
    learned.forEach((L) => { if (!S.known.includes(L)) S.known.push(L); });
    if (S.lesson < LESSONS.length) S.lesson += 1;
    const r = finishDay(S, today()); save();
    $("done-line").textContent = learned.length ? "You now know " + learned.join(" and ") + ". " + S.known.length + " of 26 letters." : "Review done. All 26 letters are yours.";
    $("done-streak").textContent = (r.restarted ? "A new streak starts today: " : r.usedRests ? "A rest day covered the gap. Streak: " : "Streak: ") + S.streak + (S.streak === 1 ? " day." : " days.") + (missed ? " You missed " + missed + " along the way, which is how learning goes." : "");
    show("done"); $("home-btn").focus();
  }

  // ---------- wiring ----------
  $("start").addEventListener("click", () => startLesson(false));
  $("practice").addEventListener("click", () => startLesson(true));
  $("quit").addEventListener("click", renderHome);
  $("home-btn").addEventListener("click", renderHome);
  $("next").addEventListener("click", next);
  $("hear").addEventListener("click", () => play(CODE[steps[at].letter]));
  $("choices").addEventListener("click", (ev) => {
    const b = ev.target.closest(".choice"); if (!b || answered) return;
    const s = steps[at], ok = b.dataset.letter === s.letter;
    b.classList.add(ok ? "right" : "wrong");
    if (!ok) $("choices").querySelector('[data-letter="' + s.letter + '"]').classList.add("right");
    answer(ok, pretty(CODE[s.letter]) + " is " + s.letter + ".");
  });
  function key(mark) { if (answered || typed.length >= 5) return; typed += mark; $("typed").textContent = pretty(typed); play(mark); }
  $("key-dit").addEventListener("click", () => key("."));
  $("key-dah").addEventListener("click", () => key("-"));
  $("key-undo").addEventListener("click", () => { if (!answered) { typed = typed.slice(0, -1); $("typed").textContent = pretty(typed); } });
  $("key-send").addEventListener("click", () => { const s = steps[at]; if (typed) answer(typed === CODE[s.letter], s.letter + " is " + pretty(CODE[s.letter]) + "."); });

  // Settings: sound, your data out, your data gone. Leaving is always one tap.
  $("open-settings").addEventListener("click", () => { $("sound").checked = S.sound; $("rests").textContent = S.rests; $("set-msg").textContent = ""; $("settings").showModal(); });
  $("close-settings").addEventListener("click", () => $("settings").close());
  $("sound").addEventListener("change", (ev) => { S.sound = ev.target.checked; save(); });
  $("export").addEventListener("click", () => {
    const text = JSON.stringify(S, null, 1);
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
      () => { $("set-msg").textContent = "Copied. Paste it anywhere to keep it."; },
      () => { $("set-msg").textContent = text; });
  });
  let eraseArmed = false;
  $("erase").addEventListener("click", () => { // two taps, no pop-up, no guilt copy
    if (!eraseArmed) { eraseArmed = true; $("erase").textContent = "Tap again to erase everything"; return; }
    localStorage.removeItem(KEY); S = fresh(); eraseArmed = false; $("erase").textContent = "Erase my data";
    $("set-msg").textContent = "Erased."; renderHome();
  });

  // For the test harness and for your own poking around in the console.
  window.__app = {
    state: () => JSON.parse(JSON.stringify(Object.assign({ today: today(), screen: ["home", "lesson", "done"].find((n) => !$(n).hidden), step: steps[at] || null }, S))),
    reset: () => { localStorage.removeItem(KEY); S = fresh(); renderHome(); },
    code: CODE,
  };

  renderHome();
})();
