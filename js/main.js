import { CONFIG, LEVELS } from './config.js';
import { Hands } from './hands.js';
import { Stage } from './scene.js';
import { Game } from './game.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { drawDemos } from './demos.js';

const $ = UI.$;
const store = {
  get(k) { try { return localStorage.getItem(`paperToss.${k}`); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(`paperToss.${k}`, String(v)); } catch (e) {} },
};
const stage = new Stage($('stage')), audio = new Sound(), hands = new Hands();
let calMax = +store.get('calMax') || null, best = +store.get('best') || 0, returnToGame = false, calib = { peak: 0, done: false };
const MOUSE_MAX = 26; // hand sizes per second that a firm mouse flick reaches

const game = new Game(stage, {
  hud: (s) => UI.hud(s), toast: (t, k) => UI.toast(t, k), prompt: (t) => UI.prompt(t), pickHint: (x, y) => UI.pickHint(x, y),
  meter: (p, l) => UI.meter(p, l), zone: (a, b) => UI.zone(a, b), wind: (w, m) => UI.wind(w, m),
  levelEnd, calibRelease,
}, audio);
hands.onFrame = (hand, t) => game.gestures.update(hand, t);
const syncMode = () => { game.pointer = hands.mode === 'mouse'; };

// ---------- screens ----------
function celebrate() {
  audio.applause();
  if (!window.confetti || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = window.confetti, o = { disableForReducedMotion: true, zIndex: 100 };
  c({ ...o, particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.9 } }); c({ ...o, particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.9 } });
  setTimeout(() => c({ ...o, particleCount: 140, spread: 100, origin: { y: 0.65 } }), 280);
  setTimeout(() => { c({ ...o, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.9 } }); c({ ...o, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.9 } }); }, 600);
}
function playing() {
  syncMode(); UI.dock(null); returnToGame = false;
  UI.show('hud'); game.startGame(calMax || (hands.mode === 'mouse' ? MOUSE_MAX : CONFIG.defaultMaxPower));
}
function levelEnd(info) {
  if (info.cleared && info.last) { finish(info.total, true); return; }
  const n = info.level + 1, again = $('lePrimary');
  if (info.cleared) {
    $('leTitle').textContent = `Level ${n} cleared`;
    $('leText').textContent = `You scored ${info.levelScore} points this level. The bin is moving further back.`;
    again.textContent = `Start level ${n + 1}`; again.onclick = () => { UI.show('hud'); game.startLevel(info.level + 1); };
    celebrate();
  } else {
    $('leTitle').textContent = 'Not quite';
    $('leText').textContent = `You scored ${info.levelScore} of ${CONFIG.goalPerLevel} points. Hit with a streak to score more.`;
    again.textContent = 'Try this level again'; again.onclick = () => { UI.show('hud'); game.retryLevel(); };
  }
  $('leSecondary').onclick = () => finish(info.total, false);
  UI.show('levelEnd');
}
function finish(total, allClear) {
  const prev = best; best = Math.max(best, total); store.set('best', best);
  $('fScore').textContent = total;
  $('fText').textContent = `${allClear ? `You cleared all ${LEVELS.length} bins. ` : ''}${total >= prev && total > 0 ? 'That is your best so far.' : `Your best is ${best}.`}`;
  game.stopAll(); game.mode = 'menu'; $('btnRecal').hidden = hands.mode !== 'camera'; UI.show('final'); if (allClear) celebrate();
}

// ---------- camera setup ----------
const ERRORS = {
  NotAllowedError: 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.',
  PermissionDeniedError: 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.',
  NotFoundError: 'No camera was found on this device.',
  DevicesNotFoundError: 'No camera was found on this device.',
  NotReadableError: 'Another app is using the camera. Close it and try again.',
  TrackStartError: 'Another app is using the camera. Close it and try again.',
  NoApi: 'This browser cannot reach the camera here. Open the page over https in a recent Chrome, Edge, Safari or Firefox.',
  TrackerFailed: 'The hand tracker could not load. Check your connection and try again.',
};
async function setupCamera() {
  const b = $('btnContinue'); b.disabled = true; b.textContent = 'Getting the camera ready...';
  try {
    if (hands.mode !== 'camera') await hands.startCamera($('cam'));
    UI.showPip(true); b.disabled = false; b.textContent = returnToGame ? 'Back to game' : 'Continue';
  } catch (e) {
    $('errorText').textContent = ERRORS[e && e.name] || 'Something went wrong while starting the camera.';
    UI.show('error');
  }
}
function useMouse() { hands.stop(); hands.startMouse(); UI.dock(null); $('pip').hidden = true; audio.unlock(); playing(); }

