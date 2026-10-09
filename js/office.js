import { WORLD } from './config.js';

// Paints the whole office once per resize, in a clean illustrated style: a ceiling in perspective, a glass wall with a
// detailed skyline, pillars, cubicles on both sides, a sofa, plants, a carpet with sun shafts, and the two desks in front.
// S is the Stage (sizes, horizon, pile position, wood-grain helper).
const rnd = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function paintOffice(g, S) {
  const { W, H, hy, ox, oy, sw, sh, cx } = S;
  const U = (u) => ox + u * sw, V = (v) => oy + v * sh;
  const lin = (x0, y0, x1, y1, stops) => { const l = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
  const rr = (x, y, w, h, r, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const poly = (pts, fill, stroke, lw = 1) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const wallTop = V(0.13), wallBot = hy, gh = wallBot - wallTop;

  // ---------- ceiling in perspective ----------
  g.fillStyle = lin(0, 0, 0, wallTop, [[0, '#8f98c6'], [1, '#c3c9e6']]); g.fillRect(0, 0, W, wallTop + 2);
  g.save(); g.beginPath(); g.rect(0, 0, W, wallTop); g.clip();
  g.strokeStyle = 'rgba(70,82,150,0.28)'; g.lineWidth = 1.2;
  for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(cx + (i + 0.5) * sw * 0.05, wallTop); g.lineTo(cx + (i + 0.5) * sw * 0.2, -4); g.stroke(); }
  for (let j = 1; j < 7; j++) { const y = wallTop - (wallTop + 4) * Math.pow(j / 7, 1.7); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  [[0.14, 0.02, 0.07], [0.37, 0.056, 0.07], [0.56, 0.065, 0.085], [0.78, 0.04, 0.08], [0.93, 0.025, 0.07]].forEach(([u, v, w]) => {
    const x = U(u), y = V(v), ww = sw * w, hh = sh * 0.02; g.save(); g.shadowColor = 'rgba(255,214,160,0.95)'; g.shadowBlur = 30; poly([[x - ww / 2, y], [x + ww / 2, y], [x + ww * 0.58, y + hh], [x - ww * 0.58, y + hh]], '#ffe3c4'); g.restore();
  });
  g.restore();

  // ---------- glass wall: sky, clouds, skyline ----------
  g.fillStyle = lin(0, wallTop, 0, wallBot, [[0, '#4e8fe0'], [0.5, '#82b8f0'], [1, '#c9e0f6']]); g.fillRect(0, wallTop, W, gh);
  const puff = (x, y, r) => { const rg = g.createRadialGradient(x, y - r * 0.2, r * 0.05, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,0.98)'); rg.addColorStop(0.62, 'rgba(250,252,255,0.9)'); rg.addColorStop(1, 'rgba(235,243,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
  [[0.1, 0.3, 0.05], [0.34, 0.22, 0.055], [0.55, 0.14, 0.04], [0.72, 0.32, 0.06], [0.91, 0.22, 0.05], [0.46, 0.42, 0.035]].forEach(([u, v, s0], i) => {
    const x = U(u), y = wallTop + gh * v, r = sw * s0 * 0.62;
    g.fillStyle = 'rgba(214,228,250,0.55)'; g.beginPath(); g.ellipse(x, y + r * 0.32, r * 2.4, r * 0.34, 0, 0, 6.2832); g.fill();
    for (let k = 0; k < 6; k++) puff(x + (k - 2.5) * r * 0.7, y + Math.sin(k * 2.1 + i) * r * 0.16 - (k === 2 || k === 3 ? r * 0.22 : 0), r * (0.5 + 0.28 * rnd(k + i * 9)));
  });
  // three layers of buildings, with lit windows, a spire and rooftop details
  const layers = [
    { c0: '#a9c3ea', c1: '#c3d6f1', hMax: 0.34, bw: 0.034, win: 0.15, base: 0.05 },
    { c0: '#7f9fd6', c1: '#a5bde6', hMax: 0.5, bw: 0.04, win: 0.22, base: 0.02 },
    { c0: '#5c7cc0', c1: '#8aa5d8', hMax: 0.62, bw: 0.05, win: 0.3, base: 0 },
  ];
  layers.forEach((L, li) => {
    let x = -0.02, i = 0;
    while (x < 1.02) {
      const bw = L.bw * (0.6 + rnd(i * 3 + li * 17) * 0.9), bh = gh * L.hMax * (0.35 + rnd(i * 5 + li * 31) * 0.75), bx = U(x), by = wallBot - gh * L.base - bh, bwp = sw * bw;
      g.fillStyle = lin(bx, 0, bx + bwp, 0, [[0, L.c0], [1, L.c1]]); g.fillRect(bx, by, bwp + 1, bh + gh * L.base);
      g.fillStyle = `rgba(255,255,255,${L.win})`;
      for (let wy = by + 6; wy < by + bh - 4; wy += 9) for (let wx = bx + 4; wx < bx + bwp - 4; wx += 7) if (rnd(wx * 0.37 + wy * 0.13 + li) > 0.45) g.fillRect(wx, wy, 3, 4);
      if (rnd(i + li * 5) > 0.7) { g.fillStyle = L.c0; g.fillRect(bx + bwp * 0.45, by - gh * 0.05, 2.5, gh * 0.05); }
      x += bw * 0.92; i++;
    }
  });
  const tx = U(0.745), tb = wallBot - gh * 0.02; // the tall landmark tower
  g.fillStyle = lin(tx - 18, 0, tx + 18, 0, [[0, '#4d6db4'], [1, '#7d9bd4']]); poly([[tx - 17, tb], [tx - 11, tb - gh * 0.55], [tx, tb - gh * 0.82], [tx + 11, tb - gh * 0.55], [tx + 17, tb]], g.fillStyle); g.fillRect(tx - 1.2, tb - gh * 1.0, 2.4, gh * 0.2);
  g.fillStyle = lin(0, wallBot - gh * 0.3, 0, wallBot, [[0, 'rgba(210,228,250,0)'], [1, 'rgba(220,235,252,0.75)']]); g.fillRect(0, wallBot - gh * 0.3, W, gh * 0.3);

  // window frames: tall dark-slate mullions with a lit edge, a transom and a sill
  [0.075, 0.275, 0.455, 0.64, 0.805, 0.955].forEach((u) => { const x = U(u); g.fillStyle = '#56648f'; g.fillRect(x - 5, wallTop, 10, gh); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 5, wallTop, 2, gh); });
  g.fillStyle = '#56648f'; g.fillRect(0, wallTop - 6, W, 12); g.fillRect(0, wallTop + gh * 0.16, W, 7);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, wallTop - 6, W, 2);
  g.fillStyle = lin(0, wallBot - 16, 0, wallBot, [[0, '#9aa6cf'], [1, '#c7cfe9']]); g.fillRect(0, wallBot - 16, W, 16);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, wallBot - 16, W, 2);

  // ---------- floor: dusk-blue carpet tiles in perspective ----------
  g.fillStyle = lin(0, hy, 0, H, [[0, '#a2add8'], [0.3, '#8490c6'], [1, '#6571b0']]); g.fillRect(0, hy, W, H - hy);
  const TILE = 0.7;
  for (let z = 0.15, i = 0; z < 22; z += TILE, i++) {
    const y0 = hy + WORLD.eye * S.k(z), y1 = hy + WORLD.eye * S.k(z + TILE);
    for (let j = -16; j < 16; j++) {
      const tone = rnd(i * 31 + j * 7) - 0.5; if (tone > -0.2 && tone < 0.2) continue;
      g.fillStyle = tone > 0 ? 'rgba(255,255,255,0.07)' : 'rgba(10,16,70,0.1)';
      poly([[cx + (j + 0.5) * TILE * S.k(z), y0], [cx + (j + 1.5) * TILE * S.k(z), y0], [cx + (j + 1.5) * TILE * S.k(z + TILE), y1], [cx + (j + 0.5) * TILE * S.k(z + TILE), y1]], g.fillStyle);
    }
  }
  g.strokeStyle = 'rgba(18,26,86,0.12)'; g.lineWidth = 1;
  for (let j = -18; j <= 18; j++) { g.beginPath(); g.moveTo(cx + (j + 0.5) * TILE * S.k(22), hy + WORLD.eye * S.k(22)); g.lineTo(cx + (j + 0.5) * TILE * S.k(0.1), H + 6); g.stroke(); }
  for (let z = 0.15; z < 22; z += TILE) { const y = hy + WORLD.eye * S.k(z); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = lin(0, hy, 0, hy + (H - hy) * 0.3, [[0, 'rgba(206,224,255,0.35)'], [1, 'rgba(206,224,255,0)']]); g.fillRect(0, hy, W, (H - hy) * 0.3);
  // sun shafts through the panes, with the mullion shadows between them
  const panes = [[0.075, 0.275], [0.275, 0.455], [0.455, 0.64], [0.64, 0.805], [0.805, 0.955]];
  g.save(); g.globalCompositeOperation = 'screen'; g.beginPath(); g.rect(0, hy, W, H - hy); g.clip(); g.filter = 'blur(5px)';
  panes.forEach(([a, c]) => {
    const dx = -sw * 0.5;
    g.fillStyle = lin(0, hy, 0, H, [[0, 'rgba(255,210,150,0)'], [0.1, 'rgba(255,165,80,0.6)'], [0.7, 'rgba(255,150,70,0.42)'], [1, 'rgba(255,140,60,0.22)']]);
    poly([[U(a) + 16, hy], [U(c) - 16, hy], [U(c) + dx * 1.9 - sw * 0.08, H + 4], [U(a) + dx * 1.9 + sw * 0.0, H + 4]], g.fillStyle);
  });
  g.restore();

  // ---------- pillars, picture ----------
  const pillar = (u0, u1, top, tone) => { const x0 = U(u0), w = sw * (u1 - u0); g.fillStyle = lin(x0, 0, x0 + w, 0, [[0, tone[0]], [0.65, tone[1]], [1, tone[2]]]); g.fillRect(x0, top, w, wallBot - top + 3); g.fillStyle = 'rgba(60,72,150,0.2)'; g.fillRect(x0 + w - 6, top, 6, wallBot - top); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0, top, 3, wallBot - top); };
  pillar(0.255, 0.335, V(0.1), ['#efe9f4', '#ddd6e8', '#b9b6d6']); pillar(0.095, 0.185, -4, ['#f6efe6', '#e4dcdf', '#bdb7d4']);
  const fx = U(0.113), fy = V(0.2), fw = sw * 0.05, fh = sh * 0.14; rr(fx - 4, fy - 4, fw + 8, fh + 8, 3, '#59658f'); g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
  g.fillStyle = lin(0, fy, 0, fy + fh, [[0, '#f5c586'], [0.5, '#8a86c6'], [1, '#3d5188']]); g.fillRect(fx, fy, fw, fh); g.fillStyle = '#2f467d'; poly([[fx, fy + fh], [fx + fw * 0.3, fy + fh * 0.5], [fx + fw * 0.55, fy + fh * 0.75], [fx + fw * 0.8, fy + fh * 0.45], [fx + fw, fy + fh * 0.8], [fx + fw, fy + fh]], g.fillStyle); g.restore();

  // ---------- furniture ----------
  const plant = (x, y, s, n, tall = 1) => {
    g.fillStyle = 'rgba(16,22,70,0.22)'; g.beginPath(); g.ellipse(x, y + 2, s * 0.55, s * 0.13, 0, 0, 6.2832); g.fill();
    g.fillStyle = lin(x - s * 0.4, 0, x + s * 0.4, 0, [[0, '#8f8aa8'], [1, '#5f5b82']]); poly([[x - s * 0.42, y - s * 0.62], [x + s * 0.42, y - s * 0.62], [x + s * 0.32, y], [x - s * 0.32, y]], g.fillStyle);
    g.strokeStyle = '#4c3a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y - s * 0.6); g.lineTo(x, y - s * 0.6 - s * 0.7 * tall); g.stroke();
    for (let i = 0; i < n; i++) { const a = -2.7 + (i / (n - 1)) * 2.2 + (rnd(i + x) - 0.5) * 0.3, l = s * (0.55 + rnd(i * 7 + y) * 0.6) * (0.7 + 0.3 * tall), bx = x, by = y - s * 0.6 - s * 0.25 * rnd(i + 3); g.save(); g.translate(bx, by - s * 0.2 * tall); g.rotate(a + 1.5708); g.fillStyle = lin(0, 0, l, 0, [[0, '#2b6d46'], [1, i % 2 ? '#62bf7c' : '#48a265']]); g.beginPath(); g.ellipse(l / 2, 0, l / 2, l * 0.2, 0, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(l * 0.92, 0); g.stroke(); g.restore(); }
  };
  const chair = (x, y, s, flip) => { // mesh office chair seen from the front-left
    g.save(); g.translate(x, y); g.scale(flip, 1);
    g.fillStyle = 'rgba(16,22,70,0.25)'; g.beginPath(); g.ellipse(0, s * 0.02, s * 0.5, s * 0.08, 0, 0, 6.2832); g.fill();
    g.strokeStyle = '#252c4a'; g.lineWidth = s * 0.03; g.lineCap = 'round'; for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(Math.sin(a) * s * 0.42, s * 0.0 + Math.abs(a) * 4); g.stroke(); g.fillStyle = '#1a2036'; g.beginPath(); g.arc(Math.sin(a) * s * 0.42, s * 0.01 + Math.abs(a) * 4, s * 0.03, 0, 6.2832); g.fill(); }
    g.fillStyle = '#2a3150'; g.fillRect(-s * 0.025, -s * 0.34, s * 0.05, s * 0.3);
    rr(-s * 0.36, -s * 0.42, s * 0.72, s * 0.1, s * 0.05, '#30385c'); // seat
    g.save(); g.translate(-s * 0.05, -s * 0.46); g.rotate(-0.1); rr(-s * 0.3, -s * 0.78, s * 0.6, s * 0.78, s * 0.12, lin(-s * 0.3, 0, s * 0.3, 0, [[0, '#4a557f'], [1, '#2a3150']])); // back
    g.strokeStyle = 'rgba(160,176,220,0.28)'; g.lineWidth = 1; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * s * 0.05, -s * 0.76); g.lineTo(i * s * 0.05 + s * 0.12, -s * 0.04); g.stroke(); g.beginPath(); g.moveTo(i * s * 0.05, -s * 0.04); g.lineTo(i * s * 0.05 + s * 0.12, -s * 0.76); g.stroke(); } g.restore();
    g.strokeStyle = '#1f2640'; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(-s * 0.3, -s * 0.5); g.lineTo(-s * 0.36, -s * 0.66); g.lineTo(-s * 0.12, -s * 0.66); g.stroke();
    g.restore();
  };
  const cabinet = (x, y, w, h) => { rr(x, y, w, h, 3, lin(x, 0, x + w, 0, [[0, '#d9dce8'], [1, '#aeb4cb']])); for (let i = 0; i < 3; i++) { const yy = y + 4 + i * (h - 8) / 3; g.fillStyle = 'rgba(40,50,110,0.22)'; g.fillRect(x + 3, yy + (h - 8) / 3 - 2, w - 6, 2); rr(x + w * 0.36, yy + (h - 8) / 6 - 1.5, w * 0.28, 3, 1.5, '#6c7597'); } };
  const monitor = (x, y, w, h) => { rr(x - 3, y - 3, w + 6, h + 6, 4, '#1c2240'); g.fillStyle = lin(x, y, x + w, y + h, [[0, '#4c6db4'], [1, '#27407e']]); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.18)'; poly([[x, y], [x + w * 0.5, y], [x + w * 0.2, y + h], [x, y + h]], g.fillStyle); g.fillStyle = '#1c2240'; g.fillRect(x + w / 2 - 3, y + h + 3, 6, 10); g.fillRect(x + w / 2 - 14, y + h + 11, 28, 3); };

  // sofa + coffee table, centre left
  const sx = U(0.355), sy = hy - sh * 0.012, sW = sw * 0.17;
  g.fillStyle = 'rgba(16,22,70,0.2)'; g.beginPath(); g.ellipse(sx + sW / 2, sy + 4, sW * 0.58, sh * 0.012, 0, 0, 6.2832); g.fill();
  rr(sx, sy - sh * 0.095, sW, sh * 0.07, 10, lin(0, sy - sh * 0.1, 0, sy, [[0, '#6c7fb7'], [1, '#556aa4']])); rr(sx - sw * 0.012, sy - sh * 0.05, sW * 0.1, sh * 0.05, 8, '#5d73ab'); rr(sx + sW * 0.9 + sw * 0.002, sy - sh * 0.05, sW * 0.1, sh * 0.05, 8, '#5d73ab'); rr(sx + sW * 0.08, sy - sh * 0.055, sW * 0.84, sh * 0.045, 8, lin(0, sy - sh * 0.06, 0, sy, [[0, '#7d92c8'], [1, '#6a80b8']]));
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(sx + sW * 0.5 - 1, sy - sh * 0.052, 2, sh * 0.04);
  const tx2 = U(0.47), ty2 = hy + sh * 0.01; g.fillStyle = 'rgba(16,22,70,0.2)'; g.beginPath(); g.ellipse(tx2, ty2 + sh * 0.045, sw * 0.04, sh * 0.01, 0, 0, 6.2832); g.fill();
  g.fillStyle = '#d5b98f'; g.beginPath(); g.ellipse(tx2, ty2 - sh * 0.012, sw * 0.04, sh * 0.012, 0, 0, 6.2832); g.fill(); g.strokeStyle = '#a58a63'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx2 - sw * 0.025, ty2); g.lineTo(tx2 - sw * 0.03, ty2 + sh * 0.045); g.moveTo(tx2 + sw * 0.025, ty2); g.lineTo(tx2 + sw * 0.03, ty2 + sh * 0.045); g.stroke();
  plant(tx2, ty2 - sh * 0.014, sh * 0.03, 6, 0.4);
  plant(U(0.355), hy + sh * 0.0, sh * 0.075, 9); plant(U(0.69), hy + sh * 0.005, sh * 0.09, 10); plant(U(0.93), hy + sh * 0.03, sh * 0.1, 10);

  // cubicles: left and right, in perspective, with partitions, monitors, chairs, drawers and sticky notes
  const cubicle = (side) => {
    const m = side > 0, e = m ? W + 10 : -10, inner = m ? U(0.84) : U(0.17), dir = m ? -1 : 1;
    const top0 = hy - sh * 0.19, far0 = hy - sh * 0.1;
    // partition wall (tan fabric) receding toward the pillar line
    poly([[e, V(0.09)], [inner, far0 - sh * 0.1], [inner, hy - sh * 0.015], [e, V(0.52)]], lin(e, 0, inner, 0, [[0, '#d2c3b4'], [1, '#e6dccf']]));
    poly([[e, V(0.09)], [inner, far0 - sh * 0.1], [inner, far0 - sh * 0.1 + 6], [e, V(0.09) + 8]], '#a99a8a');
    // sticky notes on the partition
    [['#f7de7a', 0.28], ['#f2a88a', 0.4], ['#a9dba0', 0.52], ['#8fc9ee', 0.34]].forEach(([c, t], i) => { const px = e + (inner - e) * (0.25 + t * 0.45), py = V(0.2) + (i % 2) * sh * 0.025 + i * 2; g.fillStyle = c; g.fillRect(px, py, sw * 0.012, sw * 0.012); });
    // desk top (receding quad) and front drawer unit
    poly([[e, V(0.53)], [inner, hy - sh * 0.06], [inner, hy - sh * 0.075], [e, V(0.49)]], lin(0, V(0.5), 0, V(0.56), [[0, '#e0bd8e'], [1, '#c79a66']]));
    poly([[e, V(0.53)], [inner, hy - sh * 0.06], [inner, hy - sh * 0.048], [e, V(0.552)]], '#a77a4c');
    const cabW = sw * 0.075, cabX = m ? inner : inner - cabW;
    cabinet(m ? U(0.86) : U(0.095), hy - sh * 0.045, cabW, sh * 0.19);
    const mon = m ? U(0.9) : U(0.04); monitor(mon, V(0.33), sw * 0.07, sh * 0.095);
    // keyboard, mug and papers
    g.fillStyle = '#d9dcec'; g.fillRect(mon + sw * 0.005, V(0.49), sw * 0.055, 5); rr(mon + sw * 0.07 * (m ? -0.5 : 1.15), V(0.47), 16, 18, 3, '#f5f7ff');
    chair(m ? U(0.835) : U(0.19), hy + sh * 0.11, sh * 0.2, m ? -1 : 1);
  };
  cubicle(-1); cubicle(1);

  // ---------- foreground desks ----------
  const p = S.pile(), dx0 = p.x - p.w * 2.3, dy0 = p.y - p.w * 1.15;
  const desk = (x, y, w, h, seed) => {
    g.save(); g.shadowColor = 'rgba(12,18,64,0.5)'; g.shadowBlur = 40; g.shadowOffsetY = 14; rr(x, y, w, h, 30, lin(0, y, 0, y + h, [[0, '#e8bb8c'], [1, '#c08856']])); g.restore();
    S.wood(g, x, y, w, h, seed);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 28, y + 1, w - 56, 2); g.fillStyle = 'rgba(90,50,20,0.28)'; g.fillRect(x + 28, y + 3, w - 56, 3);
  };
  desk(dx0, dy0, W - dx0 + 80, H - dy0 + 80, 3);
  // laptop and sticky notes on the right desk
  const lx = W - p.w * 0.7, ly = dy0 + p.w * 0.45; g.save(); g.translate(lx, ly); g.rotate(-0.12);
  g.fillStyle = 'rgba(12,18,64,0.28)'; g.beginPath(); g.ellipse(p.w * 0.6, p.w * 0.82, p.w * 0.75, p.w * 0.1, 0, 0, 6.2832); g.fill();
  rr(0, 0, p.w * 1.3, p.w * 0.84, 10, lin(0, 0, 0, p.w, [[0, '#b7bdd6'], [1, '#868daf']])); g.fillStyle = 'rgba(30,38,86,0.45)'; for (let i = 0; i < 5; i++) for (let j = 0; j < 14; j++) g.fillRect(p.w * (0.08 + j * 0.085), p.w * (0.1 + i * 0.1), p.w * 0.06, p.w * 0.06); g.restore();
  const nx = p.x + p.w * 1.2, ny = p.y - p.w * 0.1; g.save(); g.translate(nx, ny); g.rotate(0.08); g.fillStyle = 'rgba(20,26,70,0.25)'; g.fillRect(4, p.w * 0.38, p.w * 0.5, 6); rr(0, 0, p.w * 0.5, p.w * 0.4, 3, '#f7e07c'); rr(p.w * 0.03, -p.w * 0.07, p.w * 0.5, p.w * 0.4, 3, '#fff1a0'); g.restore();
  // left desk with books, a mug and a pencil cup
  const lbW = Math.max(250, sw * 0.22), lby = H - Math.max(130, sh * 0.23);
  desk(-30, lby, lbW, H - lby + 60, 7);
  const bk = (x, y, w, h, c) => { rr(x, y, w, h, 3, c); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(x + 6, y + h * 0.32, w - 12, 3); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + h - 4, w, 4); };
  bk(14, lby - 20, 150, 22, '#d4705a'); bk(24, lby - 42, 136, 22, '#35508f'); bk(12, lby - 64, 144, 22, '#2d7c76');
  const mx = 214, my = lby - 34; g.fillStyle = 'rgba(14,20,70,0.3)'; g.beginPath(); g.ellipse(mx + 6, my + 44, 38, 11, 0, 0, 6.2832); g.fill();
  rr(mx - 32, my - 16, 64, 58, 10, lin(mx - 32, 0, mx + 32, 0, [[0, '#ffffff'], [1, '#d5d9ec']])); g.strokeStyle = '#f2f4ff'; g.lineWidth = 9; g.beginPath(); g.arc(mx + 34, my + 14, 15, -1.3, 1.3); g.stroke(); g.fillStyle = '#6f4a36'; g.beginPath(); g.ellipse(mx, my - 14, 32, 9, 0, 0, 6.2832); g.fill();
  g.fillStyle = '#e9efff'; g.fillRect(lbW - 110, lby - 14, 70, 14); g.fillStyle = '#f7e07c'; g.fillRect(lbW - 100, lby - 20, 54, 8);
}
