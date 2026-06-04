import { useEffect, useRef, useState } from 'react';
import { useStore } from '../useStore';
import { Timer } from './Timer';
import { sfx } from '../../core/sfx';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { meterLabels } from '../../scenario/campaign';
import { gradeFor } from '../../scenario/scoring';

function Meter({
  label,
  icon,
  value,
  invert,
  format,
}: {
  label: string;
  icon: string;
  value: number;
  invert?: boolean;
  format?: (v: number) => string;
}) {
  // For "cost", higher is worse, so colour inverts.
  const good = invert ? value <= 40 : value >= 60;
  const mid = invert ? value <= 70 : value >= 35;
  const tone = good ? 'good' : mid ? 'mid' : 'bad';
  const shown = format ? format(value) : String(Math.round(value));

  // Flash the meter when it changes, coloured by whether the change was an
  // improvement (for cost, lower is better — so the direction inverts too).
  const prev = useRef(value);
  const [flash, setFlash] = useState<'' | 'good' | 'bad'>('');
  useEffect(() => {
    const delta = value - prev.current;
    if (delta === 0) return;
    const improved = invert ? delta < 0 : delta > 0;
    setFlash(improved ? 'good' : 'bad');
    prev.current = value;
    const t = setTimeout(() => setFlash(''), 750);
    return () => clearTimeout(t);
  }, [value, invert]);

  return (
    <div className={`meter ${tone}${flash ? ` flash-${flash}` : ''}`}>
      <span className="meter-icon">{icon}</span>
      <div className="meter-body">
        <div className="meter-label">{label}</div>
        <div className="meter-val" title={`${Math.round(value)} / 100`}>
          {shown}
        </div>
        <div className="meter-bar">
          <div className={`meter-fill ${tone}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  );
}

export function Hud() {
  const state = useStore();
  const [muted, setMuted] = useState(sfx.isMuted());
  const phaseLabel = state.phase.charAt(0).toUpperCase() + state.phase.slice(1);
  const ml = meterLabels(state.mode);

  const toggleMute = () => {
    const next = !muted;
    sfx.setMuted(next);
    setMuted(next);
  };

  const restart = () => {
    if (window.confirm('Restart the game? Your progress in this run will be lost.')) {
      store.reset();
      eventBus.emit('restart', undefined);
    }
  };

  // Keyboard shortcuts: R restart, M mute, ? tutorial — only while playing and
  // not typing into a field, and not while a decision modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = store.getState();
      if (s.gamePhase !== 'playing' || s.activeDialogue || s.activeInject) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') restart();
      else if (e.key === 'm' || e.key === 'M') toggleMute();
      else if (e.key === '?') eventBus.emit('startTutorial', undefined);
      else if (e.key === '+' || e.key === '=') eventBus.emit('zoom', { dir: 'in' });
      else if (e.key === '-' || e.key === '_') eventBus.emit('zoom', { dir: 'out' });
      else if (e.key === '0') eventBus.emit('zoom', { dir: 'reset' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="hud">
      <Timer clock={state.clock} mode={state.mode} />
      <div className="meters">
        <Meter
          label={ml.compliance.label}
          icon={ml.compliance.icon}
          value={state.meters.compliance}
          format={ml.compliance.format}
        />
        <Meter
          label={ml.reputation.label}
          icon={ml.reputation.icon}
          value={state.meters.reputation}
          format={ml.reputation.format}
        />
        <Meter
          label={ml.cost.label}
          icon={ml.cost.icon}
          value={state.meters.cost}
          invert
          format={ml.cost.format}
        />
      </div>
      <div className="hud-right">
        <div className="phase-pill">Phase · {phaseLabel}</div>
        <div className="score">
          <span className="score-ico">⭐</span>
          <span className="score-val">{state.score}</span>
          <span className="score-cap">/100 · {gradeFor(state.score)}</span>
        </div>
        <div className="hud-buttons">
          <button className="mute-btn" onClick={restart} title="Restart game (R)" aria-label="Restart game">
            🔄
          </button>
          <button
            className="mute-btn"
            onClick={() => eventBus.emit('startTutorial', undefined)}
            title="Replay tutorial (?)"
            aria-label="Replay tutorial"
          >
            ❔
          </button>
          <button
            className="mute-btn"
            onClick={toggleMute}
            title="Toggle sound (M)"
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
