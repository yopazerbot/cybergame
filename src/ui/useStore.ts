import { useSyncExternalStore } from 'react';
import { store } from '../core/store';
import type { GameState } from '../core/types';

// React binding for the central store.
export function useStore(): GameState {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState(),
  );
}
