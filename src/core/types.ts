// Shared types used by both the Phaser world and the React UI.
// Keep this file framework-agnostic.

import type { NetworkState } from '../scenario/network';

export type Role = 'tech' | 'management' | 'ciso' | 'dpo' | 'regulator' | 'customer';

// Defender phases follow incident response; attacker phases follow the kill chain.
export type Phase =
  | 'detection'
  | 'containment'
  | 'assessment'
  | 'notification'
  | 'resolution'
  | 'recon'
  | 'access'
  | 'escalation'
  | 'exfiltration'
  | 'coverup';

export type GamePhase = 'start' | 'playing' | 'ended';

export type Difficulty = 'easy' | 'normal' | 'hard';

/** Which side the player runs: blue-team incident response, or red-team kill chain. */
export type Mode = 'defender' | 'attacker';

/** Meters shown in the HUD. All 0..100. `cost` is "money/effort spent" (higher = worse). */
export interface Meters {
  reputation: number;
  compliance: number;
  cost: number;
}

export interface Clock {
  /** Game-time hours elapsed since the breach was detected. */
  hoursElapsed: number;
  /** GDPR Article 33 deadline. */
  deadlineHours: number;
}

export interface Objective {
  id: string;
  label: string;
  done: boolean;
}

export type EndingId =
  | 'exemplary'
  | 'compliant_costly'
  | 'reputational_damage'
  | 'regulatory_breach'
  | 'coverup_exposed'
  // Attacker-campaign endings.
  | 'ghost'
  | 'smash_grab'
  | 'caught'
  | 'burned';

export interface Ending {
  id: EndingId;
  title: string;
  flavor: string;
  tone: 'good' | 'mixed' | 'bad';
}

export interface GameState {
  gamePhase: GamePhase;
  difficulty: Difficulty;
  /** Blue-team (defender) or red-team (attacker) campaign. */
  mode: Mode;
  /** When true, the recommended choice is highlighted in dialogs (chosen at start). */
  recommendations: boolean;
  phase: Phase;
  clock: Clock;
  meters: Meters;
  score: number;
  flags: Record<string, boolean>;
  resolvedNodes: string[];
  /** Currently open dialogue, if any (locks player movement). The panel derives the node. */
  activeDialogue: { npcId: Role } | null;
  /** A timed crisis inject currently demanding a decision (locks movement + clock). */
  activeInject: { id: string } | null;
  /** Injects that have already fired (each fires at most once). */
  firedInjects: string[];
  /** Live containment-map state (intrusion spread + exfiltration). */
  network: NetworkState;
  objectives: Objective[];
  /** NPC the player is currently standing next to (for the "Talk" prompt). */
  npcInRange: Role | null;
  ending: Ending | null;
}
