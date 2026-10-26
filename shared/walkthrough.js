/* Shared by start/ and members/: adds the trainer walkthrough to an agent prompt, and the
   "copy, then open Grok or Claude" button with a follow-along checklist.
   The prompt files themselves are never edited; the walkthrough is added when copied. */
(function () {
"use strict";
var FIRST_TASK = {
  "Email-Inbox": "triage today's inbox together: I send a screenshot of my inbox list (or paste the senders and subjects) and you do THE SORT",
  "Customer-Questions": "answer one real customer question together, from my new ANSWER SHEET",
  "Sales-Follow-Up": "build today's chase list together and draft my first follow-up",
  "Daily-Assistant": "do my first \"brief me\" together for today",
  "Content-Social": "plan this week's posts together and write the first caption"
};
var DAILY = {
  "Email-Inbox": "check my email", "Customer-Questions": "paste a customer question", "Sales-Follow-Up": "who do I chase?",
  "Daily-Assistant": "brief me", "Content-Social": "plan my posts"
};
function steps(tool, agent) {
  var app = tool === "grok" ? "Grok" : "Claude";
  return [
    "Sign in to " + app + (tool === "grok" ? " (a free X/Grok account is fine)" : " (the free plan is fine)") + ". You type your own password and codes.",
    "No email address yet? Your trainer walks you through a free Gmail at accounts.google.com/signup.",
    "Your trainer sets up your " + agent.name + " and tells you what it will do for you.",
    "Do a first real task together: " + FIRST_TASK[agent.id].replace(/\bI\b/g, "you").replace(/\bmy\b/g, "your").replace(/\bMY\b/g, "YOUR").replace(/\bme\b/g, "you") + ".",
    tool === "grok" ? "Save your agent: keep this chat (bookmark it), and keep a copy of the text in your notes to paste into a new chat any time." : "Save your agent: on a computer, put it in a Project (Projects, then New project, then paste into Set project instructions).",
    "Pick a daily time. Each day, open that chat and type: “" + DAILY[agent.id] + "”."
  ];
}
var BUILT_IN = { "Customer-Questions": 1, "Sales-Follow-Up": 1, "Daily-Assistant": 1, "Content-Social": 1 };
// Trainer Agent's paid prompts carry their own 8 steps; mirror them in the checklist instead of adding ours.
function builtInSteps(tool, agent) {
  var app = tool === "grok" ? "Grok" : "Claude";
  return [
    "Sign in to " + app + " (or create a free account). You type your own password.",
    "Paste the prompt as your first message, say hi, and tell your trainer Sam or Travis.",
    "Share your business info (typing, paste or screenshot). No passwords or account numbers.",
    "Your trainer builds the " + agent.name + " with you. Check it and say what to change.",
    "Do a first real task together.",
    "Save it for reuse: a Project named \u201c" + agent.name + "\u201d, or keep the prompt in a note.",
    "Set your habit: a repeating reminder on your phone or calendar.",
    "Wrap-up: your trainer recaps what you built and the time saved."
  ];
}
function walkthrough(tool, agent) {
  if (BUILT_IN[agent.id]) return "";
  var app = tool === "grok" ? "Grok" : "Claude";
  var s = steps(tool, agent);
  return "\n\nTRAINER WALKTHROUGH (do this right after START, before anything else)\n" +
    "Walk me through setting up AND using this agent, one step per message. After each step, wait until I type \"done\" (or ask for help) before the next one.\n" +
    "Step 1 of 6: Check I'm signed in to " + app + ". If not, tell me how to sign in or create a free account. I type my own password and codes; never ask for them.\n" +
    "Step 2 of 6: Ask if I have an email address. If not, walk me through making a free Gmail at accounts.google.com/signup one screen at a time (I type my own password on Google's page).\n" +
    "Step 3 of 6: Tell me in two lines what you'll do for me as my " + agent.name + ", then run any setup steps above.\n" +
    "Step 4 of 6: First real task together: " + FIRST_TASK[agent.id] + ".\n" +
    "Step 5 of 6: Help me save this agent so I can use it again: " + (tool === "grok" ? "bookmark this chat and keep a copy of these instructions in my notes to paste into a new chat." : "on a computer, make a Project named after this agent and paste these instructions into Set project instructions; on a phone, keep this chat.") + "\n" +
    "Step 6 of 6: Agree a daily time with me, and tell me exactly what to type each day (\"" + DAILY[agent.id] + "\").\n" +
    "Then carry on as described above. (Checklist on the website: " + s.length + " steps.)\n";
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise(function (ok, no) {
    var t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.left = "-9999px";
    document.body.appendChild(t); t.select();
    try { document.execCommand("copy") ? ok() : no(new Error("copy")); } catch (e) { no(e); } finally { document.body.removeChild(t); }
  });
}
/* Builds: [Copy & open Grok/Claude] button + status line + checklist. */
function openBlock(opts) { // {tool, agent:{id,name}, text}
  var tool = opts.tool, app = tool === "grok" ? "Grok" : "Claude";
  var url = tool === "grok" ? "https://grok.com" : "https://claude.ai/new";
  var wrap = document.createElement("div"); wrap.className = "openblock";
  var b = document.createElement("a"); b.className = "go ghostgo btn primary"; b.href = url; b.target = "_blank"; b.rel = "noopener";
  b.textContent = opts.label || ("Copy prompt and open " + app);
  var msg = document.createElement("p"); msg.className = "help openmsg"; msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
  var list = document.createElement("ol"); list.className = "checklist"; list.hidden = true;
  (BUILT_IN[opts.agent.id] ? builtInSteps(tool, opts.agent) : steps(tool, opts.agent)).forEach(function (t) { var li = document.createElement("li"); var lab = document.createElement("label"); var cb = document.createElement("input"); cb.type = "checkbox"; lab.appendChild(cb); lab.appendChild(document.createTextNode(" " + t)); li.appendChild(lab); list.appendChild(li); });
  var head = document.createElement("p"); head.className = "checkhead"; head.textContent = "Follow along in " + app + ":"; head.hidden = true;
  var key = (navigator.platform || "").indexOf("Mac") === 0 || /iPhone|iPad/.test(navigator.userAgent) ? "Cmd+V" : "Ctrl+V";
  b.addEventListener("click", function () {
    // The link itself opens the new tab (a real click, so pop-up blockers allow it); copying runs in the same click.
    var full = opts.text + walkthrough(tool, opts.agent);
    copyText(full).then(function () {
      msg.textContent = "Prompt copied. Paste it in and press Enter. (In " + app + ", click the message box and press " + key + "; on a phone, tap and hold, then Paste.)";
    }, function () {
      msg.textContent = "Couldn't copy automatically. Use the Copy button above, then paste it into " + app + ".";
    });
    head.hidden = false; list.hidden = false;
  });
  wrap.appendChild(b); wrap.appendChild(msg); wrap.appendChild(head); wrap.appendChild(list);
  return wrap;
}
window.GWAIWalk = { walkthrough: walkthrough, openBlock: openBlock, steps: steps };
})();
