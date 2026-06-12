/* ====================================================
   AARON ZHANG — PORTFOLIO, BUT IT'S A SPACE GAME
   warp engine · shooting gallery · cinematic intro · save files
   ==================================================== */
"use strict";

const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const COLORS = ["#ff2d95", "#00e5ff", "#ffd60a", "#3dff8c", "#a06bff"];

/* ---------------- game state + save file ---------------- */
const state = {
  xp: 0,
  level: 1,
  coins: 0,
  kills: 0,
  sound: true,
  unlocked: new Set(),
};

const ACHIEVEMENTS = {
  start:     { icon: "🕹️", title: "INSERT COIN",       desc: "Pressed start. The game begins." },
  explorer:  { icon: "🗺️", title: "EXPLORER",          desc: "Scrolled past the halfway point." },
  finisher:  { icon: "🏁", title: "COMPLETIONIST",     desc: "Reached the end of the page." },
  artist:    { icon: "✏️", title: "ARTIST",            desc: "Drew a circle in the mini-game." },
  perfect:   { icon: "⭕", title: "PERFECTIONIST",     desc: "Scored 90%+ on the circle. Respect." },
  networker: { icon: "🤝", title: "NETWORKER",         desc: "Opened a contact link. Smart move." },
  janitor:   { icon: "🛸", title: "SPACE JANITOR",     desc: "Vaporized 10 asteroids." },
  secret:    { icon: "🌈", title: "??? SECRET",        desc: "↑↑↓↓←→←→BA. You know the ways." },
};

function saveGame() {
  try {
    localStorage.setItem("azSave", JSON.stringify({
      xp: state.xp, level: state.level, coins: state.coins,
      kills: state.kills, unlocked: [...state.unlocked],
    }));
  } catch (e) { /* private mode */ }
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem("azSave"));
    if (!d) return false;
    state.xp = d.xp || 0;
    state.level = d.level || 1;
    state.coins = d.coins || 0;
    state.kills = d.kills || 0;
    (d.unlocked || []).forEach((id) => { if (ACHIEVEMENTS[id]) state.unlocked.add(id); });
    return true;
  } catch (e) { return false; }
}
const hasSave = loadGame();

/* ---------------- audio: sfx + generative chiptune bgm ---------------- */
let actx = null;
function ctx() {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}
function beep(freq, dur = 0.08, type = "square", vol = 0.04, when = 0) {
  if (!state.sound) return;
  try {
    const a = ctx();
    const t = a.currentTime + when;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* stay silent */ }
}
const sfx = {
  hover: () => beep(520, 0.04, "square", 0.015),
  coin: () => { beep(988, 0.07); beep(1319, 0.18, "square", 0.04, 0.07); },
  achievement: () => { beep(659, 0.1); beep(880, 0.1, "square", 0.04, 0.1); beep(1175, 0.25, "square", 0.04, 0.2); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.12, "square", 0.045, i * 0.09)),
  fail: () => { beep(196, 0.2, "sawtooth", 0.035); beep(147, 0.3, "sawtooth", 0.035, 0.18); },
  start: () => [392, 523, 659, 784, 1047].forEach((f, i) => beep(f, 0.1, "square", 0.05, i * 0.07)),
  zap: () => { beep(1800, 0.05, "sawtooth", 0.03); beep(900, 0.08, "sawtooth", 0.025, 0.03); },
  boom: () => { beep(110, 0.25, "sawtooth", 0.05); beep(70, 0.35, "triangle", 0.06, 0.05); },
  warp: () => {
    if (!state.sound) return;
    try {
      const a = ctx();
      const t = a.currentTime;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(1500, t + 1.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 1.25);
    } catch (e) { /* silent */ }
  },
  braam: () => {
    if (!state.sound) return;
    try {
      const a = ctx();
      const t = a.currentTime;
      // detuned low saws swelling together — trailer braam
      [55, 55.7, 110.3].forEach((f) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = "sawtooth";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.038, t + 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
        o.connect(g).connect(a.destination);
        o.start(t);
        o.stop(t + 2.4);
      });
    } catch (e) { /* silent */ }
  },
  thud: () => beep(55, 0.12, "sine", 0.07),
  chord: () => [262, 330, 392, 523].forEach((f, i) => beep(f, 1.1, "triangle", 0.02, i * 0.07)),
};

