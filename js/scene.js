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

  // ----- the office, drawn once per resize: a bright open-plan floor with a glass wall, pillars, desks and sun shafts -----
  buildBackground() {
    const { W, H, dpr, hy, ox, oy, sw, sh, cx } = this;
    const b = this.bg; b.width = Math.round(W * dpr); b.height = Math.round(H * dpr);
    const g = b.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const U = (u) => ox + u * sw, V = (v) => oy + v * sh;
    const lin = (x0, y0, x1, y1, stops) => { const l = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
    const rr = (x, y, w, h, r, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const wallTop = V(0.1), wallBot = hy;
    // ceiling with soft light panels
    g.fillStyle = lin(0, 0, 0, wallTop + 4, [[0, '#b9c1e6'], [1, '#d6dcf3']]); g.fillRect(0, 0, W, wallTop + 4);
    g.strokeStyle = 'rgba(120,132,190,0.25)'; g.lineWidth = 1;
    for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(cx + i * sw * 0.06, wallTop); g.lineTo(cx + i * sw * 0.16, 0); g.stroke(); }
    [0.33, 0.5, 0.67, 0.84].forEach((u, i) => { const pw = sw * (0.035 + Math.abs(u - 0.5) * 0.06), ph = sh * 0.016; g.save(); g.shadowColor = 'rgba(255,240,205,0.95)'; g.shadowBlur = 26; rr(U(u) - pw / 2, V(0.028 + i % 2 * 0.004), pw, ph, 3, '#fffaf0'); g.restore(); });
    // glass wall: sky, clouds and three layers of skyline
    const gx = U(0.0), gw = sw, gy = wallTop, gh = wallBot - wallTop;
    g.fillStyle = lin(0, gy, 0, gy + gh, [[0, '#4f9cf0'], [0.55, '#8cc5f8'], [1, '#d4e9fb']]); g.fillRect(gx, gy, gw, gh);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    [[0.31, 0.3, 0.05], [0.37, 0.24, 0.04], [0.55, 0.2, 0.035], [0.72, 0.28, 0.045], [0.8, 0.22, 0.04], [0.45, 0.4, 0.03], [0.9, 0.34, 0.035]].forEach(([a, c, r]) => { const x = U(a), y = gy + gh * c, w = sw * r; [[0, 0, 1.5, 0.5], [-0.7, 0.12, 0.9, 0.4], [0.75, 0.1, 1, 0.38], [0.1, -0.18, 0.8, 0.4]].forEach(([dx, dy, ex, ey]) => { g.beginPath(); g.ellipse(x + dx * w, y + dy * w, w * ex * 0.7, w * ey * 0.7, 0, 0, 6.2832); g.fill(); }); });
    const rnd = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    [[0.55, 'rgba(160,192,238,0.75)', 0.38, 0.035], [0.75, 'rgba(122,156,218,0.9)', 0.52, 0.045], [1, 'rgba(92,124,196,0.95)', 0.62, 0.06]].forEach(([_, col, hMax, bwU], L) => {
      g.fillStyle = col; let x = 0; let i = 0;
      while (x < 1) { const bw = bwU * (0.5 + rnd(i + L * 40)), bh = gh * hMax * (0.35 + rnd(i * 3 + L * 9) * 0.9); g.fillRect(U(x), gy + gh - bh, sw * bw + 1, bh);
        if (rnd(i + 5 + L) > 0.78) { g.fillRect(U(x) + sw * bw * 0.45, gy + gh - bh - gh * 0.07, 3, gh * 0.07); }
        x += bw; i++; }
    });
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(gx, gy + gh * 0.86, gw, gh * 0.14);
    // window frames
    g.fillStyle = '#6c7aa8'; [0.29, 0.52, 0.645, 0.79, 0.905].forEach((u) => g.fillRect(U(u) - 3, wallTop, 6, gh));
    g.fillStyle = '#7f8db8'; g.fillRect(0, wallTop - 4, W, 8); g.fillRect(0, wallBot - 12, W, 12);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, wallBot - 12, W, 2);
    // pillars with a framed picture
    const pil = (u0, u1, top) => { const x0 = U(u0), w = sw * (u1 - u0); g.fillStyle = lin(x0, 0, x0 + w, 0, [[0, '#f1eef7'], [0.7, '#e1ddec'], [1, '#c4c3dc']]); g.fillRect(x0, top, w, wallBot - top + 2); g.fillStyle = 'rgba(70,80,140,0.18)'; g.fillRect(x0 + w - 4, top, 4, wallBot - top); };
    pil(0.115, 0.18, 0); pil(0.205, 0.265, V(0.075));
    const fx = U(0.125), fy = V(0.15), fw = sw * 0.035, fh = sh * 0.11; rr(fx - 3, fy - 3, fw + 6, fh + 6, 3, '#4a527a'); g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip(); g.fillStyle = lin(0, fy, 0, fy + fh, [[0, '#f2b87c'], [0.55, '#8a7fc9'], [1, '#3d4e86']]); g.fillRect(fx, fy, fw, fh); g.fillStyle = '#34457a'; g.beginPath(); g.moveTo(fx, fy + fh); g.lineTo(fx + fw * 0.35, fy + fh * 0.5); g.lineTo(fx + fw * 0.6, fy + fh * 0.8); g.lineTo(fx + fw * 0.8, fy + fh * 0.55); g.lineTo(fx + fw, fy + fh); g.fill(); g.restore();
    // plant helper
    const plant = (x, y, s, n) => { g.fillStyle = '#a99dc4'; g.beginPath(); g.moveTo(x - s * 0.5, y - s * 0.6); g.lineTo(x + s * 0.5, y - s * 0.6); g.lineTo(x + s * 0.38, y); g.lineTo(x - s * 0.38, y); g.closePath(); g.fill();
      for (let i = 0; i < n; i++) { const a = -2.5 + (i / (n - 1)) * 1.9 + (rnd(i + x) - 0.5) * 0.3, l = s * (1.1 + rnd(i * 7 + y) * 0.9); g.save(); g.translate(x, y - s * 0.6); g.rotate(a + 1.5708); g.fillStyle = lin(0, 0, l, 0, [[0, '#2d7c4f'], [1, i % 2 ? '#5fc07f' : '#46a066']]); g.beginPath(); g.ellipse(l / 2, 0, l / 2, l * 0.19, 0, 0, 6.2832); g.fill(); g.restore(); } };
    // sofa and low table
    const sx = U(0.3), sy = hy - sh * 0.085; rr(sx, sy - sh * 0.04, sw * 0.14, sh * 0.075, 8, '#6a7fb4'); rr(sx - sw * 0.01, sy, sw * 0.16, sh * 0.06, 8, '#7d91c4'); rr(sx - sw * 0.01, sy + sh * 0.055, sw * 0.16, sh * 0.012, 4, 'rgba(40,50,100,0.35)');
    g.fillStyle = '#b79a6c'; g.fillRect(U(0.375) - sw * 0.02, sy + sh * 0.035, sw * 0.04, sh * 0.006); g.fillRect(U(0.375) - 2, sy + sh * 0.04, 4, sh * 0.03);
    plant(U(0.46), hy - sh * 0.015, sh * 0.06, 8); plant(U(0.805), hy - sh * 0.02, sh * 0.07, 9); plant(U(0.285), hy - sh * 0.02, sh * 0.05, 7);
    // cubicles left and right with desks, monitors and chairs
    const cubicle = (side) => {
      const m = side < 0 ? 0 : 1, x0 = m ? U(0.86) : U(-0.01), w = sw * 0.155, y0 = hy - sh * 0.15;
      const xs = x0, ww = w;
      rr(xs, y0 - sh * 0.04, ww, sh * 0.2, 8, '#d9d3cf');                   // partition
      rr(xs + ww * (m ? 0.45 : 0.1), y0, ww * 0.38, sh * 0.075, 4, '#232a4a'); rr(xs + ww * (m ? 0.47 : 0.12), y0 + sh * 0.006, ww * 0.34, sh * 0.06, 3, '#3c4f8f'); // monitor
      g.fillStyle = '#e8d3a5'; g.fillRect(xs + ww * (m ? 0.1 : 0.62), y0 + sh * 0.01, ww * 0.1, ww * 0.1);
      rr(xs, hy - sh * 0.045, ww, sh * 0.014, 3, '#d9a76c');                 // desk top
      rr(xs + ww * (m ? 0.1 : 0.62), hy - sh * 0.03, ww * 0.28, sh * 0.06, 3, '#d7d9e4'); // drawers
      const cxs = xs + ww * (m ? 0.45 : 0.4); rr(cxs - sw * 0.014, hy - sh * 0.135, sw * 0.028, sh * 0.075, 8, '#2a3358'); rr(cxs - sw * 0.016, hy - sh * 0.06, sw * 0.032, sh * 0.016, 5, '#1f2748'); g.fillStyle = '#1f2748'; g.fillRect(cxs - 2, hy - sh * 0.045, 4, sh * 0.04); g.fillRect(cxs - sw * 0.012, hy - sh * 0.008, sw * 0.024, 3);
    };
    cubicle(-1); cubicle(1);
    // floor: dusky carpet tiles in perspective
    g.fillStyle = lin(0, hy, 0, H, [[0, '#6f7cb4'], [0.35, '#55639f'], [1, '#3a4586']]); g.fillRect(0, hy, W, H - hy);
    for (let z = 0.2, i = 0; z < 16; z += 0.6, i++) { const y0 = hy + WORLD.eye * this.k(z), y1 = hy + WORLD.eye * this.k(z + 0.6); for (let j = -12; j < 12; j++) { if ((i + j) % 2) continue; g.fillStyle = 'rgba(255,255,255,0.045)'; const x00 = cx + (j * 0.6) * this.k(z), x01 = cx + ((j + 1) * 0.6) * this.k(z), x10 = cx + (j * 0.6) * this.k(z + 0.6), x11 = cx + ((j + 1) * 0.6) * this.k(z + 0.6); g.beginPath(); g.moveTo(x00, y0); g.lineTo(x01, y0); g.lineTo(x11, y1); g.lineTo(x10, y1); g.closePath(); g.fill(); } }
    g.strokeStyle = 'rgba(25,32,80,0.12)'; g.lineWidth = 1;
    for (let j = -14; j <= 14; j++) { g.beginPath(); g.moveTo(cx + j * 0.6 * this.k(16), hy + WORLD.eye * this.k(16)); g.lineTo(cx + j * 0.6 * this.k(0.1), H + 6); g.stroke(); }
    for (let z = 0.2; z < 16; z += 0.6) { const y = hy + WORLD.eye * this.k(z); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // reflections of the glass wall and warm sun shafts
    g.fillStyle = lin(0, hy, 0, hy + (H - hy) * 0.35, [[0, 'rgba(190,215,255,0.28)'], [1, 'rgba(190,215,255,0)']]); g.fillRect(0, hy, W, (H - hy) * 0.35);
    g.save(); g.globalCompositeOperation = 'lighter';
    [[0.29, 0.52, -0.02, 0.28], [0.52, 0.645, 0.26, 0.5], [0.645, 0.79, 0.52, 0.8], [0.79, 0.905, 0.84, 1.1]].forEach(([a, c, d, e], i) => {
      g.fillStyle = lin(0, hy, 0, H, [[0, 'rgba(255,200,130,0.0)'], [0.15, 'rgba(255,196,128,0.26)'], [1, 'rgba(255,170,100,0.07)']]);
      g.beginPath(); g.moveTo(U(a), hy); g.lineTo(U(c), hy); g.lineTo(U(e) + sw * 0.1, H + 4); g.lineTo(U(d) - sw * 0.05, H + 4); g.closePath(); g.fill();
    });
    g.restore();
    // foreground desks: books and a mug bottom left, the paper desk with a laptop and sticky notes bottom right
    const p = this.pile(), dx0 = p.x - p.w * 2.3, dy0 = p.y - p.w * 1.15;
    g.save(); g.shadowColor = 'rgba(14,20,60,0.4)'; g.shadowBlur = 34; g.shadowOffsetY = 10;
    rr(dx0, dy0, W - dx0 + 60, H - dy0 + 60, 34, lin(0, dy0, 0, H, [[0, '#e9b98a'], [1, '#c58f5e']]));
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(dx0 + 30, dy0 + 2, W - dx0, 2);
    const lx = W - p.w * 0.62, ly = dy0 + p.w * 0.32; g.save(); g.translate(lx, ly); g.rotate(-0.1); rr(0, 0, p.w * 1.2, p.w * 0.8, 10, lin(0, 0, 0, p.w, [[0, '#a9aec9'], [1, '#7c82a6']])); g.fillStyle = 'rgba(30,36,70,0.5)'; for (let i = 0; i < 5; i++) g.fillRect(p.w * 0.1, p.w * (0.14 + i * 0.1), p.w * 0.9, 3); g.restore();
    const nx = p.x + p.w * 1.28, ny = p.y - p.w * 0.12; g.save(); g.translate(nx, ny); g.rotate(0.08); rr(0, 0, p.w * 0.5, p.w * 0.4, 4, '#f6e27c'); rr(p.w * 0.04, -p.w * 0.06, p.w * 0.5, p.w * 0.4, 4, '#fff08c'); g.restore();
    const lbx = -20, lby = H - Math.max(110, sh * 0.2); g.save(); g.shadowColor = 'rgba(14,20,60,0.4)'; g.shadowBlur = 28; g.shadowOffsetY = 8; rr(lbx, lby, Math.max(220, sw * 0.2), H - lby + 40, 26, lin(0, lby, 0, H, [[0, '#e9b98a'], [1, '#c58f5e']])); g.restore();
    const bk = (x, y, w, h, c) => { rr(x, y, w, h, 3, c); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 6, y + h * 0.3, w - 12, 3); };
    bk(lbx + 24, lby - 18, 130, 20, '#d4705a'); bk(lbx + 30, lby - 38, 120, 20, '#35508f'); bk(lbx + 20, lby - 58, 126, 20, '#2d7c76');
    const mx = lbx + 195, my = lby - 30; g.fillStyle = 'rgba(20,26,64,0.25)'; g.beginPath(); g.ellipse(mx + 4, my + 38, 32, 9, 0, 0, 6.2832); g.fill(); rr(mx - 28, my - 14, 56, 52, 10, '#fbfcff'); g.strokeStyle = '#fbfcff'; g.lineWidth = 8; g.beginPath(); g.arc(mx + 30, my + 12, 13, -1.3, 1.3); g.stroke(); g.fillStyle = '#7bb4ee'; g.beginPath(); g.ellipse(mx, my - 12, 28, 8, 0, 0, 6.2832); g.fill();
    // soft corners
    const vg = g.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.42, cx, H * 0.5, Math.max(W, H) * 0.85);
    vg.addColorStop(0, 'rgba(14,20,60,0)'); vg.addColorStop(1, 'rgba(14,20,60,0.3)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  drawBackground() { this.ctx.drawImage(this.bg, 0, 0, this.W, this.H); }

  // ----- the bin -----
  binGeom(z) {
    const r = WORLD.binR, base = this.proj(WORLD.binX, 0, z), top = this.proj(WORLD.binX, WORLD.rimY, z), k = base.k;
    const tilt = (WORLD.eye - WORLD.rimY) / Math.hypot(z + WORLD.plane, WORLD.eye - WORLD.rimY);
    const baseTilt = WORLD.eye / Math.hypot(z + WORLD.plane, WORLD.eye);
    return { base, top, rx: r * k, ry: r * k * tilt, bx: r * 0.78 * k, by: r * 0.78 * k * baseTilt, k };
  }
  // Transparent mesh bin. binBack = floor shadow, back of the mesh, bottom ring and back rim; balls that fell in are drawn
  // after it, then binFront (the front of the mesh and rim), so you see the paper through the wire.
  mesh(g, front, color, lw) {
    const c = this.ctx, N = 11, STEPS = 22;
    c.save(); c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round';
    for (const dir of [1, -1]) for (let i = 0; i < N; i++) {
      const ph = (i / N) * 6.2832; c.beginPath(); let pen = false;
      for (let j = 0; j <= STEPS; j++) {
        const h = j / STEPS, th = ph + dir * h * 2.4, sn = Math.sin(th);
        if ((front ? sn : -sn) < 0.02) { pen = false; continue; }
        const x = g.top.x + (g.base.x - g.top.x) * h + (g.rx + (g.bx - g.rx) * h) * Math.cos(th);
        const y = g.top.y + (g.base.y - g.top.y) * h + (g.ry + (g.by - g.ry) * h) * sn;
        if (pen) c.lineTo(x, y); else { c.moveTo(x, y); pen = true; }
      }
      c.stroke();
    }
    c.restore();
  }
  binBack(z, inside) {
    const c = this.ctx, g = this.binGeom(z), lw = Math.max(1, g.k * 0.016);
    const sg = c.createRadialGradient(g.base.x, g.base.y, 1, g.base.x, g.base.y, g.rx * 0.7); sg.addColorStop(0, 'rgba(14,20,50,0.34)'); sg.addColorStop(1, 'rgba(14,20,50,0)');
    c.save(); c.translate(g.base.x, g.base.y); c.scale(1, 0.2 / 0.7); c.translate(-g.base.x, -g.base.y); c.fillStyle = sg; c.beginPath(); c.arc(g.base.x, g.base.y, g.rx * 0.7, 0, 6.28); c.fill(); c.restore();
    // see-through floor of the bin, with the back of the mesh over it
    c.beginPath(); c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, 0, 6.2832); c.fillStyle = 'rgba(38,46,72,0.30)'; c.fill();
    this.mesh(g, false, 'rgba(40,48,72,0.5)', lw);
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, Math.PI, 6.2832, false); c.strokeStyle = '#3d465e'; c.lineWidth = Math.max(2, g.k * 0.06); c.stroke();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, Math.PI, 6.2832, false); c.strokeStyle = 'rgba(160,172,200,0.5)'; c.lineWidth = Math.max(1, g.k * 0.016); c.stroke();
    inside && inside(g);
  }
  binFront(z) {
    const c = this.ctx, g = this.binGeom(z), lw = Math.max(1, g.k * 0.018), band = Math.max(2.5, g.k * 0.07);
    this.mesh(g, true, 'rgba(34,42,66,0.85)', lw);
    this.mesh(g, true, 'rgba(150,164,198,0.28)', lw * 0.5);
    // side edges
    c.strokeStyle = '#3a435b'; c.lineWidth = lw * 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(g.top.x - g.rx, g.top.y); c.lineTo(g.base.x - g.bx, g.base.y); c.moveTo(g.top.x + g.rx, g.top.y); c.lineTo(g.base.x + g.bx, g.base.y); c.stroke();
    // base ring, front half
    c.beginPath(); c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, 0, Math.PI, false); c.strokeStyle = '#444d66'; c.lineWidth = band * 0.9; c.stroke();
    c.beginPath(); c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, 0.1, Math.PI - 0.1, false); c.strokeStyle = 'rgba(170,182,210,0.45)'; c.lineWidth = band * 0.2; c.stroke();
    // rim, front half: dark steel band with a soft highlight
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, Math.PI, false); c.strokeStyle = '#464f68'; c.lineWidth = band; c.stroke();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0.12, Math.PI - 0.12, false); c.strokeStyle = 'rgba(190,200,226,0.7)'; c.lineWidth = band * 0.22; c.stroke();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 6.2832 - 0.2, 0.2, false); c.strokeStyle = '#464f68'; c.lineWidth = band; c.stroke();
  }
  shadow(X, Z, r, a) {
    const c = this.ctx, p = this.proj(X, 0, Z), rr = r * p.k;
    c.save(); c.fillStyle = `rgba(20,26,64,${a})`; c.beginPath(); c.ellipse(p.x, p.y, rr * 1.1, rr * 0.35, 0, 0, 6.2832); c.fill(); c.restore();
  }
}
