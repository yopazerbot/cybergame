import { useState } from 'react';
import { useStore } from './useStore';
import { getUsername } from '../core/profile';
import { StartScreen } from './components/StartScreen';
import { UsernameGate } from './components/UsernameGate';
import { Hud } from './components/Hud';
import { ObjectiveTracker } from './components/ObjectiveTracker';
import { DialoguePanel } from './components/DialoguePanel';
import { DebriefScreen } from './components/DebriefScreen';
import { TalkPrompt } from './components/TalkPrompt';
import { InjectModal } from './components/InjectModal';
import { Toasts } from './components/Toasts';
import { ControlsLegend } from './components/ControlsLegend';
import { Tutorial } from './components/Tutorial';
import { NetworkButton } from './components/NetworkButton';
import { ContainmentMap } from './components/ContainmentMap';

export function App() {
  const state = useStore();
  const [name, setName] = useState(getUsername());
  const [mapOpen, setMapOpen] = useState(false);

  if (!name) {
    return (
      <div className="ui-layer">
        <UsernameGate onDone={setName} />
      </div>
    );
  }

  return (
    <div className="ui-layer">
      {state.gamePhase === 'start' && <StartScreen />}

      {state.gamePhase === 'playing' && (
        <>
          <Hud />
          <ObjectiveTracker />
          <ControlsLegend />
          <Toasts />
          <Tutorial />
          {!state.activeDialogue && !state.activeInject && (
            <NetworkButton onOpen={() => setMapOpen(true)} />
          )}
          {!state.activeDialogue && !state.activeInject && state.npcInRange && (
            <TalkPrompt npcId={state.npcInRange} />
          )}
          {mapOpen && <ContainmentMap onClose={() => setMapOpen(false)} />}
          {state.activeDialogue && <DialoguePanel npcId={state.activeDialogue.npcId} />}
          {state.activeInject && <InjectModal injectId={state.activeInject.id} />}
        </>
      )}

      {state.gamePhase === 'ended' && <DebriefScreen />}
    </div>
  );
}
