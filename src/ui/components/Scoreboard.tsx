import { useEffect, useState } from 'react';
import { fetchScores, type ScoreEntry } from '../../core/api';

const ENDING_ICON: Record<string, string> = {
  exemplary: '🏆',
  compliant_costly: '✅',
  reputational_damage: '😬',
  regulatory_breach: '⚖️',
  coverup_exposed: '🚨',
};

const DIFF_ICON: Record<string, string> = { easy: '🟢', normal: '🟡', hard: '🔴' };

// Cross-session leaderboard. Pass `scores` to render a known list (e.g. the POST
// response on the debrief); omit it to fetch the current top list.
export function Scoreboard({
  scores: provided,
  highlightTs,
  limit = 10,
}: {
  scores?: ScoreEntry[];
  highlightTs?: number;
  limit?: number;
}) {
  const [list, setList] = useState<ScoreEntry[] | null>(provided ?? null);

  useEffect(() => {
    if (provided) {
      setList(provided);
      return;
    }
    let alive = true;
    fetchScores().then((s) => alive && setList(s));
    return () => {
      alive = false;
    };
  }, [provided]);

  if (list === null) return <div className="scoreboard-state">Loading leaderboard…</div>;
  if (list.length === 0)
    return <div className="scoreboard-state">No scores yet — set the first record.</div>;

  return (
    <ol className="scoreboard">
      {list.slice(0, limit).map((s, i) => (
        <li key={`${s.ts}-${i}`} className={s.ts === highlightTs ? 'me' : ''}>
          <span className="rank">{i + 1}</span>
          <span className="who" title={s.name}>
            {s.name}
          </span>
          <span className="tags">
            <span title={`difficulty: ${s.difficulty}`}>{DIFF_ICON[s.difficulty] ?? ''}</span>
            <span title={s.ending}>{ENDING_ICON[s.ending] ?? ''}</span>
          </span>
          <span className="pts">{s.score.toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}
