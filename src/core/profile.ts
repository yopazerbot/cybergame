import type { Difficulty } from './types';

// Local player profile (handle + chosen difficulty), persisted in localStorage.

const NAME_KEY = 'breach.name';
const DIFF_KEY = 'breach.difficulty';

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
