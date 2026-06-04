import type { GameState, Mode, Phase, Role, Ending } from '../core/types';
import {
  SCORE,
  GRADE_BANDS,
  RECORDS_AT_RISK,
  DATA_VALUE_PER_RECORD,
  MAX_FINE,
  COST_EURO_PER_POINT,
  DIFFICULTY,
  THREAT_ESCALATION,
} from '../core/config';
import { store } from '../core/store';
import { eventBus } from '../core/eventBus';
import { sfx } from '../core/sfx';
import { type DecisionNode } from './scenario';
import {
  campaignNodes,
  campaignNodeById,
  campaignPhaseOrder,
  finishNodeId,
  idealRun,
  deadlineFail,
  meterLabels,
} from './campaign';
import { INJECTS, ATTACKER_INJECTS, INJECT_BY_ID, type Inject } from './injects';
import {
  tickNetwork,
  isolate,
  blockC2,
  rotateCreds,
  isContained,
  compromisedCount,
  ACTION_COST,
  type NetworkState,
} from './network';

// Pure-ish resolver: the only place that turns a player choice into new state.

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const phaseIdx = (p: Phase, mode: Mode) => campaignPhaseOrder(mode).indexOf(p);

function flagsSatisfied(state: GameState, required?: string[]): boolean {
  return !required || required.every((f) => state.flags[f]);
}

/** A node is available if its phase has been reached, prereqs are met, and it isn't already resolved. */
export function isNodeAvailable(state: GameState, node: DecisionNode): boolean {
  if (node.oneShot && state.resolvedNodes.includes(node.id)) return false;
  if (phaseIdx(node.phase, state.mode) > phaseIdx(state.phase, state.mode)) return false;
  return flagsSatisfied(state, node.requireFlags);
}

/** The next decision an NPC currently offers (or null). Drives dialogue + the "!" indicator. */
export function nodeForStakeholder(state: GameState, role: Role): DecisionNode | null {
  return campaignNodes(state.mode).find((n) => n.stakeholder === role && isNodeAvailable(state, n)) ?? null;
}

export function stakeholderHasPending(state: GameState, role: Role): boolean {
  return nodeForStakeholder(state, role) !== null;
}

function anyNodesLeft(state: GameState): boolean {
  return campaignNodes(state.mode).some((n) => isNodeAvailable(state, n));
}

function computeScore(state: GameState): number {
  const m = state.meters;
  // Simple, bounded 0–100: weighted average of the three meters (cost inverted).
  let s =
    (SCORE.compliance * m.compliance +
      SCORE.reputation * m.reputation +
      SCORE.costInv * (100 - m.cost)) /
    100;
  if (idealRun(state)) s += SCORE.cleanBonus;
  return Math.round(Math.max(0, Math.min(100, s)));
}

/** Letter grade for a 0–100 score. */
export function gradeFor(score: number): string {
  for (const [min, g] of GRADE_BANDS) if (score >= min) return g;
  return 'F';
}

