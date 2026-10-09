// Optional Spotify player. The official embed is created on the first open, then kept alive (just hidden)
// so the music carries on while you play. Browsers need a click inside the player before audio starts.
const PLAYLIST = '37i9dQZF1DX0khTY3HFA4M'; // Spotify's "Chill Instrumental Beats"
const root = document.getElementById('music'), btn = document.getElementById('btnMusic'), panel = document.getElementById('musicPanel');
const frame = document.getElementById('musicFrame'), close = document.getElementById('musicClose');
let built = false;

function build() {
  if (built) return; built = true;
  const f = document.createElement('iframe');
  f.title = 'Spotify player'; f.loading = 'lazy'; f.height = '152';
  f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  f.src = `https://open.spotify.com/embed/playlist/${PLAYLIST}?utm_source=generator&theme=0`;
  frame.appendChild(f);
}
function toggle(open) {
  const on = open === undefined ? panel.hidden : open;
  if (on) build();
  panel.hidden = !on; btn.setAttribute('aria-expanded', String(on)); btn.classList.toggle('on', on);
}
btn.addEventListener('click', () => toggle());
close.addEventListener('click', () => toggle(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
// In mouse mode the game listens for presses on the whole window; keep clicks on the player out of it.
['pointerdown', 'pointerup'].forEach((t) => root.addEventListener(t, (e) => e.stopPropagation()));
