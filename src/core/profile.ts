import type { Difficulty } from './types';

// Local player profile (handle + chosen difficulty), persisted in localStorage.

const NAME_KEY = 'breach.name';
const DIFF_KEY = 'breach.difficulty';
const ACH_KEY = 'breach.achievements';

export function getUsername(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setUsername(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 24));
  } catch {
    /* ignore */
  }
}

export function getDifficulty(): Difficulty {
  try {
    const d = localStorage.getItem(DIFF_KEY);
    return d === 'easy' || d === 'hard' ? d : 'normal';
  } catch {
    return 'normal';
  }
}

export function setDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem(DIFF_KEY, d);
  } catch {
    /* ignore */
  }
}

/** Achievement ids unlocked across all past runs. */
export function getUnlockedAchievements(): string[] {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Persist newly-earned achievements; returns the ids that were NEW this call. */
export function unlockAchievements(ids: string[]): string[] {
  try {
    const have = new Set(getUnlockedAchievements());
    const fresh = ids.filter((id) => !have.has(id));
    if (fresh.length) {
      localStorage.setItem(ACH_KEY, JSON.stringify([...have, ...fresh]));
    }
    return fresh;
  } catch {
    return [];
  }
}
