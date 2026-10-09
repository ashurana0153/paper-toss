import { templateHand, drawHand } from './hands.js';
import * as Paper from './paper.js';

// Three little looping animations for the how-to screen: pick, crush, throw.
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function prep(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return null;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  return { c, w, h };
}
function bin(c, x, y, s) {
  c.fillStyle = '#5a669f'; c.beginPath(); c.moveTo(x - s, y - s * 0.9); c.lineTo(x + s, y - s * 0.9); c.lineTo(x + s * 0.78, y + s * 0.5); c.lineTo(x - s * 0.78, y + s * 0.5); c.closePath(); c.fill();
  c.fillStyle = '#161b3b'; c.beginPath(); c.ellipse(x, y - s * 0.9, s, s * 0.28, 0, 0, 6.28); c.fill();
  c.strokeStyle = '#e6eafb'; c.lineWidth = 3; c.stroke();
}

const DEMOS = {
  pick(c, w, h, t) {
    const T = 3.8, u = (t % T), size = h * 0.17, px = w * 0.7, py = h * 0.74, pw = w * 0.3;
    const glide = ease(clamp(u / 1.2)), dwell = clamp((u - 1.2) / 0.8), lift = ease(clamp((u - 2.0) / 0.9));
    const hx = lerp(w * 0.22, px, glide), hy = lerp(h * 0.42, py - h * 0.2, glide) - lift * h * 0.2;
    Paper.drawStack(c, px, py, pw, lift > 0 ? 3 : 4, u > 1.2 ? 0.8 : 0.3, u < 2 ? dwell : 0);
    if (lift > 0) Paper.draw(c, hx, hy - size * 0.45, size * 3, 0, 0);
    drawHand(c, templateHand(hx, hy, size, 0), size, false, u > 3.4 ? 1 - (u - 3.4) / 0.4 : 1);
  },
  crush(c, w, h, t) {
    const T = 3.6, u = (t % T), k = ease(clamp((u - 0.7) / 1.1)), size = h * 0.17;
    const hx = w * 0.5 + Math.sin(u * 3) * 4 * k, hy = h * 0.66;
    if (k < 0.99) Paper.draw(c, hx, hy - size * (0.4 - 0.3 * k), size * 3, k, 0);
    else Paper.drawBall(c, hx, hy - size * 0.15, size * 3 * Paper.BALL_RATIO, u * 2);
    drawHand(c, templateHand(hx, hy, size, k), size, k > 0.5, u > 3.2 ? 1 - (u - 3.2) / 0.4 : 1);
  },
  throw(c, w, h, t) {
    const T = 4.0, u = t % T, size = h * 0.15, swing = ease(clamp((u - 0.5) / 0.8)), open = ease(clamp((u - 1.3) / 0.2)), fly = clamp((u - 1.35) / 1.0);
    const hx = lerp(w * 0.32, w * 0.5, swing), hy = lerp(h * 0.78, h * 0.4, swing), bx = w * 0.82, by = h * 0.62;
    // power meter with the green zone
    const mx = w * 0.07, mt = h * 0.12, mh = h * 0.76;
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.roundRect(mx - 9, mt, 18, mh, 9); c.fill();
    c.fillStyle = 'rgba(48,209,88,0.55)'; c.beginPath(); c.roundRect(mx - 8, mt + mh * 0.32, 16, mh * 0.34, 8); c.fill();
    const fill = u < 1.3 ? swing : 0.5;
    c.fillStyle = '#0a84ff'; c.beginPath(); c.roundRect(mx - 6, mt + mh - 4 - (mh - 8) * fill * 0.62, 12, (mh - 8) * fill * 0.62, 6); c.fill();
    bin(c, bx, by, w * 0.07);
    const lm = templateHand(hx, hy, size, 1 - open);
    if (fly <= 0) { Paper.drawBall(c, hx, hy - size * 0.15, size * 3 * Paper.BALL_RATIO, u * 3); drawHand(c, lm, size, true); }
    else {
      drawHand(c, lm, size, false, 1 - clamp(fly * 2));
      const x = lerp(hx, bx, fly), y = lerp(hy, by - w * 0.07, fly) - Math.sin(fly * Math.PI) * h * 0.4;
      if (fly < 0.98) Paper.drawBall(c, x, y, size * 3 * Paper.BALL_RATIO * lerp(1, 0.55, fly), fly * 9);
      if (fly >= 0.98 || u > 2.4) { c.font = '700 15px -apple-system, system-ui, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.shadowColor = 'rgba(20,26,64,0.5)'; c.shadowBlur = 6; c.fillText('In! +1', bx, by - w * 0.19); c.shadowBlur = 0; }
    }
  },
};

export function drawDemos(now) {
  const t = now / 1000;
  document.querySelectorAll('canvas[data-demo]').forEach((cv) => { const p = prep(cv); if (p) DEMOS[cv.dataset.demo](p.c, p.w, p.h, t); });
}
