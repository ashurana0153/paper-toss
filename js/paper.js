// Drawing for the paper: a flat sheet that morphs into a crumpled ball, and the pile on the desk.
const N = 30;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const BALL_RATIO = 0.21; // ball radius as a fraction of the sheet size

function rectPoint(u, w, h) {
  const P = 2 * (w + h); let s = u * P;
  if (s < w) return [-w / 2 + s, -h / 2]; s -= w;
  if (s < h) return [w / 2, -h / 2 + s]; s -= h;
  if (s < w) return [w / 2 - s, h / 2]; s -= w;
  return [-w / 2, h / 2 - s];
}
function outline(size, t) {
  const w = size * 0.74, h = size * 0.96, e = ease(t), wob = Math.sin(Math.PI * Math.min(1, t));
  const pts = [];
  for (let i = 0; i < N; i++) {
    const u = i / N, r = size * BALL_RATIO * (0.8 + 0.34 * rnd(i)), a = u * 6.2832 - 1.5708;
    const rp = rectPoint(u, w, h), bp = [Math.cos(a) * r, Math.sin(a) * r];
    pts.push([
      rp[0] + (bp[0] - rp[0]) * e + (rnd(i + 50) - 0.5) * 2 * size * 0.05 * wob,
      rp[1] + (bp[1] - rp[1]) * e + (rnd(i + 90) - 0.5) * 2 * size * 0.05 * wob,
    ]);
  }
  return pts;
}
function trace(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }

// crumple 0 = flat sheet, 1 = ball. size is the sheet height scale in px.
export function draw(ctx, x, y, size, crumple, rot = 0, shadow = true) {
  const t = Math.min(1, Math.max(0, crumple)), e = ease(t), pts = outline(size, t);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * (1 - e * 0.3));
  if (shadow) { ctx.shadowColor = 'rgba(20,26,64,0.32)'; ctx.shadowBlur = size * 0.1; ctx.shadowOffsetY = size * 0.04; }
  trace(ctx, pts);
  const g = ctx.createLinearGradient(-size * 0.4, -size * 0.5, size * 0.4, size * 0.5);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, e > 0.6 ? '#cfd5ea' : '#e6eaf6');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); trace(ctx, pts); ctx.clip();
  if (t < 0.55) { // ruled lines fade as the sheet crumples
    ctx.strokeStyle = `rgba(80,120,200,${0.3 * (1 - t / 0.55)})`; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const yy = -size * 0.4 + i * size * 0.1; ctx.beginPath(); ctx.moveTo(-size * 0.3, yy); ctx.lineTo(size * 0.3, yy); ctx.stroke(); }
  }
  if (e > 0.02) { // facets and creases
    for (let i = 0; i < N; i += 2) {
      const a = pts[i], b = pts[(i + 1) % N], c = pts[(i + 2) % N];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath();
      ctx.fillStyle = `rgba(60,70,140,${(0.04 + 0.09 * rnd(i + 7)) * e})`; ctx.fill();
    }
    ctx.strokeStyle = `rgba(50,60,120,${0.28 * e})`; ctx.lineWidth = Math.max(1, size * 0.008);
    for (let i = 0; i < 7; i++) {
      const a = pts[Math.floor(rnd(i + 20) * N)], b = pts[Math.floor(rnd(i + 40) * N)];
      ctx.beginPath(); ctx.moveTo(a[0] * 0.8, a[1] * 0.8); ctx.lineTo(b[0] * 0.7, b[1] * 0.7); ctx.stroke();
    }
    const hg = ctx.createRadialGradient(-size * 0.06, -size * 0.07, 1, 0, 0, size * BALL_RATIO * 1.2);
    hg.addColorStop(0, `rgba(255,255,255,${0.7 * e})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; ctx.fillRect(-size, -size, size * 2, size * 2);
  }
  ctx.restore();
  trace(ctx, pts); ctx.strokeStyle = `rgba(60,70,130,${0.25 + 0.2 * e})`; ctx.lineWidth = Math.max(1, size * 0.01); ctx.stroke();
  ctx.restore();
}
export function drawBall(ctx, x, y, r, rot = 0, shadow = true) { draw(ctx, x, y, r / BALL_RATIO, 1, rot, shadow); }

// The glowing outline that flashes when a sheet is picked up.
export function flash(ctx, x, y, size, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.shadowColor = 'rgba(10,132,255,0.9)'; ctx.shadowBlur = 28;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - size * 0.4, y - size * 0.52, size * 0.8, size * 1.04, 6); ctx.stroke(); ctx.restore();
}

// The pile on the desk. w = pile width in px; glow 0.3 at rest, brighter when a hand hovers; dwell 0..1 shows the pick progress.
export function drawStack(ctx, x, y, w, count, glow, dwell) {
  const hz = w * 0.85;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y + w * 0.04, hz, hz * 0.62, 0, 0, 6.2832);
  ctx.strokeStyle = `rgba(255,255,255,${0.25 + glow * 0.55})`; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(10,132,255,0.75)'; ctx.shadowBlur = 8 + glow * 22; ctx.stroke();
  if (dwell > 0) {
    ctx.beginPath(); ctx.ellipse(x, y + w * 0.04, hz, hz * 0.62, 0, -1.5708, -1.5708 + 6.2832 * dwell);
    ctx.strokeStyle = 'rgb(10,132,255)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
  const n = Math.max(0, Math.min(6, count)), sw = w * 0.9, sh = w * 0.62;
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.translate(x + (rnd(i + 3) - 0.5) * w * 0.05, y - i * w * 0.028); ctx.rotate((rnd(i + 11) - 0.5) * 0.14);
    ctx.shadowColor = 'rgba(20,26,64,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = i % 2 ? '#f3f5fc' : '#ffffff'; ctx.beginPath(); ctx.roundRect(-sw / 2, -sh / 2, sw, sh, 4); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(80,120,200,0.22)'; ctx.lineWidth = 1;
    for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-sw * 0.4, -sh / 2 + k * sh * 0.18); ctx.lineTo(sw * 0.4, -sh / 2 + k * sh * 0.18); ctx.stroke(); }
    ctx.restore();
  }
  if (!n) { ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - w * 0.45, y - w * 0.31, w * 0.9, w * 0.62, 5); ctx.stroke(); ctx.restore(); }
}
