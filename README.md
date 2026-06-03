# Breach! — GDPR Incident Simulator 🛡️

A browser-based, **Habbo-style isometric** cybersecurity incident simulation. You play the
**Incident Commander** during a personal-data breach: walk an isometric office, consult each
stakeholder (SOC/Tech, CISO, DPO, Management, the Supervisory Authority and an affected
Customer), and make the calls that decide whether you contain the intrusion, stay compliant
with the **GDPR 72-hour notification clock (Art. 33 / 34)**, and protect the people whose data
was exposed.

The technical scenario follows a realistic intrusion kill-chain — EDR/Sysmon endpoint
detection, encoded-PowerShell loader, LSASS credential dumping, privilege escalation, WinRM
lateral movement to a database server, and exfiltration of a customer PII table — and rewards
evidence-led containment and forensics over panic moves.

## Tech

- **Vite + TypeScript** build.
- **Phaser 3** renders the walkable isometric world (click-to-move A\* pathfinding, procedural
  art — every tile, wall, prop and character is generated at runtime, no external image assets).
- **React** renders the UI overlay (HUD, 72h timer, dialogue/decision panels, debrief).
- The Phaser world and React UI never import each other — they share a tiny observable
  `store` (`src/core/store.ts`) and a typed `eventBus`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a production bundle:

```bash
npm run build       # -> dist/
npm run start       # Express server: serves dist/ + scoreboard API on $PORT (default 3000)
```

For local API work in dev, run the server alongside Vite (the dev server proxies `/api` to it):

```bash
npm run dev:server  # scoreboard API on :3000
npm run dev         # app on :5173, /api proxied to :3000
```

## Backend & cross-session scoreboard

`server/index.js` is a tiny Express app that serves the built SPA **and** exposes a global
leaderboard API:

- `GET /api/scores` — top scores.
- `POST /api/scores` — submit `{ name, score, ending, difficulty, hoursLeft, compliance, reputation }`.

Scores persist to `${DATA_DIR}/scores.json`. The client fails soft — if the API is
unreachable the game still works fully (the leaderboard just shows empty).

## Deploy on Railway

This repo is Railway-ready (see `railway.json`):

1. Create a new Railway project from this GitHub repo.
2. Railway (Nixpacks) runs `npm run build`, then `npm run start` (the Express server).
3. **Add a Volume** so the leaderboard survives deploys/restarts:
   - Mount it at e.g. `/data`.
   - Set env var **`DATA_DIR=/data`**.

   Without a volume the scoreboard still works but resets whenever the container is replaced.

## How to play

- 🖱️ **Click the floor** to walk the office.
- Stand next to a colleague and **press `Space`** (or click them) to talk.
- Work the incident in a sensible order — the **checklist** (bottom-right) tracks progress.
- ⏱️ You have **72 game-hours**; deliberation and wrong turns burn time.
- The end screen scores you and **debriefs the correct GDPR response**.

## Project layout

```
src/
  core/        store, event bus, shared types, tunables
  game/        Phaser: iso math, A* pathfinding, procedural textures, scenes, entities
  scenario/    data-driven content: stakeholders, decision nodes, scoring, debrief
  ui/          React overlay: HUD, dialogue, objectives, debrief
```

To tune difficulty, edit `src/core/config.ts` (timer, scoring weights) or the decision
`effects` in `src/scenario/scenario.ts`.

## Credits

Made by **Yoshi Parlevliet**. All art (tiles, walls, furniture, characters) is generated
procedurally in code — no external image assets.

> Educational simulation — a simplified model of GDPR Articles 33 & 34, not legal advice.
