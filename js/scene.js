import { WORLD } from './config.js';
import { paintOffice } from './office.js';

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
  setImages({ office, bin } = {}) { this.officeImg = office || null; this.binImg = bin || null; this.buildBackground(); }
  noise(size, lo, hi) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), d = x.createImageData(size, size);
    for (let i = 0; i < d.data.length; i += 4) { const v = lo + Math.random() * (hi - lo); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  }
  wood(g, x, y, w, h, seed = 1) {
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, 30); g.clip();
    for (let i = 0; i < h / 3; i++) { const yy = y + (i / (h / 3)) * h, a = 0.025 + 0.05 * Math.abs(Math.sin(i * 12.9898 + seed)); g.strokeStyle = i % 3 ? `rgba(90,52,24,${a})` : `rgba(255,236,205,${a * 0.7})`; g.lineWidth = 0.8 + (i % 4) * 0.4; g.beginPath(); g.moveTo(x, yy); for (let t = 0; t <= 1; t += 0.1) g.lineTo(x + t * w, yy + Math.sin(t * 7 + i * 0.7 + seed) * 1.6); g.stroke(); }
    const sp = g.createLinearGradient(x, y, x + w, y + h * 0.6); sp.addColorStop(0, 'rgba(255,245,225,0.32)'); sp.addColorStop(0.35, 'rgba(255,245,225,0)'); sp.addColorStop(1, 'rgba(40,20,8,0.18)'); g.fillStyle = sp; g.fillRect(x, y, w, h);
    g.restore();
  }
  buildBackground() {
    const { W, H, dpr, hy } = this;
    const b = this.bg; b.width = Math.round(W * dpr); b.height = Math.round(H * dpr);
    const g = b.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const base = document.createElement('canvas'); base.width = b.width; base.height = b.height;
    const bc = base.getContext('2d'); bc.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.officeImg && this.officeImg.naturalWidth) this.paintImage(bc); else this.paintScene(bc);
    g.drawImage(base, 0, 0, W, H);
    if (!(this.officeImg && this.officeImg.naturalWidth)) {
      const px = (v) => v * dpr;
      // depth of field: the glass wall sits far away, so it is slightly soft; the carpet softens toward the horizon
      g.save(); g.beginPath(); g.rect(0, 0, W, hy + 2); g.clip(); g.filter = `blur(${px(0.6)}px)`; g.drawImage(base, 0, 0, W, H); g.restore();
      const soft = document.createElement('canvas'); soft.width = b.width; soft.height = b.height; const sc = soft.getContext('2d'); sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.filter = `blur(${px(0.8)}px)`; sc.drawImage(base, 0, 0, W, H); sc.filter = 'none'; sc.globalCompositeOperation = 'destination-in';
      const fm = sc.createLinearGradient(0, hy, 0, hy + (H - hy) * 0.38); fm.addColorStop(0, 'rgba(0,0,0,1)'); fm.addColorStop(1, 'rgba(0,0,0,0)'); sc.fillStyle = fm; sc.fillRect(0, hy, W, H - hy);
      g.drawImage(soft, 0, 0, W, H);
      // window bloom
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.1; g.filter = `blur(${px(26)}px) brightness(1.1) contrast(1.3)`; g.beginPath(); g.rect(0, 0, W, hy + 10); g.clip(); g.drawImage(base, 0, 0, W, H); g.restore();
      // carpet texture
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.07; g.fillStyle = g.createPattern(this.noise(192, 190, 255), 'repeat'); g.fillRect(0, hy, W, H - hy); g.restore();
      // colour grade: warm light, cool shadows
      g.save(); g.globalCompositeOperation = 'soft-light'; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,224,180,0.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(60,80,170,0.25)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    }
    // film grain and a gentle vignette
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.02; g.fillStyle = g.createPattern(this.noise(160, 0, 255), 'repeat'); g.fillRect(0, 0, W, H); g.restore();
    const vg = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.max(W, H) * 0.85);
    vg.addColorStop(0, 'rgba(10,14,44,0)'); vg.addColorStop(1, 'rgba(10,14,44,0.34)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  // A supplied photo or render: cover-fit, with a soft desk plate so the paper pile reads.
  paintImage(g) {
    const { W, H } = this, im = this.officeImg, s = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
    g.drawImage(im, (W - w) / 2, -(h - H) * 0.62, w, h); // crop more of the ceiling than the floor
    // tone it into the game: calmer highlights, a cool wash, darker top and bottom edges for the HUD
    g.fillStyle = 'rgba(40,56,120,0.16)'; g.fillRect(0, 0, W, H);
    let tg = g.createLinearGradient(0, 0, 0, H * 0.3); tg.addColorStop(0, 'rgba(14,20,56,0.38)'); tg.addColorStop(1, 'rgba(14,20,56,0)'); g.fillStyle = tg; g.fillRect(0, 0, W, H * 0.3);
    tg = g.createLinearGradient(0, H * 0.7, 0, H); tg.addColorStop(0, 'rgba(14,20,56,0)'); tg.addColorStop(1, 'rgba(14,20,56,0.28)'); g.fillStyle = tg; g.fillRect(0, H * 0.7, W, H * 0.3);
    const p = this.pile(), dx0 = p.x - p.w * 2.3, dy0 = p.y - p.w * 1.15;
    g.save(); g.shadowColor = 'rgba(14,20,60,0.45)'; g.shadowBlur = 34; g.shadowOffsetY = 10; const gr = g.createLinearGradient(0, dy0, 0, H); gr.addColorStop(0, '#e9b98a'); gr.addColorStop(1, '#c58f5e'); g.fillStyle = gr; g.beginPath(); g.roundRect(dx0, dy0, W - dx0 + 60, H - dy0 + 60, 34); g.fill(); g.restore();
    this.wood(g, dx0, dy0, W - dx0, H - dy0, 3);
  }
  paintScene(g) { paintOffice(g, this); }
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
  // Wire mesh: each wire is drawn in short pieces whose brightness follows the light (from the upper left), so it reads as round steel.
  mesh(g, front, lw) {
    const c = this.ctx, N = 12, STEPS = 26;
    c.save(); c.lineCap = 'round';
    for (const dir of [1, -1]) for (let i = 0; i < N; i++) {
      const ph = (i / N) * 6.2832;
      let px = 0, py = 0, pen = false;
      for (let j = 0; j <= STEPS; j++) {
        const h = j / STEPS, th = ph + dir * h * 2.4, sn = Math.sin(th);
        if ((front ? sn : -sn) < 0.02) { pen = false; continue; }
        const x = g.top.x + (g.base.x - g.top.x) * h + (g.rx + (g.bx - g.rx) * h) * Math.cos(th);
        const y = g.top.y + (g.base.y - g.top.y) * h + (g.ry + (g.by - g.ry) * h) * sn;
        if (pen) {
          const lit = 0.5 - 0.5 * Math.cos(th + 0.6), shade = front ? 0.3 + 0.7 * lit : 0.18 + 0.4 * lit, v = Math.round(36 + 150 * shade * shade);
          c.strokeStyle = `rgba(${v},${v + 6},${v + 22},${front ? 0.94 : 0.6})`; c.lineWidth = lw * (front ? 1 : 0.8);
          c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
          if (front && lit > 0.55) { c.strokeStyle = `rgba(215,225,248,${(lit - 0.5) * 0.6})`; c.lineWidth = lw * 0.35; c.beginPath(); c.moveTo(px - lw * 0.15, py - lw * 0.2); c.lineTo(x - lw * 0.15, y - lw * 0.2); c.stroke(); }
        }
        px = x; py = y; pen = true;
      }
    }
    c.restore();
  }
  ring(g, cy, rx, ry, a0, a1, w, left, right) {
    const c = this.ctx, gr = c.createLinearGradient(g.top.x - g.rx, 0, g.top.x + g.rx, 0);
    gr.addColorStop(0, left); gr.addColorStop(0.28, '#9aa5c4'); gr.addColorStop(0.5, '#5f6b8a'); gr.addColorStop(0.82, '#323a54'); gr.addColorStop(1, right);
    c.beginPath(); c.ellipse(g.top.x + (cy.x - g.top.x), cy.y, rx, ry, 0, a0, a1, false); c.strokeStyle = gr; c.lineWidth = w; c.stroke();
  }
  binBack(z, inside) {
    const c = this.ctx, g = this.binGeom(z), lw = Math.max(1, g.k * 0.017), band = Math.max(2.5, g.k * 0.07);
    // contact shadow and ambient occlusion on the carpet
    const sg = c.createRadialGradient(g.base.x, g.base.y, 1, g.base.x, g.base.y, g.rx * 0.9); sg.addColorStop(0, 'rgba(8,12,34,0.55)'); sg.addColorStop(0.55, 'rgba(8,12,34,0.22)'); sg.addColorStop(1, 'rgba(8,12,34,0)');
    c.save(); c.translate(g.base.x, g.base.y + g.by * 0.3); c.scale(1, 0.26); c.translate(-g.base.x, -g.base.y); c.fillStyle = sg; c.beginPath(); c.arc(g.base.x, g.base.y, g.rx * 0.95, 0, 6.28); c.fill(); c.restore();
    // the inside of the bin, seen through the mouth and the wire: darker toward the bottom
    c.beginPath(); c.moveTo(g.top.x - g.rx, g.top.y); c.lineTo(g.base.x - g.bx, g.base.y); c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, Math.PI, 0, true); c.lineTo(g.top.x + g.rx, g.top.y); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, 6.2832, true); c.closePath();
    const wg = c.createLinearGradient(0, g.top.y, 0, g.base.y); wg.addColorStop(0, 'rgba(40,48,72,0.10)'); wg.addColorStop(1, 'rgba(14,18,40,0.38)'); c.fillStyle = wg; c.fill();
    c.beginPath(); c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, 0, 6.2832); c.fillStyle = 'rgba(16,20,44,0.5)'; c.fill();
    this.mesh(g, false, lw);
    this.ring(g, g.top, g.rx, g.ry, Math.PI, 6.2832, band, '#3a4260', '#2a3148');
    inside && inside(g);
  }
  binFront(z) {
    const c = this.ctx, g = this.binGeom(z), lw = Math.max(1, g.k * 0.02), band = Math.max(2.5, g.k * 0.07);
    if (this.binImg && this.binImg.naturalWidth) { // supplied sprite: width from the rim, base line anchored to the floor point
      const im = this.binImg, w = (2 * g.rx) / 0.9875, h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, g.top.x - w / 2, g.base.y - 0.92 * h, w, h); return;
    }
    this.mesh(g, true, lw);
    // vertical steel bars at the sides
    const edge = c.createLinearGradient(0, g.top.y, 0, g.base.y); edge.addColorStop(0, '#6a7596'); edge.addColorStop(1, '#2b3250');
    c.strokeStyle = edge; c.lineWidth = lw * 1.7; c.lineCap = 'round'; c.beginPath(); c.moveTo(g.top.x - g.rx, g.top.y); c.lineTo(g.base.x - g.bx, g.base.y); c.moveTo(g.top.x + g.rx, g.top.y); c.lineTo(g.base.x + g.bx, g.base.y); c.stroke();
    // plastic-steel foot ring and rim, shaded like a torus
    this.ring(g, g.base, g.bx, g.by, 0, Math.PI, band * 0.95, '#6b7596', '#252b44');
    c.beginPath(); c.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, 0.12, Math.PI - 0.12, false); c.strokeStyle = 'rgba(210,220,245,0.22)'; c.lineWidth = band * 0.18; c.stroke();
    this.ring(g, g.top, g.rx, g.ry, 0, Math.PI, band, '#aab4d0', '#2c3350');
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0.1, Math.PI - 0.1, false); c.strokeStyle = 'rgba(235,240,255,0.55)'; c.lineWidth = band * 0.2; c.stroke();
    c.beginPath(); c.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 6.2832 - 0.16, 0.16, false); c.strokeStyle = '#4a5472'; c.lineWidth = band; c.stroke();
  }
  shadow(X, Z, r, a) {
    const c = this.ctx, p = this.proj(X, 0, Z), rr = r * p.k;
    c.save(); c.fillStyle = `rgba(20,26,64,${a})`; c.beginPath(); c.ellipse(p.x, p.y, rr * 1.1, rr * 0.35, 0, 0, 6.2832); c.fill(); c.restore();
  }
}
