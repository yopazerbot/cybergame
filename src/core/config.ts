// Central tunables. Adjust here to rebalance the game.

export const TILE_W = 64;
export const TILE_H = 32;

/**
 * Texture supersampling factor. Every procedural texture is generated at
 * ART_SCALE× its logical size and displayed at 1/ART_SCALE, so the camera's
 * fit-zoom (up to 2.0×) no longer blurs the art. 3 leaves headroom over max
 * zoom; drop to 2 if a device shows texture-memory pressure.
 */
export const ART_SCALE = 3;
export const ART_INV = 1 / ART_SCALE;

/** Top-down square tile size (px). */
export const TILE = 48;

/** Office floor grid size (square). */
export const GRID_SIZE = 12;

/** GDPR Art. 33 notification window. */
export const DEADLINE_HOURS = 72;

/**
 * Difficulty presets. `deadlineHours` is the clock budget, `drift` is ambient
 * game-hours per real second, and the meters set the starting position.
 */
export const DIFFICULTY = {
  easy: { label: 'Easy', deadlineHours: 96, drift: 0.25, reputation: 75, compliance: 66, cost: 8 },
  normal: { label: 'Normal', deadlineHours: 72, drift: 0.35, reputation: 70, compliance: 60, cost: 10 },
  hard: { label: 'Hard', deadlineHours: 54, drift: 0.5, reputation: 62, compliance: 52, cost: 14 },
} as const;

/**
 * Baseline passive clock drift: real seconds -> game hours.
 * Most time pressure comes from choice `timeCostHours`, this is gentle ambient drift.
 */
export const HOURS_PER_REAL_SECOND = 0.35;

/** Scoring weights. Compliance dominates so GDPR-correct play wins. */
export const SCORE_WEIGHTS = {
  compliance: 1.4,
  reputation: 1.0,
  cost: 0.8, // subtracted
  timeRemaining: 0.4, // per remaining hour fraction
  orderBonus: 60, // awarded for the ideal sequence
};

/** Thresholds (amber/red) for the countdown timer UI. */
export const TIMER_AMBER_HOURS = 24;
export const TIMER_RED_HOURS = 6;
