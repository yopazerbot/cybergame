import { useEffect, useRef, useState } from 'react';
import { useStore } from '../useStore';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { campaignDebrief } from '../../scenario/campaign';
import { getUsername, unlockAchievements } from '../../core/profile';
import { submitScore, type ScoreEntry } from '../../core/api';
import { outcomeReport } from '../../scenario/scoring';
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
  const outcome = outcomeReport(state);

  useEffect(() => {
    if (submitted.current || !ending) return;
    submitted.current = true;
    setFreshAchievements(unlockAchievements(earned.map((a) => a.id)));
    submitScore({
      name: getUsername() || 'Anonymous',
      score: state.score,
      grade: outcome.grade,
      headline: outcome.headline.value,
      campaign: state.mode,
      ending: ending.id,
      difficulty: state.difficulty,
      hoursLeft,
      compliance: Math.round(state.meters.compliance),
      reputation: Math.round(state.meters.reputation),
      recommended: state.recommendations,
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
            <span>Outcome score</span>
            <strong>
              {outcome.score}
              <small>/100</small>
            </strong>
          </div>
          <div className={`grade-badge grade-${outcome.grade}`}>{outcome.grade}</div>
          <div className="outcome-headline">
            <span>{outcome.headline.label}</span>
            <strong>{outcome.headline.value}</strong>
          </div>
        </div>

        <div className="consequence-report">
          {outcome.rows.map((r) => (
            <div className="consequence-row" key={r.label}>
              <span>{r.label}</span>
              <strong>{r.value}</strong>
            </div>
          ))}
        </div>

        {state.mode === 'defender' && (
          <>
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
          </>
        )}

        <h3 className="debrief-title">
          {state.mode === 'attacker'
            ? 'How defenders detect & stop this kill chain'
            : 'What good GDPR incident response looks like'}
        </h3>
        <div className="debrief-list">
          {campaignDebrief(state.mode).map((item) => (
            <div className="debrief-item" key={item.heading}>
              <h4>{item.heading}</h4>
              <p>{item.body}</p>
            </div>
          ))}
        </div>

        <div className="leaderboard-block">
          <h3>
            🏆 Global leaderboards
            {rank !== null && (
              <span className="your-rank">
                {' '}
                — you placed #{rank} on the {state.recommendations ? 'guided' : 'solo'} board
              </span>
            )}
          </h3>
          <div className="board-split">
            <div className="board-col">
              <h4>🎯 Solo · no hints</h4>
              {!state.recommendations && board !== null ? (
                <Scoreboard scores={board} limit={10} highlightTs={myTs} />
              ) : (
                <Scoreboard rec="without" campaign={state.mode} limit={10} />
              )}
            </div>
            <div className="board-col">
              <h4>🤝 Guided · recommendations</h4>
              {state.recommendations && board !== null ? (
                <Scoreboard scores={board} limit={10} highlightTs={myTs} />
              ) : (
                <Scoreboard rec="with" campaign={state.mode} limit={10} />
              )}
            </div>
          </div>
        </div>

        <p className="disclaimer">
          {state.mode === 'attacker'
            ? 'Educational red-team simulation — a strategic model of the MITRE ATT&CK kill chain, to help defenders, not a how-to.'
            : 'Educational simulation — a simplified model of GDPR Articles 33 & 34, not legal advice.'}
        </p>

        <button className="btn primary big" onClick={playAgain}>
          Play again
        </button>

        <Credit className="on-card" />
      </div>
    </div>
  );
}
