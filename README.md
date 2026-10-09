# Paper Toss

Hand-tracked paper toss game. Pick up a sheet, crumple it, swing, release into the bin.

## Run it
The camera only works over https or localhost.
- **Local:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000
- **GitHub Pages:** push these files to a repo, enable Pages on the main branch, open the link.

Hand tracking loads MediaPipe from jsDelivr and its model from Google storage, so it needs internet on first load.
"Mouse or touch" mode works with no camera.

## Controls
1. Open hand over the paper pile until the ring fills
2. Fist to crumple
3. Swing toward the bin, open your hand when the power bar is in the green band
4. Wind: ribbons on the ceiling vent show it. Swing slightly against it.

Mouse/touch: hover the pile, hold to crumple, flick, let go.

## Files
- `physics.js` ball flight, rim and bin collisions, power window per distance
- `render.js` office scene, bin, paper, desk (canvas)
- `input.js` MediaPipe hand source and mouse source
- `ui.js` HUD, toasts, cards, sounds
- `game.js` levels, scoring, gesture state machine

## Tuning
- `game.js`: `LEVELS` (wind, distance, bin offset), `NEED` baskets per level, `DEFAULT_VMAX` swing speed used when practice is skipped
- `physics.js`: `TUNE` launch constants
