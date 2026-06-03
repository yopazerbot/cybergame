import { useStore } from './useStore';
import { StartScreen } from './components/StartScreen';
import { Hud } from './components/Hud';
import { ObjectiveTracker } from './components/ObjectiveTracker';
import { DialoguePanel } from './components/DialoguePanel';
import { DebriefScreen } from './components/DebriefScreen';
import { TalkPrompt } from './components/TalkPrompt';
import { Toasts } from './components/Toasts';
import { ControlsLegend } from './components/ControlsLegend';

export function App() {
  const state = useStore();

  return (
    <div className="ui-layer">
      {state.gamePhase === 'start' && <StartScreen />}

      {state.gamePhase === 'playing' && (
        <>
          <Hud />
          <ObjectiveTracker />
          <ControlsLegend />
          <Toasts />
          {!state.activeDialogue && state.npcInRange && <TalkPrompt npcId={state.npcInRange} />}
          {state.activeDialogue && <DialoguePanel npcId={state.activeDialogue.npcId} />}
        </>
      )}

      {state.gamePhase === 'ended' && <DebriefScreen />}
    </div>
  );
}
