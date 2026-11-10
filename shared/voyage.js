/* The voyage. The ship flies in with both boosters. The first trip stages it:
   Stage 1 (setup) drops the first booster, Stage 2 (your agents) drops the second, then hyper speed:
   space-time is squeezed in front of the ship and stretched out behind it, and it arrives at the
   next world. Later trips go straight to hyper speed. The visitor starts every flight; nothing loops.
   With reduced motion the worlds simply swap. */
(function () {
  "use strict";
  var root = document.getElementById("voyage"); if (!root) return;
  var stage = root.querySelector(".vy-stage"), ship = root.querySelector(".vy-ship");
  var label = root.querySelector(".vy-label"), name = root.querySelector(".vy-name");
  var picks = root.querySelectorAll("[data-go]"), next = root.querySelector("[data-next]");
  var canvas = root.querySelector(".vy-warp"), ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var NAMES = { 1: "First stop: the frozen frontier.", 2: "Next stop: a green world of waterfalls." };
  var COUNT = 2, cur = 1, busy = false, staged = false;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function say(tag, text) { label.textContent = tag; name.textContent = text; }
  function show(n) {
    cur = n; stage.setAttribute("data-world", String(n));
    say("World " + n, NAMES[n]);
    picks.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-go") === String(n))); });
  }
  function later(ms, fn) { setTimeout(fn, ms); }

  /* ---------- the warp field ---------- */
  var cw = 0, ch = 0, stars = [], raf = 0, t0 = 0, DUR = 2600, swapAt = 0.5, swapped = false, target = 1;
  function size() {
    var r = stage.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0); cw = r.width; ch = r.height;
    return r;
  }
  function seed(w, h) {
    stars = [];
    for (var i = 0; i < 160; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, z: 0.3 + Math.random() * 0.7 });
  }
  // How strong the warp is at progress p (0..1): ramps up, holds, ramps down.
  function power(p) { return p < 0.35 ? p / 0.35 : (p < 0.65 ? 1 : Math.max(0, (1 - p) / 0.35)); }
  function nose() {
    var s = stage.getBoundingClientRect(), b = ship.getBoundingClientRect();
    return { x: b.right - s.left - b.width * 0.04, y: b.top - s.top + b.height * 0.45, tail: b.left - s.left };
  }
  function frame(now) {
    var p = Math.min(1, (now - t0) / DUR), k = power(p);
    var w = cw, h = ch;
    var c = nose();
    ctx.clearRect(0, 0, w, h);

    // Space-time grid. Vertical lines bunch up in front of the nose (space squeezed)
    // and spread out behind the ship (space stretched). Lines bend toward the ship's path.
    var step = 34, drift = ((now - t0) * 0.6 * k) % step;
    ctx.lineWidth = 1;
    for (var gx = -step * 4; gx < w + step * 4; gx += step) {
      var u = gx - drift, d = u - c.x, xw;
      if (d > 0) xw = c.x + d * (1 - 0.72 * k * Math.exp(-d / (w * 0.22)));            // squeezed ahead
      else xw = c.x + d * (1 + 1.6 * k * (1 - Math.exp(d / (w * 0.35))));             // stretched behind
      var near = Math.exp(-Math.abs(d) / (w * 0.3));
      ctx.strokeStyle = d > 0 ? "rgba(159,227,208," + (0.10 + 0.45 * k * near) + ")" : "rgba(255,190,140," + (0.06 + 0.25 * k * near) + ")";
      ctx.beginPath();
      for (var gy = 0; gy <= h; gy += 8) {
        var dy = gy - c.y, bend = 26 * k * near * Math.exp(-(dy * dy) / (h * h * 0.08));
        var px = xw + (d > 0 ? -bend : bend);
        if (gy === 0) ctx.moveTo(px, gy); else ctx.lineTo(px, gy);
      }
      ctx.stroke();
    }
    for (var gy2 = step / 2; gy2 < h; gy2 += step) {
      var dy2 = gy2 - c.y, pull = dy2 * (1 - 0.35 * k * Math.exp(-(dy2 * dy2) / (h * h * 0.12)));
      ctx.strokeStyle = "rgba(200,225,235," + (0.05 + 0.18 * k) + ")";
      ctx.beginPath(); ctx.moveTo(0, c.y + dy2); ctx.quadraticCurveTo(c.x, c.y + pull, w, c.y + dy2); ctx.stroke();
    }

    // Star streaks: short and blue-white ahead, long and warm behind.
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.x -= (2 + 38 * k) * st.z;
      if (st.x < -200) { st.x = w + Math.random() * 60; st.y = Math.random() * h; }
      var ahead = st.x > c.x, len = (ahead ? 10 : 70) * k * st.z + 1;
      ctx.strokeStyle = ahead ? "rgba(210,235,255," + (0.35 + 0.5 * k) + ")" : "rgba(255,200,160," + (0.25 + 0.45 * k) + ")";
      ctx.lineWidth = st.z * 1.6;
      ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.x + len, st.y); ctx.stroke();
    }

    // The bubble: a bright compressed front at the nose and a long faint wake behind.
    var g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 120 + 60 * k);
    g.addColorStop(0, "rgba(255,255,255," + 0.55 * k + ")"); g.addColorStop(0.35, "rgba(159,227,208," + 0.25 * k + ")"); g.addColorStop(1, "rgba(159,227,208,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, 120 + 60 * k, 60 + 20 * k, 0, 0, Math.PI * 2); ctx.fill();
    var wake = ctx.createLinearGradient(c.tail, 0, c.tail - w * 0.5, 0);
    wake.addColorStop(0, "rgba(255,190,140," + 0.22 * k + ")"); wake.addColorStop(1, "rgba(255,190,140,0)");
    ctx.fillStyle = wake; ctx.fillRect(c.tail - w * 0.5, c.y - 40 - 30 * k, w * 0.5, 80 + 60 * k);

    // White flash at the jump, then the new world.
    if (!swapped && p >= swapAt) { swapped = true; show(target); say("Hyper speed", "Arriving."); }
    var flash = Math.max(0, 1 - Math.abs(p - swapAt) / 0.08);
    if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + 0.55 * flash + ")"; ctx.fillRect(0, 0, w, h); }

    if (p < 1) raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, w, h); arrive(); }
  }
  function hyper(n) {
    target = n; swapped = false;
    say("Hyper speed", "Space folds in front of the ship and stretches out behind it.");
    stage.classList.remove("idle"); stage.classList.add("warp");
    if (!ctx) { show(n); later(DUR, arrive); return; }
    var r = size(); seed(r.width, r.height);
    t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function arrive() {
    stage.classList.remove("warp"); stage.classList.add("idle");
    show(cur); busy = false;
  }

  /* ---------- the flight ---------- */
  function fly(n) {
    if (n === cur || busy) return;
    if (still) { show(n); staged = true; ship.classList.add("sep1", "sep2"); return; }
    busy = true;
    if (staged) { hyper(n); return; }
    say("Stage 1 · Setup", "Setup is done. The first booster drops away.");
    ship.classList.add("sep1");
    later(1500, function () {
      say("Stage 2 · Your agents", "Your agents are on board. The second booster drops away.");
      ship.classList.add("sep2");
      later(1600, function () { staged = true; hyper(n); });
    });
  }
  picks.forEach(function (b) { b.addEventListener("click", function () { fly(Number(b.getAttribute("data-go"))); }); });
  next.addEventListener("click", function () { fly(cur % COUNT + 1); });
  window.addEventListener("resize", function () { if (stage.classList.contains("warp") && ctx) size(); });

  /* ---------- first arrival when the scene comes into view ---------- */
  if (still) { stage.classList.add("idle"); return; }
  var arrived = false;
  function enter() {
    if (arrived) return; arrived = true;
    stage.classList.remove("idle"); void stage.offsetWidth; stage.classList.add("arrive");
    later(1600, function () { stage.classList.remove("arrive"); stage.classList.add("idle"); });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { enter(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(stage);
  } else { enter(); }
})();
