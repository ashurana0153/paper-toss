// Tuning values. Edit here to change how the game feels.
export const CONFIG = {
  // hand shape (distances are in "hand sizes": wrist to middle knuckle = 1)
  pinchOn: 0.3, pinchOff: 0.5,
  fingersOpen: 1.15, fingersClosed: 0.45,
  gripClosure: 0.5,      // closure needed to hold the ball
  crushTrigger: 0.4,     // fist closure that starts the crumple
  crumpleSeconds: 0.8,
  pickDwell: 0.45,       // seconds an open hand must rest on the pile
  releaseClosure: 0.35,  // opening past this lets go of the ball
  bufferFrames: 10,
  peakWindowMs: 200,
  dropoutFrames: [2, 4], // tracker losing the hand this long during a fast swing counts as a release
  // throw power
  powerFloor: 0.18, powerCeil: 1.05, powerCurve: 1.4,
  bands: [0.36, 0.66],
  defaultMaxPower: 14,   // hand sizes per second, used when practice is skipped
  minMaxPower: 6,
  // rules
  throwsPerLevel: 5,
  goalPerLevel: 5,       // points needed to clear a level (a hit scores the current streak)
  zone: 0.2,             // green band half width on the power meter
  assist: 1.47,          // metres: landings this close to the bin get pulled in
  wind: false,           // set true to switch on sideways wind
};

export const LEVELS = [
  { z: 1.9, power: 0.45, wind: 0.22 },
  { z: 3.0, power: 0.6, wind: 0.4 },
  { z: 4.1, power: 0.75, wind: 0.55 },
];

export const WORLD = {
  eye: 1.2,        // camera height (m)
  plane: 0.6,      // distance from camera to the throwing plane (m)
  binX: -0.3,      // bin sideways position (m)
  binR: 0.45,      // bin mouth radius (m)
  rimY: 0.58,      // bin rim height (m)
  ballR: 0.1,
  g: 4,
  arcVy: 2.4,
  horizon: 0.42,   // horizon as a fraction of stage height
};

export const BAND_NAMES = ['Soft', 'Medium', 'Hard'];
