import type { Clock } from '../../core/types';
import { TIMER_AMBER_HOURS, TIMER_RED_HOURS } from '../../core/config';

export function Timer({ clock }: { clock: Clock }) {
  const remaining = Math.max(0, clock.deadlineHours - clock.hoursElapsed);
  const hh = Math.floor(remaining);
  const mm = Math.floor((remaining - hh) * 60);
  const pct = Math.max(0, Math.min(100, (remaining / clock.deadlineHours) * 100));

  const level = remaining <= TIMER_RED_HOURS ? 'red' : remaining <= TIMER_AMBER_HOURS ? 'amber' : 'green';

  return (
    <div className={`timer ${level}`}>
      <div className="timer-label">GDPR 72h clock</div>
      <div className="timer-value">
        {String(hh).padStart(2, '0')}h {String(mm).padStart(2, '0')}m
      </div>
      <div className="timer-bar">
        <div className="timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
