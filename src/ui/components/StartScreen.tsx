import { useEffect, useState } from 'react';
import { store } from '../../core/store';
import { DIFFICULTY } from '../../core/config';
import {
  getDifficulty,
  setDifficulty,
  getRecommendations,
  setRecommendations,
  getUsername,
  setUsername,
  getMode,
  setMode,
} from '../../core/profile';
import type { Difficulty, Mode } from '../../core/types';
import { campaignIntro, campaignStakeholders } from '../../scenario/campaign';
import { Scoreboard } from './Scoreboard';
import { Credit } from './Credit';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

export function StartScreen() {
  const [diff, setDiff] = useState<Difficulty>(getDifficulty());
  const [rec, setRec] = useState<boolean>(getRecommendations());
  const [mode, setModeState] = useState<Mode>(getMode());
  const [name, setName] = useState<string>(getUsername());
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);

  const pick = (d: Difficulty) => {
    setDiff(d);
    setDifficulty(d);
  };
  const pickRec = (on: boolean) => {
    setRec(on);
    setRecommendations(on);
  };
  const pickMode = (m: Mode) => {
    setModeState(m);
    setMode(m);
  };
  // Preview the theme on the menu as the side is chosen.
  useEffect(() => {
    document.documentElement.classList.toggle('attacker-mode', mode === 'attacker');
  }, [mode]);
  const saveName = () => {
    const n = draftName.trim().slice(0, 24);
    if (!n) return;
    setUsername(n);
    setName(n);
    setEditingName(false);
  };
  const start = () => store.startGame(diff, rec, mode);

  return (
    <div className="overlay center scroll">
      <div className={`card start-card ${mode}`}>
        <div className="badge">
          {mode === 'attacker' ? 'Red-Team Kill Chain' : 'GDPR Incident Simulator'}
        </div>
        <h1>
          Breach<span className="accent">!</span>
        </h1>

        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'defender' ? 'active' : ''}`}
            onClick={() => pickMode('defender')}
          >
            <span className="mode-emoji">🛡️</span>
            <span className="mode-text">
              <strong>Defender</strong>
              <em>Run the GDPR incident response</em>
            </span>
          </button>
          <button
            className={`mode-btn villain ${mode === 'attacker' ? 'active' : ''}`}
            onClick={() => pickMode('attacker')}
          >
            <span className="mode-emoji">🦹</span>
            <span className="mode-text">
              <strong>Attacker</strong>
              <em>Run the breach as the adversary</em>
            </span>
          </button>
        </div>

        <p className="lead">{campaignIntro(mode)}</p>

        <div className="handle-row">
          {editingName ? (
            <>
              <span className="handle-label">Handle</span>
              <input
                className="handle-input"
                autoFocus
                maxLength={24}
                value={draftName}
                placeholder="e.g. NightOwl"
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              <button className="btn handle-save" disabled={!draftName.trim()} onClick={saveName}>
                Save
              </button>
            </>
          ) : (
            <>
              <span className="handle-label">Playing as</span>
              <strong className="handle-name">{name || 'Anonymous'}</strong>
              <button
                className="handle-change"
                onClick={() => {
                  setDraftName(name);
                  setEditingName(true);
                }}
              >
                ✎ Change
              </button>
            </>
          )}
        </div>

        <div className="start-grid">
          <div className="start-col">
            <h3 className="section-title">
              {mode === 'attacker' ? '🦹 Your crew & targets' : '👥 Your incident team'}
            </h3>
            <div className="roles">
          {campaignStakeholders(mode).map((s) => (
            <div className="role-chip" key={s.id} title={s.blurb}>
              <span className="role-emoji">{s.emoji}</span>
              <span className="role-text">
                <strong>{s.name}</strong>
                <em>{s.title}</em>
              </span>
            </div>
          ))}
        </div>

        <h3 className="section-title">🎮 How to play</h3>
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
          </div>

          <div className="start-col">
        <h3 className="section-title">⚙️ Set up your run</h3>
        <div className="setup-panel">
          <div className="setup-grid">
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
                    <em>
                      {DIFFICULTY[d].maxInjects}{' '}
                      {DIFFICULTY[d].maxInjects === 1 ? 'crisis' : 'crises'}
                    </em>
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
                <button
                  className={`seg-btn ${!rec ? 'active' : ''}`}
                  onClick={() => pickRec(false)}
                >
                  Off
                  <em>solo</em>
                </button>
              </div>
            </div>
          </div>
          <p className="rec-hint">
            {rec
              ? 'Dialogs highlight the GDPR-recommended choice. Your score goes on the guided board.'
              : 'No hints in dialogs — you decide unaided. Your score goes on the solo board.'}
          </p>
        </div>

        <button className="btn primary big" onClick={start}>
          ▶ Start the incident
        </button>

        <div className="leaderboard-block">
          <h3 className="section-title">
            🏆 {mode === 'attacker' ? 'Attacker' : 'Defender'} leaderboards
          </h3>
          <div className="board-split">
            <div className="board-col">
              <h4>🎯 Solo · no hints</h4>
              <Scoreboard rec="without" campaign={mode} limit={6} />
            </div>
            <div className="board-col">
              <h4>🤝 Guided · recommendations</h4>
              <Scoreboard rec="with" campaign={mode} limit={6} />
            </div>
          </div>
            </div>
          </div>
        </div>

        <Credit className="on-card" />
      </div>
    </div>
  );
}
