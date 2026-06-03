import { useEffect, useState } from 'react';
import { eventBus } from '../../core/eventBus';

interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

let counter = 0;

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return eventBus.on('notify', ({ text, tone }) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, text, tone }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    });
  }, []);

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
