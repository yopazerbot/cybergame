import type { Clock } from '../../core/types';
import { TIMER_AMBER_HOURS, TIMER_RED_HOURS } from '../../core/config';

// Circular countdown ring for the GDPR Article 33 72-hour notification window.
export function Timer({ clock }: { clock: Clock }) {
  const remaining = Math.max(0, clock.deadlineHours - clock.hoursElapsed);
  const hh = Math.floor(remaining);
  const mm = Math.floor((remaining - hh) * 60);
  const pct = Math.max(0, Math.min(1, remaining / clock.deadlineHours));

  const level =
    remaining <= TIMER_RED_HOURS ? 'red' : remaining <= TIMER_AMBER_HOURS ? 'amber' : 'green';

  const R = 26;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);

  return (
    <div className={`timer ${level}`}>
      <div className="timer-ring-wrap">
        <svg className="timer-ring" viewBox="0 0 64 64">
          <circle className="ring-track" cx="32" cy="32" r={R} />
          <circle
            className="ring-prog"
            cx="32"
            cy="32"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div className="timer-ring-center">
          <strong>
            {hh}
            <small>h</small>
          </strong>
          <span>{String(mm).padStart(2, '0')}m</span>
        </div>
      </div>
      <div className="timer-meta">
        <div className="timer-label">GDPR · Art. 33</div>
        <div className="timer-sub">72h notification window</div>
      </div>
    </div>
  );
}
