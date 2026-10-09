import * as Paper from './paper.js';

// The three "How to play" cards. Each one loops a little animation by itself, and becomes a hands-on practice area
// the moment the pointer enters it: hover over the pile to pick a sheet, press and hold to crush it, flick and release to throw.
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const NAVY = '#1a1f45';

// ---------- bold outlined hand icon (open palm -> fist) ----------
let off = null;
function iconHand(c, x, y, s, k, alpha = 1) {
  const size = Math.ceil(s * 2.4); if (!off) off = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1); off.width = Math.round(size * dpr); off.height = Math.round(size * dpr);
  const o = off.getContext('2d'); o.setTransform(dpr, 0, 0, dpr, 0, 0); o.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, ring = Math.max(3, s * 0.06), fw = 0.19;
  const tops = [-0.55, -0.72, -0.62, -0.42].map((v, i) => lerp(v, [-0.2, -0.22, -0.2, -0.15][i], k));
  const shapes = [];
  [-0.36, -0.12, 0.12, 0.36].forEach((fx, i) => shapes.push([fx, lerp(-0.05, 0.0, k), fx, tops[i], fw]));
  shapes.push([lerp(-0.4, -0.3, k), lerp(0.2, 0.2, k), lerp(-0.62, 0.12, k), lerp(-0.2, 0.0, k), lerp(0.19, 0.2, k)]); // thumb folds across the fingers
  shapes.push([-0.2, 0.2, 0.2, 0.2, 0.7]); // palm
  const stroke = (w, style, comp) => { o.globalCompositeOperation = comp; o.strokeStyle = style; o.lineCap = 'round'; shapes.forEach(([x0, y0, x1, y1, tw]) => { o.lineWidth = Math.max(1, tw * s * 1 + (w)); o.beginPath(); o.moveTo(cx + x0 * s, cy + y0 * s); o.lineTo(cx + x1 * s, cy + y1 * s); o.stroke(); }); };
  stroke(0, NAVY, 'source-over');
  stroke(-2 * ring, '#000', 'destination-out');
  stroke(-2 * ring, 'rgba(255,255,255,0.3)', 'destination-over');
  o.globalCompositeOperation = 'source-over';
  c.save(); c.globalAlpha = alpha; c.shadowColor = 'rgba(20,26,64,0.3)'; c.shadowBlur = s * 0.12; c.shadowOffsetY = s * 0.05;
  c.drawImage(off, x - size / 2, y - size / 2, size, size); c.restore();
}

