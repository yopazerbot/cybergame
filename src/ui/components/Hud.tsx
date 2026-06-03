import { useState } from 'react';
import { useStore } from '../useStore';
import { Timer } from './Timer';
import { sfx } from '../../core/sfx';
import { store } from '../../core/store';
import { eventBus } from '../../core/eventBus';
import { meterLabels } from '../../scenario/campaign';

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
  return (
    <div className={`meter ${tone}`}>
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
          <span className="score-cap">pts</span>
        </div>
        <div className="hud-buttons">
          <button className="mute-btn" onClick={restart} title="Restart game">
            🔄
          </button>
          <button
            className="mute-btn"
            onClick={() => eventBus.emit('startTutorial', undefined)}
            title="Replay tutorial"
          >
            ❔
          </button>
          <button className="mute-btn" onClick={toggleMute} title="Toggle sound">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
