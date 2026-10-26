/* Grow With AI free setup flow.
   One question per screen. A formal setup voice asks; then the trainer (Sam or Travis) takes over.
   Answers stay in this browser (localStorage) until the visitor chooses to send them.
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
  q1: { sec: 1, type: "text", text: "What kind of business do you run?", ph: "For example: a house-cleaning business in Ogden" },
  q2: { sec: 1, type: "text", text: "What takes up too much of your week?", chips: ["Email", "Quotes and invoices", "Scheduling", "Follow-ups", "Other"] },
  q3: { sec: 2, type: "single", text: "Where does your work email live?", help: "Not sure? Check the address you send email from. Ending in @gmail.com means Gmail.", options: EMAIL_OPTS },
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
function baseTrack() {
  if (A.q4a === "phone") return "grok";
  if (A.q4b === "chrome" && (A.q5a === "very" || A.q5b === "lot")) return "claude";
  return "grok";
}
function track() { var b = baseTrack(); return A.switched ? (b === "grok" ? "claude" : "grok") : b; }
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
  if (A.q4a && A.q4a !== "phone") P.push({ k: "ask", id: "q4b" });
  P.push({ k: "ask", id: "q5a" }, { k: "ask", id: "q5b" });
  if (A.q5a && A.q5b && A.q4b === "chrome") P.push({ k: "ask", id: "q5c" });
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
function back() {
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
  h.appendChild(el("p", { class: "help" }, "You stay in charge. We never ask for passwords. Your answers stay in this browser until you choose to send them."));
  navRow(h, next, true, "Begin");
}

function ask(h, s) {
  var q = Q[s.id];
  h.appendChild(el("p", { class: "voice" }, "Setup"));
  h.appendChild(el("h1", { id: "qh" }, q.text));
  if (q.help) h.appendChild(el("p", { class: "help" }, q.help));
  if (q.type === "text") {
    var inp = el("input", { type: "text", maxlength: "120", "aria-labelledby": "qh", autocomplete: "off", placeholder: q.ph || "" });
    inp.value = A[s.id] || "";
    h.appendChild(inp);
    var count = el("p", { class: "help count", "aria-live": "polite" }); h.appendChild(count);
    if (q.chips) {
      var chips = el("div", { class: "chips", role: "group", "aria-label": "Suggestions" });
      q.chips.forEach(function (c) {
        var b = el("button", { class: "chipbtn", type: "button" }, c);
        b.onclick = function () { inp.value = c === "Other" ? "" : c; inp.focus(); upd(); };
        chips.appendChild(b);
      });
      h.appendChild(chips);
    }
    var nb;
    var upd = function () { var v = inp.value.trim(); nb.disabled = !v; count.textContent = (120 - inp.value.length) + " characters left"; };
    var submit = function () {
      var v = inp.value.trim().slice(0, 120); if (!v) return;
      A[s.id] = v; save();
      thanks(s.id === "q1" && v.length > 80 ? "Thank you, that's what I needed." : "Thank you.", next);
    };
    nb = navRow(h, submit, false);
    inp.addEventListener("input", upd);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    upd();
  } else {
    var ul = el("ul", { class: "opts", role: "list" });
    q.options.forEach(function (o) {
      var li = el("li");
      var b = el("button", { class: "opt", type: "button", "aria-pressed": String(A[s.id] === o.v && (o.id ? A[s.id + "_either"] : !A[s.id + "_either"])) });
      b.appendChild(el("span", { class: "tick", "aria-hidden": "true" }, "✓"));
      b.appendChild(el("span", { class: "lab" }, o.label));
      b.onclick = function () {
        var prevEmail = A.q3;
        A[s.id] = o.v;
        if (s.id === "q6") A.q6_either = !!o.id;
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
  var q1 = short(lower1(A.q1), 70), q2 = short(lower1(A.q2), 50);
  h.appendChild(el("h1", null, "So you run " + q1 + ". " + (q2.charAt(0).toUpperCase() + q2.slice(1)) + " takes up too much of your week. You're on " + (EMAIL_NAME[emailType()] || "your email") + " and " + (DEVICE_NAME[A.q4a] || "your computer") + ". Got it."));
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
var COST = {
  grok: "Our setup is free, and Grok has a free plan. Start at grok.com or in the free Grok app: send a screenshot of your inbox and get your first sorted list. Optional upgrade: Grok Bot can connect to your inbox directly. It needs X Premium, about $30 a month, paid to X (the $8 Plus plan doesn't include it).",
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

function result(h) {
  var tr = track(), name = trainer(), dev = A.viewDevice || A.q4a || "windows";
  h.appendChild(el("p", { class: "who" }, "Your trainer: " + name + " · Your track: " + (tr === "grok" ? "Grok, the easy path" : "Claude, the power path")));
  h.appendChild(el("h1", null, "Let's get your inbox sorted."));
  var sw = el("button", { class: "back", type: "button" }, "Prefer " + (tr === "grok" ? "Claude, the power path" : "Grok, the easy path") + "? Switch");
  sw.onclick = function () { A.switched = !A.switched; delete A.done; save(); render(); };
  h.appendChild(sw);

  var cost = el("div", { class: "note cost" });
  cost.appendChild(el("p", null, COST[tr]));
  cost.appendChild(el("p", { class: "help", style: "margin:0" }, "Prices as of October 2026. Check x.ai/pricing or claude.com/pricing."));
  h.appendChild(cost);

  // device tabs
  var keys = tr === "grok" ? [["phone", "Phone"], ["computer", "Mac or Windows"]] : [["mac", "Mac"], ["windows", "Windows"], ["phone", "Phone"]];
  var cur = deviceKey(tr, dev === "computer" ? "mac" : dev);
  if (tr === "grok" && dev !== "phone") cur = "computer";
  var tabs = el("div", { class: "tabs", role: "tablist", "aria-label": "Steps for your device" });
  keys.forEach(function (k) {
    var b = el("button", { class: "tab", type: "button", role: "tab", "aria-selected": String(k[0] === cur) }, k[1]);
    b.onclick = function () { A.viewDevice = k[0]; delete A.done; save(); render(); };
    tabs.appendChild(b);
  });
  h.appendChild(tabs);
  var DV = { grok: { phone: null, computer: null },
    claude: { mac: ["claude-mac", "Claude on a Mac (26 seconds)"], windows: ["claude-windows", "Claude on Windows (22 seconds)"], phone: ["claude-phone", "Claude on your phone (16 seconds)"] } }[tr][cur];
  if (DV) h.appendChild(vid(DV[0], "Video: " + DV[1]));
  // TODO v6: re-record for free grok.com path.
  // TODO RECOMMENDED DEFAULT 5 (v5): Grok clips hidden until Grok Bot re-record (see Grok-Bot-Rerecord-Scripts-v1). Restore the two DV entries to bring them back.
  else if (tr === "grok") h.appendChild(el("p", { class: "help" }, "Video coming soon."));

  var list = STEPS[tr][cur], done = A.done || 0;
  var ol = el("ol", { class: "isteps" });
  list.forEach(function (s, i) {
    var li = el("li", { class: i < done ? "ok" : i === done ? "now" : "later" });
    li.appendChild(el("p", { class: "st" }, s[0]));
    if (i === done) {
      if (s[2]) { li.appendChild(el("a", { class: "linkbtn go", href: s[2], target: "_blank", rel: "noopener" }, "Open " + s[2].replace(/^https:\/\//, "") + " (new tab)")); }
      li.appendChild(el("p", { class: "seeq" }, "Did you see " + s[1] + "?"));
      var b = el("button", { class: "go", type: "button" }, "I did it");
      b.onclick = function () { A.done = done + 1; save(); render(); var n = host().querySelector(".isteps .now .go:last-of-type,.isteps .now button"); if (n) n.focus(); };
      li.appendChild(b);
    } else if (i > done) { li.setAttribute("aria-disabled", "true"); }
    ol.appendChild(li);
  });
  h.appendChild(ol);
  if (tr === "grok" && cur === "computer") h.appendChild(el("p", { class: "help" }, "Grok doesn't need a desktop app; it runs in your browser at grok.com."));
  if (done >= list.length) h.appendChild(el("p", { class: "flash small", role: "status" }, "Nice work. Your free email helper is set up."));

  var up = el("details", { class: "stuck" });
  up.appendChild(el("summary", null, tr === "grok" ? "Optional upgrade: Grok Bot connects to your inbox (paid)" : "Optional: Claude Pro extras (paid)"));
  up.appendChild(el("p", null, UPGRADE[tr]));
  if (tr === "grok") up.appendChild(el("a", { href: "https://docs.x.ai/grok-bot/get-started", target: "_blank", rel: "noopener" }, "xAI's Grok Bot guide (new tab)"));
  h.appendChild(up);

  // copy box
  h.appendChild(el("h2", null, "Your free email helper"));
  h.appendChild(vid("first-win", "Video: your first win (23 seconds)"));
  h.appendChild(el("p", { class: "help" }, "Copy this and paste it into " + (tr === "grok" ? "a new Grok chat." : "your Claude project instructions, or a new Claude chat.")));
  var AG = { id: "Email-Inbox", name: "Email & Inbox Agent" };
  var txt = PROMPT[tr].split("[NAME]").join(name) + window.GWAIWalk.walkthrough(tr, AG);
  var pre = el("pre", { class: "copybox", tabindex: "0", "aria-label": "Your free email helper text" }, txt);
  h.appendChild(pre);
  var row = el("div", { class: "nav" });
  var cb = el("button", { class: "go", type: "button" }, "Copy my email helper");
  cb.onclick = function () { copy(txt, pre, cb); };
  row.appendChild(cb);
  h.appendChild(row);
  h.appendChild(window.GWAIWalk.openBlock({ tool: tr, agent: AG, text: PROMPT[tr].split("[NAME]").join(name), label: tr === "claude" && cur !== "phone" ? "Copy prompt and open Claude in your browser (or use the desktop app you installed)" : null }));

  h.appendChild(el("p", { class: "help" }, "Stuck? Email hello@wardconsulting.ai and tell us what you see on screen. Please don't email us passwords or inbox screenshots."));
  h.appendChild(el("h2", null, "Your 5 AI agents"));
  h.appendChild(el("p", { class: "help" }, "Your Email & Inbox Agent is free. Starter adds 1 paid agent of your choice. Pro and Elite include all 4."));
  var five = el("ol", { class: "rows" });
  [["Email & Inbox Agent", "Free: yours now"], ["Customer Questions Agent", "Starter, Pro & Elite"], ["Sales & Follow-Up Agent", "Starter, Pro & Elite"], ["Daily Assistant", "Starter, Pro & Elite"], ["Content & Social Agent", "Starter, Pro & Elite"]].forEach(function (a, i) {
    var li = el("li"); li.appendChild(el("span", { class: "num" }, String(i + 1)));
    var d = el("div"); d.appendChild(el("h3", null, a[0])); d.appendChild(el("p", { class: "because" }, a[1]));
    if (i > 0) { var u = el("a", { href: "https://zclear2327.github.io/grow-with-ai/members/", class: "unlocklink" }, "Members: unlock and copy it"); d.appendChild(u); }
    li.appendChild(d); five.appendChild(li);
  });
  h.appendChild(five);
  var nx = el("p", null, "Want more agents working for you? ");
  var pk = el("a", { href: "https://zclear2327.github.io/grow-with-ai/packages/" }, "See the packages"); nx.appendChild(pk); nx.appendChild(document.createTextNode("."));
  h.appendChild(nx);

  capture(h, tr);

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
