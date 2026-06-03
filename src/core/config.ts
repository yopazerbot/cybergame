// Central tunables. Adjust here to rebalance the game.

export const TILE_W = 64;
export const TILE_H = 32;

/** Top-down square tile size (px). */
export const TILE = 48;

/** Office floor grid size (square). */
export const GRID_SIZE = 12;

/** GDPR Art. 33 notification window. */
export const DEADLINE_HOURS = 72;

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
