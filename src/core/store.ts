import type { GameState } from './types';
import { DEADLINE_HOURS } from './config';
import { eventBus } from './eventBus';
import { buildObjectives } from '../scenario/objectives';

// Tiny observable store — the single source of truth.
// Phaser and React both read via getState() and subscribe via subscribe().

function initialState(): GameState {
  return {
    gamePhase: 'start',
    phase: 'detection',
    clock: { hoursElapsed: 0, deadlineHours: DEADLINE_HOURS },
    meters: { reputation: 70, compliance: 60, cost: 10 },
    score: 0,
    flags: {},
    resolvedNodes: [],
    activeDialogue: null,
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

  reset(): void {
    this.state = initialState();
    this.state.objectives = buildObjectives(this.state);
    this.listeners.forEach((l) => l(this.state));
    eventBus.emit('stateChanged', undefined);
  }
}

export const store = new Store();
