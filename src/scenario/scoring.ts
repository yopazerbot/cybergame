import type { GameState, Phase, Role, Ending } from '../core/types';
import { SCORE_WEIGHTS } from '../core/config';
import { store } from '../core/store';
import { eventBus } from '../core/eventBus';
import { sfx } from '../core/sfx';
import { NODES, NODE_BY_ID, PHASE_ORDER, type DecisionNode } from './scenario';

// Pure-ish resolver: the only place that turns a player choice into new state.

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const phaseIdx = (p: Phase) => PHASE_ORDER.indexOf(p);

function flagsSatisfied(state: GameState, required?: string[]): boolean {
  return !required || required.every((f) => state.flags[f]);
}

/** A node is available if its phase has been reached, prereqs are met, and it isn't already resolved. */
export function isNodeAvailable(state: GameState, node: DecisionNode): boolean {
  if (node.oneShot && state.resolvedNodes.includes(node.id)) return false;
  if (phaseIdx(node.phase) > phaseIdx(state.phase)) return false;
  return flagsSatisfied(state, node.requireFlags);
}

/** The next decision an NPC currently offers (or null). Drives dialogue + the "!" indicator. */
export function nodeForStakeholder(state: GameState, role: Role): DecisionNode | null {
  return NODES.find((n) => n.stakeholder === role && isNodeAvailable(state, n)) ?? null;
}

export function stakeholderHasPending(state: GameState, role: Role): boolean {
  return nodeForStakeholder(state, role) !== null;
}

function anyNodesLeft(state: GameState): boolean {
  return NODES.some((n) => isNodeAvailable(state, n));
}

function computeScore(state: GameState): number {
  const { meters, clock } = state;
  const hoursRemaining = Math.max(0, clock.deadlineHours - clock.hoursElapsed);
  const w = SCORE_WEIGHTS;
  let score =
    w.compliance * meters.compliance +
    w.reputation * meters.reputation -
    w.cost * meters.cost +
    w.timeRemaining * hoursRemaining;

  // Ideal-sequence bonus: contained & assessed *before* notifying.
  const idealOrder =
    state.flags.breachContained &&
    state.flags.scopeKnown &&
    state.flags.dpoConsulted &&
    state.flags.regulatorNotified &&
    !state.flags.coverup;
  if (idealOrder) score += w.orderBonus;

  return Math.round(score);
}

export function computeEnding(state: GameState): Ending {
  const f = state.flags;
  const missedDeadline = !f.regulatorNotified;

  if (f.coverup || f.notifyRefused) {
    return {
      id: 'coverup_exposed',
      title: 'Cover-up Exposed',
      tone: 'bad',
      flavor:
        'The breach surfaced anyway — through the dark web sale of the records and an affected ' +
        'customer going to the press. Concealment turned a manageable incident into a ' +
        'front-page enforcement case with sharply higher fines and a collapse in trust.',
    };
  }
  if (missedDeadline) {
    return {
      id: 'regulatory_breach',
      title: 'Regulatory Breach — 72h Missed',
      tone: 'bad',
      flavor:
        'The Article 33 window closed before you notified the supervisory authority. The ' +
        'failure to notify is itself an infringement, on top of the original breach.',
    };
  }
  if (state.meters.compliance >= 78 && state.meters.reputation >= 70 && state.meters.cost <= 45) {
    return {
      id: 'exemplary',
      title: 'Exemplary Response',
      tone: 'good',
      flavor:
        'Contained fast, scoped with evidence, the DPO consulted, the authority notified within ' +
        '72 hours and customers told honestly. The regulator noted your diligence as a mitigating ' +
        'factor. This is textbook incident response.',
    };
  }
  if (state.meters.compliance >= 70) {
    return {
      id: 'compliant_costly',
      title: 'Compliant, but Costly',
      tone: 'mixed',
      flavor:
        'You met your legal obligations, but detours along the way burned time, money or ' +
        'goodwill. Compliant — yet it cost more than it needed to.',
    };
  }
  return {
    id: 'reputational_damage',
    title: 'Reputational Damage',
    tone: 'mixed',
    flavor:
      'You stayed (just) on the right side of the law, but mishandled evidence and weak ' +
      'communication left customers and the board shaken. Trust will take a long time to rebuild.',
  };
}

