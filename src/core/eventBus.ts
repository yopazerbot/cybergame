import type { Role } from './types';

// Typed pub/sub used to communicate between the Phaser world and the React UI.
// Neither side imports the other; they only emit/listen to these events.

export interface EventMap {
  /** Player avatar finished walking to a tile. */
  playerArrived: { gx: number; gy: number };
  /** The NPC the player is adjacent to changed (null = none). */
  npcInRange: { npcId: Role | null };
  /** UI/world asks to open dialogue with an NPC. */
  requestDialogue: { npcId: Role };
  /** Central store changed — world re-evaluates indicators, locks, etc. */
  stateChanged: void;
  /** Restart requested from the debrief screen. */
  restart: void;
  /** Transient on-screen toast (meter changes, phase changes). */
  notify: { text: string; tone: 'good' | 'bad' | 'info' };
  /** Replay the onboarding tutorial. */
  startTutorial: void;
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class EventBus {
  private handlers: { [K in keyof EventMap]?: Set<Handler<K>> } = {};

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    (this.handlers[event] ??= new Set() as any).add(handler as any);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    this.handlers[event]?.delete(handler as any);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.handlers[event]?.forEach((h) => (h as Handler<K>)(payload));
  }
}

export const eventBus = new EventBus();
