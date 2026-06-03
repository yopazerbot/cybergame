import { useEffect, useRef, useState } from 'react';
import { INJECT_BY_ID } from '../../scenario/injects';
import { resolveInject } from '../../scenario/scoring';

// A timed crisis inject: real-seconds countdown; on timeout the inject's
// default choice auto-resolves. Locks the world while open.
export function InjectModal({ injectId }: { injectId: string }) {
  const inject = INJECT_BY_ID[injectId];
  const [left, setLeft] = useState(inject ? inject.seconds : 0);
  const done = useRef(false);

  useEffect(() => {
    if (!inject) return;
    done.current = false;
    setLeft(inject.seconds);
    const t = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          if (!done.current) {
            done.current = true;
            resolveInject(inject.id, inject.choices[inject.defaultChoice].id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [injectId]);

  if (!inject) return null;

  const pick = (choiceId: string) => {
    if (done.current) return;
    done.current = true;
    resolveInject(inject.id, choiceId);
  };

  const pct = Math.max(0, (left / inject.seconds) * 100);
  const urgent = left <= 6;

  return (
    <div className="overlay center inject-overlay">
      <div className="card inject-card">
        <div className="inject-kicker">
          <span className="inject-icon">{inject.icon}</span>
          {inject.kicker}
        </div>
        <h2 className="inject-heading">{inject.heading}</h2>
        <p className="inject-text">{inject.text}</p>

        <div className={`inject-timer ${urgent ? 'urgent' : ''}`}>
          <div className="inject-timer-bar" style={{ width: `${pct}%` }} />
          <span className="inject-timer-num">{left}s</span>
        </div>

        <div className="inject-choices">
          {inject.choices.map((c) => (
            <button
              key={c.id}
              className={`inject-choice ${c.tag === 'best practice' ? 'good' : c.tag === 'risky' ? 'bad' : ''}`}
              onClick={() => pick(c.id)}
            >
              <span className="inject-choice-label">{c.label}</span>
              {c.tag && <span className="inject-choice-tag">{c.tag}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
