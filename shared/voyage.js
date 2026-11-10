/* The voyage: the ship flies in, and the buttons send it to the next world.
   With reduced motion the worlds simply swap. No autoplay loop: the visitor decides when to fly. */
(function () {
  "use strict";
  var root = document.getElementById("voyage"); if (!root) return;
  var stage = root.querySelector(".vy-stage"), label = root.querySelector(".vy-label"), name = root.querySelector(".vy-name");
  var picks = root.querySelectorAll("[data-go]"), next = root.querySelector("[data-next]");
  var NAMES = { 1: "First stop: the frozen frontier.", 2: "Next stop: a green world of waterfalls." };
  var COUNT = 2, cur = 1, busy = false;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(n) {
    cur = n; stage.setAttribute("data-world", String(n));
    label.textContent = "World " + n; name.textContent = NAMES[n];
    picks.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-go") === String(n))); });
  }
  function settle(cls, ms, then) {
    stage.classList.remove("idle", "arrive", "depart"); void stage.offsetWidth; stage.classList.add(cls);
    setTimeout(then, ms);
  }
  function fly(n) {
    if (n === cur || busy) return;
    if (still) { show(n); return; }
    busy = true;
    settle("depart", 900, function () {
      show(n);
      settle("arrive", 1600, function () { stage.classList.remove("arrive"); stage.classList.add("idle"); busy = false; });
    });
  }
  picks.forEach(function (b) { b.addEventListener("click", function () { fly(Number(b.getAttribute("data-go"))); }); });
  next.addEventListener("click", function () { fly(cur % COUNT + 1); });

  // First arrival when the scene comes into view.
  if (still) { stage.classList.add("idle"); return; }
  var arrived = false;
  function arrive() { if (arrived) return; arrived = true; settle("arrive", 1600, function () { stage.classList.remove("arrive"); stage.classList.add("idle"); }); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { arrive(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(stage);
  } else { arrive(); }
})();