$("#sndBtn").addEventListener("click", () => {
  state.sound = !state.sound;
  $("#sndBtn").textContent = state.sound ? "♪ ON" : "♪ OFF";
  if (state.sound) sfx.coin();
});

/* bgm: tiny step-sequenced synthwave loop */
const BGM = {
  on: false,
  step: 0,
  timer: null,
  lead: [440, 0, 523, 587, 659, 0, 587, 523, 440, 0, 392, 440, 523, 0, 392, 330],
  bass: [110, 110, 87, 87, 98, 98, 73, 82],
};
function bgmTick() {
  if (!BGM.on || !state.sound) return;
  const s = BGM.step;
  const lead = BGM.lead[s % 16];
  if (lead) beep(lead, 0.14, "square", 0.018);
  if (s % 2 === 0) beep(BGM.bass[(s / 2) % 8], 0.22, "triangle", 0.03);
  if (s % 4 === 0) beep(50, 0.06, "sine", 0.05); // kick thump
  BGM.step++;
}
$("#bgmBtn").addEventListener("click", () => {
  BGM.on = !BGM.on;
  $("#bgmBtn").textContent = BGM.on ? "♫ ON" : "♫ OFF";
  if (BGM.on) { ctx(); BGM.timer = setInterval(bgmTick, 150); }
  else clearInterval(BGM.timer);
});

/* ---------------- HUD: xp / level / coins ---------------- */
function xpNeeded(lv) { return 100 + (lv - 1) * 75; }

function updateHUD() {
  $("#hudLv").textContent = "LV " + state.level;
  $("#hudXp").textContent = state.xp + " XP";
  $("#xpFill").style.width = Math.min(100, (state.xp / xpNeeded(state.level)) * 100) + "%";
  $("#hudCoins").textContent = "🪙 " + state.coins;
  $("#hudAch").textContent = `🏆 ${state.unlocked.size}/${Object.keys(ACHIEVEMENTS).length}`;
  saveGame();
}

function addXP(n) {
  state.xp += n;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    toast("⬆️", "LEVEL UP!", "You reached level " + state.level + ".");
    sfx.levelup();
    confetti(28);
    shake();
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
  shake();
  addXP(40);
}

/* ---------------- toasts / shake / confetti ---------------- */
function toast(icon, title, desc) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-icon">${icon}</span><div><div class="toast-title">${title}</div><div class="toast-desc">${desc}</div></div>`;
  $("#toasts").appendChild(el);
  setTimeout(() => el.classList.add("out"), 3600);
  setTimeout(() => el.remove(), 4100);
}

function shake() {
  if (reducedMotion) return;
  const m = document.querySelector("main");
  m.classList.remove("shake");
  void m.offsetWidth; // restart animation
  m.classList.add("shake");
}

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
  hasSave ? "SAVE FILE FOUND .............. OK" : "CREATING NEW SAVE ............ OK",
  "READY.",
];

(function boot() {
  const log = $("#bootLog");
  const bar = $("#bootBar");
  if (hasSave) $("#pressStart").textContent = "▶ CONTINUE";
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
      setTimeout(step, 300);
    } else {
      showStart();
    }
  };
  setTimeout(step, 350);
})();

function showStart() {
  $("#pressStart").hidden = false;
  $("#bootHint").hidden = false;
  $("#bootHint").textContent = hasSave
    ? `welcome back, LV ${state.level} — progress restored`
    : "recruiters get infinite lives";
}

function startGame() {
  if (document.body.classList.contains("playing")) return;
  document.body.classList.add("playing");
  $("#boot").classList.add("done");
  sfx.start();
  addXP(10);
  unlock("start");
  if (reducedMotion) document.body.classList.add("entered");
  else runCinematic();
}

