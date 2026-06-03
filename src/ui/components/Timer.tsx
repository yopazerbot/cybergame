import type { Clock, Mode } from '../../core/types';
import { TIMER_AMBER_HOURS, TIMER_RED_HOURS } from '../../core/config';
import { timerLabel } from '../../scenario/campaign';

// Circular countdown ring: GDPR Art. 33 window (defender) or detection window (attacker).
export function Timer({ clock, mode }: { clock: Clock; mode: Mode }) {
  const label = timerLabel(mode);
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
        <div className="timer-label">{label.title}</div>
        <div className="timer-sub">{label.sub}</div>
      </div>
    </div>
  );
}
