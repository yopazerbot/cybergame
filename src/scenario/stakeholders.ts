import type { Role } from '../core/types';

// Data-driven NPC definitions. Tile positions match the office layout in OfficeScene.
// Sprites are generated procedurally from `colors` + `emoji` (no external art).

export interface Stakeholder {
  id: Role;
  name: string;
  title: string;
  emoji: string;
  colors: { body: number; accent: number };
  /** Station tile the NPC stands on (blocked for pathfinding). */
  grid: { gx: number; gy: number };
  blurb: string;
}

export const STAKEHOLDERS: Stakeholder[] = [
  {
    id: 'tech',
    name: 'Sam Okoye',
    title: 'IT / SOC Analyst',
    emoji: '🧑‍💻',
    colors: { body: 0x3aa6b9, accent: 0x123c43 },
    grid: { gx: 2, gy: 2 },
    blurb: 'Runs the SOC. Lives in the SIEM, EDR console and packet captures.',
  },
  {
    id: 'ciso',
    name: 'Dana Reyes',
    title: 'CISO',
    emoji: '🛡️',
    colors: { body: 0x6c5ce7, accent: 0x2d2466 },
    grid: { gx: 2, gy: 9 },
    blurb: 'Owns the incident response plan and the risk call.',
  },
  {
    id: 'dpo',
    name: 'Mara Lindqvist',
    title: 'Data Protection Officer',
    emoji: '⚖️',
    colors: { body: 0x00b894, accent: 0x0a5e4a },
    grid: { gx: 9, gy: 2 },
    blurb: 'Decides if this is a notifiable personal-data breach under the GDPR.',
  },
  {
    id: 'management',
    name: 'Victor Crane',
    title: 'CEO / Management',
    emoji: '👔',
    colors: { body: 0xe17055, accent: 0x6e2f22 },
    grid: { gx: 9, gy: 9 },
    blurb: 'Signs off on disclosure, budget and external messaging.',
  },
  {
    id: 'regulator',
    name: 'APD/GBA Desk',
    title: 'Supervisory Authority',
    emoji: '🏛️',
    colors: { body: 0x636e72, accent: 0x2d3436 },
    grid: { gx: 5, gy: 11 },
    blurb: 'The data protection authority. Expects an Art. 33 notification within 72h.',
  },
  {
    id: 'customer',
    name: 'Priya N.',
    title: 'Affected Customer',
    emoji: '🙍',
    colors: { body: 0xfdcb6e, accent: 0x8a6d1f },
    grid: { gx: 11, gy: 5 },
    blurb: 'One of the data subjects whose records were in the exposed table.',
  },
];

export const STAKEHOLDER_BY_ID: Record<Role, Stakeholder> = Object.fromEntries(
  STAKEHOLDERS.map((s) => [s.id, s]),
) as Record<Role, Stakeholder>;
