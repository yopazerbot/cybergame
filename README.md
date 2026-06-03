# Breach! — GDPR Incident Simulator 🛡️

A browser-based, **top-down pixel-art** cybersecurity incident simulation. You play the
**Incident Commander** during a personal-data breach: walk a pixel-art office, consult each
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
- **Phaser 3** renders the walkable top-down world (click-to-move A\* pathfinding, animated
  pixel-art character sprites + procedurally-generated tiles/furniture).
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
npm run build    # -> dist/
npm run start    # serves dist/ on $PORT (default 3000)
```

## Deploy on Railway

This repo is Railway-ready (see `railway.json`):

1. Create a new Railway project from this GitHub repo.
2. Railway (Nixpacks) runs `npm run build`, then `npm run start`.
3. `npm run start` serves the static `dist/` build on Railway's injected `$PORT`.

No environment variables are required. The app is a static SPA, so any static host works too
(point it at `dist/`).

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

- Character pixel-art sprites from the **pixel-agents** project by Pablo De Lucca (MIT licensed).
  See `public/assets/CHARACTERS_LICENSE_pixel-agents.txt`.
- Tiles, furniture and UI are generated procedurally in this project.

> Educational simulation — a simplified model of GDPR Articles 33 & 34, not legal advice.
