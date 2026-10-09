# Paper Toss

Pick up a sheet of paper, crush it in your fist and toss it into the bin. Your webcam tracks your hand (MediaPipe Hand Landmarker), all on-device.

**Play:** https://ashurana0153.github.io/paper-toss/

## How it plays
1. **Pick** – hold an open hand over the paper pile (or pinch it).
2. **Crush** – make a fist.
3. **Throw** – swing toward the bin and open your hand while the power meter is in the green "Throw here" band.

3 levels, 5 throws each. The bin moves further back every level. Hits score your current streak (1, 2, 3...), and you need 5 points to clear a level. A short practice throw sets the power meter to your arm.

No camera? Choose "Play with mouse or touch": press and hold to crush, flick and release to throw.

## Run locally
Needs a static server (camera and ES modules do not work from `file://`):

    npx serve .        # or: python3 -m http.server

## Structure
- `js/hands.js` camera + MediaPipe tracking, One Euro smoothing, mouse fallback
- `js/gestures.js` pick / crush / release state machine and swing speed
- `js/power.js` speed → power → landing distance
- `js/game.js` levels, throw physics, scoring
- `js/scene.js`, `js/paper.js` canvas office scene and paper drawing
- `js/ui.js`, `js/demos.js`, `style.css` liquid-glass UI and how-to animations
- `js/audio.js` synthesized sounds (no asset files)

Inspired by the interaction design of shaivybhatia-afk/paper-throw; this is an independent implementation.
