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
 * Difficulty presets. Difficulty does NOT change the clock — every run gets the
 * same fixed 72h GDPR window and the same passive drift. It only sets how hard
 * the scenario starts (the meters) and how many crisis injects can fire.
 */
export const DIFFICULTY = {
  easy: { label: 'Easy', maxInjects: 1, threat: 0.7, reputation: 75, compliance: 66, cost: 8, budget: 95 },
  normal: { label: 'Normal', maxInjects: 3, threat: 1.0, reputation: 70, compliance: 60, cost: 10, budget: 82 },
  hard: { label: 'Hard', maxInjects: 5, threat: 1.45, reputation: 62, compliance: 52, cost: 14, budget: 70 },
} as const;

/**
 * The clock bites: the longer the intrusion runs uncontained, the faster the
 * attacker spreads and exfiltrates. Spread/exfil speed is scaled by
 * 1 + THREAT_ESCALATION × (hoursElapsed / deadline), so dawdling is punished —
 * at the 72h deadline the attacker moves THREAT_ESCALATION× faster than at h0.
 */
export const THREAT_ESCALATION = 0.7;

/**
 * Per-run variety: starting meters are jittered ± these amounts around the
 * difficulty baseline so no two runs open from an identical position.
 */
export const METER_JITTER = { reputation: 4, compliance: 4, cost: 3 } as const;

/**
 * Baseline passive clock drift: real seconds -> game hours.
 * Most time pressure comes from choice `timeCostHours`, this is gentle ambient drift.
 */
export const HOURS_PER_REAL_SECOND = 0.35;

/**
 * Outcome score: a simple, bounded 0–100 (weights sum to 100) — half from
 * compliance/stealth, a third from reputation/loot, a fifth from the inverse of
 * cost/heat — plus a small clean-run bonus. Replaces the old unbounded points.
 */
export const SCORE = {
  compliance: 50,
  reputation: 30,
  costInv: 20,
  cleanBonus: 6,
};

/** Letter grade thresholds for the 0–100 score (first match wins, descending). */
export const GRADE_BANDS: ReadonlyArray<readonly [number, string]> = [
  [85, 'A'],
  [70, 'B'],
  [55, 'C'],
  [40, 'D'],
  [0, 'F'],
];

/** Realism constants for the tangible "consequence report" on the debrief. */
export const RECORDS_AT_RISK = 50_000; // customer PII rows in the breached table
export const DATA_VALUE_PER_RECORD = 4; // € street value per stolen record (attacker take)
export const MAX_FINE = 2_500_000; // € upper fine band for this sim's company
export const COST_EURO_PER_POINT = 5_000; // 1 cost-meter point ≈ €5k of incident spend

/** Score-model version — bumped to reset the leaderboards when scoring changed. */
export const SCORE_VERSION = 2;

/** Thresholds (amber/red) for the countdown timer UI. */
export const TIMER_AMBER_HOURS = 24;
export const TIMER_RED_HOURS = 6;
