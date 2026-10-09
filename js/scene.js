import { WORLD } from './config.js';

// The stage is a 16:9 area that covers the window (edges crop). Everything is placed in metres and projected:
// camera eye 1.2 m up, horizon at 42% of the stage height, the throwing plane 0.6 m in front of the camera.
export class Stage {
  constructor(canvas) { this.canvas = canvas; this.bg = document.createElement('canvas'); this.resize(); }

  resize() {
    const c = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr; this.W = c.clientWidth || window.innerWidth; this.H = c.clientHeight || window.innerHeight;
    c.width = Math.round(this.W * dpr); c.height = Math.round(this.H * dpr);
    this.ctx = c.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.max(this.W / 16, this.H / 9);
    this.sw = 16 * s; this.sh = 9 * s; this.ox = (this.W - this.sw) / 2; this.oy = (this.H - this.sh) / 2;
    this.F = 0.6 * this.sh; this.cx = this.W / 2; this.hy = this.oy + WORLD.horizon * this.sh;
    this.buildBackground();
  }
  k(z) { return this.F / (z + WORLD.plane); }
  proj(X, Y, Z) { const k = this.k(Z); return { x: this.cx + X * k, y: this.hy + (WORLD.eye - Y) * k, k }; }
  unproj(sx, sy, Z = 0) { const k = this.k(Z); return { X: (sx - this.cx) / k, Y: WORLD.eye - (sy - this.hy) / k }; }
  pile() { const w = Math.max(100, 0.12 * this.W); return { w, x: Math.min(0.84 * this.W, this.W - 0.75 * w), y: Math.min(0.8 * this.H, this.H - 60) }; }

