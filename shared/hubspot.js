/* RETIRED 2026-10-26: Chris chose not to use HubSpot ("i dont want to use hubspot find another way").
   No page loads this file any more; shared/leads.js replaced it. Kept, not deleted (launch hardening v6 rule). */
/* Grow With AI lead capture: one place for the HubSpot form, used by the setup flow (start/flow.js)
   and the waitlist (affiliates/wl.js). Launch hardening v6, item D.
   HubSpot portal 5372726 is the "Z Clear" portal. Until Chris pastes the form's GUID into formId,
   leads keep going to the old FormSubmit inbox so nothing is lost. */
var HS = { portalId: "5372726", formId: "FORM_ID" /* TODO Chris: paste HubSpot form GUID */ };
(function () {
  "use strict";
  var FALLBACK = "https://formsubmit.co/ajax/7fbd7e6f9b9178360b909504bd877f07";
  var CONSENT = "Yes, Ward Consulting AI may email me my setup, tips and offers. I can unsubscribe anytime. Ward Consulting AI, 2680 Commerce Way, Ogden, UT 84401.";
  var ATTR = ["ref", "src", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  function attrib() { // last-touch values from affiliates/ref.js (item E), first-touch as a fallback
    var a = (window.wcRef && window.wcRef.attrib) || {}, last = a.last || {}, first = a.first || {}, out = {};
    ATTR.forEach(function (k) { out[k] = last[k] || first[k] || ""; });
    if (!out.ref && window.wcRef && window.wcRef.code) out.ref = window.wcRef.code;
    return out;
  }
  function ready() { return HS.formId && HS.formId !== "FORM_ID"; }
  /* send({ email, firstname, list, interest, gwai_intake, consent, subject }) -> Promise */
  function send(d) {
    var at = attrib(), now = new Date().toISOString(), page = location.href;
    var f = { email: d.email, firstname: d.firstname || "", list: d.list || "", interest: d.interest || "", gwai_intake: d.gwai_intake || "",
      consent_casl: d.consent ? "true" : "false", consent_timestamp: d.consent ? now : "", page_url: page };
    ATTR.forEach(function (k) { f[k] = at[k]; });
    if (ready()) {
      var fields = Object.keys(f).filter(function (k) { return f[k] !== ""; }).map(function (k) { return { name: k, value: f[k] }; });
      var body = { fields: fields, context: { pageUri: page, pageName: document.title },
        legalConsentOptions: { consent: { consentToProcess: !!d.consent, text: CONSENT } } };
      return fetch("https://api.hsforms.com/submissions/v3/integration/submit/" + HS.portalId + "/" + HS.formId, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json().catch(function () { return {}; }); });
    }
    console.warn("HubSpot FORM_ID not set");
    var b = new FormData();
    Object.keys(f).forEach(function (k) { b.append(k, f[k]); });
    b.append("_subject", d.subject || ("Lead: " + (d.list || "site") + " (" + d.email + ")"));
    b.append("_template", "table"); b.append("_honey", "");
    return fetch(FALLBACK, { method: "POST", body: b, headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json().catch(function () { return {}; }); })
      .then(function (j) { if (j && (j.success === false || j.success === "false")) throw new Error(j.message || "not accepted"); return j; });
  }
  window.GWAILead = { send: send, consentText: CONSENT, attrib: attrib, ready: ready };
})();
