/* Grow With AI lead capture: one place for both forms (start/flow.js and affiliates/wl.js).
   Chris, 2026-10-26: "i dont want to use hubspot find another way". Mailchimp replaces HubSpot.
   1) Every lead goes to Chris's inbox through FormSubmit, with the full setup answers and campaign codes.
   2) Once MC_ACTION is set, the same lead is also added to the Mailchimp audience (email and first name),
      so Mailchimp handles the list, the unsubscribe link, the postal address and double opt-in.
   MC_ACTION is the "action" address of the audience's embedded signup form, for example
   https://XXXX.us21.list-manage.com/subscribe/post?u=AAAA&id=BBBB  (Audience > Signup forms > Embedded forms). */
var MC_ACTION = ""; // TODO Chris: paste the Mailchimp embedded-form action URL
(function () {
  "use strict";
  var INBOX = "https://formsubmit.co/ajax/7fbd7e6f9b9178360b909504bd877f07";
  var CONSENT = "Yes, Ward Consulting AI may email me my setup, tips and offers. I can unsubscribe anytime. Ward Consulting AI, 2680 Commerce Way, Ogden, UT 84401.";
  var ATTR = ["ref", "src", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  function attrib() { // last-touch values from affiliates/ref.js, first-touch as a fallback
    var a = (window.wcRef && window.wcRef.attrib) || {}, last = a.last || {}, first = a.first || {}, out = {};
    ATTR.forEach(function (k) { out[k] = last[k] || first[k] || ""; });
    if (!out.ref && window.wcRef && window.wcRef.code) out.ref = window.wcRef.code;
    return out;
  }
  function mailchimp(email, firstname) { // JSONP: list-manage.com answers to a script tag, no key needed
    return new Promise(function (ok, no) {
      var cb = "gwaiMc" + Date.now(), s = document.createElement("script"), done = false;
      var url = MC_ACTION.replace("/subscribe/post?", "/subscribe/post-json?") + "&EMAIL=" + encodeURIComponent(email) +
        "&FNAME=" + encodeURIComponent(firstname || "") + "&c=" + cb;
      window[cb] = function (r) { done = true; delete window[cb]; s.remove();
        if (r && (r.result === "success" || /already subscribed/i.test(r.msg || ""))) ok(r); else no(new Error("mailchimp: " + ((r && r.msg) || "not accepted").replace(/<[^>]*>/g, ""))); };
      s.onerror = function () { if (!done) { delete window[cb]; no(new Error("mailchimp unreachable")); } };
      s.src = url; document.head.appendChild(s);
      setTimeout(function () { if (!done) { delete window[cb]; no(new Error("mailchimp timed out")); } }, 10000);
    });
  }
  /* send({ email, firstname, list, interest, gwai_intake, consent, subject }) -> Promise (resolves when the inbox has it) */
  function send(d) {
    var at = attrib(), f = { email: d.email, firstname: d.firstname || "", list: d.list || "", interest: d.interest || "",
      gwai_intake: d.gwai_intake || "", consent_casl: d.consent ? "true" : "false", consent_timestamp: d.consent ? new Date().toISOString() : "",
      consent_text: d.consent ? CONSENT : "", page_url: location.href };
    ATTR.forEach(function (k) { f[k] = at[k]; });
    var b = new FormData();
    Object.keys(f).forEach(function (k) { b.append(k, f[k]); });
    b.append("mailchimp", MC_ACTION ? "added" : "not set up yet");
    b.append("_subject", d.subject || ("Lead: " + (d.list || "site") + " (" + d.email + ")"));
    b.append("_template", "table"); b.append("_honey", "");
    var inbox = fetch(INBOX, { method: "POST", body: b, headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json().catch(function () { return {}; }); })
      .then(function (j) { if (j && (j.success === false || j.success === "false")) throw new Error(j.message || "not accepted"); return j; });
    if (!MC_ACTION || !d.consent) return inbox;
    // Mailchimp is a second copy: a failure there is logged, never shown as a lost lead
    return Promise.all([inbox, mailchimp(d.email, d.firstname).catch(function (e) { console.warn(e.message); return null; })]).then(function (r) { return r[0]; });
  }
  window.GWAILead = { send: send, consentText: CONSENT, attrib: attrib, ready: function () { return !!MC_ACTION; } };
})();