export interface Outcome {
  score: number;
  grade: string;
  /** The single defining real-world figure (fine incurred / take). */
  headline: { label: string; value: string };
  rows: { label: string; value: string }[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const euro = (n: number) => '€' + Math.round(n).toLocaleString('en-US');

/** Tangible, real-world consequence report shown on the debrief. */
export function outcomeReport(state: GameState): Outcome {
  const score = computeScore(state);
  const grade = gradeFor(score);
  const m = state.meters;
  const f = state.flags;

  if (state.mode === 'attacker') {
    const exfiltrated = !!f.dataExfiltrated;
    const records = exfiltrated ? Math.round(RECORDS_AT_RISK * (0.4 + m.reputation / 200)) : 0;
    const take = records * DATA_VALUE_PER_RECORD;
    const alarms = m.cost < 35 ? 'Low' : m.cost < 70 ? 'Medium' : 'High';
    const caught = !!f.gotCaught || !f.tracksCovered;
    const outcome = !exfiltrated ? 'Burned — no data' : caught ? 'Caught' : 'Clean getaway';
    return {
      score,
      grade,
      headline: { label: 'Take', value: euro(take) },
      rows: [
        { label: 'Records stolen', value: records.toLocaleString('en-US') },
        { label: 'Alarms tripped', value: alarms },
        { label: 'Stealth', value: `${Math.round(m.compliance)}%` },
        { label: 'Outcome', value: outcome },
      ],
    };
  }

  const exfil = state.network.exfilPct / 100;
  const affected = Math.round(RECORDS_AT_RISK * exfil);
  const notified = !!f.regulatorNotified;
  const severity = Math.max(exfil, affected > 0 ? 0.15 : 0.05);
  const culpability = clamp01(
    (100 - m.compliance) / 100 + (f.coverup ? 0.4 : 0) + (notified ? 0 : 0.25),
  );
  const fine = Math.round((MAX_FINE * Math.min(1, severity * culpability * 1.4)) / 5000) * 5000;
  return {
    score,
    grade,
    headline: { label: 'GDPR fine', value: euro(fine) },
    rows: [
      { label: 'Customers affected', value: affected.toLocaleString('en-US') },
      {
        label: 'Authority notified',
        value: notified
          ? `Yes · ${Math.round(state.clock.hoursElapsed)}h used`
          : 'NOT notified — 72h missed',
      },
      { label: 'Customer trust', value: `${Math.round(m.reputation)}%` },
      { label: 'Incident cost', value: euro(m.cost * COST_EURO_PER_POINT) },
    ],
  };
}

export function computeEnding(state: GameState): Ending {
  return state.mode === 'attacker' ? attackerEnding(state) : defenderEnding(state);
}

/** Red-team endings: did you get the data and vanish, or get burned/caught? */
function attackerEnding(state: GameState): Ending {
  const f = state.flags;
  const { compliance: stealth, reputation: loot, cost: heat } = state.meters;

  if (!f.dataExfiltrated) {
    return {
      id: 'burned',
      title: 'Burned',
      tone: 'bad',
      flavor:
        'The intrusion stalled before you reached the data — detected and evicted while you were ' +
        'still moving. From the defenders’ side, this is the win: catch the kill chain early, ' +
        'before exfiltration, and the breach never happens.',
    };
  }
  if (f.gotCaught || !f.tracksCovered) {
    return {
      id: 'caught',
      title: 'Caught in the Act',
      tone: 'bad',
      flavor:
        'You got the records, but left a forensic trail — log artefacts, tooling and timing the ' +
        'SOC stitched into attribution. Immutable off-host logging and forensic readiness are why ' +
        'a noisy exit ends in an indictment.',
    };
  }
  if (stealth >= 70 && heat <= 40 && loot >= 60) {
    return {
      id: 'ghost',
      title: 'Ghost in the Machine',
      tone: 'good',
      flavor:
        'In, escalated, exfiltrated and gone — quiet enough that detection lagged the whole way. ' +
        'This clean run is exactly the scenario blue teams train against: defence-in-depth, EDR, ' +
        'DLP and immutable logging exist to make this outcome impossible.',
    };
  }
  return {
    id: 'smash_grab',
    title: 'Smash & Grab',
    tone: 'mixed',
    flavor:
      'You walked away with the data, but loudly — spikes, alerts and signatures that a competent ' +
      'SOC would have caught in time. Profitable, but the noise is what gets crews like yours ' +
      'identified and dismantled.',
  };
}

function defenderEnding(state: GameState): Ending {
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
  const node = campaignNodeById(state.mode)[nodeId];
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
  const phaseAdvanced =
    e.advancePhaseTo && phaseIdx(e.advancePhaseTo, state.mode) > phaseIdx(phase, state.mode);
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
  const deadlineMissed = next.clock.hoursElapsed >= next.clock.deadlineHours && deadlineFail(next);
  const finished = nodeId === finishNodeId(state.mode) || !anyNodesLeft(next);

  if (deadlineMissed || finished) {
    endGame(next);
  } else {
    store.setState(next);
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function emitChoiceToast(e: { compliance?: number; reputation?: number }): void {
  const ml = meterLabels(store.getState().mode);
  const parts: string[] = [];
  if (e.compliance) parts.push(`${e.compliance > 0 ? '+' : ''}${e.compliance} ${ml.compliance.label}`);
  if (e.reputation) parts.push(`${e.reputation > 0 ? '+' : ''}${e.reputation} ${ml.reputation.label}`);
  if (parts.length === 0) return;
  const tone = (e.compliance ?? 0) + (e.reputation ?? 0) >= 0 ? 'good' : 'bad';
  eventBus.emit('notify', { text: parts.join('  ·  '), tone });
}

/** Advance the game-time clock (called by the world's passive ticker). */
export function advanceClock(hours: number): void {
  const state = store.getState();
  if (state.gamePhase !== 'playing' || state.activeDialogue || state.activeInject) return;
  const isDefender = state.mode === 'defender';
  const clock = { ...state.clock, hoursElapsed: state.clock.hoursElapsed + hours };
  // The live intrusion sim is the defender's containment minigame only.
  let next: GameState = isDefender
    ? applyNetworkTransitions(state, {
        ...state,
        clock,
        network: tickNetwork(state.network, hours, threatSpeed(state)),
      })
    : { ...state, clock };
  next = { ...next, score: computeScore(next) };

  if (next.clock.hoursElapsed >= next.clock.deadlineHours && deadlineFail(next)) {
    endGame(next);
    return;
  }

  // Maybe interrupt with a timed crisis inject (both campaigns have their own pool).
  const inject = pickEligibleInject(next);
  if (inject) {
    next = { ...next, activeInject: { id: inject.id }, firedInjects: [...next.firedInjects, inject.id] };
    eventBus.emit('notify', { text: `Incoming: ${inject.kicker}`, tone: 'bad' });
    sfx.bad();
  }

  store.setState(next);
}

// ---------------------------------------------------------------- containment map

/**
 * The clock bites: spread/exfil speed = base difficulty threat scaled up the
 * longer the breach runs uncontained. Dawdling lets the attacker accelerate.
 */
export function threatSpeed(state: GameState): number {
  const progress = Math.min(1, state.clock.hoursElapsed / state.clock.deadlineHours);
  return DIFFICULTY[state.difficulty].threat * (1 + THREAT_ESCALATION * progress);
}

/** Spendable IR budget left for containment actions (cost-meter headroom). */
export function responseBudgetLeft(state: GameState): number {
  return Math.max(0, DIFFICULTY[state.difficulty].budget - state.meters.cost);
}

/**
 * A legible read on how dangerous the live intrusion is right now — combines the
 * clock-bite escalation (elapsed time), how many hosts are compromised, and how
 * much data has leaked. Surfaces the otherwise-invisible "the attacker is
 * speeding up" pressure in the containment dock.
 */
export function threatReadout(state: GameState): {
  label: string;
  pct: number;
  tone: 'good' | 'mid' | 'bad';
} {
  const net = state.network;
  if (isContained(net)) return { label: 'Neutralised', pct: 0, tone: 'good' };
  const progress = Math.min(1, state.clock.hoursElapsed / state.clock.deadlineHours);
  const danger = Math.min(
    1,
    0.18 + progress * 0.5 + compromisedCount(net) * 0.08 + net.exfilPct / 260,
  );
  const pct = Math.round(danger * 100);
  if (danger < 0.4) return { label: 'Low', pct, tone: 'good' };
  if (danger < 0.62) return { label: 'Elevated', pct, tone: 'mid' };
  if (danger < 0.82) return { label: 'High', pct, tone: 'mid' };
  return { label: 'Critical', pct, tone: 'bad' };
}

/** Can the player still afford a containment action of this cost? */
export function canAfford(state: GameState, cost: number): boolean {
  return state.meters.cost + cost <= DIFFICULTY[state.difficulty].budget;
}

/** Apply meter/flag consequences when the network crosses key thresholds. */
function applyNetworkTransitions(prev: GameState, next: GameState): GameState {
  const meters = { ...next.meters };
  const flags = { ...next.flags };

  if (!isContained(prev.network) && isContained(next.network) && !flags.networkContained) {
    flags.networkContained = true;
    flags.breachContained = true;
    meters.compliance = clamp(meters.compliance + 6);
    eventBus.emit('notify', { text: 'Network contained — the intrusion is stopped', tone: 'good' });
    sfx.good();
  }
  if (next.network.exfilPct >= 50 && !flags.majorExfil) {
    flags.majorExfil = true;
    meters.compliance = clamp(meters.compliance - 8);
    meters.reputation = clamp(meters.reputation - 5);
    eventBus.emit('notify', { text: 'Major data exfiltration in progress!', tone: 'bad' });
    sfx.bad();
  }

  return { ...next, meters, flags };
}

function commitNetwork(net: NetworkState, spec: { hours: number; cost: number }): void {
  const state = store.getState();
  if (state.gamePhase !== 'playing') return;
  // Containment draws on a finite response budget — spend it where it counts.
  if (!canAfford(state, spec.cost)) {
    eventBus.emit('notify', {
      text: 'Response budget exhausted — you can’t fund more containment',
      tone: 'bad',
    });
    sfx.bad();
    return;
  }
  const meters = { ...state.meters, cost: clamp(state.meters.cost + spec.cost) };
  const clock = { ...state.clock, hoursElapsed: state.clock.hoursElapsed + spec.hours };
  let next: GameState = applyNetworkTransitions(state, { ...state, network: net, meters, clock });
  next = { ...next, score: computeScore(next) };

  if (next.clock.hoursElapsed >= next.clock.deadlineHours && deadlineFail(next)) {
    endGame(next);
  } else {
    store.setState(next);
  }
}

/** Player containment actions dispatched from the map UI. */
export function networkIsolate(hostId: string): void {
  const net = store.getState().network;
  if (net.hosts[hostId]?.status === 'isolated') return;
  commitNetwork(isolate(net, hostId), ACTION_COST.isolate);
}

export function networkBlockC2(): void {
  const net = store.getState().network;
  if (net.c2Blocked) return;
  commitNetwork(blockC2(net), ACTION_COST.blockC2);
}

export function networkRotateCreds(): void {
  const net = store.getState().network;
  if (net.credsRotated) return;
  commitNetwork(rotateCreds(net), ACTION_COST.rotate);
}

function pickEligibleInject(state: GameState): Inject | null {
  // Difficulty caps how many crisis injects a run can throw at the player.
  if (state.firedInjects.length >= DIFFICULTY[state.difficulty].maxInjects) return null;
  const pool = state.mode === 'attacker' ? ATTACKER_INJECTS : INJECTS;
  const candidates = pool.filter(
    (i) =>
      !state.firedInjects.includes(i.id) &&
      state.clock.hoursElapsed >= i.afterHours &&
      (!i.requireFlags || i.requireFlags.every((f) => state.flags[f])) &&
      (!i.excludeFlags || !i.excludeFlags.some((f) => state.flags[f])),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Apply a player's response to a timed inject. */
export function resolveInject(injectId: string, choiceId: string): void {
  const state = store.getState();
  const inject = INJECT_BY_ID[injectId];
  const choice = inject?.choices.find((c) => c.id === choiceId);
  if (!inject || !choice) return;

  const e = choice.effects;
  const meters = {
    reputation: clamp(state.meters.reputation + (e.reputation ?? 0)),
    compliance: clamp(state.meters.compliance + (e.compliance ?? 0)),
    cost: clamp(state.meters.cost + (e.cost ?? 0)),
  };
  const flags = { ...state.flags };
  (e.setFlags ?? []).forEach((flag) => (flags[flag] = true));
  const clock = { ...state.clock, hoursElapsed: state.clock.hoursElapsed + (e.timeCostHours ?? 0) };

  const next: GameState = { ...state, meters, flags, clock, activeInject: null };
  next.score = computeScore(next);

  const netGood = (e.compliance ?? 0) + (e.reputation ?? 0) >= 0;
  if (netGood) sfx.good();
  else sfx.bad();
  emitChoiceToast(e);
  eventBus.emit('notify', { text: choice.feedback, tone: netGood ? 'good' : 'bad' });

  const deadlineMissed = next.clock.hoursElapsed >= next.clock.deadlineHours && deadlineFail(next);
  if (deadlineMissed) endGame(next);
  else store.setState(next);
}
