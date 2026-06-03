import { store } from '../../core/store';
import { SCENARIO_INTRO } from '../../scenario/scenario';
import { STAKEHOLDERS } from '../../scenario/stakeholders';

export function StartScreen() {
  const start = () => store.setState({ ...store.getState(), gamePhase: 'playing' });

  return (
    <div className="overlay center">
      <div className="card start-card">
        <div className="badge">GDPR Incident Simulator</div>
        <h1>
          Breach<span className="accent">!</span>
        </h1>
        <p className="lead">{SCENARIO_INTRO}</p>

        <div className="roles">
          {STAKEHOLDERS.map((s) => (
            <div className="role-chip" key={s.id} title={s.blurb}>
              <span className="role-emoji">{s.emoji}</span>
              <span className="role-text">
                <strong>{s.name}</strong>
                <em>{s.title}</em>
              </span>
            </div>
          ))}
        </div>

        <div className="howto">
          <div className="howto-step">
            <span className="howto-ico">🖱️</span>
            <span>
              <strong>Click the floor</strong> to walk your avatar around the office.
            </span>
          </div>
          <div className="howto-step">
            <span className="howto-ico">💬</span>
            <span>
              Walk up to a colleague and press <kbd>Space</kbd> (or click them) to talk and decide.
            </span>
          </div>
          <div className="howto-step">
            <span className="howto-ico">✨</span>
            <span>
              <strong>Glowing rings</strong> mark who needs you next. The checklist tracks progress.
            </span>
          </div>
          <div className="howto-step">
            <span className="howto-ico">⏱️</span>
            <span>
              You have <strong>72 hours</strong> — deliberation and wrong turns burn the clock.
            </span>
          </div>
        </div>

        <button className="btn primary big" onClick={start}>
          ▶ Start the incident
        </button>
      </div>
    </div>
  );
}
