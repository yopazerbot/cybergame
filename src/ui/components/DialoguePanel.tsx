import { useState } from 'react';
import type { Role } from '../../core/types';
import { store } from '../../core/store';
import { nodeForStakeholder, resolveChoice } from '../../scenario/scoring';
import { recommendedChoiceId, type Choice } from '../../scenario/scenario';
import { campaignStakeholderById, meterLabels } from '../../scenario/campaign';

export function DialoguePanel({ npcId }: { npcId: Role }) {
  const mode = store.getState().mode;
  const s = campaignStakeholderById(mode)[npcId];
  const node = nodeForStakeholder(store.getState(), npcId);
  const [picked, setPicked] = useState<Choice | null>(null);
  const showRecs = store.getState().recommendations;
  const recId = node && showRecs ? recommendedChoiceId(node) : null;
  const portraitColor = '#' + s.colors.body.toString(16).padStart(6, '0');

  const close = () => store.setState({ ...store.getState(), activeDialogue: null });

  return (
    <div className="overlay bottom">
      <div className="card dialogue">
        <div className="dialogue-portrait" style={{ background: portraitColor }}>
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
                  <button
                    key={c.id}
                    className={`btn choice ${c.id === recId ? 'recommended' : ''}`}
                    onClick={() => setPicked(c)}
                  >
                    {c.id === recId && <span className="choice-rec">✓ Recommended</span>}
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
  const ml = meterLabels(store.getState().mode);
  const items: { label: string; v: number; invert?: boolean }[] = [];
  if (e.compliance) items.push({ label: ml.compliance.label, v: e.compliance });
  if (e.reputation) items.push({ label: ml.reputation.label, v: e.reputation });
  if (e.cost) items.push({ label: ml.cost.label, v: e.cost, invert: true });
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
  if (tag.includes('best') || tag.includes('quiet')) return 'good';
  if (tag.includes('critical')) return 'bad';
  if (
    tag.includes('risky') ||
    tag.includes('insufficient') ||
    tag.includes('destroys') ||
    tag.includes('loud')
  )
    return 'warn';
  return 'note';
}
