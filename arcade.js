/* ====================================================
   AARON ZHANG — PORTFOLIO, BUT IT'S A GAME
   ==================================================== */
"use strict";

const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- game state ---------------- */
const state = {
  xp: 0,
  level: 1,
  coins: 0,
  sound: true,
  unlocked: new Set(),
};

const ACHIEVEMENTS = {
  start:     { icon: "🕹️", title: "INSERT COIN",     desc: "Pressed start. The game begins." },
  explorer:  { icon: "🗺️", title: "EXPLORER",        desc: "Scrolled past the halfway point." },
  finisher:  { icon: "🏁", title: "COMPLETIONIST",   desc: "Reached the end of the page." },
  artist:    { icon: "✏️", title: "ARTIST",          desc: "Drew a circle in the mini-game." },
  perfect:   { icon: "⭕", title: "PERFECTIONIST",   desc: "Scored 90%+ on the circle. Respect." },
  networker: { icon: "🤝", title: "NETWORKER",       desc: "Opened a contact link. Smart move." },
  secret:    { icon: "🌈", title: "??? SECRET",      desc: "↑↑↓↓←→←→BA. You know the ways." },
};

/* ---------------- audio (tiny chiptune synth) ---------------- */
let actx = null;
function beep(freq, dur = 0.08, type = "square", vol = 0.04, when = 0) {
  if (!state.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* audio unavailable; stay silent */ }
}
const sfx = {
  hover: () => beep(520, 0.04, "square", 0.018),
  coin: () => { beep(988, 0.07); beep(1319, 0.18, "square", 0.04, 0.07); },
  achievement: () => { beep(659, 0.1); beep(880, 0.1, "square", 0.04, 0.1); beep(1175, 0.25, "square", 0.04, 0.2); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.12, "square", 0.045, i * 0.09)),
  fail: () => { beep(196, 0.2, "sawtooth", 0.035); beep(147, 0.3, "sawtooth", 0.035, 0.18); },
  start: () => [392, 523, 659, 784, 1047].forEach((f, i) => beep(f, 0.1, "square", 0.05, i * 0.07)),
};

$("#sndBtn").addEventListener("click", () => {
  state.sound = !state.sound;
  $("#sndBtn").textContent = state.sound ? "♪ ON" : "♪ OFF";
  if (state.sound) sfx.coin();
});

/* ---------------- HUD: xp / level / coins ---------------- */
function xpNeeded(lv) { return 100 + (lv - 1) * 75; }

function updateHUD() {
  $("#hudLv").textContent = "LV " + state.level;
  $("#hudXp").textContent = state.xp + " XP";
  $("#xpFill").style.width = Math.min(100, (state.xp / xpNeeded(state.level)) * 100) + "%";
  $("#hudCoins").textContent = "🪙 " + state.coins;
  $("#hudAch").textContent = `🏆 ${state.unlocked.size}/${Object.keys(ACHIEVEMENTS).length}`;
}

function addXP(n) {
  state.xp += n;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    toast("⬆️", "LEVEL UP!", "You reached level " + state.level + ".");
    sfx.levelup();
    confetti(28);
  }
  updateHUD();
}

function addCoins(n) {
  state.coins += n;
  sfx.coin();
  updateHUD();
}

function unlock(id) {
  if (state.unlocked.has(id)) return;
  state.unlocked.add(id);
  const a = ACHIEVEMENTS[id];
  toast(a.icon, "ACHIEVEMENT — " + a.title, a.desc);
  sfx.achievement();
  confetti(18);
  addXP(40);
}

/* ---------------- toasts ---------------- */
function toast(icon, title, desc) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-icon">${icon}</span><div><div class="toast-title">${title}</div><div class="toast-desc">${desc}</div></div>`;
  $("#toasts").appendChild(el);
  setTimeout(() => el.classList.add("out"), 3600);
  setTimeout(() => el.remove(), 4100);
}

