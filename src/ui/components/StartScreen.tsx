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

// One-liners explaining what each difficulty actually changes, in terms of the
// live systems (opening posture, response budget, how fast the attacker escalates).
const DIFF_BLURB: Record<Difficulty, string> = {
  easy: 'Stronger opening posture, a generous response budget, and a slower attacker — room to learn the ropes.',
  normal: 'A balanced starting position and response budget. The attacker speeds up the longer you take.',
  hard: 'A weak opening, a tight response budget, and an attacker that escalates fast. Every move counts.',
};

const REPO_URL = 'https://github.com/yopazerbot/cybergame';

// Simple GitHub mark, inheriting the surrounding text colour so it themes with
// both the defender (light) and attacker (dark) palettes.
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

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
        <div className="start-topbar">
          <span className="badge">
            {mode === 'attacker' ? 'Red-Team Kill Chain' : 'GDPR Incident Simulator'}
          </span>
          <a
            className="gh-link"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="View source on GitHub"
            aria-label="View source on GitHub"
          >
            <GithubMark />
            <span className="gh-link-text">GitHub</span>
          </a>
        </div>

        <h1>
          Breach<span className="accent">!</span>
        </h1>
        <p className="tagline">
          See a data breach from both sides — run the response, or run the attack.
        </p>

        <span className="eyebrow">Choose your side</span>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'defender' ? 'active' : ''}`}
            aria-pressed={mode === 'defender'}
            onClick={() => pickMode('defender')}
          >
            <span className="mode-emoji">🛡️</span>
            <span className="mode-text">
              <strong>Defender</strong>
              <em>Run the GDPR incident response</em>
            </span>
            {mode === 'defender' && (
              <span className="mode-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
          <button
            className={`mode-btn villain ${mode === 'attacker' ? 'active' : ''}`}
            aria-pressed={mode === 'attacker'}
            onClick={() => pickMode('attacker')}
          >
            <span className="mode-emoji">🦹</span>
            <span className="mode-text">
              <strong>Attacker</strong>
              <em>Run the breach as the adversary</em>
            </span>
            {mode === 'attacker' && (
              <span className="mode-check" aria-hidden="true">
                ✓
              </span>
            )}
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
          <p className="rec-hint diff-hint">{DIFF_BLURB[diff]}</p>
          <p className="rec-hint">
            {rec
              ? 'Dialogs highlight the GDPR-recommended choice. Your score goes on the guided board.'
              : 'No hints in dialogs — you decide unaided. Your score goes on the solo board.'}
          </p>
        </div>

        <button className="btn primary big start-cta" onClick={start}>
          <span className="start-cta-main">
            ▶ {mode === 'attacker' ? 'Begin the operation' : 'Start the incident'}
          </span>
          <span className="start-cta-sub">
            {mode === 'attacker'
              ? 'Stay quiet · grab the data · vanish'
              : '72-hour clock · contain, notify, recover'}
          </span>
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

        <div className="start-footer">
          <Credit className="on-card" />
          <a
            className="gh-link ghost"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubMark />
            <span>Source on GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}
