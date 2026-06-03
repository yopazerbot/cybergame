import { useEffect, useState } from 'react';
import { fetchScores, type ScoreEntry, type RecBucket } from '../../core/api';
import type { Mode } from '../../core/types';

const ENDING_ICON: Record<string, string> = {
  exemplary: '🏆',
  compliant_costly: '✅',
  reputational_damage: '😬',
  regulatory_breach: '⚖️',
  coverup_exposed: '🚨',
  // Attacker endings.
  ghost: '👻',
  smash_grab: '💰',
  caught: '🚔',
  burned: '🔥',
};

const DIFF_ICON: Record<string, string> = { easy: '🟢', normal: '🟡', hard: '🔴' };
const DIFF_LABEL: Record<string, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

// Cross-session leaderboard. Pass `scores` to render a known list (e.g. the POST
// response on the debrief); omit it to fetch the current top list.
export function Scoreboard({
  scores: provided,
  highlightTs,
  limit = 10,
  rec,
  campaign,
}: {
  scores?: ScoreEntry[];
  highlightTs?: number;
  limit?: number;
  rec?: RecBucket;
  campaign?: Mode;
}) {
  const [list, setList] = useState<ScoreEntry[] | null>(provided ?? null);

  useEffect(() => {
    if (provided) {
      setList(provided);
      return;
    }
    let alive = true;
    fetchScores({ rec, campaign }).then((s) => alive && setList(s));
    return () => {
      alive = false;
    };
  }, [provided, rec, campaign]);

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
            <span className={`diff-tag ${s.difficulty}`} title={`difficulty: ${s.difficulty}`}>
              {DIFF_ICON[s.difficulty] ?? ''} {DIFF_LABEL[s.difficulty] ?? s.difficulty}
            </span>
            {s.headline && <span className="headline-tag">{s.headline}</span>}
            <span title={s.ending}>{ENDING_ICON[s.ending] ?? ''}</span>
          </span>
          <span className="pts">
            {s.score}
            {s.grade ? <span className="pts-grade"> · {s.grade}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
