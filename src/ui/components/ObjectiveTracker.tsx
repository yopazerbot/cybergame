import { useState } from 'react';
import { useStore } from '../useStore';

export function ObjectiveTracker() {
  const state = useStore();
  const [open, setOpen] = useState(true);
  const done = state.objectives.filter((o) => o.done).length;

  return (
    <div className={`objectives ${open ? 'open' : 'closed'}`}>
      <button className="objectives-head" onClick={() => setOpen((v) => !v)}>
        <span>📋 Incident checklist</span>
        <span className="obj-count">
          {done}/{state.objectives.length}
        </span>
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ul className="objectives-list">
          {state.objectives.map((o) => (
            <li key={o.id} className={o.done ? 'done' : ''}>
              <span className="check">{o.done ? '✅' : '⬜'}</span>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
