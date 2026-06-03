import { useState } from 'react';
import { store } from '../../core/store';
import { DIFFICULTY } from '../../core/config';
import {
  getDifficulty,
  setDifficulty,
  getRecommendations,
  setRecommendations,
} from '../../core/profile';
import type { Difficulty } from '../../core/types';
import { SCENARIO_INTRO } from '../../scenario/scenario';
import { STAKEHOLDERS } from '../../scenario/stakeholders';
import { Scoreboard } from './Scoreboard';
import { Credit } from './Credit';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

export function StartScreen() {
  const [diff, setDiff] = useState<Difficulty>(getDifficulty());
  const [rec, setRec] = useState<boolean>(getRecommendations());

  const pick = (d: Difficulty) => {
    setDiff(d);
    setDifficulty(d);
  };
  const pickRec = (on: boolean) => {
    setRec(on);
    setRecommendations(on);
  };
  const start = () => store.startGame(diff, rec);

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

        <div className="difficulty">
          <span className="difficulty-label">Recommendations</span>
          <div className="seg">
            <button className={`seg-btn ${rec ? 'active' : ''}`} onClick={() => pickRec(true)}>
              On
              <em>guided</em>
            </button>
            <button className={`seg-btn ${!rec ? 'active' : ''}`} onClick={() => pickRec(false)}>
              Off
              <em>solo</em>
            </button>
          </div>
        </div>
        <p className="rec-hint">
          {rec
            ? 'Dialogs highlight the GDPR-recommended choice. Your score goes on the guided board.'
            : 'No hints in dialogs — you decide unaided. Your score goes on the solo board.'}
        </p>

        <button className="btn primary big" onClick={start}>
          ▶ Start the incident
        </button>

        <div className="leaderboard-block">
          <h3>🏆 Global leaderboards</h3>
          <div className="board-split">
            <div className="board-col">
              <h4>🎯 Solo · no hints</h4>
              <Scoreboard mode="without" limit={8} />
            </div>
            <div className="board-col">
              <h4>🤝 Guided · recommendations</h4>
              <Scoreboard mode="with" limit={8} />
            </div>
          </div>
        </div>

        <Credit className="on-card" />
      </div>
    </div>
  );
}
