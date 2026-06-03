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

// Attacker-campaign achievements (meters: Stealth/Loot/Heat).
export const ATTACKER_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ghost',
    icon: '👻',
    title: 'Ghost in the Machine',
    desc: 'Pull off the clean-getaway (Ghost) ending.',
    earned: (s) => s.ending?.id === 'ghost',
  },
  {
    id: 'no_alarms',
    icon: '🔕',
    title: 'No Alarms',
    desc: 'Exfiltrate the data while keeping Heat at 25 or below.',
    earned: (s) => !!s.flags.dataExfiltrated && s.meters.cost <= 25,
  },
  {
    id: 'big_score',
    icon: '💰',
    title: 'Big Score',
    desc: 'Get the data out with Loot at 80 or above.',
    earned: (s) => !!s.flags.dataExfiltrated && s.meters.reputation >= 80,
  },
  {
    id: 'silent_op',
    icon: '🤫',
    title: 'Silent Operator',
    desc: 'Complete the heist without ever going loud.',
    earned: (s) => !!s.flags.dataExfiltrated && !s.flags.loud,
  },
  {
    id: 'clean_exit',
    icon: '🧹',
    title: 'Clean Exit',
    desc: 'Cover your tracks and avoid being caught.',
    earned: (s) => !!s.flags.tracksCovered && !s.flags.gotCaught,
  },
  {
    id: 'full_chain',
    icon: '🔗',
    title: 'Full Kill Chain',
    desc: 'Complete every objective on the checklist.',
    earned: (s) => s.objectives.length > 0 && s.objectives.every((o) => o.done),
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  [...ACHIEVEMENTS, ...ATTACKER_ACHIEVEMENTS].map((a) => [a.id, a]),
);

export function earnedAchievements(state: GameState): Achievement[] {
  const pool = state.mode === 'attacker' ? ATTACKER_ACHIEVEMENTS : ACHIEVEMENTS;
  return pool.filter((a) => a.earned(state));
}

/** Total achievements available in the active campaign (for the "x/N" count). */
export function achievementCount(state: GameState): number {
  return (state.mode === 'attacker' ? ATTACKER_ACHIEVEMENTS : ACHIEVEMENTS).length;
}
