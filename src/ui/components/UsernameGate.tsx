import { useState } from 'react';
import { setUsername } from '../../core/profile';
import { Credit } from './Credit';

// Shown once on first open: capture a handle for the cross-session leaderboard.
export function UsernameGate({ onDone }: { onDone: (name: string) => void }) {
  const [val, setVal] = useState('');
  const submit = () => {
    const name = val.trim().slice(0, 24);
    if (!name) return;
    setUsername(name);
    onDone(name);
  };

  return (
    <div className="overlay center">
      <div className="card name-gate">
        <div className="badge">GDPR Incident Simulator</div>
        <h1>
          Breach<span className="accent">!</span>
        </h1>
        <p className="lead">
          You&rsquo;re the Incident Commander. First — choose a handle for the global leaderboard.
        </p>
        <input
          className="name-input"
          autoFocus
          maxLength={24}
          value={val}
          placeholder="e.g. NightOwl"
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn primary big" disabled={!val.trim()} onClick={submit}>
          Continue →
        </button>
        <Credit className="on-card" />
      </div>
    </div>
  );
}
