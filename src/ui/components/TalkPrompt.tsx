import type { Role } from '../../core/types';
import { STAKEHOLDER_BY_ID } from '../../scenario/stakeholders';
import { eventBus } from '../../core/eventBus';

export function TalkPrompt({ npcId }: { npcId: Role }) {
  const s = STAKEHOLDER_BY_ID[npcId];
  return (
    <button className="talk-prompt" onClick={() => eventBus.emit('requestDialogue', { npcId })}>
      <span className="talk-emoji">{s.emoji}</span>
      Talk to <strong>{s.name}</strong> · <kbd>Space</kbd>
    </button>
  );
}