/* ---------------- hyperspace entry: pure motion, no words ---------------- */
function runCinematic() {
  const cine = $("#cine");
  let done = false;
  let arriveTimer = null;

  cine.hidden = false;
  document.body.classList.add("warping");
  requestAnimationFrame(() => cine.classList.add("on"));
  space.jump();
  sfx.warp();

  function arrive() {
    if (done) return;
    done = true;
    clearTimeout(arriveTimer);
    cine.classList.add("flash");
    document.body.classList.remove("warping");
    document.body.classList.add("entered");
    sfx.boom();
    shake();
    setTimeout(() => cine.classList.remove("on"), 200);
    setTimeout(() => { cine.hidden = true; cine.classList.remove("flash"); }, 1100);
    removeEventListener("click", arrive, true);
    removeEventListener("keydown", arrive, true);
  }

  // impatient pilots can drop out of warp early
  addEventListener("click", arrive, true);
  addEventListener("keydown", arrive, true);
  arriveTimer = setTimeout(arrive, 1150);
}
$("#pressStart").addEventListener("click", startGame);
addEventListener("keydown", (e) => {
  if (!$("#pressStart").hidden && !document.body.classList.contains("playing") &&
      (e.key === "Enter" || e.key === " ")) startGame();
});

/* ====================================================
   WARP ENGINE — starfield + asteroids + lasers
   ==================================================== */
