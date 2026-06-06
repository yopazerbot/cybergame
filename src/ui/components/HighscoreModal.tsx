import { useEffect, useRef } from 'react';
import { useStore } from '../useStore';
import { Scoreboard } from './Scoreboard';
import { useFocusTrap } from '../useFocusTrap';

// In-game leaderboard popup, opened from the HUD. Shows the current campaign's
// solo + guided boards. Click the backdrop or press Esc to close.
export function HighscoreModal({ onClose }: { onClose: () => void }) {
  const state = useStore();
  const cardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(cardRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay center scroll" onClick={onClose}>
      <div
        className="card highscore-modal"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="High scores"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="net-close" onClick={onClose} aria-label="Close high scores">
          ✕
        </button>
        <h3 className="section-title">
          🏆 {state.mode === 'attacker' ? 'Attacker' : 'Defender'} leaderboards
        </h3>
        <div className="board-split">
          <div className="board-col">
            <h4>🎯 Solo · no hints</h4>
            <Scoreboard rec="without" campaign={state.mode} limit={10} />
          </div>
          <div className="board-col">
            <h4>🤝 Guided · recommendations</h4>
            <Scoreboard rec="with" campaign={state.mode} limit={10} />
          </div>
        </div>
      </div>
    </div>
  );
}
