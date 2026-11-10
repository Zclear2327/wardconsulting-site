/* Launch film at the top of the homepage: plays "Clear for launch" then "Launch" back to back.
   Starts muted when it scrolls into view (browsers only autoplay muted video); the visitor can turn
   sound on or pause. With reduced motion it never starts by itself. */
(function () {
  "use strict";
  var fig = document.getElementById("launchfilm"); if (!fig) return;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tall = window.matchMedia("(max-width: 600px)");
  // The buttons can sit inside the figure, or anywhere in a bar marked data-for="launchfilm".
  var bar = document.querySelector('[data-for="launchfilm"]') || fig;
  var playBtn = bar.querySelector(".lf-play"), soundBtn = bar.querySelector(".lf-sound");
  if (!playBtn || !soundBtn) return;
  function active() { return fig.querySelector(tall.matches ? ".lf-tall video" : ".lf-wide video"); }
  function list(v) { return (v.getAttribute("data-list") || "").split(/\s+/).filter(Boolean); }
  function label() {
    var v = active();
    playBtn.textContent = v.paused ? (v.ended ? "Watch again" : "Play the launch") : "Pause";
    playBtn.setAttribute("aria-pressed", String(!v.paused));
    soundBtn.textContent = v.muted ? "Sound on" : "Sound off";
    soundBtn.setAttribute("aria-pressed", String(!v.muted));
  }
  fig.querySelectorAll("video").forEach(function (v) {
    v.dataset.i = "0";
    v.addEventListener("ended", function () {
      var l = list(v), i = Number(v.dataset.i) + 1;
      if (i < l.length) { v.dataset.i = String(i); v.src = l[i]; v.play().catch(function () {}); }
      label();
    });
    ["play", "pause"].forEach(function (e) { v.addEventListener(e, label); });
  });
  function restartIfDone(v) {
    if (v.ended && Number(v.dataset.i) >= list(v).length - 1) { v.dataset.i = "0"; v.src = list(v)[0]; }
  }
  playBtn.addEventListener("click", function () {
    var v = active();
    if (v.paused) { restartIfDone(v); v.play().catch(function () {}); } else { v.pause(); }
  });
  soundBtn.addEventListener("click", function () {
    var v = active(); v.muted = !v.muted; if (!v.muted && v.paused) v.play().catch(function () {}); label();
  });
  if (!still && "IntersectionObserver" in window) {
    var started = false, autoPaused = false;
    var io = new IntersectionObserver(function (e) {
      var v = active();
      if (e[0].isIntersecting) {
        if (!started || autoPaused) { started = true; autoPaused = false; v.play().catch(function () {}); }
      } else if (!v.paused) { v.pause(); autoPaused = true; }
    }, { threshold: 0.4 });
    io.observe(fig);
  }
  tall.addEventListener("change", function () { fig.querySelectorAll("video").forEach(function (v) { v.pause(); }); label(); });
  label();
})();
