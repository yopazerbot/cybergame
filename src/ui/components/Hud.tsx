import { useState } from 'react';
import { useStore } from '../useStore';
import { Timer } from './Timer';
import { sfx } from '../../core/sfx';

function Meter({
  label,
  icon,
  value,
  invert,
}: {
  label: string;
  icon: string;
  value: number;
  invert?: boolean;
}) {
  // For "cost", higher is worse, so colour inverts.
  const good = invert ? value <= 40 : value >= 60;
  const mid = invert ? value <= 70 : value >= 35;
  const tone = good ? 'good' : mid ? 'mid' : 'bad';
  return (
    <div className="meter">
      <div className="meter-head">
        <span>
          {icon} {label}
        </span>
        <span className="meter-num">{Math.round(value)}</span>
      </div>
      <div className="meter-bar">
        <div className={`meter-fill ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Hud() {
  const state = useStore();
  const [muted, setMuted] = useState(sfx.isMuted());
  const phaseLabel = state.phase.charAt(0).toUpperCase() + state.phase.slice(1);

  const toggleMute = () => {
    const next = !muted;
    sfx.setMuted(next);
    setMuted(next);
  };

  return (
    <div className="hud">
      <Timer clock={state.clock} />
      <div className="meters">
        <Meter label="Compliance" icon="⚖️" value={state.meters.compliance} />
        <Meter label="Reputation" icon="💬" value={state.meters.reputation} />
        <Meter label="Cost" icon="💸" value={state.meters.cost} invert />
      </div>
      <div className="hud-right">
        <div className="phase-pill">Phase · {phaseLabel}</div>
        <div className="score">
          Score <strong>{state.score}</strong>
        </div>
        <button className="mute-btn" onClick={toggleMute} title="Toggle sound">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
}
