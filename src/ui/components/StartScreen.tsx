import { useState } from 'react';
import { store } from '../../core/store';
import { DIFFICULTY } from '../../core/config';
import { getDifficulty, setDifficulty } from '../../core/profile';
import type { Difficulty } from '../../core/types';
import { SCENARIO_INTRO } from '../../scenario/scenario';
import { STAKEHOLDERS } from '../../scenario/stakeholders';
import { Scoreboard } from './Scoreboard';
import { Credit } from './Credit';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

export function StartScreen() {
  const [diff, setDiff] = useState<Difficulty>(getDifficulty());

  const pick = (d: Difficulty) => {
    setDiff(d);
    setDifficulty(d);
  };
  const start = () => store.startGame(diff);

  return (
    <div className="overlay center scroll">
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
              The <strong>72-hour clock</strong> is ticking — deliberation and wrong turns burn it.
            </span>
          </div>
        </div>

        <div className="difficulty">
          <span className="difficulty-label">Difficulty</span>
          <div className="seg">
            {DIFFS.map((d) => (
              <button
                key={d}
                className={`seg-btn ${diff === d ? 'active' : ''}`}
                onClick={() => pick(d)}
              >
                {DIFFICULTY[d].label}
                <em>{DIFFICULTY[d].deadlineHours}h</em>
              </button>
            ))}
          </div>
        </div>

        <button className="btn primary big" onClick={start}>
          ▶ Start the incident
        </button>

        <div className="leaderboard-block">
          <h3>🏆 Global leaderboard</h3>
          <Scoreboard limit={8} />
        </div>

        <Credit className="on-card" />
      </div>
    </div>
  );
}
