import type { GameState } from '../core/types';

// End-of-run achievements, derived purely from the final state. Unlocks are also
// persisted across sessions (see core/profile).

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  earned: (s: GameState) => boolean;
}

const hoursLeft = (s: GameState) => s.clock.deadlineHours - s.clock.hoursElapsed;
const isClean = (s: GameState) => !s.flags.coverup && !s.flags.notifyRefused;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'textbook',
    icon: '🏆',
    title: 'Textbook Response',
    desc: 'Finish with the Exemplary ending.',
    earned: (s) => s.ending?.id === 'exemplary',
  },
  {
    id: 'by_the_book',
    icon: '📕',
    title: 'By the Book',
    desc: 'Contain, scope and consult the DPO before notifying — no cover-up.',
    earned: (s) =>
      !!s.flags.breachContained &&
      !!s.flags.scopeKnown &&
      !!s.flags.dpoConsulted &&
      !!s.flags.regulatorNotified &&
      !s.flags.coverup,
  },
  {
    id: 'speedrun',
    icon: '⚡',
    title: 'Ahead of the Clock',
    desc: 'Notify the supervisory authority with 24h+ to spare.',
    earned: (s) => !!s.flags.regulatorNotified && hoursLeft(s) >= 24,
  },
  {
    id: 'frugal',
    icon: '💰',
    title: 'Frugal Commander',
    desc: 'Resolve the incident keeping Cost at 30 or below.',
    earned: (s) => s.gamePhase === 'ended' && s.meters.cost <= 30 && isClean(s),
  },
  {
    id: 'cool_head',
    icon: '🧯',
    title: 'Cool Head',
    desc: 'Handle the press honestly and refuse the ransom.',
    earned: (s) => !!s.flags.pressHandled && !!s.flags.ransomRefused,
  },
  {
    id: 'customer_first',
    icon: '🤝',
    title: 'Customers First',
    desc: 'Communicate the breach to affected customers.',
    earned: (s) => !!s.flags.customerNotified,
  },
  {
    id: 'full_house',
    icon: '🌟',
    title: 'Full House',
    desc: 'Complete every objective on the checklist.',
    earned: (s) => s.objectives.length > 0 && s.objectives.every((o) => o.done),
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function earnedAchievements(state: GameState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.earned(state));
}
