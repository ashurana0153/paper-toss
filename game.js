// Game flow. One throw = pick (open hand over the pile) -> holding (flat sheet) -> ball (fist) -> flying -> settle.
(() => {
  const $ = UI.$, canvas = $('scene');
  const LEVELS = [
    { name: 'Calm', wind: [0, 0], D: [3.8, 5.2], X: 0.6 },
    { name: 'Breezy', wind: [0.8, 1.3], D: [4.6, 6.5], X: 0.9 },
    { name: 'Gusty', wind: [1.5, 2.0], D: [5.5, 7.6], X: 1.2 },
  ];
  const UMAX = 4000, PER_LEVEL = 5, NEED = 3, DEFAULT_VMAX = 22;
  const clamp = Phys.clamp, rand = (a, b) => a + Math.random() * (b - a);

  const S = {
    level: 0, score: 0, streak: 0, levelScore: 0, thrown: 0, baskets: 0, vmax: DEFAULT_VMAX, practice: false, playing: false,
    phase: 'pick', pickT: 0, fistT: 0, lostT: 0, ballT0: 0, settleT: 0, scoreT: -1, holdNext: 0, nextReady: false,
    bin: { x: 0, z: 5 }, wind: 0, band: null, ball: null, offset: { x: 0, y: 0 }, samples: [], cur: { x: 0, y: 0 }, lastFloor: 0,
  };
  let best = 0;
  try { best = +localStorage.getItem('paperToss.best') || 0; } catch (e) {}

  const windLabel = (w) => (Math.abs(w) < 0.3 ? 'Calm' : Math.abs(w) < 1.4 ? 'Breezy' : 'Gusty');

  // ---------- cards ----------
  const menuCard = () => UI.card(`
    <h1>Paper Toss</h1>
    <p>Pick up a sheet, crumple it and toss it into the bin across the office. Three levels, five throws each, and the wind picks up as you go.</p>
    <div class="row"><button class="btn" data-act="start-camera">Start with camera</button><button class="btn ghost" data-act="start-mouse">Mouse or touch</button></div>
    <p class="fine">The camera tracks your hand on this device. Nothing is recorded or uploaded.</p>`);
  const howCard = () => UI.card(`
    <h2>How to play</h2>
    <ol>
      <li><b>Pick up:</b> hold an open hand over the paper pile until the ring fills.</li>
      <li><b>Crumple:</b> make a fist.</li>
      <li><b>Throw:</b> swing toward the bin and open your hand when the power bar reaches the green band.</li>
      <li><b>Wind:</b> the ribbons on the vent show it. Swing a little against the wind to correct.</li>
    </ol>
    <p class="fine">Mouse or touch: hover the pile, press and hold to crumple, flick, then let go.</p>
    <div class="row"><button class="btn" data-act="close">Got it</button></div>`);
  const calibrateCard = () => UI.card(`
    <h2>Practice throw</h2>
    <p>Do one throw at the fastest speed that still feels comfortable. The power bar will be sized to your arm. You can skip this and use a standard setting.</p>
    <div class="row"><button class="btn" data-act="practice">Start practice</button><button class="btn ghost" data-act="skip">Skip</button></div>`);
  const clearedCard = () => UI.card(`
    <h2>Level ${S.level + 1} cleared</h2>
    <p>${S.baskets} of ${PER_LEVEL} in the bin. ${LEVELS[S.level + 1].name} wind is next.</p>
    <div class="row"><button class="btn" data-act="next">Next level</button></div>
    ${Input.mode === 'camera' ? '<p class="fine">Or hold an open hand up to the camera for a second.</p>' : ''}`);
  const retryCard = () => UI.card(`
    <h2>Level ${S.level + 1} not cleared</h2>
    <p>You need ${NEED} baskets out of ${PER_LEVEL} and got ${S.baskets}. Try the level again.</p>
    <div class="row"><button class="btn" data-act="retry">Try again</button></div>`);
  const finalCard = () => UI.card(`
    <h2>Final score</h2>
    <div class="big">${S.score}</div>
    <p>Best on this device: ${Math.max(best, S.score)}</p>
    <div class="row"><button class="btn" data-act="again">Play again</button><button class="btn ghost" data-act="share">Share score</button></div>`);
  const camErrCard = (msg) => UI.card(`
    <h2>Camera not available</h2>
    <p>${msg}</p>
    <div class="row"><button class="btn" data-act="start-camera">Try again</button><button class="btn ghost" data-act="start-mouse">Use mouse or touch</button></div>`);

  // ---------- flow ----------
  function startGame() {
    Object.assign(S, { level: 0, score: 0, streak: 0, playing: true });
    UI.showHud(true); startLevel(0);
  }
  function startLevel(i) {
    Object.assign(S, { level: i, thrown: 0, baskets: 0, levelScore: 0, streak: 0 });
    UI.closeCard(); UI.hud({ level: i + 1, score: S.score, streak: 0, prog: `0 / ${PER_LEVEL}` });
    startThrow(); UI.toast(`Level ${i + 1} · ${LEVELS[i].name}`, 1600);
  }
  function startThrow() {
    const L = LEVELS[S.practice ? 1 : S.level];
    const D = S.practice ? 5.5 : rand(L.D[0], L.D[1]);
    S.bin = { x: S.practice ? 0 : rand(-L.X, L.X), z: D };
    S.wind = S.practice ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(L.wind[0], L.wind[1]);
    const w = Phys.hitWindow(D), half = Math.max((w.hi - w.lo) / 2, 120) + 35;
    S.band = S.practice ? null : { lo: (w.mid - half) / UMAX, hi: (w.mid + half) / UMAX };
    Object.assign(S, { phase: 'pick', pickT: 0, fistT: 0, lostT: 0, ball: null, scoreT: -1, samples: [] });
    UI.wind(S.wind, windLabel(S.wind)); UI.meter(0, S.band);
  }
  function release(now) {
    const pk = S.samples.reduce((a, b) => (b.s > a.s ? b : a), { s: 0, vx: 0, vy: 0 });
    if (S.practice) {
      if (pk.s < 5) { UI.toast('Swing a bit harder'); S.phase = 'pick'; return; }
      S.vmax = Math.max(8, pk.s); S.practice = false; UI.toast('Power bar set to your arm', 1800);
      S.phase = 'pick'; startGame(); return;
    }
    const p = pk.s / S.vmax;
    if (p < 0.12) { UI.toast('Swing harder'); S.phase = 'pick'; S.pickT = 0; return; }
    const v = Phys.launch(clamp(p, 0, 1.15) * UMAX, 0);
    const ideal = S.bin.x / S.bin.z, up = Math.max(-pk.vy, 0.4 * pk.s);
    const lean = clamp(pk.vx / Math.max(up, 0.001), -1, 1) * 0.5;
    v.vx = clamp(ideal + lean * 0.5, -0.7, 0.7) * v.vz;
    S.ball = Phys.newBall(v);
    const o = R.P(Phys.START.x, Phys.START.y, Phys.START.z);
    S.offset = { x: S.cur.x - o.x, y: S.cur.y - o.y };
    S.phase = 'flying'; Sound.toss(); UI.meter(p, S.band);
  }
  function resolve() {
    const b = S.ball; S.thrown++;
    if (b.scored) {
      S.baskets++; S.streak++;
      const pts = Math.round((100 + Math.round((S.bin.z - 3.5) * 20) + (b.rim ? 0 : 50)) * (1 + 0.25 * (S.streak - 1)));
      S.score += pts; S.levelScore += pts; UI.toast(`${b.rim ? 'Basket' : 'Swish'}! +${pts}`, 1200);
    } else { S.streak = 0; Sound.miss(); UI.toast(b.rim ? 'Rim out' : 'Missed', 1000); }
    UI.hud({ score: S.score, streak: S.streak, prog: `${S.thrown} / ${PER_LEVEL}` });
    S.phase = 'settle'; S.settleT = 1.1;
  }
  function endLevel() {
    if (S.baskets >= NEED) {
      if (S.level >= LEVELS.length - 1) {
        try { if (S.score > best) { best = S.score; localStorage.setItem('paperToss.best', String(best)); } } catch (e) {}
        finalCard();
      } else { S.holdNext = 0; clearedCard(); }
    } else retryCard();
  }

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act; Sound.init();
    if (act === 'start-camera') {
      UI.card('<h2>Getting the camera ready…</h2><p>Allow camera access when your browser asks. The hand model takes a few seconds to load.</p>');
      try {
        await Input.startCamera($('video')); $('camBox').hidden = false; calibrateCard();
      } catch (err) {
        Input.stopCamera();
        camErrCard(err && err.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow it in your browser settings, then try again.' : (err && err.message) || 'Something stopped the camera or hand model from loading.');
      }
    } else if (act === 'start-mouse') { Input.stopCamera(); $('camBox').hidden = true; Input.startMouse(canvas); startGame(); }
    else if (act === 'practice') { S.practice = true; S.playing = true; UI.closeCard(); UI.showHud(false); $('meter').hidden = false; startThrow(); }
    else if (act === 'skip') startGame();
    else if (act === 'next') startLevel(S.level + 1);
    else if (act === 'retry') { S.score -= S.levelScore; UI.hud({ score: S.score }); startLevel(S.level); }
    else if (act === 'again') startGame();
    else if (act === 'close') UI.closeCard();
    else if (act === 'share') {
      const text = `I scored ${S.score} in Paper Toss.`;
      try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); UI.toast('Score copied'); } } catch (_) {}
    }
  });
  $('howBtn').addEventListener('click', howCard);

  // ---------- frame ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const h = Input.read(now), t = now / 1000, W = R.W, H = R.H;
    if (Input.mode === 'camera') { Input.drawSkeleton($('skel')); $('hw').textContent = h.speed.toFixed(1); }
    const tx = h.nx * W, ty = clamp(h.ny * H, H * 0.3, H * 0.96);
    S.cur.x += (tx - S.cur.x) * Math.min(1, dt * 18); S.cur.y += (ty - S.cur.y) * Math.min(1, dt * 18);
    const paused = UI.cardOpen();

    if (S.playing && !paused) update(now, dt, h);

    // camera-mode "next level" gesture
    if (paused && Input.mode === 'camera' && S.playing && S.baskets >= NEED && S.level < LEVELS.length - 1 && S.thrown >= PER_LEVEL) {
      S.holdNext = h.present && h.pose === 'open' ? S.holdNext + dt : 0;
      if (S.holdNext > 1) { S.holdNext = 0; startLevel(S.level + 1); }
    }
    draw(now, t, h);
    requestAnimationFrame(frame);
  }

  function update(now, dt, h) {
    const ph = S.phase;
    if (ph === 'pick') {
      const z = R.pileZone();
      const inZone = h.present && (h.pose === 'open' || Input.mode === 'mouse') && Math.hypot(S.cur.x - z.x, S.cur.y - z.y) < z.r * 1.6;
      S.pickT = inZone ? Math.min(1, S.pickT + dt / 0.55) : Math.max(0, S.pickT - dt * 2);
      if (S.pickT >= 1) { S.phase = 'holding'; S.pickT = 0; S.fistT = 0; Sound.pick(); }
      UI.meter(0, S.band);
    } else if (ph === 'holding' || ph === 'ball') {
      S.lostT = h.present ? 0 : S.lostT + dt;
      if (S.lostT > 0.6) { S.phase = 'pick'; UI.toast('Lost your hand'); return; }
      if (ph === 'holding') {
        S.fistT = h.pose === 'fist' ? S.fistT + dt : 0;
        if (S.fistT > 0.12) { S.phase = 'ball'; S.ballT0 = now; S.samples = []; Sound.crumple(); }
        UI.meter(0, S.band);
      } else {
        S.samples.push({ t: now, s: h.speed, vx: h.vx, vy: h.vy });
        while (S.samples.length && now - S.samples[0].t > 280) S.samples.shift();
        const live = S.samples.reduce((m, s) => (now - s.t < 140 ? Math.max(m, s.s) : m), 0);
        UI.meter(live / S.vmax, S.band);
        if (h.pose === 'open' && now - S.ballT0 > 250) release(now);
      }
    } else if (ph === 'flying') {
      const b = S.ball;
      Phys.step(b, S.bin, S.wind, dt);
      for (const e of b.ev) {
        if (e === 'score') { Sound.score(); S.scoreT = b.t; } else if (e === 'rim' || e === 'wall') Sound.rim();
        else if (e === 'floor' && now - S.lastFloor > 120) { Sound.floor(); S.lastFloor = now; }
      }
      b.ev.length = 0;
      if ((S.scoreT >= 0 && b.t - S.scoreT > 0.9) || b.rest > 0.5 || b.t > 5) resolve();
    } else if (ph === 'settle') {
      S.settleT -= dt;
      if (S.settleT <= 0) { S.thrown >= PER_LEVEL ? endLevel() : startThrow(); }
    }
  }

  function draw(now, t, h) {
    const ctx = R.ctx; if (!ctx) return;
    const b = S.ball, bin = S.bin, ph = S.phase;
    R.room(t, S.playing ? S.wind : 0);
    const showBall = b && ph !== 'settle';
    if (showBall) R.shadowOnFloor(b);
    let bp = null, zone = 'front';
    if (showBall) {
      bp = R.P(b.x, b.y, b.z);
      const k = Math.max(0, 1 - b.t / 0.18);
      bp = { x: bp.x + S.offset.x * k, y: bp.y + S.offset.y * k, s: bp.s };
      zone = b.inBin || (Math.abs(b.z - bin.z) < 0.45 && b.z <= bin.z + 0.45) ? 'near' : b.z > bin.z + 0.45 ? 'far' : 'front';
    }
    const drawFlying = () => R.ball(bp.x, bp.y, Phys.BR * bp.s * 1.15, b.ang);
    if (S.playing && zone === 'far' && showBall) drawFlying();
    R.binBack(bin);
    if (S.playing && zone === 'near' && showBall) drawFlying();
    R.binFront(bin);
    if (S.playing && zone === 'front' && showBall) drawFlying();
    R.desk(PER_LEVEL - S.thrown - (ph === 'holding' || ph === 'ball' ? 1 : 0), S.pickT, ph === 'pick' && h.present);
    if (S.playing && (ph === 'pick' || ph === 'holding' || ph === 'ball')) R.marker(bin, t);
    if (ph === 'holding') R.sheet(S.cur.x, S.cur.y, 62, Math.sin(t * 3) * 0.06);
    if (ph === 'ball') { const k = clamp((now - S.ballT0) / 250, 0, 1), o = R.P(Phys.START.x, Phys.START.y, Phys.START.z); R.ball(S.cur.x, S.cur.y, Phys.BR * o.s * 1.15, t * 2, 1.35 - 0.35 * k); }
    if (S.playing && (ph === 'pick' || ph === 'holding' || ph === 'ball')) R.cursor(S.cur.x, S.cur.y, h.pose, h.present);
    R.vignette();
  }

  function fit() { R.resize(canvas); }
  window.addEventListener('resize', fit); fit();
  menuCard(); UI.wind(0, 'Calm');
  requestAnimationFrame(frame);
})();
