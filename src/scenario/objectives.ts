import type { GameState, Objective } from '../core/types';

// Derives the player's task checklist from the current flags. Pure function.

export function buildObjectives(state: GameState): Objective[] {
  const f = state.flags;
  if (state.mode === 'attacker') {
    return [
      { id: 'recon', label: 'Map the target (Recon)', done: !!f.reconDone },
      { id: 'access', label: 'Gain initial access (The Broker)', done: !!f.accessGained },
      {
        id: 'escalate',
        label: 'Escalate privileges & move laterally (Priv-Kit)',
        done: !!f.privEscalated,
      },
      { id: 'exfil', label: 'Exfiltrate the customer database (The Fence)', done: !!f.dataExfiltrated },
      { id: 'cover', label: 'Cover your tracks & get away (The Boss)', done: !!f.tracksCovered },
    ];
  }
  return [
    { id: 'triage', label: 'Triage the EDR alert with the SOC (Tech)', done: !!f.investigating },
    { id: 'contain', label: 'Contain the intrusion & cut C2 (Tech)', done: !!f.breachContained },
    { id: 'ir', label: 'Activate the incident response plan (CISO)', done: !!f.irActivated },
    { id: 'scope', label: 'Confirm & scope the exfiltration (Tech)', done: !!f.scopeKnown },
    { id: 'dpo', label: 'Assess notifiability with the DPO', done: !!f.dpoConsulted },
    { id: 'mgmt', label: 'Get disclosure sign-off (Management)', done: !!f.mgmtApproved },
    {
      id: 'regulator',
      label: 'Notify the supervisory authority within 72h',
      done: !!f.regulatorNotified,
    },
    { id: 'customer', label: 'Communicate to affected customers', done: !!f.customerNotified },
    { id: 'remediate', label: 'Eradicate, recover & review (Management)', done: !!f.remediated },
  ];
}
