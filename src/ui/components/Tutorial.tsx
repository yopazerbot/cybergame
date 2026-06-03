import { useEffect, useState } from 'react';
import { eventBus } from '../../core/eventBus';
import { useStore } from '../useStore';

// First-load guided tutorial. Steps advance as the player performs each action,
// so it teaches by doing rather than walls of text. Replayable via the HUD "?".

const KEY = 'breach_tutorial_done';

type Advance = 'walk' | 'talk' | 'button';

interface Step {
  ico: string;
  title: string;
  text: string;
  advanceOn: Advance;
}

const STEPS: Step[] = [
  {
    ico: '🖱️',
    title: 'Move around',
    text: 'Click anywhere on the floor to walk your avatar there.',
    advanceOn: 'walk',
  },
  {
    ico: '💬',
    title: 'Talk to a colleague',
    text: 'Walk up to someone with a glowing ring beneath them, then click them or press Space to open a decision.',
    advanceOn: 'talk',
  },
  {
    ico: '⏱️',
    title: 'Mind the clock & meters',
    text: 'Top bar: your GDPR 72-hour timer and Compliance / Reputation / Cost. Good calls raise them — wrong turns burn time.',
    advanceOn: 'button',
  },
  {
    ico: '📋',
    title: "You're the Incident Commander",
    text: 'Follow the checklist (bottom-right) to drive the incident from detection to resolution. Good luck!',
    advanceOn: 'button',
  },
];

export function Tutorial() {
  const state = useStore();
  const [active, setActive] = useState(() => localStorage.getItem(KEY) !== '1');
  const [step, setStep] = useState(0);

  // Allow replay from the HUD.
  useEffect(() => eventBus.on('startTutorial', () => {
    setStep(0);
    setActive(true);
  }), []);

  // Advance the "walk" step when the player actually arrives somewhere.
  useEffect(() => {
    if (!active || STEPS[step].advanceOn !== 'walk') return;
    return eventBus.on('playerArrived', () => setStep((s) => Math.min(s + 1, STEPS.length - 1)));
  }, [active, step]);

  // Advance the "talk" step when a dialogue actually opens.
  useEffect(() => {
    if (active && STEPS[step].advanceOn === 'talk' && state.activeDialogue) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }, [active, step, state.activeDialogue]);

  if (!active) return null;
  // Hide while a decision is open so we never cover the dialogue.
  if (state.activeDialogue) return null;

  const finish = () => {
    localStorage.setItem(KEY, '1');
    setActive(false);
  };
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="tutorial-card">
      <div className="tutorial-ico">{current.ico}</div>
      <div className="tutorial-body">
        <div className="tutorial-title">{current.title}</div>
        <p>{current.text}</p>
        <div className="tutorial-foot">
          <div className="tutorial-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={i === step ? 'dot on' : 'dot'} />
            ))}
          </div>
          <div className="tutorial-actions">
            <button className="btn ghost small" onClick={finish}>
              Skip
            </button>
            {current.advanceOn === 'button' && (
              <button
                className="btn primary small"
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              >
                {isLast ? 'Got it!' : 'Next'}
              </button>
            )}
            {current.advanceOn !== 'button' && <span className="tutorial-wait">…try it</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
