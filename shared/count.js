/* Visitor counting with GoatCounter: no cookies and no personal data, just page views and a few named events.
   OFF until COUNTER_CODE is set to the site code from https://<code>.goatcounter.com (Chris creates the free account).
   Pages call window.wcCount("setup-finished") for events; it does nothing while the counter is off. */
var COUNTER_CODE = "wardconsulting"; // https://wardconsulting.goatcounter.com (Chris, Nov 9 2026)
(function () {
  "use strict";
  var queue = COUNTER_CODE ? (window.__wcq || []) : []; // events a page logged before this script loaded
  window.wcCount = function (name) { if (COUNTER_CODE) queue.push(name); flush(); };
  function flush() {
    var gc = window.goatcounter;
    if (!gc || typeof gc.count !== "function") return;
    while (queue.length) { var n = queue.shift(); try { gc.count({ path: location.host + "/" + n, title: n, event: true }); } catch (e) {} }
  }
  if (!COUNTER_CODE) return;
  // Both sites share one dashboard, so every path starts with the site's address
  // (wardconsulting.ai/start/ vs zclear2327.github.io/grow-with-ai/start/).
  window.goatcounter = window.goatcounter || {};
  window.goatcounter.path = function (p) { return location.host + p; };
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + COUNTER_CODE + ".goatcounter.com/count");
  s.onload = flush;
  document.head.appendChild(s);
})();
