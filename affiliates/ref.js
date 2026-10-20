/* Grow With AI: affiliate referral tracking.
 *
 * Loaded on every page. Two jobs:
 *  1. When a visitor arrives on a link carrying ?ref=CODE (or ?aff=CODE), remember the code for
 *     90 days in this browser. The newest code wins.
 *  2. While courses are still bought by email, stamp the remembered code onto every
 *     "mailto:hello@wardconsulting.ai" link (subject and body), so a sale that starts from an
 *     affiliate's link can be credited to them by hand in ThriveCart
 *     ("add an affiliate to an existing transaction").
 *
 * Once checkout moves to ThriveCart, ThriveCart's own affiliate tracking takes over and this file
 * keeps working as a backstop. Nothing here leaves the visitor's browser except inside an email
 * the visitor chooses to send.
 *
 * APPLY_URL: paste the ThriveCart affiliate sign-up link here once the account exists. While it is
 * empty, every "Apply" button opens an email to hello@wardconsulting.ai instead, so the page works
 * on day one.
 */
(function () {
  var APPLY_URL = "";
  var KEY = "wc_ref", DAYS = 90;

  function clean(v) { return (v || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40); }
  function store(get) {
    try { return get(window.localStorage); } catch (e) { return null; }
  }

  var params = new URLSearchParams(window.location.search);
  var incoming = clean(params.get("ref") || params.get("aff"));
  if (incoming) {
    store(function (ls) {
      ls.setItem(KEY, JSON.stringify({ code: incoming, until: Date.now() + DAYS * 864e5 }));
    });
  }

  var saved = store(function (ls) {
    var raw = ls.getItem(KEY);
    if (!raw) return null;
    var v = JSON.parse(raw);
    if (!v || !v.code || v.until < Date.now()) { ls.removeItem(KEY); return null; }
    return v.code;
  });
  var code = incoming || saved;

  function wire() {
    if (code) {
      var links = document.querySelectorAll('a[href^="mailto:hello@wardconsulting.ai"]');
      for (var i = 0; i < links.length; i++) {
        var a = links[i];
        if (a.dataset.refStamped) continue;
        var href = a.getAttribute("href");
        var join = href.indexOf("?") === -1 ? "?" : "&";
        var tag = " [ref " + code + "]";
        if (/[?&]subject=/.test(href)) {
          href = href.replace(/([?&]subject=)([^&]*)/, function (m, k, v) { return k + v + encodeURIComponent(tag); });
        } else {
          href += join + "subject=" + encodeURIComponent("Hello" + tag);
          join = "&";
        }
        if (!/[?&]body=/.test(href)) {
          href += "&body=" + encodeURIComponent("\n\n(Referred by " + code + ")");
        }
        a.setAttribute("href", href);
        a.dataset.refStamped = "1";
      }
    }
    var apply = document.querySelectorAll("[data-apply]");
    for (var j = 0; j < apply.length; j++) {
      apply[j].setAttribute("href", APPLY_URL ||
        "mailto:hello@wardconsulting.ai?subject=" + encodeURIComponent("Affiliate application") +
        "&body=" + encodeURIComponent(
          "Name:\nWhere I'd share Grow With AI (website, social accounts, newsletter, clients):\n" +
          "Roughly how many business owners I reach:\nPayPal email for commissions:\n\n" +
          "I have read the affiliate guide and agree to disclose that I earn a commission."));
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();

  window.wcRef = { code: code || null };
})();
