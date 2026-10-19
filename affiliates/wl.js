/* Waitlist / interest forms. Posts to the same FormSubmit endpoint as the questionnaire, which
 * delivers to Chris. Nothing is charged; it only records interest. */
(function () {
  var ENDPOINT = "https://formsubmit.co/ajax/7fbd7e6f9b9178360b909504bd877f07";
  var START = Date.now();
  document.querySelectorAll("form[data-waitlist]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = f.querySelector(".msg"), em = f.querySelector("input[type=email]"),
          cb = f.querySelector("input[type=checkbox]"), hp = f.querySelector("input[name=_honey]"),
          sel = f.querySelector("select"), btn = f.querySelector("button");
      var v = (em.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = "That email does not look right. Check it and try again."; em.focus(); return; }
      if (cb && !cb.checked) { msg.textContent = "Tick the box so we are allowed to email you."; cb.focus(); return; }
      if ((hp && hp.value) || (Date.now() - START) / 1000 < 4) { msg.textContent = "Thanks, you're on the list."; return; }
      var b = new FormData();
      b.append("email", v);
      b.append("list", f.getAttribute("data-waitlist"));
      if (sel) b.append("interest", sel.options[sel.selectedIndex].text);
      b.append("referred_by", (window.wcRef && window.wcRef.code) || "");
      b.append("_subject", "Waitlist: " + f.getAttribute("data-waitlist") + " (" + v + ")");
      b.append("_template", "table");
      btn.disabled = true; msg.textContent = "Sending...";
      fetch(ENDPOINT, { method: "POST", body: b, headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (j && (j.success === false || j.success === "false")) throw new Error(j.message || "not accepted");
          msg.textContent = "Thanks, you're on the list. We'll email you when it opens.";
          var dl = f.getAttribute("data-download");
          if (dl && !f.querySelector(".dl")) {
            var p = document.createElement("p"); p.className = "dl";
            var a = document.createElement("a"); a.className = "btn primary"; a.href = dl; a.setAttribute("download", "");
            a.textContent = "Download your free Inbox Cleanup guide";
            p.appendChild(a); f.appendChild(p);
          }
        })
        .catch(function (e) {
          btn.disabled = false;
          msg.textContent = "That did not go through (" + e.message + "). Email hello@wardconsulting.ai instead.";
        });
    });
  });
})();