  // ----- the office, drawn once per resize -----
  buildBackground() {
    const { W, H, dpr, hy, ox, oy, sw, sh, cx } = this;
    const b = this.bg; b.width = Math.round(W * dpr); b.height = Math.round(H * dpr);
    const g = b.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const U = (u) => ox + u * sw, V = (v) => oy + v * sh;
    // wall and floor
    let gr = g.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#9fb0ea'); gr.addColorStop(0.6, '#c7d1f5'); gr.addColorStop(1, '#e4e9fb');
    g.fillStyle = gr; g.fillRect(0, 0, W, hy);
    gr = g.createLinearGradient(0, hy, 0, H); gr.addColorStop(0, '#e2d3ba'); gr.addColorStop(1, '#b89b76');
    g.fillStyle = gr; g.fillRect(0, hy, W, H - hy);
    // floor boards converge on the horizon
    g.strokeStyle = 'rgba(84,56,28,0.11)'; g.lineWidth = 1;
    for (let i = -24; i <= 24; i++) { g.beginPath(); g.moveTo(cx, hy); g.lineTo(cx + i * sw * 0.1, H + 4); g.stroke(); }
    g.strokeStyle = 'rgba(84,56,28,0.07)';
    for (let z = 0.3; z < 14; z += 0.75) { const y = hy + WORLD.eye * this.k(z); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // skirting
    g.fillStyle = '#f2f5ff'; g.fillRect(0, hy - sh * 0.02, W, sh * 0.02);
    g.fillStyle = 'rgba(20,26,64,0.12)'; g.fillRect(0, hy, W, 3);
    // window with a pale skyline
    const wx = U(0.14), wy = V(0.07), ww = sw * 0.38, wh = sh * 0.3;
    g.fillStyle = '#f8faff'; g.beginPath(); g.roundRect(wx - 8, wy - 8, ww + 16, wh + 16, 12); g.fill();
    gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#7fbaff'); gr.addColorStop(1, '#e2f2ff');
    g.save(); g.beginPath(); g.roundRect(wx, wy, ww, wh, 6); g.clip(); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    [[0.2, 0.25, 0.09], [0.55, 0.18, 0.07], [0.78, 0.32, 0.08]].forEach(([a, c, r]) => { g.beginPath(); g.ellipse(wx + ww * a, wy + wh * c, ww * r * 1.6, ww * r * 0.6, 0, 0, 6.28); g.fill(); });
    for (let i = 0; i < 14; i++) { const bw = ww / 14, bh = wh * (0.18 + ((i * 37) % 11) / 11 * 0.3); g.fillStyle = i % 2 ? 'rgba(150,172,225,0.75)' : 'rgba(170,190,235,0.75)'; g.fillRect(wx + i * bw, wy + wh - bh, bw - 2, bh); }
    g.restore();
    g.strokeStyle = '#f8faff'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(wx + ww / 3, wy); g.lineTo(wx + ww / 3, wy + wh); g.moveTo(wx + (2 * ww) / 3, wy); g.lineTo(wx + (2 * ww) / 3, wy + wh); g.moveTo(wx, wy + wh * 0.5); g.lineTo(wx + ww, wy + wh * 0.5); g.stroke();
    // sunlight on the floor
    [[0.16, 0.3], [0.34, 0.46]].forEach(([a, c], i) => {
      const lg = g.createLinearGradient(0, hy, 0, H); lg.addColorStop(0, 'rgba(255,255,255,0.0)'); lg.addColorStop(0.3, `rgba(255,255,255,${0.2 - i * 0.05})`); lg.addColorStop(1, 'rgba(255,255,255,0.04)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(U(a), hy); g.lineTo(U(c), hy); g.lineTo(U(c + 0.34), H + 4); g.lineTo(U(a + 0.22), H + 4); g.closePath(); g.fill();
    });
    // bookshelf (left), wall art and clock, plant (right)
    const sx0 = U(0.015), sy0 = V(0.1), shw = sw * 0.085, shh = sh * 0.3;
    g.fillStyle = '#b7a58d'; g.beginPath(); g.roundRect(sx0, sy0, shw, shh, 5); g.fill();
    const cols = ['#5b7cfa', '#ff7a8a', '#ffd166', '#4cd4a2', '#b57bff', '#ff9f5b'];
    for (let r = 0; r < 4; r++) { let x = sx0 + 5; const yy = sy0 + 6 + r * (shh / 4); g.fillStyle = 'rgba(70,52,34,0.35)'; g.fillRect(sx0, yy + shh / 4 - 8, shw, 3);
      for (let i = 0; i < 6; i++) { const bw = 5 + ((i * 3 + r) % 4) * 2, bh = shh / 4 - 14 - ((i + r) % 3) * 3; g.fillStyle = cols[(i + r * 2) % 6]; g.fillRect(x, yy + shh / 4 - 8 - bh, bw, bh); x += bw + 1.5; if (x > sx0 + shw - 8) break; } }
    [[0.6, 0.11, 0.075, 0.13, '#ff9f5b', '#5b7cfa'], [0.69, 0.14, 0.05, 0.09, '#ffd166', '#ff7a8a']].forEach(([u, v, w, h, c1, c2]) => {
      g.fillStyle = '#fbfcff'; g.beginPath(); g.roundRect(U(u), V(v), w * sw, h * sh, 4); g.fill();
      g.fillStyle = c1; g.beginPath(); g.arc(U(u) + w * sw * 0.4, V(v) + h * sh * 0.45, w * sw * 0.22, 0, 6.28); g.fill();
      g.fillStyle = c2; g.fillRect(U(u) + w * sw * 0.45, V(v) + h * sh * 0.5, w * sw * 0.35, h * sh * 0.3);
    });
    const kx = U(0.8), ky = V(0.2), kr = sh * 0.05;
    g.fillStyle = '#fbfcff'; g.beginPath(); g.arc(kx, ky, kr, 0, 6.28); g.fill(); g.strokeStyle = '#3b4580'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + kr * 0.45, ky - kr * 0.2); g.moveTo(kx, ky); g.lineTo(kx - kr * 0.1, ky - kr * 0.62); g.stroke();
    const px = U(0.94), py = hy - 2, pw = sw * 0.035;
    g.fillStyle = '#e59a78'; g.beginPath(); g.moveTo(px - pw, py - sh * 0.07); g.lineTo(px + pw, py - sh * 0.07); g.lineTo(px + pw * 0.75, py); g.lineTo(px - pw * 0.75, py); g.closePath(); g.fill();
    for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.4, l = sh * (0.12 + ((i * 5) % 4) * 0.02); g.save(); g.translate(px, py - sh * 0.07); g.rotate(a + 1.57); const lg = g.createLinearGradient(0, 0, l, 0); lg.addColorStop(0, '#2f9e6b'); lg.addColorStop(1, '#58d69c'); g.fillStyle = lg; g.beginPath(); g.ellipse(l / 2, 0, l / 2, l * 0.2, 0, 0, 6.28); g.fill(); g.restore(); }
    // desk in the bottom right with a mug
    const p = this.pile(), dx0 = p.x - p.w * 2.3, dy0 = p.y - p.w * 1.15;
    g.save(); g.shadowColor = 'rgba(20,26,64,0.3)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    gr = g.createLinearGradient(0, dy0, 0, H); gr.addColorStop(0, '#e2b68a'); gr.addColorStop(1, '#bd8a5c');
    g.fillStyle = gr; g.beginPath(); g.roundRect(dx0, dy0, W - dx0 + 60, H - dy0 + 60, 34); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(dx0 + 30, dy0 + 2, W - dx0, 2);
    const mx = p.x + p.w * 1.35, my = p.y - p.w * 0.55;
    g.fillStyle = 'rgba(20,26,64,0.2)'; g.beginPath(); g.ellipse(mx + 6, my + 30, 26, 8, 0, 0, 6.28); g.fill();
    g.fillStyle = '#f6f8ff'; g.beginPath(); g.roundRect(mx - 22, my - 8, 44, 38, 8); g.fill();
    g.strokeStyle = '#f6f8ff'; g.lineWidth = 6; g.beginPath(); g.arc(mx + 24, my + 11, 10, -1.2, 1.2); g.stroke();
    g.fillStyle = '#5b7cfa'; g.beginPath(); g.ellipse(mx, my - 8, 22, 7, 0, 0, 6.28); g.fill();
    // soft corners
    const vg = g.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.4, cx, H * 0.5, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(20,26,64,0)'); vg.addColorStop(1, 'rgba(20,26,64,0.22)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  drawBackground() { this.ctx.drawImage(this.bg, 0, 0, this.W, this.H); }

  // ----- the bin -----
  binGeom(z) {
    const r = WORLD.binR, base = this.proj(WORLD.binX, 0, z), top = this.proj(WORLD.binX, WORLD.rimY, z), k = base.k;
    const tilt = (WORLD.eye - WORLD.rimY) / Math.hypot(z + WORLD.plane, WORLD.eye - WORLD.rimY);
    const baseTilt = WORLD.eye / Math.hypot(z + WORLD.plane, WORLD.eye);
    return { base, top, rx: r * k, ry: r * k * tilt, bx: r * 0.78 * k, by: r * 0.78 * k * baseTilt, k };
  }
  // Interior and back rim, plus its floor shadow. Balls that fell in are drawn after this and before binFront.
  binBack(z, inside) {
    const c = this.ctx, g = this.binGeom(z);
    const sg = c.createRadialGradient(g.base.x, g.base.y, 1, g.base.x, g.base.y, g.rx * 0.7); sg.addColorStop(0, 'rgba(20,26,64,0.45)'); sg.addColorStop(1, 'rgba(20,26,64,0)');
    c.save(); c.translate(g.base.x, g.base.y); c.scale(1, 0.2 / 0.7); c.translate(-g.base.x, -g.base.y); c.fillStyle = sg; c.beginPath(); c.arc(g.base.x, g.base.y, g.rx * 0.7 * 1.0, 0, 6.28); c.fill(); c.restore();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, 6.2832);
    const ig = c.createLinearGradient(0, g.top.y - g.ry, 0, g.top.y + g.ry); ig.addColorStop(0, '#59639a'); ig.addColorStop(1, '#161b3b'); c.fillStyle = ig; c.fill();
    inside && inside(g);
  }
  binFront(z) {
    const c = this.ctx, g = this.binGeom(z);
    c.beginPath(); c.moveTo(g.top.x - g.rx, g.top.y); c.lineTo(g.base.x - g.bx, g.base.y);
    c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, Math.PI, 0, true); c.lineTo(g.top.x + g.rx, g.top.y);
    c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, Math.PI, false); c.closePath();
    const bg = c.createLinearGradient(g.top.x - g.rx, 0, g.top.x + g.rx, 0);
    bg.addColorStop(0, '#3a4474'); bg.addColorStop(0.3, '#7683bd'); bg.addColorStop(0.55, '#5a669f'); bg.addColorStop(1, '#2c3562');
    c.fillStyle = bg; c.fill();
    c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = Math.max(1, g.k * 0.012);
    for (let i = -4; i <= 4; i++) { const t = i / 4.5; c.beginPath(); c.moveTo(g.top.x + t * g.rx, g.top.y); c.lineTo(g.base.x + t * g.bx, g.base.y); c.stroke(); }
    c.restore();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, Math.PI, false);
    c.strokeStyle = '#e6eafb'; c.lineWidth = Math.max(2, g.k * 0.035); c.stroke();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, Math.PI, 6.2832, false); c.strokeStyle = '#c4cbea'; c.stroke();
  }
  shadow(X, Z, r, a) {
    const c = this.ctx, p = this.proj(X, 0, Z), rr = r * p.k;
    c.save(); c.fillStyle = `rgba(20,26,64,${a})`; c.beginPath(); c.ellipse(p.x, p.y, rr * 1.1, rr * 0.35, 0, 0, 6.2832); c.fill(); c.restore();
  }
}
