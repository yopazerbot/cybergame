import type { Difficulty, Mode } from './types';

// Thin client for the cross-session scoreboard API. All calls fail soft so the
// game still works fully offline / without the backend.

/** Whether to filter the board to the guided ('with') or solo ('without') runs. */
export type RecBucket = 'with' | 'without';

export interface ScoreEntry {
  name: string;
  score: number; // 0–100 outcome score
  grade: string; // A–F
  /** The defining real-world figure for this run (e.g. "€420,000" fine / take). */
  headline: string;
  /** Which campaign this run was — boards are kept separate per side. */
  campaign: Mode;
  ending: string;
  difficulty: Difficulty;
  hoursLeft: number;
  compliance: number;
  reputation: number;
  /** Whether this run had in-dialog recommendations enabled. */
  recommended: boolean;
  ts: number;
}

export interface FetchOpts {
  rec?: RecBucket;
  campaign?: Mode;
}

export async function fetchScores(opts: FetchOpts = {}): Promise<ScoreEntry[]> {
  try {
    const q = new URLSearchParams();
    if (opts.rec) q.set('rec', opts.rec);
    if (opts.campaign) q.set('campaign', opts.campaign);
    const qs = q.toString();
    const res = await fetch(`/api/scores${qs ? `?${qs}` : ''}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.scores) ? json.scores : [];
  } catch {
    return [];
  }
}

export interface SubmitResult {
  rank: number | null;
  total: number;
  entry: ScoreEntry;
  scores: ScoreEntry[];
}

export async function submitScore(payload: Omit<ScoreEntry, 'ts'>): Promise<SubmitResult | null> {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as SubmitResult;
  } catch {
    return null;
  }
}
