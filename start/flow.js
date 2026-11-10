/* Grow With AI free setup flow.
   One question per screen. A formal setup voice asks; then the trainer (Sam or Travis) takes over.
   Answers are kept in this browser (localStorage); when the questions are done they are sent to us once
   (sendAnswers: no name or email). Name and email are sent only if the visitor chooses to.
   Never asks for passwords, codes, card, bank or ID details. */
(function () {
"use strict";
var CFG = { form_endpoint: "https://formsubmit.co/ajax/7fbd7e6f9b9178360b909504bd877f07", min_seconds_before_send: 10, mailchimp_action: (typeof MC_ACTION !== "undefined" && MC_ACTION) || "" /* set in shared/leads.js */ };
var KEY = "wc-intake-v3";
var SECTIONS = ["Welcome", "About you", "Your setup", "Your trainer", "Your result"];
var START = Date.now();
var A = {}, step = 0, meta = { backs: {}, hes: 0 };
var PROMPT = { grok: text("P_GROK"), claude: text("P_CLAUDE") };
function text(id) { var n = document.getElementById(id); return n ? n.textContent.replace(/^\n/, "") : ""; }

/* ---------- theme (unchanged from v2) ---------- */
try { var t = localStorage.getItem("wc-intake-v1-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
function isDark() { var d = document.documentElement.dataset.theme; return d === "dark" || (!d && matchMedia("(prefers-color-scheme:dark)").matches); }
function paintTheme() { document.getElementById("theme").textContent = isDark() ? "Light" : "Dark"; }
document.getElementById("theme").onclick = function () {
  document.documentElement.dataset.theme = isDark() ? "light" : "dark";
  try { localStorage.setItem("wc-intake-v1-theme", document.documentElement.dataset.theme); } catch (e) {}
  paintTheme();
};
paintTheme();

/* ---------- storage ---------- */
function save() { try { localStorage.setItem(KEY, JSON.stringify({ A: A, step: step, meta: meta })); } catch (e) {} }
function restore() { try { var r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && r.A) { A = r.A; step = r.step || 0; meta = r.meta || meta; } } catch (e) {} }
function clearAll() { try { localStorage.removeItem(KEY); } catch (e) {} A = {}; step = 0; meta = { backs: {}, hes: 0 }; }

/* ---------- questions ---------- */
var EMAIL_OPTS = [
  { v: "gmail", label: "Gmail" },
  { v: "m365", label: "Microsoft 365 / Outlook for work (blue Outlook logo, company address)" },
  { v: "outlookcom", label: "Outlook.com, Hotmail or Live (personal)" },
  { v: "other", label: "Something else" },
  { v: "none", label: "I don't have an email address yet" }
];
var Q = {
  q1: { sec: 1, type: "text", text: "What kind of business do you run?", ph: "Type it, or tap one below", chips: ["Salon or spa", "Home services", "Contractor", "Retail shop", "Restaurant or food", "Real estate", "Events", "Professional services", "Other"] },
  q2: { sec: 1, type: "text", text: "What takes up too much of your week?", help: "Pick as many as you like.", multi: true, ph: "Anything else? Type it here (optional)", chips: ["Email", "Quotes and invoices", "Scheduling", "Follow-ups", "Customer questions", "Social media posts", "Bookkeeping"] },
  q3: { sec: 2, type: "single", multi: true, only: "none", text: "Where does your work email live?", help: "Pick all that you use. Not sure? Check the address you send email from. Ending in @gmail.com means Gmail.", options: EMAIL_OPTS },
  q4a: { sec: 2, type: "single", text: "What do you work on most days?", options: [{ v: "mac", label: "Mac" }, { v: "windows", label: "Windows computer" }, { v: "phone", label: "Mostly my phone" }] },
  q4b: { sec: 2, type: "single", text: "Which web browser do you use?", options: [{ v: "chrome", label: "Chrome" }, { v: "edge", label: "Edge" }, { v: "safari", label: "Safari" }, { v: "other", label: "Other / not sure" }] },
  q5a: { sec: 2, type: "single", text: "How comfortable are you with new apps?", options: [{ v: "start", label: "Just starting" }, { v: "getting", label: "Getting there" }, { v: "very", label: "Very comfortable" }] },
  q5b: { sec: 2, type: "single", text: "Have you used an AI chat app before?", options: [{ v: "no", label: "No" }, { v: "little", label: "A little" }, { v: "lot", label: "A lot" }] },
  q5c: { sec: 2, type: "single", text: "Okay to add a small browser add-on if we walk you through it?", options: [{ v: "yes", label: "Yes" }, { v: "no", label: "I'd rather not" }] },
  q6: { sec: 3, type: "single", text: "Pick your trainer: Sam or Travis.", help: "Sam has a female voice and style; Travis has a male voice and style. You can switch any time.", options: [{ v: "Sam", label: "Sam" }, { v: "Travis", label: "Travis" }, { v: "Sam", label: "Either is fine", id: "either" }] }
};

/* ---------- no-email branch ---------- */
var GMAIL_STEPS = [
  { t: "Open Google's sign-up page.", link: ["https://accounts.google.com/signup", "Open accounts.google.com/signup"], see: "Google's “Create a Google Account” page" },
  { t: "Type your first and last name. Click Next.", see: "a page asking for your birthday" },
  { t: "Enter your birthday and gender. Click Next.", see: "a page about choosing your Gmail address" },
  { t: "Pick “Create your own Gmail address” and type one you like (for example yourbusinessname@gmail.com). Click Next.", see: "a page asking you to create a password" },
  { t: "Create a strong password you'll remember. Write it somewhere safe, not here. Click Next.", see: "the next page (Google may ask for a phone number)" },
  { t: "Google may ask for a phone number and send a code by text. Type the code on Google's page only.", see: "Google accept the code, or move to the next page" },
  { t: "Add a recovery email or phone if asked (recommended). Review and click “I agree”.", see: "Google finish creating your account" },
  { t: "Open your new Gmail.", link: ["https://mail.google.com", "Open Gmail"], see: "your new Gmail inbox", final: true }
];
var GMAIL_HELP = ["Username taken? Add your town or a number.", "No code arrived? Wait a minute, check the number, and try “Resend”.", "Asked for a phone you don't have? Use Outlook.com instead."];
var OUTLOOK_STEPS = [
  { t: "Open Microsoft's sign-up page.", link: ["https://signup.live.com", "Open signup.live.com"], see: "Microsoft's “Create your Microsoft account” page" },
  { t: "Type the address you want and pick @outlook.com. Click Next.", see: "a page asking you to create a password" },
  { t: "Create your password (only on Microsoft's page). Click Next.", see: "a page asking for your name" },
  { t: "Type your name, country and birthday.", see: "a quick puzzle check" },
  { t: "Complete the puzzle check.", see: "Microsoft finish creating your account" },
  { t: "Open your new Outlook inbox.", link: ["https://outlook.live.com", "Open Outlook.com"], see: "your Outlook inbox", final: true }
];
var OUTLOOK_HELP = ["Address taken? Add your town or a number.", "The puzzle won't load? Refresh the page and try again."];

/* ---------- plan of screens ---------- */
/* Chris, Nov 6: "set people up only on grok for now". The Claude branch stays (unused) so it can come back. */
var GROK_ONLY = true;
// TEAM_SEAT: when true, the setup flow asks for a seat on the Ward Consulting AI Grok Business team instead of
// using the person's own Grok account. Chris, 2026-11-09: Grok team seats are now a $35/seat add-on for Pro
// ($99.99) and Elite only; free setup users use their own free Grok account (grok.com or the free Grok app).
var TEAM_SEAT = false;
function baseTrack() {
  if (GROK_ONLY) return "grok";
  if (A.q4a === "phone") return "grok";
  if (A.q4b === "chrome" && (A.q5a === "very" || A.q5b === "lot")) return "claude";
  return "grok";
}
function track() { var b = baseTrack(); if (GROK_ONLY) return b; return A.switched ? (b === "grok" ? "claude" : "grok") : b; }
function emailType() { return A.q3 === "none" ? (A.newEmail || "gmail") : A.q3; }
function trainer() { return A.q6 || "Sam"; }

function plan() {
  var P = [{ k: "welcome", sec: 0 }, { k: "ask", id: "q1" }, { k: "ask", id: "q2" }, { k: "ask", id: "q3" }];
  if (A.q3 === "none") {
    P.push({ k: "ne_choice", sec: 2 });
    var steps = A.neKind === "outlookcom" ? OUTLOOK_STEPS : GMAIL_STEPS;
    if (A.neKind) steps.forEach(function (s, i) { P.push({ k: "ne_step", sec: 2, i: i }); });
  }
  P.push({ k: "ask", id: "q4a" });
  // Browser, comfort and add-on questions only chose Claude; with GROK_ONLY they are not asked.
  if (!GROK_ONLY && A.q4a && A.q4a !== "phone") P.push({ k: "ask", id: "q4b" });
  if (!GROK_ONLY) P.push({ k: "ask", id: "q5a" });
  P.push({ k: "ask", id: "q5b" });
  if (!GROK_ONLY && A.q5a && A.q5b && A.q4b === "chrome") P.push({ k: "ask", id: "q5c" });
  P.push({ k: "ask", id: "q6" }, { k: "handoff", sec: 3 }, { k: "reflect", sec: 3 }, { k: "result", sec: 4 });
  return P;
}
function secOf(s) { return s.k === "ask" ? Q[s.id].sec : s.sec; }

/* ---------- dom helpers ---------- */
function el(tag, attrs, txt) { var n = document.createElement(tag); if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]); if (txt != null) n.textContent = txt; return n; }
function host() { return document.getElementById("q"); }
// Short videos: Chris (V1-V7, V10) and the AI trainers Sam and Travis. Never autoplay; captions on by default.
var VIDEO_BASE = "video/";
function vid(name, label, cls) {
  var f = el("figure", { class: "vid" + (cls ? " " + cls : "") });
  var v = el("video", { controls: "", preload: "none", playsinline: "", poster: VIDEO_BASE + "gwai-" + name + ".jpg", "aria-label": label });
  v.appendChild(el("source", { src: VIDEO_BASE + "gwai-" + name + ".mp4", type: "video/mp4" }));
  v.appendChild(el("track", { kind: "captions", srclang: "en", label: "English", src: VIDEO_BASE + "gwai-" + name + ".vtt", default: "" }));
  f.appendChild(v); f.appendChild(el("figcaption", null, label));
  return f;
}
var idleTimer = null;

function waitlistScreen(h) { // CAPACITY.mode === "waitlist" (start/capacity.js)
  var when = (window.CAPACITY && CAPACITY.nextCohort) ? " (" + CAPACITY.nextCohort + ")" : "";
  h.appendChild(el("p", { class: "voice" }, "Setup"));
  h.appendChild(el("h1", null, "This week's setup spots are full."));
  h.appendChild(el("p", null, "Join the waitlist and we'll email you when the next group opens" + when + "."));
  var f = el("form", { novalidate: "novalidate" });
  var l = el("label", { class: "fl", for: "wem" }, "Your email"); var em = el("input", { id: "wem", type: "email", autocomplete: "email", required: "required" });
  var cons = el("label", { class: "opt", style: "margin-top:12px" }); var cb = el("input", { type: "checkbox", id: "wcons" });
  var cl = el("span", { class: "lab" }, (window.GWAILead ? GWAILead.consentText : "Email me when the next group opens.") + " "); cl.appendChild(el("a", { href: "../privacy/" }, "Privacy"));
  cons.appendChild(cb); cons.appendChild(cl);
  var send = el("button", { class: "go", type: "submit", style: "margin-top:18px" }, "Join the waitlist");
  var msg = el("p", { class: "help", role: "status", "aria-live": "polite" }, "");
  [l, em, cons, send, msg].forEach(function (n) { f.appendChild(n); }); h.appendChild(f);
  f.onsubmit = function (ev) {
    ev.preventDefault(); var v = (em.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = "That email doesn't look right. Check it and try again."; em.focus(); return; }
    if (!cb.checked) { msg.textContent = "Tick the box so we're allowed to email you."; cb.focus(); return; }
    send.disabled = true; msg.textContent = "Sending…";
    window.GWAILead.send({ email: v, list: "start-waitlist", consent: true, subject: "Setup waitlist (" + v + ")" })
      .then(function () { msg.textContent = "Thanks, you're on the list. We'll email you when the next group opens."; })
      .catch(function (e) { send.disabled = false; msg.textContent = "That didn't go through (" + e.message + "). Try again in a minute."; });
  };
}

function render() {
  clearTimeout(idleTimer);
  if (window.CAPACITY && CAPACITY.mode === "waitlist" && !/[?&]member=1(&|$)/.test(location.search)) { // members (from /welcome/) skip the waitlist
    var wh = host(); wh.innerHTML = ""; wh.className = "screen"; waitlistScreen(wh); return; }
  var P = plan(); if (step >= P.length) step = P.length - 1; if (step < 0) step = 0;
  var s = P[step], h = host();
  h.innerHTML = ""; h.className = "screen";
  var si = secOf(s), ul = document.getElementById("steps"); ul.innerHTML = "";
  SECTIONS.forEach(function (_, i) { ul.appendChild(el("li", { "data-on": i <= si ? "1" : "0" })); });
  document.getElementById("stepname").textContent = "Section " + (si + 1) + " of " + SECTIONS.length + " · " + SECTIONS[si];
  if (step > 0) { var bt = el("button", { class: "backtop", type: "button", "aria-label": "Go back to the previous screen" }, "← Back"); bt.onclick = back; h.appendChild(bt); }
  ({ welcome: welcome, ask: ask, ne_choice: neChoice, ne_step: neStep, handoff: handoff, reflect: reflect, result: result })[s.k](h, s);
  save();
  var f = h.querySelector("h1"); if (f && render.ready) { f.setAttribute("tabindex", "-1"); f.focus(); }
  render.ready = true;
}
function go(n) { step += n; save(); render(); window.scrollTo(0, 0); }
function next() { go(1); }
var RESULT_SKIP = function () { return false; };
function back() {
  var cur = plan()[step]; if (cur && cur.k === "result" && (A.rs || 0) > 0) { var i = A.rs - 1; while (i > 0 && RESULT_SKIP(i)) i--; A.rs = i; save(); render(); window.scrollTo(0, 0); return; }
  var P = plan(), prev = P[step - 1];
  if (prev && prev.k === "ask") meta.backs[prev.id] = (meta.backs[prev.id] || 0) + 1;
  go(-1);
}
function thanks(msg, then) {
  var h = host(); h.innerHTML = "";
  var p = el("p", { class: "flash", role: "status" }, msg || "Thank you."); h.appendChild(p);
  setTimeout(then, msg && msg.length > 12 ? 1200 : 650);
}
function navRow(h, onNext, enabled, label) {
  var row = el("div", { class: "nav" });
  var b = el("button", { class: "go", type: "button" }, label || "Next");
  if (!enabled) b.disabled = true;
  b.onclick = onNext; row.appendChild(b); h.appendChild(row); return b;
}
function hesitance(h, id) {
  var note = el("p", { class: "help hes", role: "status", "aria-live": "polite" });
  h.appendChild(note);
  var show = function () {
    if (note.textContent) return;
    note.textContent = "Sounds like this one's a bit unclear. That's normal. Pick the closest answer; you can change it later.";
    save();
  };
  if ((meta.backs[id] || 0) >= 2) show();
  idleTimer = setTimeout(show, 45000);
}

/* ---------- screens ---------- */
function welcome(h) {
  h.appendChild(el("p", { class: "voice" }, "Setup"));
  h.appendChild(el("h1", null, "Welcome to Ward Consulting AI."));
  h.appendChild(el("p", null, "We'd like to ask you a few basic questions before your trainer is set up. This helps us create an assistant that best fits your needs. Your first win takes about 10 minutes, and the full setup about 20. The setup is free."));
  h.appendChild(vid("welcome", "Video: Chris Ward welcomes you (20 seconds)"));
  h.appendChild(el("p", { class: "help" }, "Available in English in the US and Canada, except Quebec for now (no French version yet)."));
  h.appendChild(el("p", { class: "help" }, "You stay in charge. We never ask for passwords. When you finish the questions, your answers come to us so we can help. Your name and email only come to us if you choose to send them."));
  navRow(h, next, true, "Begin");
}

function ask(h, s) {
  var q = Q[s.id];
  h.appendChild(el("p", { class: "voice" }, "Setup"));
  h.appendChild(el("h1", { id: "qh" }, q.text));
  if (q.help) h.appendChild(el("p", { class: "help" }, q.help));
  if (q.type === "text") {
    var inp = el("input", { type: "text", maxlength: "120", "aria-labelledby": "qh", autocomplete: "off", placeholder: q.ph || "" });
    var picked = q.multi ? (A[s.id + "_picks"] || []).slice() : [];
    inp.value = q.multi ? (A[s.id + "_extra"] || "") : (A[s.id] || "");
    h.appendChild(inp);
    var count = el("p", { class: "help count", "aria-live": "polite" }); h.appendChild(count);
    if (q.chips) {
      var chips = el("div", { class: "chips", role: "group", "aria-label": "Suggestions" });
      q.chips.forEach(function (c) {
        var b = el("button", { class: "chipbtn", type: "button", "aria-pressed": String(q.multi ? picked.indexOf(c) >= 0 : false) }, c);
        b.onclick = function () {
          if (q.multi) { var i = picked.indexOf(c); if (i >= 0) picked.splice(i, 1); else picked.push(c); b.setAttribute("aria-pressed", String(i < 0)); upd(); return; }
          inp.value = c === "Other" ? "" : c; inp.focus(); upd();
        };
        chips.appendChild(b);
      });
      h.appendChild(chips);
    }
    var nb;
    var upd = function () { var v = inp.value.trim(); nb.disabled = !v && !picked.length; count.textContent = (120 - inp.value.length) + " characters left"; };
    var submit = function () {
      var v = inp.value.trim().slice(0, 120);
      if (q.multi) { A[s.id + "_picks"] = picked.slice(); A[s.id + "_extra"] = v; v = picked.concat(v ? [v] : []).join(", "); }
      if (!v) return;
      A[s.id] = v; save();
      thanks(s.id === "q1" && v.length > 80 ? "Thank you, that's what I needed." : "Thank you.", next);
    };
    nb = navRow(h, submit, false);
    inp.addEventListener("input", upd);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    upd();
  } else if (q.multi) {
    var picks = (A[s.id + "_all"] || (A[s.id] ? [A[s.id]] : [])).slice();
    var ul = el("ul", { class: "opts", role: "list" }), btns = [], nb;
    var paint = function () { btns.forEach(function (x) { x.b.setAttribute("aria-pressed", String(picks.indexOf(x.v) >= 0)); }); if (nb) nb.disabled = !picks.length; };
    q.options.forEach(function (o) {
      var li = el("li"), b = el("button", { class: "opt", type: "button" });
      b.appendChild(el("span", { class: "tick", "aria-hidden": "true" }, "✓"));
      b.appendChild(el("span", { class: "lab" }, o.label));
      b.onclick = function () {
        var i = picks.indexOf(o.v);
        if (i >= 0) picks.splice(i, 1);
        else if (o.v === q.only) picks = [o.v];                                  // "no email yet" stands alone
        else { picks = picks.filter(function (v) { return v !== q.only; }); picks.push(o.v); }
        paint();
      };
      btns.push({ b: b, v: o.v }); li.appendChild(b); ul.appendChild(li);
    });
    h.appendChild(ul);
    nb = navRow(h, function () {
      if (!picks.length) return;
      var prev = A[s.id];
      A[s.id + "_all"] = picks.slice(); A[s.id] = picks[0];   // the first pick stays the main one for the rest of the setup
      if (s.id === "q3" && prev !== A.q3) { delete A.neKind; delete A.newEmail; }
      save(); thanks("Thank you.", next);
    }, false);
    paint();
  } else {
    var ul = el("ul", { class: "opts", role: "list" });
    q.options.forEach(function (o) {
      var li = el("li");
      var b = el("button", { class: "opt", type: "button", "aria-pressed": String(o.id ? !!A[s.id + "_either"] : (A[s.id] === o.v && !A[s.id + "_either"])) });
      b.appendChild(el("span", { class: "tick", "aria-hidden": "true" }, "✓"));
      b.appendChild(el("span", { class: "lab" }, o.label));
      b.onclick = function () {
        var prevEmail = A.q3;
        A[s.id] = o.v;
        if (s.id === "q6") { A.q6_either = !!o.id; if (o.id === "either") A.q6 = Math.random() < 0.5 ? "Sam" : "Travis"; // "Either is fine" = a fair coin, not always Sam
          // Sam vs Travis test (Chris, Nov 10: "test both and then go with whatever people like the most")
          if (window.wcCount) window.wcCount("trainer-" + A.q6.toLowerCase() + (A.q6_either ? "-either" : "-picked")); }
        if (s.id === "q3" && prevEmail !== o.v) { delete A.neKind; delete A.newEmail; }
        save(); thanks("Thank you.", next);
      };
      li.appendChild(b); ul.appendChild(li);
    });
    h.appendChild(ul);
  }
  if (s.id === "q6") {
    var pair = el("div", { class: "vidpair" });
    pair.appendChild(vid("meet-sam", "Meet Sam, AI trainer (9 seconds)", "small"));
    pair.appendChild(vid("meet-travis", "Meet Travis, AI trainer (8 seconds)", "small"));
    h.insertBefore(pair, h.querySelector(".opts"));
  }
  hesitance(h, s.id);
}

function neChoice(h) {
  h.appendChild(el("p", { class: "voice" }, "Setup"));
  h.appendChild(el("h1", null, "No problem. Let's make you a free email address first."));
  h.appendChild(el("p", null, "You'll type your own password; we never see it."));
  var ul = el("ul", { class: "opts", role: "list" });
  [["gmail", "Gmail (recommended)"], ["outlookcom", "Outlook.com"]].forEach(function (o) {
    var li = el("li"), b = el("button", { class: "opt", type: "button", "aria-pressed": String(A.neKind === o[0]) });
    b.appendChild(el("span", { class: "tick", "aria-hidden": "true" }, "✓")); b.appendChild(el("span", { class: "lab" }, o[1]));
    b.onclick = function () { A.neKind = o[0]; save(); next(); };
    li.appendChild(b); ul.appendChild(li);
  });
  h.appendChild(ul);
}

function neStep(h, s) {
  var gm = A.neKind !== "outlookcom", list = gm ? GMAIL_STEPS : OUTLOOK_STEPS, st = list[s.i];
  h.appendChild(el("p", { class: "voice" }, (gm ? "Gmail" : "Outlook.com") + " · step " + (s.i + 1) + " of " + list.length));
  h.appendChild(el("h1", null, st.t));
  if (gm && s.i === 0) h.appendChild(vid("gmail", "Video: make a free Gmail, step by step (28 seconds)"));
  if (st.link) { var a = el("a", { class: "go linkbtn", href: st.link[0], target: "_blank", rel: "noopener" }, st.link[1] + " (new tab)"); h.appendChild(a); }
  h.appendChild(el("p", { class: "seeq" }, "Did you see " + st.see + "?"));
  var row = el("div", { class: "nav" });
  var ok = el("button", { class: "go", type: "button" }, st.final ? "Yes!" : "I did it");
  ok.onclick = function () {
    if (st.final) { A.newEmail = gm ? "gmail" : "outlookcom"; save(); thanks("You've got email. That's step one done.", next); }
    else next();
  };
  row.appendChild(ok); h.appendChild(row);
  var d = el("details", { class: "stuck" }); d.appendChild(el("summary", null, "Stuck?"));
  var ul = el("ul"); (gm ? GMAIL_HELP : OUTLOOK_HELP).forEach(function (x) { ul.appendChild(el("li", null, x)); }); d.appendChild(ul);
  d.appendChild(el("p", { class: "help" }, "Still stuck? Tell us what you see at hello@wardconsulting.ai. Never send passwords."));
  h.appendChild(d);
}

function handoff(h) {
  h.classList.add("center");
  var p1 = el("p", { class: "voice", role: "status" }, "Thank you. Your trainer is ready.");
  h.appendChild(p1);
  var wrap = el("div", { class: "warm", hidden: "hidden" });
  var hi = el("h1", { class: "warmh" }, "Hi, I'm here. How are you doing?");
  wrap.appendChild(el("p", { class: "who" }, trainer()));
  wrap.appendChild(hi);
  wrap.appendChild(vid(trainer() === "Travis" ? "meet-travis" : "meet-sam", trainer() + ", your AI trainer, says hi", "small center"));
  var row = el("div", { class: "nav center" }), reply = el("p", { class: "reply", role: "status", "aria-live": "polite" });
  [["Good", "Love that. Let's keep it that way."], ["Busy", "Then let's give you some time back."]].forEach(function (o) {
    var b = el("button", { class: "go", type: "button" }, o[0]);
    b.onclick = function () { reply.textContent = o[1]; row.innerHTML = ""; var c = el("button", { class: "go", type: "button" }, "Continue"); c.onclick = next; row.appendChild(c); c.focus(); };
    row.appendChild(b);
  });
  wrap.appendChild(row); wrap.appendChild(reply); h.appendChild(wrap);
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(function () { wrap.hidden = false; hi.setAttribute("tabindex", "-1"); hi.focus(); }, reduce ? 0 : 1200);
}

var EMAIL_NAME = { gmail: "Gmail", m365: "Microsoft 365 work email", outlookcom: "Outlook.com", other: "your email" };
var DEVICE_NAME = { mac: "a Mac", windows: "a Windows computer", phone: "your phone" };
function lower1(s) { s = (s || "").replace(/[.!\s]+$/, ""); return s.charAt(0).toLowerCase() + s.slice(1); }
function short(s, n) { s = s || ""; return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }

function reflect(h) {
  h.appendChild(el("p", { class: "who" }, trainer()));
  var BIZ = { "Salon or spa": "a salon or spa", "Home services": "a home services business", "Contractor": "a contracting business", "Retail shop": "a retail shop",
    "Restaurant or food": "a restaurant or food business", "Real estate": "a real estate business", "Events": "an events business", "Professional services": "a professional services business" };
  var q1 = BIZ[A.q1] || short(lower1(A.q1), 70), q2 = short((A.q2 || "").toLowerCase(), 60);
  h.appendChild(el("h1", null, "So you run " + q1 + ". " + (q2.charAt(0).toUpperCase() + q2.slice(1)) + (/,/.test(q2) ? " take" : " takes") + " up too much of your week. You're on " + (DEVICE_NAME[A.q4a] || "your computer") + " and use " + emailsLabel() + ". Got it."));
  h.appendChild(el("p", null, "Here's the simplest way to get your inbox sorted."));
  navRow(h, next, true, "Show me");
}

/* ---------- result ---------- */
var STEPS = {
  grok: {
    phone: [
      ["Open the App Store (iPhone) or Google Play (Android).", "the store open"],
      ["Search “Grok”. Check it's the official app from xAI.", "Grok in the results"],
      ["Tap Get or Install. The app is free.", "the Grok app on your phone"],
      ["Open it and sign in or make a free account. You type your own password and codes.", "the chat box"],
      ["Tap “Copy my email helper” below, paste it into the chat, and send.", "your trainer say “Hi, I'm here”"],
      ["Send a screenshot of your inbox list when it asks.", "your inbox sorted into groups"]
    ],
    computer: [
      ["Open grok.com in your browser.", "Grok's page", "https://grok.com"],
      ["Sign in or make a free account yourself.", "you're signed in"],
      ["Find the chat box.", "the chat box"],
      ["Tap “Copy my email helper” below, paste it into the chat, and send.", "your trainer say “Hi, I'm here”"],
      ["Send a screenshot of your inbox list when it asks.", "your inbox sorted into groups"]
    ]
  },
  claude: {
    mac: [
      ["Go to claude.com/download and click Mac.", "a file downloading", "https://claude.com/download"],
      ["Open the downloaded file and drag Claude into Applications.", "Claude in Applications"],
      ["Open Claude from Applications. If your Mac warns you, click Open.", "Claude's sign-in screen"],
      ["Sign up or sign in yourself; the code comes by email.", "“How can I help”"],
      ["Click Projects, then New project, and name it “Inbox”.", "your Inbox project"],
      ["Paste your email helper (copy it below) into “Set project instructions”.", "the instructions saved"],
      ["Start a chat in the project.", "your trainer say “Hi, I'm here”"]
    ],
    windows: [
      ["Go to claude.com/download and click Windows.", "a file downloading", "https://claude.com/download"],
      ["Open the downloaded installer.", "Claude installing"],
      ["Open Claude from the Start menu.", "Claude's sign-in screen"],
      ["Sign up or sign in yourself; the code comes by email.", "“How can I help”"],
      ["Click Projects, then New project, and name it “Inbox”.", "your Inbox project"],
      ["Paste your email helper (copy it below) into “Set project instructions”.", "the instructions saved"],
      ["Start a chat in the project.", "your trainer say “Hi, I'm here”"]
    ],
    phone: [
      ["Open the App Store or Google Play and search “Claude” (by Anthropic).", "Claude by Anthropic"],
      ["Install it, open it, and sign in yourself.", "the chat box"],
      ["Paste your email helper (copy it below) into a new chat and send. Projects and Claude in Chrome work best on a computer.", "your trainer say “Hi, I'm here”"]
    ]
  }
};
// Team seat: replaces the "make your own account" steps (TEAM_SEAT above).
var SEAT_STEPS = {
  phone: [
    ["Ask for your team seat in the box above. We send the invite by hand, usually within 1 business day.", "“Request sent” in the box above"],
    ["Open the invite email from xAI on your phone and tap the button to join the Ward Consulting AI team.", "a page saying you joined the team"],
    ["Open the App Store (iPhone) or Google Play (Android), search “Grok”, check it's the official app from xAI, and install it. It's free.", "the Grok app on your phone"],
    ["Open the app and sign in with the same email the invite went to. You type your own codes.", "the chat box, with the team's name in your account"],
    ["Tap “Copy my email helper” below, paste it into the chat, and send.", "your trainer say “Hi, I'm here”"],
    ["Send a screenshot of your inbox list when it asks.", "your inbox sorted into groups"]
  ],
  computer: [
    ["Ask for your team seat in the box above. We send the invite by hand, usually within 1 business day.", "“Request sent” in the box above"],
    ["Open the invite email from xAI and click the button to join the Ward Consulting AI team.", "a page saying you joined the team"],
    ["Open grok.com and sign in with the same email the invite went to. You type your own codes.", "the chat box, with the team's name in your account", "https://grok.com"],
    ["Tap “Copy my email helper” below, paste it into the chat, and send.", "your trainer say “Hi, I'm here”"],
    ["Send a screenshot of your inbox list when it asks.", "your inbox sorted into groups"]
  ]
};
if (TEAM_SEAT) STEPS.grok = SEAT_STEPS;

function seatBox(h) { // the seat request: one email, sent to us so we can invite it from the xAI console
  var box = el("div", { class: "note cost" });
  var bh = el("p"); bh.appendChild(el("strong", null, "Step 1: get your seat on our Grok team")); box.appendChild(bh);
  box.appendChild(el("p", { class: "help", style: "margin:0 0 10px" }, "Type the email you want to use with Grok. We send an invite to it from xAI. Use your work email if you have one."));
  var f = el("form", { novalidate: "novalidate" });
  var l = el("label", { class: "fl", for: "seatem" }, "Email for your Grok seat"); var em = el("input", { id: "seatem", type: "email", autocomplete: "email", required: "required" });
  if (A.seatEmail) em.value = A.seatEmail;
  var cons = el("label", { class: "opt", style: "margin-top:12px" }); var cb = el("input", { type: "checkbox", id: "seatok" });
  var cl = el("span", { class: "lab" }, "Add me to the Ward Consulting AI Grok team. I understand Ward Consulting AI runs the team and can remove my seat. ");
  cl.appendChild(el("a", { href: "../terms/#team-seat" }, "How the team seat works"));
  cons.appendChild(cb); cons.appendChild(cl);
  var send = el("button", { class: "go", type: "submit", style: "margin-top:14px" }, A.seatSent ? "Send it again" : "Request my seat");
  var msg = el("p", { class: "help", role: "status", "aria-live": "polite" }, A.seatSent ? "Request sent for " + A.seatEmail + ". Watch for an email from xAI." : "");
  [l, em, cons, send, msg].forEach(function (n) { f.appendChild(n); }); box.appendChild(f);
  f.onsubmit = function (ev) {
    ev.preventDefault(); var v = (em.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = "That email doesn't look right. Check it and try again."; em.focus(); return; }
    if (!cb.checked) { msg.textContent = "Tick the box so we can add you to the team."; cb.focus(); return; }
    send.disabled = true; msg.textContent = "Sending…";
    // not a marketing sign-up: the box covers the team seat only, so it stays off Mailchimp
    var lead = { email: v, list: "grok-team-seat", consent: false, interest: "Grok team seat; trainer " + trainer() + "; device " + (A.q4a || "not given"), subject: "Grok team seat request (" + v + ")" };
    window.GWAILead.send(lead)
      .then(function () { A.seatEmail = v; A.seatSent = true; save(); send.disabled = false; msg.textContent = "Request sent for " + v + ". Watch for an email from xAI, usually within 1 business day. Then tap “I did it” on step 1 below."; })
      .catch(function (e) { send.disabled = false; msg.textContent = "That didn't go through (" + e.message + "). Try again in a minute, or: "; if (window.GWAILead.fallbackLink) msg.appendChild(window.GWAILead.fallbackLink(lead)); });
  };
  h.appendChild(box);
}

var COST = {
  grok: TEAM_SEAT ? "Our setup is free. Pro and Elite members can add a seat on the Ward Consulting AI Grok team for $35 a month, so you don't need your own Grok plan. Send a screenshot of your inbox and get your first sorted list. Optional upgrade: Grok Bot can connect to your inbox directly. It needs X Premium, about $30 a month, paid to X (the $8 Plus plan doesn't include it)." : "Our setup is free, and Grok has a free plan. Start at grok.com or in the free Grok app: send a screenshot of your inbox and get your first sorted list. Optional upgrade: Grok Bot can connect to your inbox directly. It needs X Premium, about $30 a month, paid to X (the $8 Plus plan doesn't include it).",
  claude: "Our setup is free, and Claude has a free plan. On Free, you can send a screenshot of your inbox, or connect Gmail or a Microsoft 365 work account (your admin may need to approve Microsoft 365 once). For Claude in Chrome, which can do the clicks you approve, you need Claude Pro, about $20 a month ($17 billed yearly), paid to Anthropic. Optional."
};
var UPGRADE = {
  grok: "Optional, about $30 a month paid to X (X Premium; the $8 Plus plan doesn't include it). Get Grok Bot: download the desktop app for Mac or Windows from cursor.com/download/bot (or get the phone app), sign in, choose a plan that includes Grok Bot yourself, then connect Gmail or Outlook and click Allow.",
  claude: "Gmail connector (any plan): + \u2192 Connectors \u2192 Gmail \u2192 Connect \u2192 Allow. Claude asks before it sends anything; keep it that way. Microsoft 365: + \u2192 Connectors \u2192 Microsoft 365 (your admin may need to approve). Claude in Chrome (Pro or higher): Chrome Web Store \u2192 Claude by Anthropic \u2192 Add to Chrome \u2192 pin it \u2192 \u201cAsk before acting\u201d."
};

function deviceKey(tr, dev) {
  if (tr === "grok") return dev === "phone" ? "phone" : "computer";
  return dev || "windows";
}

// Counts a finished setup once per browser: a GoatCounter event (when on) and a short note to the form inbox.
// No email, name or answers are sent; only the track, device, trainer and site.
function logFinish(tr, site) {
  if (meta.finishLogged) return;
  meta.finishLogged = Date.now(); save();
  if (window.wcCount) window.wcCount("setup-finished"); else (window.__wcq = window.__wcq || []).push("setup-finished"); // counter loads after this script
  var tk = "finished-" + trainer().toLowerCase(); if (window.wcCount) window.wcCount(tk); else window.__wcq.push(tk); // Sam vs Travis: who gets people to the end
  try {
    var b = new FormData();
    b.append("list", "setup-finished"); b.append("track", tr); b.append("device", A.q4a || ""); b.append("trainer", trainer());
    b.append("site", site); b.append("page_url", location.href);
    b.append("_subject", "Setup finished (" + site + ", " + tr + ", " + (A.q4a || "device not given") + ")");
    b.append("_template", "table"); b.append("_honey", "");
    fetch(CFG.form_endpoint, { method: "POST", body: b, headers: { Accept: "application/json" } }).catch(function () {});
  } catch (e) {}
}

// The questionnaire answers come to us once, as soon as the questions are done (Chris, Nov 10: "I want that
// auto sent to us"). Never the person's name or email: only what they told us about the work.
function emailsLabel() {
  var all = A.q3_all && A.q3_all.length ? A.q3_all : [A.q3];
  var names = all.map(function (v) { return v === "none" ? null : (v === "other" && A.q3_text) || EMAIL_NAME[v] || null; }).filter(Boolean);
  if (!names.length) return EMAIL_NAME[emailType()] || "your email";
  return names.length === 1 ? names[0] : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}
function sendAnswers() {
  if (meta.answersSent) return;
  meta.answersSent = Date.now(); save();
  try {
    var b = new FormData();
    b.append("list", "setup-answers"); b.append("site", "wardconsulting");
    b.append("business", (A.q1 || "").slice(0, 120)); b.append("takes_too_much_time", (A.q2 || "").slice(0, 240));
    b.append("email_type", (A.q3_all || [emailType()]).join(", ")); b.append("device", A.q4a || ""); b.append("ai_experience", A.q5b || "");
    b.append("trainer", trainer()); b.append("trainer_how", A.q6_either ? "either (random)" : "picked"); b.append("page_url", location.href);
    b.append("_subject", "Setup answers (wardconsulting): " + (A.q1 || "business not given").slice(0, 60));
    b.append("_template", "table"); b.append("_honey", "");
    fetch(CFG.form_endpoint, { method: "POST", body: b, headers: { Accept: "application/json" } }).catch(function () {});
  } catch (e) {}
}

function result(h) {
  sendAnswers();
  // One step per screen (Chris, Nov 10: "do one step at a time so it does not get confusing").
  var tr = track(), name = trainer(), r = A.rs || 0;
  var AG = { id: "Email-Inbox", name: "Email & Inbox Agent" };
  var txt = PROMPT[tr].split("[NAME]").join(name) + window.GWAIWalk.walkthrough(tr, AG);
  var SHOT = { mac: "On a Mac: press Shift + Command + 4, then drag a box around your inbox.",
    windows: "On Windows: press the Windows key + Shift + S, then drag a box around your inbox.",
    phone: "On a phone: press the side button and volume up together." }[A.q4a] || "On a Mac: Shift + Command + 4. On Windows: Windows key + Shift + S. On a phone: side button + volume up.";
  var GROK = "https://grok.com";
  var MISSION = "../media/missions/";
  var S = [
    { choose: true, h: "Do you already have Grok?", p: "Grok is the free AI app your helper runs in." },
    { noGrok: true, h: "Open Grok.", p: "Grok is the free AI app your helper runs in. Tap the button. It opens in a new tab, so this page stays here.", link: [GROK, "Open grok.com"], q: "Do you see Grok's page?" },
    { noGrok: true, h: "Sign in, or make a free account.", p: "Click Sign up or Log in on Grok's page. You type your own password and codes there. We never see them.", link: [GROK, "Open grok.com again"], q: "Are you signed in and looking at a chat box?" },
    { ship: "mission-1-boosters", tag: "Stage 1 complete", h: "You're signed in. The first booster drops away." },
    { h: "Copy your email helper.", p: "Tap the button. It copies your helper so you can paste it into Grok.", copy: true, q: "Did the button say Copied?" },
    { h: "Paste it into Grok and press send.", p: "Go back to the Grok tab. Click the chat box, paste (Ctrl + V, or Command + V on a Mac, or press and hold on a phone), then press send.", link: [GROK, "Go to grok.com"], q: "Did " + name + " say “Hi, I'm here”?" },
    { ship: "mission-2-hyperspeed", tag: "Stage 2 complete", h: "Your helper is on board. Ready for hyper speed." },
    { h: "Send a screenshot of your inbox.", p: "When " + name + " asks, take a screenshot of your inbox list and add it to the Grok chat. " + SHOT, q: "Did " + name + " sort your inbox into groups?" }
  ];
  // With Grok already, the open and sign-in steps are skipped.
  function shown(x) { return !(A.hasGrok && x.noGrok); }
  RESULT_SKIP = function (i) { return !!(S[i] && !shown(S[i])); };
  var counted = function (x) { return !x.ship && !x.choose && shown(x); };
  var TOTAL = S.filter(counted).length;
  function stepNo(i) { return S.slice(0, i + 1).filter(counted).length; }
  function goTo(i) { while (i < S.length && !shown(S[i])) i++; A.rs = i; save(); render(); window.scrollTo(0, 0); }
  // The ship: a short film between steps. Plays on the tap that opened it; never on its own.
  function shipFilm(stem, label) {
    var f = el("figure", { class: "shipfilm" });
    var v = el("video", { controls: "", playsinline: "", preload: "metadata", poster: MISSION + stem + "-poster.jpg", "aria-label": "Ship film: " + label });
    v.appendChild(el("source", { src: MISSION + stem + ".mp4", type: "video/mp4" }));
    f.appendChild(v);
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!still) setTimeout(function () { v.play().catch(function () { v.muted = true; v.play().catch(function () {}); }); }, 0);
    if (window.wcCount) window.wcCount(stem);
    return f;
  }
  if (r < S.length && S[r].choose) {
    h.appendChild(el("p", { class: "voice" }, "One quick question"));
    h.appendChild(el("h1", null, S[r].h));
    h.appendChild(el("p", null, S[r].p));
    var cr = el("div", { class: "nav" });
    var yes = el("button", { class: "go", type: "button" }, "Yes, I have Grok");
    yes.onclick = function () { A.hasGrok = true; goTo(r + 1); };
    var no = el("button", { class: "go", type: "button" }, "No, not yet");
    no.onclick = function () { A.hasGrok = false; goTo(r + 1); };
    cr.appendChild(yes); cr.appendChild(no); h.appendChild(cr);
    return;
  }
  if (r < S.length && S[r].ship) {
    var m = S[r];
    h.appendChild(el("p", { class: "voice" }, m.tag));
    h.appendChild(el("h1", null, m.h));
    h.appendChild(shipFilm(m.ship, m.h));
    var mr = el("div", { class: "nav" }), mg = el("button", { class: "go", type: "button" }, "Continue");
    mg.onclick = function () { goTo(r + 1); };
    mr.appendChild(mg); h.appendChild(mr);
    return;
  }
  var bar = el("p", { class: "voice" }, r < S.length ? "Step " + stepNo(r) + " of " + TOTAL : "Mission complete");
  h.appendChild(bar);
  if (r < S.length) {
    var st = S[r];
    h.appendChild(el("h1", null, st.h));
    h.appendChild(el("p", null, st.p));
    if (S[r].h === "Open Grok.") h.appendChild(el("p", { class: "help" }, "It's free. Grok's free plan is all you need for this."));
    if (st.link) { var a = el("a", { class: "linkbtn go", href: st.link[0], target: "_blank", rel: "noopener" }, st.link[1] + " (new tab)"); h.appendChild(a); }
    if (st.copy) {
      var pre = el("pre", { class: "copybox", tabindex: "0", "aria-label": "Your free email helper text" }, txt);
      var cb = el("button", { class: "go", type: "button" }, "Copy my email helper");
      cb.onclick = function () { copy(txt, pre, cb); };
      h.appendChild(cb);
      var see = el("details", { class: "stuck" }); see.appendChild(el("summary", null, "See what you're copying")); see.appendChild(pre); h.appendChild(see);
    }
    h.appendChild(el("p", { class: "seeq" }, st.q));
    var row = el("div", { class: "nav" });
    var ok = el("button", { class: "go", type: "button" }, "Yes, next step");
    ok.onclick = function () { goTo(r + 1); };
    row.appendChild(ok); h.appendChild(row);
    h.appendChild(el("p", { class: "help" }, "Stuck? Email hello@wardconsulting.ai and tell us which step you're on. Never send us passwords."));
    return;
  }
  // finished
  logFinish(tr, "wardconsulting");
  h.appendChild(el("h1", null, "You made the jump. Your free email helper is set up."));
  h.appendChild(shipFilm("mission-3-arrival-family", "You made the jump"));
  h.appendChild(el("a", { class: "linkbtn go", href: "https://zclear2327.github.io/grow-with-ai/train/grok/" }, "Start the free Grok training"));
  var more = el("details", { class: "stuck" }); more.appendChild(el("summary", null, "Want more helpers? See the plans"));
  more.appendChild(el("p", null, "Starter ($29.99 a month) adds 1 paid agent. Pro ($99.99) adds all 4. Cancel anytime."));
  more.appendChild(el("a", { href: "https://zclear2327.github.io/grow-with-ai/packages/" }, "See the plans"));
  h.appendChild(more);
  var mail = el("details", { class: "stuck" }); mail.appendChild(el("summary", null, "Email me these steps"));
  capture(mail, tr); h.appendChild(mail);
  var nav = el("div", { class: "nav" });
  var rs = el("button", { class: "back", type: "button" }, "Start over");
  rs.onclick = function () { if (!confirm("Clear your answers and start again?")) return; clearAll(); render(); };
  nav.appendChild(rs); h.appendChild(nav);
}