const space = (() => {
  const cv = $("#bg");
  const c = cv.getContext("2d");
  let W, H, CX, CY;
  let mouseX = 0.5, mouseY = 0.5;
  let warp = 0; // scroll-driven boost

  function resize() {
    W = cv.width = innerWidth;
    H = cv.height = innerHeight;
    CX = W / 2; CY = H / 2;
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => {
    mouseX = e.clientX / W;
    mouseY = e.clientY / H;
  }, { passive: true });

  let lastY = scrollY;
  addEventListener("scroll", () => {
    warp = Math.min(30, warp + Math.abs(scrollY - lastY) * 0.06);
    lastY = scrollY;
  }, { passive: true });

  /* stars in z-space, flying at the camera */
  const STARS = Array.from({ length: 200 }, () => ({
    x: (Math.random() - 0.5) * 2000,
    y: (Math.random() - 0.5) * 2000,
    z: Math.random() * 1000 + 1,
    c: Math.random() < 0.82 ? "#ffffff" : COLORS[(Math.random() * COLORS.length) | 0],
  }));

  /* asteroids: pixel-cluster targets */
  const asteroids = [];
  function spawnAsteroid() {
    const size = 14 + Math.random() * 22;
    const edge = (Math.random() * 4) | 0;
    const a = {
      x: edge === 0 ? -60 : edge === 1 ? W + 60 : Math.random() * W,
      y: edge < 2 ? Math.random() * H : edge === 2 ? -60 : H + 60,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      size,
      cells: [],
    };
    // random blocky shape
    const n = 4;
    for (let i = 0; i < n * n; i++) {
      const gx = (i % n) - n / 2, gy = ((i / n) | 0) - n / 2;
      if (Math.hypot(gx + 0.5, gy + 0.5) < n / 2 + 0.3 && Math.random() < 0.85)
        a.cells.push([gx, gy]);
    }
    if (a.vx === 0 && a.vy === 0) a.vx = 0.3;
    asteroids.push(a);
  }

  /* effects */
  const beams = [];   // {x, y, t}
  const debris = [];  // {x, y, vx, vy, t, c}

  function explode(x, y, size) {
    for (let i = 0; i < 26; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      debris.push({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        t: 1, c: COLORS[(Math.random() * COLORS.length) | 0],
        s: 2 + Math.random() * (size / 8),
      });
    }
  }

  function fire(x, y) {
    beams.push({ x, y, t: 1 });
    sfx.zap();
    let hit = false;
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      if (Math.hypot(a.x - x, a.y - y) < a.size + 30) {
        explode(a.x, a.y, a.size);
        asteroids.splice(i, 1);
        hit = true;
        state.kills++;
        addCoins(5);
        addXP(10);
        sfx.boom();
        if (state.kills >= 10) unlock("janitor");
      }
    }
    return hit;
  }

  function frame() {
    c.clearRect(0, 0, W, H);
    const speed = 1.2 + warp;
    warp *= 0.93;
    const px = (mouseX - 0.5) * 60;
    const py = (mouseY - 0.5) * 60;

    /* stars */
    for (const s of STARS) {
      s.z -= speed;
      if (s.z <= 1) {
        s.x = (Math.random() - 0.5) * 2000;
        s.y = (Math.random() - 0.5) * 2000;
        s.z = 1000;
      }
      const k = 280 / s.z;
      const sx = CX + s.x * k / 10 - px;
      const sy = CY + s.y * k / 10 - py;
      if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
      const sz = Math.max(0.5, (1 - s.z / 1000) * 3);
      c.globalAlpha = Math.min(1, (1 - s.z / 1000) * 1.4);
      c.fillStyle = s.c;
      if (warp > 4) {
        // streaks at warp speed
        const k2 = 280 / (s.z + speed * 6);
        c.strokeStyle = s.c;
        c.lineWidth = sz;
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(CX + s.x * k2 / 10 - px, CY + s.y * k2 / 10 - py);
        c.stroke();
      } else {
        c.fillRect(sx, sy, sz, sz);
      }
    }
    c.globalAlpha = 1;

    /* asteroids */
    if (asteroids.length < 5 && Math.random() < 0.02) spawnAsteroid();
    for (const a of asteroids) {
      a.x += a.vx; a.y += a.vy; a.rot += a.vr;
      if (a.x < -100 || a.x > W + 100 || a.y < -100 || a.y > H + 100) {
        a.x = Math.max(-99, Math.min(W + 99, a.x));
        a.y = Math.max(-99, Math.min(H + 99, a.y));
        a.vx *= -1; a.vy *= -1;
      }
      c.save();
      c.translate(a.x, a.y);
      c.rotate(a.rot);
      const u = a.size / 2.2;
      for (const [gx, gy] of a.cells) {
        c.fillStyle = "rgba(167,159,201,0.55)";
        c.fillRect(gx * u, gy * u, u - 1, u - 1);
      }
      c.strokeStyle = "rgba(255,255,255,0.25)";
      c.strokeRect(-a.size, -a.size, a.size * 2, a.size * 2);
      c.restore();
    }

    /* laser rings */
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.t -= 0.06;
      if (b.t <= 0) { beams.splice(i, 1); continue; }
      const r = (1 - b.t) * 46;
      c.globalAlpha = b.t;
      c.strokeStyle = "#00e5ff";
      c.lineWidth = 2;
      c.beginPath(); c.arc(b.x, b.y, r, 0, 7); c.stroke();
      c.beginPath();
      c.moveTo(b.x - r - 8, b.y); c.lineTo(b.x - r + 4, b.y);
      c.moveTo(b.x + r - 4, b.y); c.lineTo(b.x + r + 8, b.y);
      c.moveTo(b.x, b.y - r - 8); c.lineTo(b.x, b.y - r + 4);
      c.moveTo(b.x, b.y + r - 4); c.lineTo(b.x, b.y + r + 8);
      c.stroke();
      c.globalAlpha = 1;
    }

    /* debris */
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.t -= 0.02;
      if (d.t <= 0) { debris.splice(i, 1); continue; }
      d.x += d.vx; d.y += d.vy;
      d.vx *= 0.98; d.vy *= 0.98;
      c.globalAlpha = d.t;
      c.fillStyle = d.c;
      c.fillRect(d.x, d.y, d.s, d.s);
    }
    c.globalAlpha = 1;

    requestAnimationFrame(frame);
  }

  if (!reducedMotion) requestAnimationFrame(frame);
  else {
    // static starfield
    for (const s of STARS) {
      c.fillStyle = s.c;
      c.globalAlpha = 0.5;
      c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
  }

  return { fire, jump: (v = 90) => { warp = v; } };
})();