function endGame(state: GameState): void {
  const ending = computeEnding(state);
  if (ending.tone === 'good') sfx.win();
  else sfx.lose();
  store.setState({
    ...state,
    score: computeScore(state),
    gamePhase: 'ended',
    ending,
    activeDialogue: null,
    npcInRange: null,
  });
}

/** Apply a player's choice. */
export function resolveChoice(nodeId: string, choiceId: string): void {
  const state = store.getState();
  const node = NODE_BY_ID[nodeId];
  const choice = node?.choices.find((c) => c.id === choiceId);
  if (!node || !choice) return;

  const e = choice.effects;
  const meters = {
    reputation: clamp(state.meters.reputation + (e.reputation ?? 0)),
    compliance: clamp(state.meters.compliance + (e.compliance ?? 0)),
    cost: clamp(state.meters.cost + (e.cost ?? 0)),
  };

  const flags = { ...state.flags };
  (e.setFlags ?? []).forEach((flag) => (flags[flag] = true));

  const clock = {
    ...state.clock,
    hoursElapsed: state.clock.hoursElapsed + (e.timeCostHours ?? 0),
  };

  let phase = state.phase;
  const phaseAdvanced = e.advancePhaseTo && phaseIdx(e.advancePhaseTo) > phaseIdx(phase);
  if (phaseAdvanced) phase = e.advancePhaseTo!;

  const resolvedNodes = node.oneShot
    ? [...state.resolvedNodes, nodeId]
    : state.resolvedNodes;

  const next: GameState = {
    ...state,
    meters,
    flags,
    clock,
    phase,
    resolvedNodes,
    activeDialogue: null,
  };
  next.score = computeScore(next);

  // Audio + toast feedback on the choice quality.
  const net = (e.compliance ?? 0) + (e.reputation ?? 0);
  if (net >= 0) sfx.good();
  else sfx.bad();
  emitChoiceToast(e);
  if (phaseAdvanced) {
    eventBus.emit('notify', { text: `Phase: ${capitalize(phase)}`, tone: 'info' });
  }

  // End conditions.
  const deadlineMissed = next.clock.hoursElapsed >= next.clock.deadlineHours && !flags.regulatorNotified;
  const finished = nodeId === 'mgmt_remediation' || !anyNodesLeft(next);

  if (deadlineMissed || finished) {
    endGame(next);
  } else {
    store.setState(next);
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function emitChoiceToast(e: { compliance?: number; reputation?: number }): void {
  const parts: string[] = [];
  if (e.compliance) parts.push(`${e.compliance > 0 ? '+' : ''}${e.compliance} Compliance`);
  if (e.reputation) parts.push(`${e.reputation > 0 ? '+' : ''}${e.reputation} Reputation`);
  if (parts.length === 0) return;
  const tone = (e.compliance ?? 0) + (e.reputation ?? 0) >= 0 ? 'good' : 'bad';
  eventBus.emit('notify', { text: parts.join('  ·  '), tone });
}

/** Advance the game-time clock (called by the world's passive ticker). */
export function advanceClock(hours: number): void {
  const state = store.getState();
  if (state.gamePhase !== 'playing') return;
  const clock = { ...state.clock, hoursElapsed: state.clock.hoursElapsed + hours };
  const next = { ...state, clock, score: computeScore({ ...state, clock }) };

  if (clock.hoursElapsed >= clock.deadlineHours && !state.flags.regulatorNotified) {
    endGame(next);
  } else {
    store.setState(next);
  }
}
