import { useEffect, useRef, useState } from 'react';
import { INJECT_BY_ID } from '../../scenario/injects';
import { resolveInject } from '../../scenario/scoring';
import { useFocusTrap } from '../useFocusTrap';

// A timed crisis inject: real-seconds countdown; on timeout the inject's
// default choice auto-resolves. Locks the world while open. No Esc — it is a
// forced decision; the only ways out are choosing or the timer running out.
export function InjectModal({ injectId }: { injectId: string }) {
  const inject = INJECT_BY_ID[injectId];
  const [left, setLeft] = useState(inject ? inject.seconds : 0);
  const done = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useFocusTrap(cardRef);

  const onChoiceKey = (e: React.KeyboardEvent, idx: number, count: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
      choiceRefs.current[next]?.focus();
    }
  };

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

  // Number keys pick a response fast — valuable under the live countdown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inject || done.current || !/^[1-9]$/.test(e.key)) return;
      const choice = inject.choices[Number(e.key) - 1];
      if (choice) {
        e.preventDefault();
        done.current = true;
        resolveInject(inject.id, choice.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      <div className="card inject-card" ref={cardRef} role="alertdialog" aria-modal="true" aria-label={inject.heading}>
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
          {inject.choices.map((c, i) => (
            <button
              key={c.id}
              ref={(el) => (choiceRefs.current[i] = el)}
              className={`inject-choice ${
                c.tag && (c.tag.includes('best') || c.tag.includes('quiet'))
                  ? 'good'
                  : c.tag && (c.tag.includes('risky') || c.tag.includes('loud'))
                    ? 'bad'
                    : ''
              }`}
              onClick={() => pick(c.id)}
              onKeyDown={(e) => onChoiceKey(e, i, inject.choices.length)}
            >
              <span className="choice-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="inject-choice-label">{c.label}</span>
              {c.tag && <span className="inject-choice-tag">{c.tag}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
