import type { Role } from '../core/types';
import type { Stakeholder } from './stakeholders';
import type { DecisionNode } from './scenario';
import type { DebriefItem } from './debrief';

// ---------------------------------------------------------------------------
// Red-team campaign: the same intrusion told from the attacker's seat, as a
// MITRE ATT&CK kill chain (recon → access → escalation → exfiltration → cover
// tracks). It is deliberately strategic, not operational — every node teaches
// what the technique IS and how blue teams detect/stop it (see ATTACKER_DEBRIEF).
//
// Meters are re-skinned: compliance = Stealth, reputation = Loot, cost = Heat.
// The clock is the window before the SOC notices. It reuses the defender engine
// via the campaign selector; only the data differs.
// ---------------------------------------------------------------------------

export const ATTACKER_INTRO =
  'You run a financially-motivated intrusion crew. The target: a company holding a fat ' +
  'customer PII database. You have a window before their SOC catches on — get in, escalate, ' +
  'exfiltrate the records and vanish without being attributed. Move quietly: every noisy step ' +
  'raises Heat and shortens your window.';

// Personas reuse the six office tiles so the walkable world is unchanged.
export const ATTACKER_STAKEHOLDERS: Stakeholder[] = [
  {
    id: 'tech',
    name: 'RECON-RIG',
    title: 'Reconnaissance',
    emoji: '🛰️',
    colors: { body: 0x3aa6b9, accent: 0x0c343b },
    grid: { gx: 3, gy: 2 },
    blurb: 'Your recon console — map the target before you touch it.',
  },
  {
    id: 'dpo',
    name: 'The Broker',
    title: 'Initial Access',
    emoji: '🎣',
    colors: { body: 0x00b894, accent: 0x064a3a },
    grid: { gx: 7, gy: 2 },
    blurb: 'Sells you a way in — phish, exploit or stolen credentials.',
  },
  {
    id: 'customer',
    name: 'The Mole',
    title: 'Insider Contact',
    emoji: '🕵️',
    colors: { body: 0xc9a227, accent: 0x5a4810 },
    grid: { gx: 3, gy: 9 },
    blurb: 'An employee who can be turned for quiet, legitimate access.',
  },
  {
    id: 'ciso',
    name: 'PRIV-KIT',
    title: 'Escalation & Lateral',
    emoji: '🧬',
    colors: { body: 0x9b59b6, accent: 0x3a1d49 },
    grid: { gx: 2, gy: 7 },
    blurb: 'Turn a foothold into domain control and reach the database.',
  },
  {
    id: 'regulator',
    name: 'The Fence',
    title: 'Exfiltration & Cash-out',
    emoji: '💱',
    colors: { body: 0xe056a0, accent: 0x5e1f43 },
    grid: { gx: 10, gy: 9 },
    blurb: 'Moves the stolen data out and turns it into money.',
  },
  {
    id: 'management',
    name: 'The Boss',
    title: 'Operation Lead',
    emoji: '🎩',
    colors: { body: 0xe17055, accent: 0x5e2317 },
    grid: { gx: 9, gy: 7 },
    blurb: 'Calls the getaway — cover the tracks and stay unattributed.',
  },
];

export const ATTACKER_STAKEHOLDER_BY_ID = Object.fromEntries(
  ATTACKER_STAKEHOLDERS.map((s) => [s.id, s]),
) as Record<Role, Stakeholder>;

export const ATTACKER_PHASE_ORDER = [
  'recon',
  'access',
  'escalation',
  'exfiltration',
  'coverup',
] as const;