// ---------- notebook sheet with ruled lines, a margin and handwriting ----------
function noteSheet(c, x, y, w, h, rot = 0, edge = false, seed = 1) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.shadowColor = 'rgba(20,26,64,0.3)'; c.shadowBlur = h * 0.08; c.shadowOffsetY = h * 0.03;
  const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#f6f2e8'); g.addColorStop(1, '#e4dfd2');
  c.fillStyle = g; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 3); c.fill(); c.shadowColor = 'transparent';
  c.save(); c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 3); c.clip();
  c.strokeStyle = 'rgba(110,150,205,0.45)'; c.lineWidth = 1;
  const rows = 13; for (let i = 0; i < rows; i++) { const yy = -h / 2 + h * (0.14 + i * 0.065); c.beginPath(); c.moveTo(-w / 2, yy); c.lineTo(w / 2, yy); c.stroke(); }
  c.strokeStyle = 'rgba(214,110,120,0.55)'; c.beginPath(); c.moveTo(-w * 0.32, -h / 2); c.lineTo(-w * 0.32, h / 2); c.stroke();
  c.strokeStyle = 'rgba(60,64,90,0.55)'; c.lineWidth = Math.max(1, h * 0.006); c.lineCap = 'round';
  for (let i = 0; i < 6; i++) { let xx = -w * 0.27; const yy = -h / 2 + h * (0.14 + i * 0.065) - h * 0.012; const len = w * (0.4 + 0.25 * rnd(i + seed)); c.beginPath(); c.moveTo(xx, yy);
    for (; xx < -w * 0.27 + len; xx += w * 0.03) c.lineTo(xx + w * 0.015, yy - h * 0.012 * rnd(xx + i)), c.lineTo(xx + w * 0.03, yy + h * 0.004); c.stroke(); }
  c.restore();
  if (edge) { c.strokeStyle = 'rgba(120,175,235,0.95)'; c.lineWidth = Math.max(2, h * 0.025); c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 3); c.stroke(); }
  c.restore();
}
function sheetPile(c, x, y, w, h, n = 3) { for (let i = 0; i < n; i++) noteSheet(c, x + (rnd(i + 3) - 0.5) * w * 0.04, y - (n - 1 - i) * h * -0.04 + (n - 1) * h * 0.03, w, h, (rnd(i + 11) - 0.5) * 0.06, i === n - 1, i + 1); }
function ball(c, x, y, r, rot = 0) { Paper.drawBall(c, x, y, r, rot); }
// dark mesh bin, drawn like an icon
function bin(c, x, y, s) {
  c.save(); c.beginPath(); c.moveTo(x - s, y - s * 0.9); c.lineTo(x - s * 0.78, y + s * 0.5); c.ellipse(x, y + s * 0.5, s * 0.78, s * 0.2, 0, Math.PI, 0, true); c.lineTo(x + s, y - s * 0.9); c.ellipse(x, y - s * 0.9, s, s * 0.28, 0, 0, Math.PI, false); c.closePath();
  const g = c.createLinearGradient(x - s, 0, x + s, 0); g.addColorStop(0, 'rgba(70,80,108,0.9)'); g.addColorStop(0.35, 'rgba(100,110,138,0.85)'); g.addColorStop(1, 'rgba(46,54,80,0.92)'); c.fillStyle = g; c.fill(); c.clip();
  c.strokeStyle = 'rgba(20,26,48,0.55)'; c.lineWidth = 1.3;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(x + i * s * 0.25 - s, y - s); c.lineTo(x + i * s * 0.25 + s * 0.4, y + s * 0.7); c.moveTo(x + i * s * 0.25 + s, y - s); c.lineTo(x + i * s * 0.25 - s * 0.4, y + s * 0.7); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(14,18,40,0.8)'; c.beginPath(); c.ellipse(x, y - s * 0.9, s * 0.92, s * 0.24, 0, 0, 6.2832); c.fill();
  c.strokeStyle = '#3a4260'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y - s * 0.9, s, s * 0.28, 0, 0, 6.2832); c.stroke();
  c.strokeStyle = 'rgba(190,200,226,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y - s * 0.9, s, s * 0.28, 0, 0.2, Math.PI - 0.2); c.stroke();
}
function chip(c, text, x, y, fg = '#fff', bg = 'rgba(10,132,255,0.95)', a = 1) {
  c.save(); c.globalAlpha = a; c.font = '700 12px -apple-system, system-ui, sans-serif'; const w = c.measureText(text).width + 18;
  c.fillStyle = bg; c.beginPath(); c.roundRect(x - w / 2, y - 12, w, 24, 12); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y + 0.5); c.restore();
}