/* ---------------- confetti ---------------- */
const COLORS = ["#ff2d95", "#00e5ff", "#ffd60a", "#3dff8c", "#a06bff"];
function confetti(count) {
  if (reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const b = document.createElement("div");
    b.className = "bit";
    b.style.background = COLORS[i % COLORS.length];
    b.style.left = 50 + (Math.random() - 0.5) * 30 + "vw";
    b.style.top = "-12px";
    document.body.appendChild(b);
    const drift = (Math.random() - 0.5) * 240;
    const spin = Math.random() * 720 - 360;
    b.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${drift}px, ${innerHeight + 40}px) rotate(${spin}deg)`, opacity: 0.9 },
      ],
      { duration: 1400 + Math.random() * 1200, easing: "cubic-bezier(0.2,0.6,0.4,1)" }
    ).onfinish = () => b.remove();
  }
}

/* ---------------- boot sequence ---------------- */
const BOOT_LINES = [
  "LOADING AARON.EXE ............ OK",
  "MOUNTING 50,000,000 PLAYS .... OK",
  "COMPILING LUA SCRIPTS ........ OK",
  "ENROLLING AT UCLA ............ OK",
  "READY.",
];

(function boot() {
  const log = $("#bootLog");
  const bar = $("#bootBar");
  if (reducedMotion) {
    log.textContent = "READY.";
    bar.style.width = "100%";
    showStart();
    return;
  }
  let i = 0;
  const step = () => {
    if (i < BOOT_LINES.length) {
      log.innerHTML += BOOT_LINES[i] + "<br>";
      bar.style.width = ((i + 1) / BOOT_LINES.length) * 100 + "%";
      i++;
      setTimeout(step, 320);
    } else {
      showStart();
    }
  };
  setTimeout(step, 350);
})();

function showStart() {
  $("#pressStart").hidden = false;
  $("#bootHint").hidden = false;
}

function startGame() {
  if (document.body.classList.contains("playing")) return;
  document.body.classList.add("playing");
  $("#boot").classList.add("done");
  sfx.start();
  addXP(50);
  unlock("start");
}
$("#pressStart").addEventListener("click", startGame);
addEventListener("keydown", (e) => {
  if (!$("#pressStart").hidden && (e.key === "Enter" || e.key === " ")) startGame();
}, { once: false });

/* ---------------- background canvas: drifting pixels ---------------- */
(function background() {
  const cv = $("#bg");
  const ctx = cv.getContext("2d");
  let w, h, parts;

  function resize() {
    w = cv.width = innerWidth;
    h = cv.height = innerHeight;
  }
  resize();
  addEventListener("resize", resize);

  parts = Array.from({ length: 70 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    s: Math.random() < 0.85 ? 2 : 4,
    v: 0.15 + Math.random() * 0.45,
    c: COLORS[(Math.random() * COLORS.length) | 0],
    tw: Math.random() * Math.PI * 2,
  }));

  let star = null; // occasional shooting star

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y -= p.v;
      p.tw += 0.03;
      if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
      ctx.globalAlpha = 0.25 + Math.sin(p.tw) * 0.2;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s);
    }
    ctx.globalAlpha = 1;

    if (!star && Math.random() < 0.004) {
      star = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.3, life: 0 };
    }
    if (star) {
      star.life++;
      star.x += 9; star.y += 4.5;
      ctx.strokeStyle = "rgba(0,229,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x - 36, star.y - 18);
      ctx.stroke();
      if (star.life > 40 || star.x > w) star = null;
    }
    requestAnimationFrame(frame);
  }
  if (!reducedMotion) requestAnimationFrame(frame);
})();

/* ---------------- typewriter roles ---------------- */
(function typewriter() {
  const roles = ["GAME DEVELOPER", "SOFTWARE ENGINEER", "UCLA CS '29", "STUDIO OWNER", "DATA SCIENTIST", "HIGH SCORE: $250K+"];
  const el = $("#typewriter");
  if (reducedMotion) { el.textContent = roles[0]; return; }
  let ri = 0, ci = 0, del = false;
  function tick() {
    const word = roles[ri];
    el.textContent = word.slice(0, ci);
    if (!del && ci < word.length) { ci++; setTimeout(tick, 65); }
    else if (!del) { del = true; setTimeout(tick, 1500); }
    else if (ci > 0) { ci--; setTimeout(tick, 30); }
    else { del = false; ri = (ri + 1) % roles.length; setTimeout(tick, 350); }
  }
  tick();
})();

/* ---------------- reveal on scroll ---------------- */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((en, i) => {
    if (en.isIntersecting) {
      en.target.style.transitionDelay = (i % 3) * 90 + "ms";
      en.target.classList.add("visible");
      revealObs.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

/* ---------------- animated counters ---------------- */
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    counterObs.unobserve(en.target);
    const el = en.target;
    const target = parseFloat(el.dataset.target);
    const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    const t0 = performance.now();
    (function tick(now) {
      const t = Math.min((now - t0) / 1500, 1);
      el.textContent = pre + Math.round(target * (1 - Math.pow(1 - t, 3))) + suf;
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  });
}, { threshold: 0.6 });
document.querySelectorAll(".big-stat-num").forEach((el) => counterObs.observe(el));

/* ---------------- scroll milestones ---------------- */
const milestones = [
  { at: 0.25, xp: 25, done: false },
  { at: 0.5, xp: 25, done: false, ach: "explorer" },
  { at: 0.75, xp: 25, done: false },
  { at: 0.98, xp: 50, done: false, ach: "finisher" },
];
addEventListener("scroll", () => {
  const p = scrollY / (document.documentElement.scrollHeight - innerHeight);
  for (const m of milestones) {
    if (!m.done && p >= m.at) {
      m.done = true;
      addXP(m.xp);
      addCoins(5);
      if (m.ach) unlock(m.ach);
    }
  }
}, { passive: true });

/* ---------------- hover bleeps + coin clicks ---------------- */
document.querySelectorAll(".menu-item, .lobby-card, .sq, .item, .quicknav a").forEach((el) => {
  el.addEventListener("mouseenter", sfx.hover);
});
document.querySelectorAll("[data-net]").forEach((el) => {
  el.addEventListener("click", () => { unlock("networker"); addCoins(10); });
});

/* ---------------- konami code ---------------- */
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let kpos = 0;
addEventListener("keydown", (e) => {
  kpos = (e.key === KONAMI[kpos]) ? kpos + 1 : (e.key === KONAMI[0] ? 1 : 0);
  if (kpos === KONAMI.length) {
    kpos = 0;
    document.body.classList.toggle("party");
    unlock("secret");
    addCoins(100);
    confetti(80);
  }
});

/* ====================================================
   MINI-GAME: DRAW A PERFECT CIRCLE
   ==================================================== */
(function circleGame() {
  const cv = $("#circleGame");
  const ctx = cv.getContext("2d");
  const SIZE = 480;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = SIZE * dpr;
  cv.height = SIZE * dpr;
  ctx.scale(dpr, dpr);

  const msg = $("#gameMsg");
  const scoreEl = $("#gsScore");
  const gradeEl = $("#gsGrade");
  const bestEl = $("#gsBest");

  let best = +(localStorage.getItem("circleBest") || 0);
  if (best) bestEl.textContent = best + "%";

  let pts = [];
  let drawing = false;

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  }

  function clear(grid = true) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!grid) return;
    ctx.strokeStyle = "rgba(0,229,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 40; i < SIZE; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke();
    }
    // center dot as anchor
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.arc(SIZE / 2, SIZE / 2, 3, 0, 7); ctx.fill();
  }
  clear();

  function strokePath(color) {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  cv.addEventListener("pointerdown", (e) => {
    drawing = true;
    pts = [pos(e)];
    cv.setPointerCapture(e.pointerId);
    clear();
  });

  cv.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    pts.push(pos(e));
    clear();
    strokePath("#00e5ff");
  });

  cv.addEventListener("pointerup", () => {
    if (!drawing) return;
    drawing = false;
    judge();
  });

  function judge() {
    if (pts.length < 25) {
      msg.textContent = "too short!\ndraw one full circle";
      sfx.fail();
      return;
    }
    // centroid
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;

    // radii stats
    const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const meanR = radii.reduce((a, b) => a + b) / radii.length;
    if (meanR < 30) {
      msg.textContent = "bigger! fill the box";
      sfx.fail();
      return;
    }
    const variance = radii.reduce((a, r) => a + (r - meanR) ** 2, 0) / radii.length;
    const relStd = Math.sqrt(variance) / meanR;

    // angular coverage: largest gap between sorted angles
    const angles = pts.map((p) => Math.atan2(p.y - cy, p.x - cx)).sort((a, b) => a - b);
    let maxGap = angles[0] + Math.PI * 2 - angles[angles.length - 1];
    for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
    const coverage = Math.max(0, 1 - Math.max(0, maxGap - 0.35) / (Math.PI * 1.2));

    const roundness = Math.max(0, 1 - relStd * 3.2);
    const score = Math.round(100 * roundness * coverage);

    // verdict
    const grade = score >= 95 ? "S" : score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";
    const lines = {
      S: "FLAWLESS.\nare you a compass?",
      A: "excellent circle!\nachievement unlocked",
      B: "solid! 40M players\nstarted somewhere",
      C: "respectable.\ntry a smoother arc",
      D: "that's... an egg",
      F: "the circle has\nfiled a complaint",
    };

    strokePath(score >= 90 ? "#3dff8c" : score >= 65 ? "#ffd60a" : "#ff2d95");
    // ideal circle ghost
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, meanR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    scoreEl.textContent = score + "%";
    gradeEl.textContent = "RANK " + grade;
    msg.textContent = lines[grade];

    if (score > best) {
      best = score;
      localStorage.setItem("circleBest", best);
      bestEl.textContent = best + "%";
    }

    unlock("artist");
    addXP(Math.round(score / 2));
    addCoins(Math.round(score / 10));
    if (score >= 90) { unlock("perfect"); confetti(40); sfx.levelup(); }
    else if (score >= 65) sfx.coin();
    else sfx.fail();
  }

  $("#retryBtn").addEventListener("click", () => {
    pts = [];
    clear();
    scoreEl.textContent = "--";
    gradeEl.textContent = "";
    msg.textContent = "draw inside the box ▴";
  });
})();

/* ---------------- footer flair ---------------- */
updateHUD();