/* click-to-shoot (anywhere that isn't interactive) */
document.addEventListener("click", (e) => {
  if (!document.body.classList.contains("playing")) return;
  if (e.target.closest("a, button, input, #circleGame, .hud, .quicknav, .cine, .toast")) return;
  if (!document.body.classList.contains("entered")) return;
  space.fire(e.clientX, e.clientY);
});

/* ---------------- film outro: the lobby IS the finale ----------------
   SHOT A     push-in on the lobby title (REC on, braam) — cards hidden
   CUT        hard black frame
   SHOWCASE   the four lobby cards warp in from hyperspace one by one,
              each landing with a boom, shake, shockwave and scramble
   PULSE      all four glow together — then bars lift and the final quest drops */
(function finalShot() {
  if (reducedMotion) return;
  const target = $("#contact");
  let played = false;
  const obs = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting || played || !document.body.classList.contains("entered")) return;
      played = true;
      obs.disconnect();
      film();
    });
  }, { threshold: 0.45 });
  obs.observe(target);

  function film() {
    const cine = $("#cine");
    const timeEl = $("#recTime");
    const timers = [];
    let frames = 0;
    let rolling = true;

    cine.hidden = false;
    cine.classList.add("film");
    requestAnimationFrame(() => cine.classList.add("on"));

    // running 24fps timecode next to the REC dot
    const tc = setInterval(() => {
      frames++;
      const f = frames % 24;
      const s = ((frames / 24) | 0) % 60;
      timeEl.textContent = `00:00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
    }, 42);

    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    function hardCut() {
      sfx.thud();
      cine.classList.add("cut");
      setTimeout(() => cine.classList.remove("cut"), 90);
    }

    const cards = [...document.querySelectorAll(".lobby-card")];
    const lobby = $(".lobby");
    let landed = 0;

    // SHOT A — cards vanish, slow push-in on the empty lobby
    document.body.classList.add("lobby-cine", "outro-a");
    sfx.braam();
    space.jump(16);

    function slam(card) {
      card.classList.add("slam");
      landed++;
      sfx.boom();
      shake();
      space.jump(6);
      const label = card.querySelector(".lobby-label");
      if (label) setTimeout(() => scramble(label), 280);
    }

    // CUT → SHOWCASE — cards warp in from hyperspace one by one
    at(1600, () => {
      hardCut();
      document.body.classList.remove("outro-a");
    });
    cards.forEach((card, i) => at(1800 + i * 800, () => slam(card)));

    // all four glow together, then the bars lift on the lobby itself
    at(1800 + cards.length * 800 + 200, () => {
      lobby.classList.add("pulse");
      sfx.levelup();
    });
    at(1800 + cards.length * 800 + 1400, wrap);

    function showAll() {
      cards.forEach((card) => card.classList.add("slam"));
      landed = cards.length;
    }

    function wrap() {
      if (!rolling) return;
      rolling = false;
      timers.forEach(clearTimeout);
      clearInterval(tc);
      removeEventListener("click", onClick, true);
      document.body.classList.remove("outro-a", "outro-b");
      cine.classList.remove("on", "cut");
      setTimeout(() => {
        document.body.classList.remove("lobby-cine");
        lobby.classList.remove("pulse");
        cards.forEach((card) => card.classList.remove("slam"));
        cine.classList.remove("film");
        cine.hidden = true;
        toast("🎬", "FINAL QUEST", "Recruit Aaron to your party. He's right there ↓");
      }, 700);
    }

    // clicks: on a card, let the link work and end the scene; elsewhere,
    // fast-forward — first to all cards landed, then straight to the wrap
    function onClick(e) {
      if (e.target.closest(".lobby-card")) {
        setTimeout(wrap, 150);
        return;
      }
      if (landed < cards.length) {
        timers.forEach(clearTimeout);
        timers.length = 0;
        hardCut();
        document.body.classList.remove("outro-a");
        showAll();
        at(1600, wrap);
      } else {
        wrap();
      }
    }
    addEventListener("click", onClick, true);
  }
})();

/* ---------------- hero cinematic parallax ---------------- */
(function heroParallax() {
  if (reducedMotion) return;
  const hero = document.querySelector(".hero");
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const p = Math.min(1.2, scrollY / innerHeight);
      hero.style.transform = `translateY(${scrollY * 0.32}px) scale(${1 - p * 0.06})`;
      hero.style.opacity = Math.max(0, 1 - p * 1.05);
      ticking = false;
    });
  }, { passive: true });
})();

/* ---------------- custom cursor ---------------- */
(function cursor() {
  if (!finePointer || reducedMotion) { $("#cursor").remove(); return; }
  document.body.classList.add("has-cursor");
  const cur = $("#cursor");
  let tx = -100, ty = -100;
  addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    cur.style.transform = `translate(${tx}px, ${ty}px)`;
    const hot = e.target.closest("a, button, #circleGame, input");
    cur.classList.toggle("hot", !!hot);
  }, { passive: true });
  addEventListener("pointerdown", () => cur.classList.add("down"));
  addEventListener("pointerup", () => cur.classList.remove("down"));
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

/* ---------------- decode-scramble on section titles ---------------- */
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&▓░";
function scramble(el) {
  const orig = el.textContent;
  if (reducedMotion) return;
  let f = 0;
  const total = orig.length * 3 + 8;
  (function tick() {
    f++;
    const fixed = Math.floor((f / total) * orig.length);
    el.textContent = orig.slice(0, fixed) + orig.slice(fixed).split("")
      .map((ch) => (ch === " " ? " " : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]))
      .join("");
    if (fixed < orig.length) requestAnimationFrame(tick);
    else el.textContent = orig;
  })();
}

/* ---------------- reveal on scroll ---------------- */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((en, i) => {
    if (en.isIntersecting) {
      en.target.style.transitionDelay = (i % 3) * 90 + "ms";
      en.target.classList.add("visible");
      const zt = en.target.querySelector(".zt");
      if (zt) scramble(zt);
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

/* ---------------- 3D tilt + glare on inventory cards ---------------- */
if (finePointer && !reducedMotion) {
  document.querySelectorAll(".item").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.transform =
        `perspective(750px) rotateX(${(y - 0.5) * -10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-6px)`;
      card.style.setProperty("--gx", x * 100 + "%");
      card.style.setProperty("--gy", y * 100 + "%");
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

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

/* ---------------- hover bleeps + contact coins ---------------- */
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
  if (e.target.tagName === "INPUT") return;
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
   MINI-GAME: DRAW A PERFECT CIRCLE (boss fight)
   ==================================================== */
(function circleGame() {
  const cv = $("#circleGame");
  const ctx2 = cv.getContext("2d");
  const SIZE = 480;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = SIZE * dpr;
  cv.height = SIZE * dpr;
  ctx2.scale(dpr, dpr);

  const msg = $("#gameMsg");
  const scoreEl = $("#gsScore");
  const gradeEl = $("#gsGrade");
  const bestEl = $("#gsBest");
  const bossFill = $("#bossFill");
  const bossNum = $("#bossHpNum");
  const bossName = $("#bossName");

  let best = +(localStorage.getItem("circleBest") || 0);
  if (best) bestEl.textContent = best + "%";

  let pts = [];
  let drawing = false;

  function setBoss(hp) {
    bossFill.style.width = hp + "%";
    bossNum.textContent = `HP ${hp}/100`;
    if (hp <= 10) {
      bossName.textContent = "👑 BOSS DEFEATED: THE PERFECT CIRCLE";
      bossFill.classList.add("dead");
    } else {
      bossName.textContent = "☠ BOSS: THE PERFECT CIRCLE";
      bossFill.classList.remove("dead");
    }
  }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  }

  function clear(grid = true) {
    ctx2.clearRect(0, 0, SIZE, SIZE);
    if (!grid) return;
    ctx2.strokeStyle = "rgba(0,229,255,0.07)";
    ctx2.lineWidth = 1;
    for (let i = 40; i < SIZE; i += 40) {
      ctx2.beginPath(); ctx2.moveTo(i, 0); ctx2.lineTo(i, SIZE); ctx2.stroke();
      ctx2.beginPath(); ctx2.moveTo(0, i); ctx2.lineTo(SIZE, i); ctx2.stroke();
    }
    ctx2.fillStyle = "rgba(255,255,255,0.25)";
    ctx2.beginPath(); ctx2.arc(SIZE / 2, SIZE / 2, 3, 0, 7); ctx2.fill();
  }
  clear();

  function strokePath(color) {
    if (pts.length < 2) return;
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 3;
    ctx2.lineJoin = ctx2.lineCap = "round";
    ctx2.shadowColor = color;
    ctx2.shadowBlur = 12;
    ctx2.beginPath();
    ctx2.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx2.lineTo(p.x, p.y);
    ctx2.stroke();
    ctx2.shadowBlur = 0;
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
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;

    const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const meanR = radii.reduce((a, b) => a + b) / radii.length;
    if (meanR < 30) {
      msg.textContent = "bigger! fill the box";
      sfx.fail();
      return;
    }
    const variance = radii.reduce((a, r) => a + (r - meanR) ** 2, 0) / radii.length;
    const relStd = Math.sqrt(variance) / meanR;

    const angles = pts.map((p) => Math.atan2(p.y - cy, p.x - cx)).sort((a, b) => a - b);
    let maxGap = angles[0] + Math.PI * 2 - angles[angles.length - 1];
    for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
    const coverage = Math.max(0, 1 - Math.max(0, maxGap - 0.35) / (Math.PI * 1.2));

    const roundness = Math.max(0, 1 - relStd * 3.2);
    const score = Math.round(100 * roundness * coverage);

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
    ctx2.strokeStyle = "rgba(255,255,255,0.25)";
    ctx2.setLineDash([6, 8]);
    ctx2.lineWidth = 1.5;
    ctx2.beginPath();
    ctx2.arc(cx, cy, meanR, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.setLineDash([]);

    scoreEl.textContent = score + "%";
    gradeEl.textContent = "RANK " + grade;
    msg.textContent = lines[grade];
    setBoss(Math.max(0, 100 - score));

    if (score > best) {
      best = score;
      localStorage.setItem("circleBest", best);
      bestEl.textContent = best + "%";
    }

    unlock("artist");
    addXP(Math.round(score / 2));
    addCoins(Math.round(score / 10));
    if (score >= 90) { unlock("perfect"); confetti(40); sfx.levelup(); shake(); }
    else if (score >= 65) sfx.coin();
    else sfx.fail();
  }

  $("#retryBtn").addEventListener("click", () => {
    pts = [];
    clear();
    scoreEl.textContent = "--";
    gradeEl.textContent = "";
    msg.textContent = "draw inside the box ▴";
    setBoss(100);
  });
})();

/* ---------------- animated tab title + favicon ---------------- */
(function tabFlair() {
  const titles = ["Aaron Zhang — Player 1", "▶ PRESS START", "50M+ plays. one student.", "Aaron Zhang — Player 1"];
  let ti = 0;
  setInterval(() => {
    if (document.hidden) { document.title = "← COME BACK, PLAYER 1"; return; }
    document.title = titles[ti++ % titles.length];
  }, 3000);

  const link = document.createElement("link");
  link.rel = "icon";
  document.head.appendChild(link);
  const fc = document.createElement("canvas");
  fc.width = fc.height = 32;
  const f = fc.getContext("2d");
  let ci = 0;
  function drawIcon() {
    f.clearRect(0, 0, 32, 32);
    f.fillStyle = "#0a0418";
    f.fillRect(0, 0, 32, 32);
    f.strokeStyle = COLORS[ci++ % COLORS.length];
    f.lineWidth = 3;
    f.beginPath();
    f.arc(16, 16, 10, 0.4, Math.PI * 2);
    f.stroke();
    link.href = fc.toDataURL("image/png");
  }
  drawIcon();
  if (!reducedMotion) setInterval(drawIcon, 1200);
})();

/* ---------------- go ---------------- */
updateHUD();
