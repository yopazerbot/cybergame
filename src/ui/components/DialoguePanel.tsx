import { useState } from 'react';
import type { Role } from '../../core/types';
import { STAKEHOLDER_BY_ID } from '../../scenario/stakeholders';
import { store } from '../../core/store';
import { nodeForStakeholder, resolveChoice } from '../../scenario/scoring';
import type { Choice } from '../../scenario/scenario';

export function DialoguePanel({ npcId }: { npcId: Role }) {
  const s = STAKEHOLDER_BY_ID[npcId];
  const node = nodeForStakeholder(store.getState(), npcId);
  const [picked, setPicked] = useState<Choice | null>(null);

  const close = () => store.setState({ ...store.getState(), activeDialogue: null });

  return (
    <div className="overlay bottom">
      <div className="card dialogue">
        <div className="dialogue-portrait" style={{ background: portraitBg(npcId) }}>
          <span>{s.emoji}</span>
        </div>
        <div className="dialogue-body">
          <div className="dialogue-name">
            {s.name} <em>· {s.title}</em>
          </div>

          {!node && (
            <>
              <p className="dialogue-text">{s.blurb}</p>
              <p className="dialogue-text muted">Nothing to action with them right now.</p>
              <div className="choices">
                <button className="btn" onClick={close}>
                  Leave
                </button>
              </div>
            </>
          )}

          {node && !picked && (
            <>
              <div className="dialogue-heading">{node.heading}</div>
              <p className="dialogue-text">{node.prompt}</p>
              <div className="choices">
                {node.choices.map((c) => (
                  <button key={c.id} className="btn choice" onClick={() => setPicked(c)}>
                    <span className="choice-label">{c.label}</span>
                    {c.tag && <span className={`choice-tag tag-${tagClass(c.tag)}`}>{c.tag}</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {node && picked && (
            <>
              <div className="dialogue-heading">{picked.label}</div>
              <p className="dialogue-text feedback">{picked.feedback}</p>
              <EffectsRow choice={picked} />
              <div className="choices">
                <button
                  className="btn primary"
                  onClick={() => resolveChoice(node.id, picked.id)}
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EffectsRow({ choice }: { choice: Choice }) {
  const e = choice.effects;
  const items: { label: string; v: number; invert?: boolean }[] = [];
  if (e.compliance) items.push({ label: 'Compliance', v: e.compliance });
  if (e.reputation) items.push({ label: 'Reputation', v: e.reputation });
  if (e.cost) items.push({ label: 'Cost', v: e.cost, invert: true });
  return (
    <div className="effects">
      {items.map((it) => {
        const positive = it.invert ? it.v < 0 : it.v > 0;
        return (
          <span key={it.label} className={`effect ${positive ? 'pos' : 'neg'}`}>
            {it.label} {it.v > 0 ? '+' : ''}
            {it.v}
          </span>
        );
      })}
      {e.timeCostHours ? <span className="effect time">⏱️ +{e.timeCostHours}h</span> : null}
    </div>
  );
}

function tagClass(tag: string): string {
  if (tag.includes('best')) return 'good';
  if (tag.includes('critical')) return 'bad';
  if (tag.includes('risky') || tag.includes('insufficient') || tag.includes('destroys'))
    return 'warn';
  return 'note';
}

function portraitBg(role: Role): string {
  const map: Record<Role, string> = {
    tech: '#3aa6b9',
    ciso: '#6c5ce7',
    dpo: '#00b894',
    management: '#e17055',
    regulator: '#636e72',
    customer: '#d8a93f',
  };
  return map[role];
}
