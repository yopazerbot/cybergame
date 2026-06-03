import type { Difficulty } from './types';

// Thin client for the cross-session scoreboard API. All calls fail soft so the
// game still works fully offline / without the backend.

export interface ScoreEntry {
  name: string;
  score: number;
  ending: string;
  difficulty: Difficulty;
  hoursLeft: number;
  compliance: number;
  reputation: number;
  ts: number;
}

export async function fetchScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch('/api/scores');
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