$('btnStart').onclick = () => { audio.unlock(); UI.show('instructions'); setupCamera(); };
$('btnMouse').onclick = useMouse; $('btnErrMouse').onclick = useMouse;
$('btnRetryCam').onclick = () => { UI.show('instructions'); setupCamera(); };
$('btnContinue').onclick = () => { audio.unlock(); if (returnToGame) { returnToGame = false; UI.show('hud'); game.gestures.enable(game.phase === 'ready' || game.phase === 'inhand'); return; } showCalibIntro(); };
$('btnHowTo').onclick = () => {
  returnToGame = true; game.gestures.enable(false); UI.show('instructions');
  $('btnContinue').disabled = false; $('btnContinue').textContent = 'Back to game';
};

// ---------- practice throw ----------
function showCalibIntro() { game.stopAll(); UI.dock(null); $('calibIntro').hidden = false; $('calibRun').hidden = true; UI.show('calib'); }
function resetCalibUI() {
  calib = { peak: 0, done: false }; $('calibText').textContent = 'Your hand shows in the box once the camera sees it.';
  $('calibFill').style.width = '0%'; $('calibValue').textContent = '0.0'; $('calibButtons').hidden = true;
}
$('btnCalibGo').onclick = () => { $('calibIntro').hidden = true; $('calibRun').hidden = false; resetCalibUI(); requestAnimationFrame(() => { UI.dock($('calibCam')); UI.placePip(); }); game.startCalib(); };
$('btnCalibBack').onclick = showCalibIntro;
$('btnCalibRetry').onclick = () => { resetCalibUI(); game.calibRetry(); };
$('btnPlay').onclick = playing;
$('btnSkipCalib').onclick = playing;
$('btnRecal').onclick = () => { game.stopAll(); showCalibIntro(); };
function calibRelease(m) {
  calib.done = true; $('calibFill').style.width = `${Math.min(100, (m.raw / 30) * 100)}%`; $('calibValue').textContent = m.raw.toFixed(1);
  if (m.raw < 3) {
    $('calibText').textContent = 'That one was very gentle. Make a fist and give it a proper flick.';
    setTimeout(() => { calib = { peak: 0, done: false }; game.calibRetry(); }, 900); return;
  }
  calMax = Math.max(CONFIG.minMaxPower, m.raw); store.set('calMax', calMax);
  $('calibText').textContent = m.dropout
    ? 'Nice and fast. Your hand moved so quickly the camera lost it for a moment, which we count as a release.'
    : 'Got it. This is now your hardest throw. Soft, medium and hard throws are measured against it.';
  $('calibButtons').hidden = false;
}

// ---------- share ----------
$('btnShare').onclick = async () => {
  const text = `I scored ${$('fScore').textContent} in Paper Toss, a game where you crush and toss paper with your bare hand. Can you beat it?`, url = location.href.split('?')[0];
  try { if (navigator.share) await navigator.share({ text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); $('btnShare').textContent = 'Copied'; } } catch (e) {}
};
$('btnAgain').onclick = () => { UI.show('hud'); game.startGame(calMax || (hands.mode === 'mouse' ? MOUSE_MAX : CONFIG.defaultMaxPower)); };

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  hands.step(now, stage.W, stage.H);
  const hand = hands.latest;
  game.frame(dt, now, hand);
  game.render(now);
  UI.holdButtons(hands.mode === 'camera' && !!hand && hand.closure < 0.12, dt);
  if (UI.screen === 'instructions') drawDemos(now);
  if (hands.mode === 'camera') {
    UI.placePip(); UI.drawPip(hand, $('cam'));
    if (UI.screen === 'calib' && game.mode === 'calibrate' && !calib.done) {
      const g = game.gestures;
      if (g.state === 'ball' && g.armed) {
        calib.peak = Math.max(g.liveSpeed, calib.peak * 0.97);
        $('calibValue').textContent = calib.peak.toFixed(1); $('calibFill').style.width = `${Math.min(100, (calib.peak / 30) * 100)}%`;
      }
    }
  }
  requestAnimationFrame(loop);
}
addEventListener('resize', () => { stage.resize(); });
requestAnimationFrame(loop);
