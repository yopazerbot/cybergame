import { useEffect, useRef, useState } from 'react';
import { useStore } from '../useStore';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { GDPR_DEBRIEF } from '../../scenario/debrief';
import { getUsername, unlockAchievements } from '../../core/profile';
import { submitScore, type ScoreEntry } from '../../core/api';
import { scoreBreakdown } from '../../scenario/scoring';
import { earnedAchievements } from '../../scenario/achievements';
import { Scoreboard } from './Scoreboard';
import { Credit } from './Credit';

export function DebriefScreen() {
  const state = useStore();
  const ending = state.ending;
  const submitted = useRef(false);
  const [board, setBoard] = useState<ScoreEntry[] | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [myTs, setMyTs] = useState<number | undefined>(undefined);
  const [freshAchievements, setFreshAchievements] = useState<string[]>([]);

  const hoursLeft = Math.max(0, Math.round(state.clock.deadlineHours - state.clock.hoursElapsed));
  const earned = earnedAchievements(state);
  const breakdown = scoreBreakdown(state);

  useEffect(() => {
    if (submitted.current || !ending) return;
    submitted.current = true;
    setFreshAchievements(unlockAchievements(earned.map((a) => a.id)));
    submitScore({
      name: getUsername() || 'Anonymous',
      score: state.score,
      ending: ending.id,
      difficulty: state.difficulty,
      hoursLeft,
      compliance: Math.round(state.meters.compliance),
      reputation: Math.round(state.meters.reputation),
    }).then((res) => {
      if (!res) return;
      setBoard(res.scores);
      setRank(res.rank);
      setMyTs(res.entry.ts);
    });
  }, []);

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

        <div className="score-breakdown">
          {breakdown.map((p) => (
            <div className="breakdown-row" key={p.label}>
              <span>{p.label}</span>
              <strong className={p.value < 0 ? 'neg' : 'pos'}>
                {p.value > 0 ? '+' : ''}
                {p.value}
              </strong>
            </div>
          ))}
        </div>

        <h3 className="debrief-title">
          Achievements <span className="ach-count">{earned.length}/7</span>
        </h3>
        {earned.length === 0 ? (
          <p className="ach-empty">No achievements this run — try a cleaner, faster response.</p>
        ) : (
          <div className="ach-grid">
            {earned.map((a) => (
              <div
                className={`ach-card ${freshAchievements.includes(a.id) ? 'fresh' : ''}`}
                key={a.id}
                title={a.desc}
              >
                <span className="ach-icon">{a.icon}</span>
                <span className="ach-text">
                  <strong>{a.title}</strong>
                  <em>{a.desc}</em>
                </span>
                {freshAchievements.includes(a.id) && <span className="ach-new">NEW</span>}
              </div>
            ))}
          </div>
        )}

        <h3 className="debrief-title">What good GDPR incident response looks like</h3>
        <div className="debrief-list">
          {GDPR_DEBRIEF.map((item) => (
            <div className="debrief-item" key={item.heading}>
              <h4>{item.heading}</h4>
              <p>{item.body}</p>
            </div>
          ))}
        </div>

        <div className="leaderboard-block">
          <h3>
            🏆 Global leaderboard
            {rank !== null && (
              <span className="your-rank"> — you placed #{rank}</span>
            )}
          </h3>
          {board === null ? (
            <Scoreboard limit={10} highlightTs={myTs} />
          ) : (
            <Scoreboard scores={board} limit={10} highlightTs={myTs} />
          )}
        </div>

        <p className="disclaimer">
          Educational simulation — a simplified model of GDPR Articles 33 & 34, not legal advice.
        </p>

        <button className="btn primary big" onClick={playAgain}>
          Play again
        </button>

        <Credit className="on-card" />
      </div>
    </div>
  );
}
