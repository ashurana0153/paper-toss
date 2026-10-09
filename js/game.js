import { CONFIG, LEVELS, WORLD, BAND_NAMES } from './config.js';
import { Gestures } from './gestures.js';
import { mapPower, bandOf, landingDistance } from './power.js';
import * as Paper from './paper.js';
import { drawHand } from './hands.js';

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const PROMPTS = {
  find: 'Show your hand to the camera.',
  move: 'Move your open hand over the paper on the right.',
  hover: 'Hold still to pick it up...',
  crumpling: 'Crumpling...',
  got: 'Got it. Make a fist to crush it.',
  grip: 'Make a fist to hold the ball.',
  swing: 'Swing toward the bin and open your hand. Fill the meter to the green band.',
};

const PROMPTS_POINTER = { find: 'Move your pointer over the paper.', move: 'Move the pointer over the paper on the right.', hover: 'Hold still to pick it up...', got: 'Got it. Press and hold to crush it.', grip: 'Press and hold to grip the ball.', swing: 'Flick toward the bin and let go. Fill the meter to the green band.' };

export class Game {
  // ui: { hud, prompt, toast, meter, zone, pickHint, levelEnd, calibRelease, wind }   audio: sound player
  constructor(stage, ui, audio) {
    this.stage = stage; this.ui = ui; this.audio = audio;
    this.mode = 'menu'; this.level = 0; this.total = 0; this.streak = 0; this.levelScore = 0; this.throwIdx = 0; this.results = [];
    this.phase = 'ready'; this.ball = null; this.floorBalls = []; this.binBalls = 0; this.binList = []; this.pickFlash = 0; this.nextAt = 0;
    this.meterP = 0; this.meterHold = 0; this.wind = { w: 0, max: 0 }; this.streaks = [];
    this.hand = null; this.calibPeak = 0;
    this.gestures = new Gestures({
      pick: () => { this.phase = 'inhand'; this.pickFlash = 1; this.audio.pick(); },
      crush: (c) => this.audio.crinkle(c),
      crushed: () => { this.audio.crinkleStop(); this.audio.pick(0.5, 0.6); },
      release: (m) => this.onRelease(m),
      dropped: () => { this.audio.crinkleStop(); if (this.mode === 'play') { this.phase = 'ready'; this.ui.toast('You dropped it. Pick up another sheet.'); } },
    });
    this.gestures.pileTest = (x, y) => { const p = this.stage.pile(); return Math.hypot(x - p.x, y - p.y) < 0.85 * p.w; };
  }

  // ---------- flow ----------
  startCalib() { this.mode = 'calibrate'; this.ball = null; this.phase = 'inhand'; this.calibPeak = 0; this.gestures.startCalib(); this.gestures.maxPower = CONFIG.defaultMaxPower; this.gestures.enable(true); this.ui.zone(null); this.ui.prompt(''); }
  calibRetry() { this.calibPeak = 0; this.gestures.startCalib(); this.gestures.enable(true); }
  stopAll() { this.mode = 'menu'; this.gestures.enable(false); this.ui.pickHint(null); this.ui.prompt(''); this.audio.crinkleStop(); }
  startGame(calMax) {
    this.gestures.maxPower = calMax || CONFIG.defaultMaxPower;
    this.mode = 'play'; this.total = 0; this.streak = 0; this.startLevel(0);
  }
  startLevel(i) {
    this.level = i; this.levelScore = 0; this.throwIdx = 0; this.results = []; this.floorBalls = []; this.binBalls = 0; this.binList = []; this.ball = null;
    this.newThrow();
  }
  newThrow() {
    const L = LEVELS[this.level];
    this.phase = 'ready'; this.ball = null; this.pickFlash = 0; this.meterP = 0; this.meterHold = 0;
    this.gestures.startPlay(); this.gestures.enable(true);
    const w = CONFIG.wind && Math.random() > 0.15 ? (Math.random() < 0.5 ? -1 : 1) * L.wind * (0.3 + 0.7 * Math.random()) : 0;
    this.wind = { w, max: L.wind };
    this.ui.zone(Math.max(0, L.power - CONFIG.zone), Math.min(1, L.power + CONFIG.zone));
    this.ui.wind(CONFIG.wind ? w : null, L.wind);
    this.emitHud();
  }
  emitHud() {
    this.ui.hud({ level: this.level + 1, levels: LEVELS.length, throwNum: Math.min(this.throwIdx + 1, CONFIG.throwsPerLevel), throws: CONFIG.throwsPerLevel, total: this.total, streak: this.streak, levelScore: this.levelScore, goal: CONFIG.goalPerLevel, results: this.results, idx: this.throwIdx });
  }

