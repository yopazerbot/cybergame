// Live containment minigame — a pure model of the intrusion spreading across the
// corporate network. The scene clock drives `tickNetwork`; the UI dispatches
// actions (isolate / block C2 / rotate creds) via scoring.ts. No store import here
// (keeps it a pure, testable module).

export type HostStatus = 'secure' | 'compromised' | 'isolated';

export interface Host {
  id: string;
  label: string;
  kind: 'workstation' | 'server' | 'database' | 'backup';
  /** Normalised layout position (0..1) for the SVG map. */
  x: number;
  y: number;
  /** How attractive this host is as a spread target (DB is the prize). */
  priority: number;
  status: HostStatus;
  /** Game-hours since this host was compromised (drives the next hop). */
  sinceInfectedH: number;
}

export interface NetworkState {
  hosts: Record<string, Host>;
  edges: [string, string][];
  c2Blocked: boolean;
  credsRotated: boolean;
  /** 0..100 — share of the customer PII table exfiltrated to C2. */
  exfilPct: number;
}

export const ACTION_COST = {
  isolate: { hours: 2, cost: 3 },
  blockC2: { hours: 1, cost: 2 },
  rotate: { hours: 3, cost: 4 },
} as const;

const SPREAD_INTERVAL_H = 6; // base hours for a compromised host to take a neighbour
const SPREAD_INTERVAL_ROTATED_H = 11; // slower after credential rotation
const EXFIL_RATE_PER_H = 3.2; // %/hour while the DB is compromised and C2 is open

const HOST_DEFS: Omit<Host, 'status' | 'sinceInfectedH'>[] = [
  { id: 'wks', label: 'WKS-FIN-07', kind: 'workstation', x: 0.18, y: 0.3, priority: 0 },
  { id: 'dc', label: 'DC-01', kind: 'server', x: 0.5, y: 0.44, priority: 1 },
  { id: 'file', label: 'FILE-01', kind: 'server', x: 0.82, y: 0.34, priority: 1 },
  { id: 'db', label: 'DB-PROD-02', kind: 'database', x: 0.34, y: 0.74, priority: 3 },
  { id: 'backup', label: 'BACKUP-01', kind: 'backup', x: 0.76, y: 0.74, priority: 2 },
];

const EDGES: [string, string][] = [
  ['wks', 'dc'],
  ['dc', 'db'],
  ['dc', 'file'],
  ['db', 'backup'],
  ['file', 'backup'],
];

export function initialNetwork(): NetworkState {
  const hosts: Record<string, Host> = {};
  for (const d of HOST_DEFS) {
    // The kill-chain has already pivoted off patient zero by detection time.
    const compromised = d.id === 'wks' || d.id === 'dc';
    hosts[d.id] = { ...d, status: compromised ? 'compromised' : 'secure', sinceInfectedH: 0 };
  }
  return { hosts, edges: EDGES, c2Blocked: false, credsRotated: false, exfilPct: 0 };
}

function neighbours(net: NetworkState, id: string): string[] {
  const out: string[] = [];
  for (const [a, b] of net.edges) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}

/** Advance the spread + exfiltration by `dtHours`. Pure. */
export function tickNetwork(net: NetworkState, dtHours: number): NetworkState {
  const hosts: Record<string, Host> = {};
  for (const id of Object.keys(net.hosts)) hosts[id] = { ...net.hosts[id] };
  const interval = net.credsRotated ? SPREAD_INTERVAL_ROTATED_H : SPREAD_INTERVAL_H;

  for (const id of Object.keys(hosts)) {
    const h = hosts[id];
    if (h.status !== 'compromised') continue;
    h.sinceInfectedH += dtHours;
    if (h.sinceInfectedH < interval) continue;
    h.sinceInfectedH = 0;
    const targets = neighbours(net, id)
      .map((n) => hosts[n])
      .filter((n) => n.status === 'secure')
      .sort((a, b) => b.priority - a.priority);
    if (targets.length > 0) targets[0].status = 'compromised';
  }

  let exfilPct = net.exfilPct;
  if (hosts.db.status === 'compromised' && !net.c2Blocked) {
    exfilPct = Math.min(100, exfilPct + EXFIL_RATE_PER_H * dtHours);
  }

  return { ...net, hosts, exfilPct };
}

export function isolate(net: NetworkState, id: string): NetworkState {
  const h = net.hosts[id];
  if (!h || h.status === 'isolated') return net;
  return { ...net, hosts: { ...net.hosts, [id]: { ...h, status: 'isolated' } } };
}

export function blockC2(net: NetworkState): NetworkState {
  return net.c2Blocked ? net : { ...net, c2Blocked: true };
}

export function rotateCreds(net: NetworkState): NetworkState {
  return net.credsRotated ? net : { ...net, credsRotated: true };
}

export function isContained(net: NetworkState): boolean {
  return !Object.values(net.hosts).some((h) => h.status === 'compromised');
}

export function compromisedCount(net: NetworkState): number {
  return Object.values(net.hosts).filter((h) => h.status === 'compromised').length;
}