export const ATTACKER_NODES: DecisionNode[] = [
  // ----------------------------------------------------------------- RECON
  {
    id: 'rec_scan',
    stakeholder: 'tech',
    phase: 'recon',
    oneShot: true,
    heading: 'Reconnaissance (TA0043)',
    prompt:
      'RECON-RIG: "Before we touch anything — how do we map the target? Loud gets us answers ' +
      'fast; quiet keeps us off their radar."',
    choices: [
      {
        id: 'rec_passive',
        label: 'Passive OSINT only — public records, certs, breach dumps',
        tag: 'quiet tradecraft',
        effects: { compliance: 8, reputation: 2, timeCostHours: 3, setFlags: ['reconDone'], advancePhaseTo: 'access' },
        feedback:
          'Passive reconnaissance touches no target system, so it leaves nothing in their logs. ' +
          'Slow, but invisible — exactly why defenders cannot rely on perimeter alerts alone.',
      },
      {
        id: 'rec_activescan',
        label: 'Active port + vuln scan of their perimeter',
        tag: 'loud',
        effects: { compliance: -6, reputation: 4, cost: 10, timeCostHours: 1, setFlags: ['reconDone', 'loud'], advancePhaseTo: 'access' },
        feedback:
          'Active scanning (T1595) is fast but trips IDS/IPS and fills their firewall logs with ' +
          'your source IP. A competent SOC sees a scan as the opening move of an attack.',
      },
      {
        id: 'rec_buy',
        label: 'Buy a target dossier from an access broker',
        effects: { compliance: 3, cost: 4, reputation: 2, timeCostHours: 2, setFlags: ['reconDone'], advancePhaseTo: 'access' },
        feedback:
          'Buying intel offloads the noise to someone else, but ties you to a criminal supplier ' +
          'who may be an informant or already under surveillance.',
      },
    ],
  },
  // ---------------------------------------------------------------- ACCESS
  {
    id: 'acc_method',
    stakeholder: 'dpo',
    phase: 'access',
    oneShot: true,
    heading: 'Initial Access (TA0001)',
    prompt:
      'The Broker: "Three ways through the front door. Pick your poison — each one trades noise ' +
      'for speed."',
    choices: [
      {
        id: 'acc_phish',
        label: 'Targeted spear-phish with a believable pretext',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, reputation: 3, cost: 2, timeCostHours: 2, setFlags: ['accessGained'], advancePhaseTo: 'escalation' },
        feedback:
          'Spear-phishing (T1566) abuses people, not unpatched software. Defenders counter it with ' +
          'MFA, attachment sandboxing, link rewriting and user reporting — not just patching.',
      },
      {
        id: 'acc_exploit',
        label: 'Exploit an unpatched public-facing app',
        tag: 'loud',
        effects: { compliance: -5, reputation: 5, cost: 9, timeCostHours: 1, setFlags: ['accessGained', 'loud'], advancePhaseTo: 'escalation' },
        feedback:
          'Exploiting a public app (T1190) is fast but throws errors and crash artefacts a WAF and ' +
          'app logs will show. Timely patching and virtual patching close this door.',
      },
      {
        id: 'acc_buycreds',
        label: 'Log in with valid credentials bought online',
        effects: { compliance: 4, reputation: 2, cost: 5, timeCostHours: 1, setFlags: ['accessGained'], advancePhaseTo: 'escalation' },
        feedback:
          'Valid accounts (T1078) look like a normal login — which is why MFA and impossible-travel ' +
          'and new-device detection are the controls that actually catch it.',
      },
    ],
  },
  {
    id: 'acc_insider',
    stakeholder: 'customer',
    phase: 'access',
    oneShot: true,
    heading: 'Insider angle (optional)',
    prompt:
      'The Mole: "There is someone on the inside who is unhappy. We can use them — gently, or with ' +
      'leverage."',
    choices: [
      {
        id: 'ins_recruit',
        label: 'Recruit them quietly with a cash incentive',
        tag: 'quiet tradecraft',
        effects: { compliance: 5, reputation: 4, cost: 3, timeCostHours: 2, setFlags: ['insiderHelp'] },
        feedback:
          'A willing insider grants access that looks fully legitimate (T1078). Least-privilege, ' +
          'segregation of duties and user-behaviour analytics (UEBA) are how blue teams limit the blast radius.',
      },
      {
        id: 'ins_coerce',
        label: 'Blackmail them into helping',
        tag: 'loud',
        effects: { compliance: -6, reputation: 3, cost: 9, timeCostHours: 1, setFlags: ['insiderHelp', 'loud'] },
        feedback:
          'Coercion makes the insider erratic and likely to confess. Insider-threat programmes and ' +
          'anonymous reporting turn a coerced employee into your biggest liability.',
      },
    ],
  },
  // ------------------------------------------------------------- ESCALATION
  {
    id: 'esc_privesc',
    stakeholder: 'ciso',
    phase: 'escalation',
    oneShot: true,
    heading: 'Privilege Escalation & Lateral Movement (TA0004 / TA0008)',
    prompt:
      'PRIV-KIT: "We have a foothold. Now we need domain rights and a path to the database host. ' +
      'How hard do we push?"',
    choices: [
      {
        id: 'esc_lolbins',
        label: 'Live off the land — built-in tools, token theft',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, reputation: 4, cost: 2, timeCostHours: 3, setFlags: ['privEscalated'], advancePhaseTo: 'exfiltration' },
        feedback:
          'Living-off-the-land (T1218) blends into normal admin activity. Defenders need behavioural ' +
          'EDR, Credential Guard and tiered admin to spot it — signature AV alone misses it.',
      },
      {
        id: 'esc_mimikatz',
        label: 'Dump LSASS with a known credential tool',
        tag: 'loud',
        effects: { compliance: -6, reputation: 6, cost: 10, timeCostHours: 1, setFlags: ['privEscalated', 'loud'], advancePhaseTo: 'exfiltration' },
        feedback:
          'OS credential dumping (T1003) via off-the-shelf tooling is heavily signatured — modern ' +
          'EDR flags LSASS access instantly. Fast loot, lots of Heat.',
      },
      {
        id: 'esc_kerberoast',
        label: 'Kerberoast service accounts and crack offline',
        effects: { compliance: 3, reputation: 4, cost: 5, timeCostHours: 2, setFlags: ['privEscalated'], advancePhaseTo: 'exfiltration' },
        feedback:
          'Kerberoasting (T1558.003) is quiet on the wire but the ticket requests are visible to ' +
          'defenders who monitor for them — and strong service-account passwords defeat the crack.',
      },
    ],
  },
  // ------------------------------------------------------------ EXFILTRATION
  {
    id: 'exf_steal',
    stakeholder: 'regulator',
    phase: 'exfiltration',
    oneShot: true,
    heading: 'Exfiltration (TA0010)',
    prompt:
      'The Fence: "The customer table is in reach. How do we get it out and turn it into money?"',
    choices: [
      {
        id: 'exf_lowslow',
        label: 'Low-and-slow over HTTPS, blend into normal traffic',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, reputation: 12, cost: 3, timeCostHours: 3, setFlags: ['dataExfiltrated', 'soldData'], advancePhaseTo: 'coverup' },
        feedback:
          'Throttled exfiltration over a trusted protocol (T1041/T1567) hides under normal volume. ' +
          'DLP, egress filtering and NetFlow baselining are what surface the slow leak.',
      },
      {
        id: 'exf_bulk',
        label: 'Bulk-dump the whole database fast',
        tag: 'loud',
        effects: { compliance: -8, reputation: 16, cost: 12, timeCostHours: 1, setFlags: ['dataExfiltrated', 'soldData', 'loud'], advancePhaseTo: 'coverup' },
        feedback:
          'A big, fast egress spike is the single clearest breach signal — DLP and NetFlow anomaly ' +
          'detection light up. Maximum loot, maximum Heat.',
      },
      {
        id: 'exf_ransom',
        label: 'Exfiltrate AND encrypt for double extortion',
        tag: 'loud',
        effects: { compliance: -6, reputation: 10, cost: 11, timeCostHours: 2, setFlags: ['dataExfiltrated', 'soldData', 'loud'], advancePhaseTo: 'coverup' },
        feedback:
          'Double extortion (T1486 + exfil) raises the payout pressure but the encryption itself is ' +
          'loud and triggers immediate incident response — and good offline backups blunt the leverage.',
      },
    ],
  },
  // ---------------------------------------------------------------- COVERUP
  {
    id: 'boss_getaway',
    stakeholder: 'management',
    phase: 'coverup',
    oneShot: true,
    heading: 'Cover Tracks & Getaway (TA0005)',
    prompt:
      'The Boss: "Last move. How we leave decides whether they ever put a name to this."',
    choices: [
      {
        id: 'cov_clean',
        label: 'Wipe logs, timestomp, remove tooling, launder funds',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, cost: -12, timeCostHours: 2, setFlags: ['tracksCovered'] },
        feedback:
          'Indicator removal (T1070) frustrates investigators — but forwarded, immutable (WORM) ' +
          'logs in a SIEM survive local wiping, which is exactly why defenders ship logs off-host.',
      },
      {
        id: 'cov_wiper',
        label: 'Detonate a wiper to destroy the evidence',
        tag: 'loud',
        effects: { compliance: -10, reputation: 2, cost: 16, setFlags: ['tracksCovered', 'gotCaught'] },
        feedback:
          'A destructive wiper is deafening — it guarantees an all-hands incident response and law ' +
          'enforcement involvement, and forensics still recovers plenty. The worst possible exit.',
      },
      {
        id: 'cov_cashout',
        label: 'Skip cleanup — cash out and run now',
        effects: { reputation: 6, cost: 8 },
        feedback:
          'Leaving your tooling and logs behind hands investigators a clean forensic trail and ' +
          'attribution. Fast money, but you are now a name on an indictment.',
      },
    ],
  },
];

