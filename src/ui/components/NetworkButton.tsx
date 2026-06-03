import { useStore } from '../useStore';
import { compromisedCount, isContained } from '../../scenario/network';

// Floating HUD button that surfaces the live intrusion status and opens the
// containment map. Pulses red while hosts are still compromised.
export function NetworkButton({ onOpen }: { onOpen: () => void }) {
  const net = useStore().network;
  const contained = isContained(net);
  const n = compromisedCount(net);
  const exfil = Math.round(net.exfilPct);

  return (
    <button
      className={`net-fab ${contained ? 'safe' : 'alert'}`}
      onClick={onOpen}
      title="Open the live network containment map"
    >
      <span className="net-fab-ico">🛰️</span>
      <span className="net-fab-text">
        <strong>Network</strong>
        <small>
          {contained ? 'Contained ✓' : `${n} host${n === 1 ? '' : 's'} hit · ${exfil}% exfil`}
        </small>
      </span>
    </button>
  );
}
