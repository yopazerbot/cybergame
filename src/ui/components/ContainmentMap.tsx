import { useState } from 'react';
import { useStore } from '../useStore';
import {
  networkIsolate,
  networkBlockC2,
  networkRotateCreds,
  responseBudgetLeft,
  canAfford,
} from '../../scenario/scoring';
import { isContained, compromisedCount, ACTION_COST } from '../../scenario/network';

const STATUS_COLOR: Record<string, string> = {
  secure: '#21a366',
  compromised: '#e8554e',
  isolated: '#8a93b4',
};
const KIND_ICON: Record<string, string> = {
  workstation: '🖥️',
  server: '🗄️',
  database: '🛢️',
  backup: '💾',
};

const C2 = { x: 50, y: 8 };

// Real-time containment minigame: isolate hosts / block C2 / rotate creds to stop
// the intrusion before it reaches the customer DB and exfiltrates. The game clock
// keeps running while this is open — the threat is live.
// Always-on compact panel docked in the UI (defender mode): the live intrusion
// map, so containment is part of the screen rather than a modal you open.
export function ContainmentMap() {
  const state = useStore();
  const net = state.network;
  const byId = net.hosts;
  const hosts = Object.values(byId);
  const [sel, setSel] = useState<string | null>(null);
  const contained = isContained(net);
  const selHost = sel ? byId[sel] : null;
  const budget = Math.round(responseBudgetLeft(state));

  return (
    <div className="net-dock">
      <div className="card net-dock-card">
        <div className="net-head">
          <div className="net-title">🛰️ Live containment</div>
          <div className={`net-status ${contained ? 'good' : 'bad'}`}>
            {contained ? '✅ Contained' : `🔴 ${compromisedCount(net)}`}
          </div>
        </div>

        <div className="net-budget">
          <span>Budget</span>
          <div className="net-budget-bar">
            <div
              className={budget <= 12 ? 'crit' : ''}
              style={{ width: `${Math.min(100, budget)}%` }}
            />
          </div>
          <strong>{budget}</strong>
        </div>

        <div className="net-exfil">
          <span>Exfil</span>
          <div className="net-exfil-bar">
            <div
              className={net.exfilPct >= 50 ? 'crit' : ''}
              style={{ width: `${net.exfilPct}%` }}
            />
          </div>
          <strong>{Math.round(net.exfilPct)}%</strong>
        </div>

        <svg className="net-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {net.edges.map(([a, b], i) => (
            <line
              key={i}
              x1={byId[a].x * 100}
              y1={byId[a].y * 100}
              x2={byId[b].x * 100}
              y2={byId[b].y * 100}
              className="net-edge"
            />
          ))}
          <line
            x1={C2.x}
            y1={C2.y}
            x2={byId.wks.x * 100}
            y2={byId.wks.y * 100}
            className="net-edge c2"
          />
          {byId.db.status === 'compromised' && !net.c2Blocked && (
            <line
              x1={byId.db.x * 100}
              y1={byId.db.y * 100}
              x2={C2.x}
              y2={C2.y}
              className="net-exfil-line"
            />
          )}

          <g className={`net-c2 ${net.c2Blocked ? 'blocked' : ''}`}>
            <circle cx={C2.x} cy={C2.y} r="6.5" />
            <text x={C2.x} y={C2.y + 2.6} className="net-c2-label">
              C2
            </text>
          </g>

          {hosts.map((h) => (
            <g
              key={h.id}
              className={`net-node ${h.status} ${sel === h.id ? 'sel' : ''}`}
              onClick={() => setSel(h.id)}
            >
              <circle cx={h.x * 100} cy={h.y * 100} r="7.5" fill={STATUS_COLOR[h.status]} />
              <text x={h.x * 100} y={h.y * 100 + 2.4} className="net-node-ico">
                {KIND_ICON[h.kind]}
              </text>
              <text x={h.x * 100} y={h.y * 100 + 13} className="net-node-label">
                {h.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="net-actions">
          {selHost ? (
            <div className="net-sel">
              <span>
                <strong>{selHost.label}</strong> · {selHost.status}
              </span>
              <button
                className="btn primary"
                disabled={selHost.status === 'isolated' || !canAfford(state, ACTION_COST.isolate.cost)}
                onClick={() => networkIsolate(selHost.id)}
              >
                {selHost.status === 'isolated'
                  ? 'Isolated ✓'
                  : `Isolate host  −${ACTION_COST.isolate.hours}h · ${ACTION_COST.isolate.cost}💶`}
              </button>
            </div>
          ) : (
            <span className="net-hint">Select a host to isolate it. The clock keeps ticking.</span>
          )}
          <div className="net-global">
            <button
              className="btn"
              disabled={net.c2Blocked || !canAfford(state, ACTION_COST.blockC2.cost)}
              onClick={() => networkBlockC2()}
            >
              {net.c2Blocked
                ? 'C2 blocked ✓'
                : `Block C2  −${ACTION_COST.blockC2.hours}h · ${ACTION_COST.blockC2.cost}💶`}
            </button>
            <button
              className="btn"
              disabled={net.credsRotated || !canAfford(state, ACTION_COST.rotate.cost)}
              onClick={() => networkRotateCreds()}
            >
              {net.credsRotated
                ? 'Creds rotated ✓'
                : `Rotate creds  −${ACTION_COST.rotate.hours}h · ${ACTION_COST.rotate.cost}💶`}
            </button>
          </div>
          {budget <= 12 && !contained && (
            <span className="net-hint warn">
              Budget nearly spent — prioritise the highest-value hosts.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