export const ATTACKER_NODE_BY_ID: Record<string, DecisionNode> = Object.fromEntries(
  ATTACKER_NODES.map((n) => [n.id, n]),
);

// "Know your adversary" debrief — each stage mapped to the defensive control
// that stops it. The whole point of the red-team campaign is blue-team learning.
export const ATTACKER_DEBRIEF: DebriefItem[] = [
  {
    heading: '1 · Reconnaissance is mostly invisible',
    body:
      'Passive OSINT (TA0043) never touches your systems, so perimeter alerts will not see it. ' +
      'Reduce your attack surface instead: minimise public data, monitor for leaked credentials, ' +
      'and treat exposed services as already-known to attackers.',
  },
  {
    heading: '2 · Initial access abuses people and unpatched edges',
    body:
      'Phishing (T1566), public-app exploits (T1190) and valid stolen accounts (T1078) are the top ' +
      'three doors in. Phishing-resistant MFA, rapid patching/virtual patching, attachment ' +
      'sandboxing and new-device/impossible-travel detection close them.',
  },
  {
    heading: '3 · Credential theft enables everything after',
    body:
      'Escalation and lateral movement run on stolen credentials (T1003) and living-off-the-land ' +
      '(T1218). Credential Guard, tiered/least-privilege admin, strong service-account passwords and ' +
      'behavioural EDR (not signature AV) are what catch the quiet variants.',
  },
  {
    heading: '4 · Exfiltration is where DLP earns its keep',
    body:
      'Whether low-and-slow (T1041) or a bulk dump, data leaving the network is the clearest breach ' +
      'signal. Egress filtering, DLP, and NetFlow/volume baselining surface it — and offline, ' +
      'immutable backups remove ransomware leverage.',
  },
  {
    heading: '5 · You cannot un-ring the bell',
    body:
      'Cover-tracks (T1070) only works against logs the attacker can reach. Ship logs off-host to a ' +
      'WORM/immutable SIEM, alert on log-clearing and time anomalies, and keep forensic readiness so ' +
      'every intrusion ends in attribution, not a clean getaway.',
  },
];
