import { useStore } from '../useStore';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { GDPR_DEBRIEF } from '../../scenario/debrief';

export function DebriefScreen() {
  const state = useStore();
  const ending = state.ending;
  if (!ending) return null;

  const playAgain = () => {
    store.reset();
    eventBus.emit('restart', undefined);
  };

  return (
    <div className="overlay center scroll">
      <div className="card debrief">
        <div className={`ending-banner ${ending.tone}`}>
          <div className="ending-kicker">Incident closed</div>
          <h2>{ending.title}</h2>
          <p>{ending.flavor}</p>
        </div>

        <div className="debrief-score">
          <div className="big-score">
            <span>Final score</span>
            <strong>{state.score}</strong>
          </div>
          <div className="score-meters">
            <span>⚖️ Compliance {Math.round(state.meters.compliance)}</span>
            <span>💬 Reputation {Math.round(state.meters.reputation)}</span>
            <span>💸 Cost {Math.round(state.meters.cost)}</span>
            <span>
              ⏱️ {Math.max(0, Math.round(state.clock.deadlineHours - state.clock.hoursElapsed))}h
              left
            </span>
          </div>
        </div>

        <h3 className="debrief-title">What good GDPR incident response looks like</h3>
        <div className="debrief-list">
          {GDPR_DEBRIEF.map((item) => (
            <div className="debrief-item" key={item.heading}>
              <h4>{item.heading}</h4>
              <p>{item.body}</p>
            </div>
          ))}
        </div>

        <p className="disclaimer">
          Educational simulation — a simplified model of GDPR Articles 33 & 34, not legal advice.
        </p>

        <button className="btn primary big" onClick={playAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