  // ---------- throwing ----------
  onRelease(m) {
    this.audio.crinkleStop();
    if (this.mode === 'calibrate') { this.ui.calibRelease(m); return; }
    const p = mapPower(m.raw, this.gestures.maxPower);
    if (p <= 0) { this.ui.toast('Too gentle. Swing a bit faster, then open your hand.'); this.gestures.rearm(); return; }
    const band = bandOf(p);
    this.ui.toast(`${BAND_NAMES[band]} throw`, 'band'); this.audio.whoosh(p);
    this.meterP = p; this.meterHold = 1.2;
    const L = LEVELS[this.level], s = this.gestures.sheet, st = this.stage;
    const o = st.unproj(s.x, s.y, 0), X0 = clamp(o.X, -2.4, 2.4), Y0 = clamp(o.Y, 0.35, 1.9);
    const dead = 0.25, side = Math.abs(m.dx) > dead ? Math.sign(m.dx) * (Math.abs(m.dx) - dead) / (1 - dead) : 0;
    let Xt = X0 + side * 1.4, Zt = landingDistance(p);
    const err = Math.hypot(Xt - WORLD.binX, Zt - L.z), assisted = err < CONFIG.assist;
    let why = '';
    if (assisted) { Xt += (WORLD.binX - Xt) * 0.9 + gauss() * 0.07; Zt += (L.z - Zt) * 0.9 + gauss() * 0.07; }
    else if (Math.abs(Zt - L.z) >= Math.abs(Xt - WORLD.binX)) why = Zt < L.z ? 'A little more power' : 'A little softer';
    else why = 'Just wide. Throw straighter';
    const { arcVy: vy, g } = WORLD, tRim = (vy + Math.sqrt(vy * vy + 2 * g * (Y0 - WORLD.rimY))) / g;
    this.ball = { X: X0, Y: Y0, Z: 0, vx: (Xt - X0) / tRim, vy, vz: Zt / tRim, t: 0, r0: s.size * Paper.BALL_RATIO, rot: 0, spin: 5 + Math.random() * 4, why, rimmed: false, crossings: 0, sunk: false, rest: 0, done: false, resolved: false, bounces: 0 };
    this.phase = 'flying'; this.gestures.enable(false);
    this.ui.prompt('');
  }
  stepBall(dt) {
    const b = this.ball, L = LEVELS[this.level]; if (!b || b.done) return;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const prevY = b.Y;
      b.vx += this.wind.w * h; b.vy -= WORLD.g * h; b.X += b.vx * h; b.Y += b.vy * h; b.Z += b.vz * h; b.rot += b.spin * h; b.t += h;
      if (b.Z > 11) { b.Z = 11; b.vz *= -0.3; }
      const dx = b.X - WORLD.binX, dz = b.Z - L.z, d = Math.hypot(dx, dz);
      if (!b.sunk && prevY >= WORLD.rimY && b.Y < WORLD.rimY && b.vy < 0 && b.crossings < 2) {
        b.crossings++;
        if (d < WORLD.binR - 0.03) { b.sunk = true; b.vx *= 0.2; b.vz *= 0.2; this.resolve(true); }
        else if (d < WORLD.binR + WORLD.ballR) { // clipped the rim
          b.rimmed = true; this.audio.rim(); const u = d || 1;
          b.vx = (dx / u) * 1.1 + b.vx * 0.2; b.vz = (dz / u) * 1.1 + b.vz * 0.2; b.vy = 1.3; b.Y = WORLD.rimY + 0.01; b.why = 'Off the rim!';
        }
      }
      if (b.sunk) { // fall inside the bin
        const pull = Math.min(1, h * 6); b.vx -= (b.X - WORLD.binX) * pull * 2; b.vz -= (b.Z - L.z) * pull * 2; b.vx *= 0.98; b.vz *= 0.98;
        const rest = 0.11 + 0.15 * Math.floor(this.binBalls / 3);
        const r = (0.78 + 0.22 * Math.min(1, b.Y / WORLD.rimY)) * WORLD.binR - WORLD.ballR * 0.7, dd = Math.hypot(b.X - WORLD.binX, b.Z - L.z);
        if (dd > r) { b.X = WORLD.binX + (b.X - WORLD.binX) * r / dd; b.Z = L.z + (b.Z - L.z) * r / dd; }
        if (b.Y <= rest) {
          b.Y = rest; b.done = true;
          for (let k = 0; k < 6; k++) this.binList.forEach((o) => { if (Math.abs(o.Y - rest) < 0.05) { const ox = b.X - o.X, oz = b.Z - o.Z, od = Math.hypot(ox, oz); if (od < 0.22) { const u = od || 1, push = 0.22 - od; b.X += (ox / u) * push * 0.6 + (od ? 0 : 0.06); b.Z += (oz / u) * push * 0.6; } } });
          const d2 = Math.hypot(b.X - WORLD.binX, b.Z - L.z); if (d2 > r) { b.X = WORLD.binX + (b.X - WORLD.binX) * r / d2; b.Z = L.z + (b.Z - L.z) * r / d2; }
          this.binList.push({ X: b.X, Y: rest, Z: b.Z, rot: b.rot }); this.binBalls++; this.audio.thud(0.5); break;
        }
      } else if (b.Y <= WORLD.ballR) {
        b.Y = WORLD.ballR;
        if (b.vy < -0.7) { b.bounces++; this.audio.thud(Math.min(1, -b.vy / 3)); }
        b.vy = Math.abs(b.vy) > 0.6 ? -b.vy * 0.38 : 0; b.vx *= 0.7; b.vz *= 0.7; b.spin *= 0.7;
        if (Math.hypot(b.vx, b.vz) < 0.08 && b.vy === 0) { b.done = true; this.floorBalls.push({ X: b.X, Z: b.Z, rot: b.rot }); }
      }
    }
    if (!b.done && b.t > 5) { b.done = true; this.floorBalls.push({ X: b.X, Z: b.Z, rot: b.rot }); }
    if (b.done && !b.resolved) this.resolve(false);
  }
  resolve(hit) {
    const b = this.ball; if (b.resolved) return; b.resolved = true;
    this.throwIdx++; this.results.push(hit);
    if (hit) {
      this.streak++; this.total += this.streak; this.levelScore += this.streak;
      this.ui.toast(this.streak > 1 ? `In! +${this.streak}  ·  streak of ${this.streak}` : `In! +${this.streak}`, 'hit');
      this.audio.hit(this.streak);
    } else {
      const ended = this.streak > 0; this.streak = 0;
      this.ui.toast(`${b.why || 'Missed'}${ended ? ' Streak ended.' : ''}`); this.audio.miss();
    }
    this.phase = 'between'; this.nextAt = performance.now() + (hit ? 900 : 1100);
    this.emitHud();
  }
  advance() {
    if (this.throwIdx >= CONFIG.throwsPerLevel) {
      this.phase = 'over'; this.gestures.enable(false);
      this.ui.levelEnd({ cleared: this.levelScore >= CONFIG.goalPerLevel, level: this.level, last: this.level >= LEVELS.length - 1, levelScore: this.levelScore, total: this.total });
    } else this.newThrow();
  }
  // Redo the current level after missing the goal.
  retryLevel() { this.total -= this.levelScore; this.streak = 0; this.startLevel(this.level); }

  // ---------- per frame ----------
  frame(dt, now, hand) {
    this.hand = hand;
    const g = this.gestures;
    g.tick(dt);
    if (this.pickFlash > 0) this.pickFlash = Math.max(0, this.pickFlash - dt * 1.6);
    if (this.phase === 'flying' || this.phase === 'between') this.stepBall(dt);
    if (this.phase === 'between' && this.ball && this.ball.resolved && performance.now() >= this.nextAt && (this.ball.done || performance.now() > this.nextAt + 1500)) this.advance();
    // power meter
    const live = g.state === 'ball' && g.armed ? mapPower(g.liveSpeed, g.maxPower) : 0;
    if (this.meterHold > 0) this.meterHold -= dt;
    else if (live > this.meterP) this.meterP = live;
    else this.meterP = Math.max(0, this.meterP - dt * (g.state === 'ball' && g.armed ? 0.9 : 1.5));
    this.ui.meter(this.meterP, g.state === 'ball' && g.armed);
    this.updatePrompt(hand);
  }
  updatePrompt(hand) {
    if (this.mode !== 'play' || (this.phase !== 'ready' && this.phase !== 'inhand')) { if (this.mode === 'play') this.ui.prompt(''); this.ui.pickHint(null); return; }
    const g = this.gestures; let key;
    if (g.state === 'idle') key = !hand ? 'find' : g.hover ? 'hover' : 'move';
    else if (g.state === 'holding') key = g.squeezing ? 'crumpling' : 'got';
    else key = g.armed ? 'swing' : 'grip';
    this.ui.prompt((this.pointer && PROMPTS_POINTER[key]) || PROMPTS[key]);
    if (g.state === 'idle' && !g.hover && this.throwIdx === 0) { const p = this.stage.pile(); this.ui.pickHint(p.x, p.y - p.w * 0.5); } else this.ui.pickHint(null);
  }

  // ---------- drawing ----------
  render(now) {
    const st = this.stage, c = st.ctx, L = LEVELS[this.level];
    st.drawBackground();
    if (this.mode === 'play' || this.mode === 'menu') {
      const items = [];
      items.push({ z: L.z, draw: () => this.drawBin(L.z) });
      this.floorBalls.forEach((f) => items.push({ z: f.Z, draw: () => { st.shadow(f.X, f.Z, WORLD.ballR, 0.35); const p = st.proj(f.X, WORLD.ballR, f.Z); Paper.drawBall(c, p.x, p.y, WORLD.ballR * p.k, f.rot, false); } }));
      const b = this.ball;
      if (b && !b.sunk && !(b.done)) items.push({ z: b.Z, draw: () => this.drawFlying(b) });
      items.sort((a, z) => z.z - a.z).forEach((i) => i.draw());
    }
    this.drawWindStreaks(c);
    const p = st.pile(), g = this.gestures, left = Math.max(0, CONFIG.throwsPerLevel - this.throwIdx - (this.phase === 'inhand' || g.state === 'holding' || g.state === 'ball' ? 1 : 0));
    const showPile = this.mode === 'play' || this.mode === 'menu';
    if (showPile) {
      Paper.drawStack(c, p.x, p.y, p.w, left, g.state === 'idle' && g.hover ? 0.6 + 0.4 * g.dwellProgress : 0.3, g.state === 'idle' ? g.dwellProgress : 0);
      c.save(); c.font = `600 ${Math.max(13, p.w * 0.11)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`;
      c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.96)'; c.shadowColor = 'rgba(10,14,40,0.65)'; c.shadowBlur = 8;
      const txt = this.mode === 'menu' ? '' : left <= 0 && this.phase !== 'inhand' ? 'Last throw' : left === 1 ? '1 throw left' : left <= 0 ? 'Last throw' : `${left} throws left`;
      c.fillText(txt, p.x, p.y + Math.max(20, p.w * 0.2) + p.w * 0.32); c.restore();
    }
    // held paper
    const s = g.sheet;
    if (g.state === 'holding') { Paper.draw(c, s.x, s.y, s.size, g.crumple, Math.sin(now / 400) * 0.05); Paper.flash(c, s.x, s.y, s.size, this.pickFlash); }
    else if (g.state === 'ball' && this.mode !== 'calibrate') Paper.drawBall(c, s.x, s.y, s.size * Paper.BALL_RATIO, 0);
    else if (this.pickFlash > 0 && (this.phase === 'inhand')) Paper.flash(c, s.x, s.y, s.size, this.pickFlash);
    if (this.hand && (this.mode === 'play' || this.mode === 'calibrate')) drawHand(c, this.hand.lm, this.hand.size, g.state === 'ball' || g.state === 'holding' || this.hand.pinch);
  }
  drawBin(z) {
    const st = this.stage, c = st.ctx, b = this.ball;
    st.binBack(z, (geom) => {
      [...this.binList].sort((p, q) => q.Z - p.Z || q.Y - p.Y).forEach((e) => { const p = st.proj(e.X, e.Y, e.Z); Paper.drawBall(c, p.x, p.y, WORLD.ballR * p.k, e.rot, false); });
      if (b && b.sunk && !b.done) { const p = st.proj(b.X, b.Y, b.Z); Paper.drawBall(c, p.x, p.y, WORLD.ballR * p.k, b.rot, false); }
    });
    st.binFront(z);
  }
  drawFlying(b) {
    const st = this.stage, c = st.ctx, p = st.proj(b.X, b.Y, b.Z), k = Math.min(1, b.t / 0.22), r = b.r0 + (WORLD.ballR * p.k - b.r0) * (1 - (1 - k) ** 2);
    st.shadow(b.X, b.Z, WORLD.ballR, 0.3 * Math.max(0.2, 1 - b.Y / 2.6));
    Paper.drawBall(c, p.x, p.y, r, b.rot);
  }
  drawWindStreaks(c) {
    if (!CONFIG.wind || !this.wind.w) return;
    const a = Math.abs(this.wind.w) / this.wind.max, t = performance.now() / 1000, W = this.stage.W, H = this.stage.H;
    c.save(); c.strokeStyle = `rgba(255,255,255,${0.35 * a})`; c.lineCap = 'round'; c.lineWidth = 2;
    for (let i = 0; i < 24; i++) { const sp = 0.05 + (i % 5) * 0.02, x = (((i * 0.137 + t * sp * Math.sign(this.wind.w)) % 1) + 1) % 1 * W, y = H * (0.2 + ((i * 0.31) % 0.55)); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sign(this.wind.w) * 38, y); c.stroke(); }
    c.restore();
  }
}
