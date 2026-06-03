import type { GameState, Difficulty } from './types';
import { DIFFICULTY, DEADLINE_HOURS } from './config';
import { eventBus } from './eventBus';
import { buildObjectives } from '../scenario/objectives';
import { initialNetwork } from '../scenario/network';

// Tiny observable store — the single source of truth.
// Phaser and React both read via getState() and subscribe via subscribe().

function initialState(difficulty: Difficulty = 'normal', recommendations = true): GameState {
  const d = DIFFICULTY[difficulty];
  return {
    gamePhase: 'start',
    difficulty,
    recommendations,
    phase: 'detection',
    clock: { hoursElapsed: 0, deadlineHours: DEADLINE_HOURS },
    meters: { reputation: d.reputation, compliance: d.compliance, cost: d.cost },
    score: 0,
    flags: {},
    resolvedNodes: [],
    activeDialogue: null,
    activeInject: null,
    firedInjects: [],
    network: initialNetwork(),
    objectives: [],
    npcInRange: null,
    ending: null,
  };
}

type Listener = (state: GameState) => void;

class Store {
  private state: GameState = initialState();
  private listeners = new Set<Listener>();

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Replace state (shallow) and notify both React (listeners) and the world (eventBus). */
  setState(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch };
    this.state.objectives = buildObjectives(this.state);
    this.listeners.forEach((l) => l(this.state));
    eventBus.emit('stateChanged', undefined);
  }

  /** Begin a fresh run at the chosen difficulty. */
  startGame(difficulty: Difficulty, recommendations = true): void {
    this.state = initialState(difficulty, recommendations);
    this.state.gamePhase = 'playing';
    this.state.objectives = buildObjectives(this.state);
    this.listeners.forEach((l) => l(this.state));
    eventBus.emit('stateChanged', undefined);
  }

  reset(): void {
    this.state = initialState(this.state.difficulty, this.state.recommendations);
    this.state.objectives = buildObjectives(this.state);
    this.listeners.forEach((l) => l(this.state));
    eventBus.emit('stateChanged', undefined);
  }
}

export const store = new Store();