// ---------- per-card state: pointer tracking and the three scenes ----------
const states = new WeakMap();
function stateOf(cv) {
  let s = states.get(cv); if (s) return s;
  s = { in: false, down: false, x: 0, y: 0, hx: 0, hy: 0, t0: performance.now(), k: 0, dwell: 0, lifted: false, vel: [], peak: 0, phase: 'idle', pt: 0, result: '', p: 0, lastMove: 0, last: performance.now(), px: 0, py: 0, tryAlpha: 1, hasHand: false };
  const pos = (e) => { const r = cv.getBoundingClientRect(); s.x = e.clientX - r.left; s.y = e.clientY - r.top; };
  cv.addEventListener('pointerenter', (e) => { pos(e); s.in = true; s.hasHand = false; s.dwell = 0; s.lifted = false; s.phase = 'idle'; s.k = 0; s.vel = []; });
  cv.addEventListener('pointermove', (e) => { const px = s.x, py = s.y; pos(e); const now = performance.now(), dt = Math.max(1, now - s.lastMove); s.lastMove = now; s.vel.push({ t: now, v: Math.hypot(s.x - px, s.y - py) / dt * 1000 }); while (s.vel.length && now - s.vel[0].t > 220) s.vel.shift(); });
  cv.addEventListener('pointerleave', () => { s.in = false; s.down = false; s.t0 = performance.now(); s.phase = 'idle'; });
  cv.addEventListener('pointerdown', (e) => { pos(e); s.down = true; s.in = true; if (cv.setPointerCapture) try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  const up = () => { if (!s.down) return; s.down = false; s.release = true; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.style.cursor = 'pointer'; cv.style.touchAction = 'none';
  states.set(cv, s); return s;
}
const peakSpeed = (s) => s.vel.reduce((m, q) => Math.max(m, q.v), 0);

const DEMOS = {
  // ----- Pick: hover the pile; a ring fills; the sheet lifts into the hand -----
  pick(c, w, h, t, s, dt) {
    const size = h * 0.2, S = h * 0.5, px = w * 0.64, py = h * 0.74, pw = w * 0.34, ph = pw * 0.7;
    let hx, hy, dwell, lift;
    if (s.in) {
      if (!s.hasHand) { s.hx = s.x; s.hy = s.y; s.hasHand = true; }
      s.hx += (s.x - s.hx) * Math.min(1, dt * 14); s.hy += (s.y - s.hy) * Math.min(1, dt * 14); hx = s.hx; hy = s.hy;
      const over = Math.hypot(hx - px, hy - (py - ph * 0.15)) < pw * 0.55;
      if (!s.lifted) { s.dwell = over ? s.dwell + dt : Math.max(0, s.dwell - dt * 2); if (s.dwell >= 0.8) { s.lifted = true; s.liftT = 0; } }
      s.liftT = (s.liftT || 0) + dt; dwell = clamp(s.dwell / 0.8); lift = s.lifted ? ease(clamp(s.liftT / 0.35)) : 0;
    } else {
      const T = 4, u = t % T, glide = ease(clamp(u / 1.2)); dwell = clamp((u - 1.2) / 0.8); lift = ease(clamp((u - 2.0) / 0.9));
      hx = lerp(w * 0.2, px, glide); hy = lerp(h * 0.4, py - h * 0.16, glide) - lift * h * 0.14;
    }
    const ringY = py + ph * 0.08;
    c.save(); c.beginPath(); c.ellipse(px, ringY, pw * 0.72, ph * 0.74, 0, 0, 6.2832); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; c.stroke();
    if (dwell > 0 && lift <= 0) { c.beginPath(); c.ellipse(px, ringY, pw * 0.72, ph * 0.74, 0, -1.5708, -1.5708 + 6.2832 * dwell); c.strokeStyle = '#0a84ff'; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(); }
    c.restore();
    sheetPile(c, px, py, pw, ph, lift > 0 ? 2 : 3);
    if (lift > 0) noteSheet(c, hx, hy + size * 0.1 - lift * size * 0.15, pw * 0.85, ph * 0.85, -0.05 * lift, false, 5);
    iconHand(c, hx, hy - S * 0.2, S, lift > 0 ? 0.35 : 0, 1);
    if (lift > 0.6) chip(c, 'Picked up', w * 0.5, h * 0.12, '#fff', 'rgba(48,176,72,0.95)', clamp((lift - 0.6) * 4));
  },

  // ----- Crush: press and hold; the sheet crumples into a ball -----
  crush(c, w, h, t, s, dt) {
    const size = h * 0.2, S = h * 0.5; let k, hx, hy;
    if (s.in) {
      if (!s.hasHand) { s.hx = s.x; s.hy = s.y; s.hasHand = true; }
      s.hx += (s.x - s.hx) * Math.min(1, dt * 12); s.hy += (s.y - s.hy) * Math.min(1, dt * 12); hx = s.hx; hy = s.hy;
      s.k += ((s.down ? 1 : 0) - s.k) * Math.min(1, dt * (s.down ? 3.2 : 6)); k = s.k;
    } else { const T = 3.8, u = t % T; k = ease(clamp((u - 0.8) / 1.1)) * (u > 3.3 ? 1 - (u - 3.3) / 0.5 : 1); hx = w * 0.5; hy = h * 0.58; }
    const sx = s.in ? hx : w * 0.5, sy = s.in ? hy + size * 0.35 : h * 0.62;
    Paper.draw(c, sx, sy - size * 0.1, size * 3.6, k, s.in ? Math.sin(t * 20) * 0.02 * k : 0, true);
    iconHand(c, hx, hy - S * 0.2, S, k, 1);
    if (k > 0.85) chip(c, 'Crumpled', w * 0.5, h * 0.12, '#fff', 'rgba(48,176,72,0.95)', clamp((k - 0.85) * 6));
  },

  // ----- Throw: flick and release; the power meter shows if you hit the green band -----
  throw(c, w, h, t, s, dt) {
    const size = h * 0.17, S = h * 0.46, bx = w * 0.84, by = h * 0.62, mx = w * 0.07, mt = h * 0.12, mh = h * 0.76, band = [0.43, 0.67];
    let hx, hy, k = 1, meter = 0, ballPos = null, msg = '', msgOk = false;
    if (s.in) {
      if (!s.hasHand) { s.hx = s.x; s.hy = s.y; s.hasHand = true; }
      if (s.phase === 'idle' || s.phase === 'hold') { s.hx += (s.x - s.hx) * Math.min(1, dt * 14); s.hy += (s.y - s.hy) * Math.min(1, dt * 14); }
      if (s.phase === 'idle' && s.down) { s.phase = 'hold'; s.vel = []; }
      if (s.phase === 'hold') { const pk = peakSpeed(s); s.p += (clamp(pk / (w * 3.2)) - s.p) * Math.min(1, dt * 12); }
      if ((s.phase === 'hold') && s.release) { s.release = false; s.phase = 'fly'; s.pt = 0; s.fp = s.p; s.fx = s.hx; s.fy = s.hy; }
      if (s.phase === 'idle') s.p = Math.max(0, s.p - dt * 2);
      if (s.phase === 'fly') { s.pt += dt; if (s.pt > 2.4) { s.phase = 'idle'; s.p = 0; } }
      hx = s.hx; hy = s.hy; k = s.phase === 'hold' ? 1 : s.phase === 'fly' ? Math.max(0, 1 - s.pt * 6) : 0;
      meter = s.p;
      if (s.phase === 'fly') { const p = s.fp, land = bx + (p - 0.55) * w * 1.1, T = 0.85, f = clamp(s.pt / T), hit = p >= band[0] && p <= band[1];
        ballPos = { x: lerp(s.fx, land, f), y: lerp(s.fy, by + (hit ? s.fy * 0 : h * 0.18), f) - Math.sin(f * Math.PI) * h * 0.38, f, hit };
        if (f >= 1) { msg = hit ? 'In! +1' : p < band[0] ? 'Too soft' : 'Too hard'; msgOk = hit; } }
    } else {
      const T = 4.2, u = t % T, swing = ease(clamp((u - 0.5) / 0.8)), fly = clamp((u - 1.35) / 0.9); k = 1 - ease(clamp((u - 1.3) / 0.2));
      hx = lerp(w * 0.3, w * 0.5, swing); hy = lerp(h * 0.78, h * 0.42, swing); meter = u < 1.3 ? swing * 0.55 : 0.55;
      if (fly > 0) ballPos = { x: lerp(hx, bx, fly), y: lerp(hy, by, fly) - Math.sin(fly * Math.PI) * h * 0.38, f: fly, hit: true };
      if (fly >= 1) { msg = 'In! +1'; msgOk = true; }
    }
    // power meter with the green band
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.roundRect(mx - 10, mt, 20, mh, 10); c.fill();
    c.fillStyle = 'rgba(48,209,88,0.5)'; c.strokeStyle = '#30d158'; c.lineWidth = 2; c.beginPath(); c.roundRect(mx - 11, mt + mh * (1 - band[1]), 22, mh * (band[1] - band[0]), 8); c.fill(); c.stroke();
    const fh = Math.max(0, (mh - 8) * clamp(meter)); if (fh > 0) { c.fillStyle = '#0a84ff'; c.beginPath(); c.roundRect(mx - 6, mt + mh - 4 - Math.max(12, fh), 12, Math.max(12, fh), 6); c.fill(); }
    bin(c, bx, by, w * 0.075);
    const flying = ballPos && s.in ? s.phase === 'fly' : !!ballPos;
    if (ballPos) { const r = size * 0.62 * lerp(1, 0.62, ballPos.f); if (!(ballPos.f >= 1 && ballPos.hit)) ball(c, ballPos.x, ballPos.y, r, ballPos.f * 9); }
    if (!flying || (ballPos && ballPos.f < 0.12)) {
      if (k > 0.5 || (s.in && s.phase === 'hold')) ball(c, hx, hy - size * 0.1, size * 0.62, 0);
      iconHand(c, hx, hy - S * 0.2, S, k, 1);
    }
    if (msg) chip(c, msg, bx, by - w * 0.14, '#fff', msgOk ? 'rgba(48,176,72,0.95)' : 'rgba(230,120,40,0.95)');
  },
};

export function drawDemos(now) {
  document.querySelectorAll('canvas[data-demo]').forEach((cv) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const s = stateOf(cv), dt = Math.min(0.05, (now - s.last) / 1000); s.last = now;
    DEMOS[cv.dataset.demo](c, w, h, (now - s.t0) / 1000, s, dt);
    s.tryAlpha += ((s.in ? 0 : 1) - s.tryAlpha) * Math.min(1, dt * 8);
    if (s.tryAlpha > 0.02) chip(c, 'Try it here', w - 56, 20, '#12162b', 'rgba(255,255,255,0.85)', s.tryAlpha);
  });
}
