import { BONES } from './hands.js';

const $ = (id) => document.getElementById(id);
const HOLD_SECONDS = 1.8;

export const UI = {
  $,
  screen: 'landing',
  show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    this.screen = id;
  },

  // ---------- HUD ----------
  bump(el, text) {
    if (el.textContent === String(text)) return;
    el.textContent = text;
    const box = el.closest('.stat'); if (!box) return;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  },
  hud(s) {
    $('hLevel').textContent = s.level; $('hLevels').textContent = s.levels;
    this.bump($('hScore'), s.total); this.bump($('hStreak'), s.streak); $('hStreakBox').classList.toggle('hot', s.streak >= 2);
    $('hLevelScore').textContent = s.levelScore; $('hGoal').textContent = s.goal;
    $('hThrowText').textContent = `Throw ${s.throwNum} of ${s.throws}`;
    $('hDots').innerHTML = Array.from({ length: s.throws }, (_, i) => `<i class="${i < s.results.length ? (s.results[i] ? 'hit' : 'miss') : i === s.idx ? 'now' : ''}"></i>`).join('');
  },
  toast(text, kind = '') {
    const t = $('hToast'); t.className = 'toast'; void t.offsetWidth;
    t.textContent = text; t.className = `toast show ${kind}`;
  },
  prompt(text) { const p = $('hPrompt'); if (p.textContent !== text) p.textContent = text; },
  pickHint(x, y) { const h = $('hPick'); if (x == null) { h.hidden = true; return; } h.hidden = false; h.style.left = `${x}px`; h.style.top = `${y}px`; },
  meter(p, live) {
    const m = $('hMeter');
    m.style.height = p <= 0.005 ? '0px' : `max(24px, calc((100% - 10px) * ${Math.min(1, p).toFixed(3)}))`;
    m.classList.toggle('live', !!live);
  },
  zone(lo, hi) {
    const z = $('hZone'), l = $('hZoneLabel');
    if (lo == null) { z.hidden = true; l.hidden = true; return; }
    z.hidden = false; l.hidden = false;
    z.style.bottom = `calc(5px + (100% - 10px) * ${lo})`; z.style.height = `calc((100% - 10px) * ${hi - lo})`;
    l.style.bottom = `calc(5px + (100% - 10px) * ${(lo + hi) / 2})`;
  },
  wind(w, max) {
    const el = $('hWind'); if (w == null) { el.hidden = true; return; }
    el.hidden = false; const a = Math.abs(w) / max;
    $('hWindText').textContent = (a < 0.02 ? 'Calm, no wind' : a < 0.5 ? 'Light breeze' : 'Strong breeze') + (a < 0.02 ? '' : w > 0 ? ', blowing right' : ', blowing left');
    const arrow = el.querySelector('svg'); arrow.style.opacity = a < 0.02 ? 0 : 1; arrow.style.transform = `scaleX(${w < 0 ? -1 : 1}) scale(${0.7 + 0.5 * a})`;
  },

  // ---------- hold an open hand to press the main button ----------
  hold: { id: null, t: 0 },
  holdButtons(open, dt) {
    const id = this.screen === 'levelEnd' ? 'lePrimary' : this.screen === 'final' ? 'btnAgain' : null;
    if (id !== this.hold.id) { if (this.hold.id) $(this.hold.id).style.setProperty('--hold', 0); this.hold = { id, t: 0 }; }
    if (!id) return;
    this.hold.t = open ? this.hold.t + dt : Math.max(0, this.hold.t - dt * 2);
    $(id).style.setProperty('--hold', Math.min(1, this.hold.t / HOLD_SECONDS));
    if (this.hold.t > HOLD_SECONDS) { this.hold.t = 0; $(id).style.setProperty('--hold', 0); $(id).click(); }
  },

  // ---------- camera preview ----------
  pip: { docked: false, slot: null },
  showPip(on) { const p = $('pip'); p.hidden = false; p.classList.toggle('away', !on); },
  dock(slot) { this.pip.docked = !!slot; this.pip.slot = slot; const p = $('pip'); p.classList.toggle('docked', !!slot); if (!slot) { p.style.left = p.style.top = p.style.width = p.style.bottom = ''; } },
  placePip() {
    if (!this.pip.docked) return; const r = this.pip.slot.getBoundingClientRect(), p = $('pip');
    Object.assign(p.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, bottom: 'auto' });
  },
  drawPip(hand, video) {
    const cv = $('pipHands'), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    if (cv.width !== w) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'); c.clearRect(0, 0, w, h);
    if (!hand || !hand.raw || !video.videoWidth) return;
    const sc = w / video.videoWidth, off = (video.videoHeight * sc - h) / 2, lm = hand.raw;
    const X = (i) => lm[i].x * video.videoWidth * sc, Y = (i) => lm[i].y * video.videoHeight * sc - off;
    c.strokeStyle = 'rgba(255,255,255,0.88)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
    BONES.forEach(([a, b]) => { c.moveTo(X(a), Y(a)); c.lineTo(X(b), Y(b)); }); c.stroke();
    [4, 8, 12, 16, 20].forEach((i) => { c.beginPath(); c.arc(X(i), Y(i), 3, 0, 6.28); c.fillStyle = hand.closure > 0.55 ? 'rgb(125,180,255)' : '#fff'; c.fill(); });
  },
};
