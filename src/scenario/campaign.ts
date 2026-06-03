import type { GameState, Mode, Phase, Role } from '../core/types';
import type { Stakeholder } from './stakeholders';
import type { DecisionNode } from './scenario';
import type { DebriefItem } from './debrief';
import { NODES, NODE_BY_ID, PHASE_ORDER, SCENARIO_INTRO } from './scenario';
import { STAKEHOLDERS, STAKEHOLDER_BY_ID } from './stakeholders';
import { GDPR_DEBRIEF } from './debrief';
import {
  ATTACKER_NODES,
  ATTACKER_NODE_BY_ID,
  ATTACKER_PHASE_ORDER,
  ATTACKER_INTRO,
  ATTACKER_STAKEHOLDERS,
  ATTACKER_STAKEHOLDER_BY_ID,
  ATTACKER_DEBRIEF,
} from './attacker';

// Selects the active campaign's data + presentation by mode, so one engine and
// one walkable world serve both the blue-team and red-team storylines.

const atk = (m: Mode): boolean => m === 'attacker';

export const campaignNodes = (m: Mode): DecisionNode[] => (atk(m) ? ATTACKER_NODES : NODES);
export const campaignNodeById = (m: Mode): Record<string, DecisionNode> =>
  atk(m) ? ATTACKER_NODE_BY_ID : NODE_BY_ID;
export const campaignPhaseOrder = (m: Mode): Phase[] =>
  atk(m) ? [...ATTACKER_PHASE_ORDER] : PHASE_ORDER;
export const campaignStakeholders = (m: Mode): Stakeholder[] =>
  atk(m) ? ATTACKER_STAKEHOLDERS : STAKEHOLDERS;
export const campaignStakeholderById = (m: Mode): Record<Role, Stakeholder> =>
  atk(m) ? ATTACKER_STAKEHOLDER_BY_ID : STAKEHOLDER_BY_ID;
export const campaignIntro = (m: Mode): string => (atk(m) ? ATTACKER_INTRO : SCENARIO_INTRO);
export const campaignDebrief = (m: Mode): DebriefItem[] => (atk(m) ? ATTACKER_DEBRIEF : GDPR_DEBRIEF);
export const finishNodeId = (m: Mode): string => (atk(m) ? 'boss_getaway' : 'mgmt_remediation');

export interface MeterLabel {
  label: string;
  icon: string;
}

/** Re-skinned meter labels: the same three meters mean different things per side. */
export const meterLabels = (
  m: Mode,
): { compliance: MeterLabel; reputation: MeterLabel; cost: MeterLabel } =>
  atk(m)
    ? {
        compliance: { label: 'Stealth', icon: '🕶️' },
        reputation: { label: 'Loot', icon: '💰' },
        cost: { label: 'Heat', icon: '🚨' },
      }
    : {
        compliance: { label: 'Compliance', icon: '⚖️' },
        reputation: { label: 'Reputation', icon: '💬' },
        cost: { label: 'Cost', icon: '💸' },
      };

export const timerLabel = (m: Mode): { title: string; sub: string } =>
  atk(m)
    ? { title: 'Detection window', sub: 'Before the SOC notices' }
    : { title: 'GDPR · Art. 33', sub: '72h notification window' };

/** Ideal-sequence bonus condition (clean, in-order run). */
export const idealRun = (s: GameState): boolean =>
  atk(s.mode)
    ? !!(
        s.flags.reconDone &&
        s.flags.accessGained &&
        s.flags.privEscalated &&
        s.flags.dataExfiltrated &&
        s.flags.tracksCovered &&
        !s.flags.gotCaught &&
        !s.flags.loud
      )
    : !!(
        s.flags.breachContained &&
        s.flags.scopeKnown &&
        s.flags.dpoConsulted &&
        s.flags.regulatorNotified &&
        !s.flags.coverup
      );

/** The clock running out is a failure while this is still true at the deadline. */
export const deadlineFail = (s: GameState): boolean =>
  atk(s.mode) ? !s.flags.tracksCovered : !s.flags.regulatorNotified;