function copy(txt, pre, btn) {
  var ok = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy my email helper"; }, 2000); };
  var fallback = function () { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    try { if (document.execCommand("copy")) { ok(); return; } } catch (e) {} btn.textContent = "Selected: press Ctrl+C (Cmd+C on a Mac)"; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
}

function capture(h, tr) {
  h.appendChild(el("h2", null, "Want the steps by email and a check-in in a week?"));
  var f = el("form", { novalidate: "novalidate" });
  var l1 = el("label", { class: "fl", for: "fn" }, "First name (optional)"); var fn = el("input", { id: "fn", type: "text", maxlength: "40", autocomplete: "given-name" });
  var l2 = el("label", { class: "fl", for: "em", style: "margin-top:12px" }, "Your email"); var em = el("input", { id: "em", type: "email", autocomplete: "email", required: "required" });
  var emNote = el("p", { class: "help", id: "em-note" }, "We use your email only to send your setup and updates. Unsubscribe anytime. "); emNote.appendChild(el("a", { href: "../privacy/" }, "Privacy")); em.setAttribute("aria-describedby", "em-note");
  var hp = el("input", { type: "text", name: "_honey", tabindex: "-1", "aria-hidden": "true", autocomplete: "off", style: "position:absolute;left:-9999px;width:1px;height:1px;opacity:0" });
  var cons = el("label", { class: "opt", style: "margin-top:12px" }); var cb = el("input", { type: "checkbox", id: "cons" });
  cons.appendChild(cb); var cl = el("span", { class: "lab" }, window.GWAILead ? GWAILead.consentText + " " : "Email me the steps and one check-in a week from now. "); cl.appendChild(el("a", { href: "../privacy/" }, "Privacy")); cons.appendChild(cl);
  var msg = el("p", { class: "help", role: "status", "aria-live": "polite" }, "");
  var send = el("button", { class: "go", type: "submit", style: "margin-top:18px" }, "Send me the steps");
  [l1, fn, l2, em, emNote, hp, cons, send, msg].forEach(function (n) { f.appendChild(n); });
  h.appendChild(f);
  h.appendChild(el("p", { class: "help" }, "We'll send: your first name, email, track, trainer, device, email type and the chore you named. Nothing else. We don't sell or share your address."));
  f.onsubmit = function (ev) {
    ev.preventDefault();
    var v = (em.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = "That email doesn't look right. Check it and try again."; em.focus(); return; }
    if (!cb.checked) { msg.textContent = "Tick the box so we're allowed to email you."; cb.focus(); return; }
    if (hp.value || (Date.now() - START) / 1000 < CFG.min_seconds_before_send) { msg.textContent = "Sent."; return; }
    send.disabled = true; msg.textContent = "Sending…";
    var intake = "track: " + tr + "; trainer: " + trainer() + "; device: " + (A.q4a || "") + "; email type: " + (emailType() || "") + "; chore: " + (A.q2 || "").slice(0, 120);
    window.GWAILead.send({ email: v, firstname: (fn.value || "").trim().slice(0, 40), list: "free-setup", gwai_intake: intake, consent: cb.checked, subject: "Free setup: " + tr + " (" + v + ")" })
      .then(function () { msg.textContent = "Sent. Check your inbox for the steps."; })
      .catch(function (e) { send.disabled = false; msg.textContent = "That didn't go through (" + e.message + "). Nothing is lost; try again in a minute."; });
  };
}

restore();
render();
window.__flow = { plan: plan, track: track, state: function () { return { A: A, step: step, meta: meta }; } };
})();
