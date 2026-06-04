import type { Effects } from './scenario';

// Random, time-pressured crisis "injects" that interrupt the incident. Each fires
// at most once, when its earliest hour is reached and its flag conditions hold.
// The player has `seconds` to choose before the `defaultChoice` auto-resolves.

export interface InjectChoice {
  id: string;
  label: string;
  tag?: string;
  effects: Effects;
  feedback: string;
}

export interface Inject {
  id: string;
  /** Earliest game-hour this can fire. */
  afterHours: number;
  /** Only fire if all these flags are set. */
  requireFlags?: string[];
  /** Suppress if any of these flags are set. */
  excludeFlags?: string[];
  /** Channel label + icon for flavour. */
  kicker: string;
  icon: string;
  heading: string;
  text: string;
  /** Real seconds before auto-resolve. */
  seconds: number;
  choices: InjectChoice[];
  /** Index auto-picked on timeout (usually the passive / worst option). */
  defaultChoice: number;
}

export const INJECTS: Inject[] = [
  {
    id: 'press_leak',
    afterHours: 8,
    excludeFlags: ['regulatorNotified'],
    kicker: 'BREAKING — Social media',
    icon: '📰',
    heading: 'A journalist is tweeting about the leak',
    text:
      'A tech reporter just posted: "Sources say [your company] suffered a major customer data breach. ' +
      'No comment from the company yet." It is gaining traction. Comms wants a line in the next two minutes.',
    seconds: 25,
    defaultChoice: 2,
    choices: [
      {
        id: 'holding',
        label: 'Issue an honest holding statement',
        tag: 'best practice',
        effects: { reputation: 6, cost: 2, setFlags: ['pressHandled'] },
        feedback:
          'A calm "we are investigating an incident and will update affected people" buys trust without over-promising.',
      },
      {
        id: 'deny',
        label: 'Deny everything for now',
        tag: 'risky',
        effects: { reputation: -16, compliance: -6, setFlags: ['pressDenied'] },
        feedback:
          'Denying a breach that later proves real is the fastest way to destroy credibility — and regulators notice.',
      },
      {
        id: 'silent',
        label: 'Stay silent, focus on response',
        effects: { reputation: -7, timeCostHours: 1 },
        feedback:
          'Silence lets the story write itself. A short holding line would have cost nothing and steadied things.',
      },
    ],
  },
  {
    id: 'second_beacon',
    afterHours: 4,
    excludeFlags: ['breachContained'],
    kicker: 'SOC ALERT — EDR',
    icon: '🚨',
    heading: 'A second C2 beacon just lit up',
    text:
      'The EDR flagged outbound traffic from a *different* host (WKS-HR-12) to a new C2 IP. The attacker may ' +
      'have a second foothold. Containment is not as complete as you thought.',
    seconds: 22,
    defaultChoice: 2,
    choices: [
      {
        id: 'isolate',
        label: 'Isolate WKS-HR-12 immediately',
        tag: 'best practice',
        effects: { compliance: 6, cost: 3, setFlags: ['secondFootholdContained'] },
        feedback: 'Fast isolation of the new host limits lateral spread. Right call.',
      },
      {
        id: 'monitor',
        label: 'Leave it up and monitor to learn more',
        tag: 'risky',
        effects: { compliance: -8, reputation: -4, timeCostHours: 3 },
        feedback:
          'Watching a live attacker is tempting, but every minute risks more exfiltration. Contain first, analyse from forensics.',
      },
      {
        id: 'ignore',
        label: 'Assume itʼs a false positive',
        effects: { compliance: -12, timeCostHours: 4, setFlags: ['missedSecondFoothold'] },
        feedback: 'Dismissing a fresh C2 beacon let the attacker dig in deeper. Costly.',
      },
    ],
  },
  {
    id: 'ceo_ransom',
    afterHours: 6,
    excludeFlags: ['ransomPaid', 'ransomRefused'],
    kicker: 'PHONE CALL — CEO',
    icon: '☎️',
    heading: 'The attacker is demanding a ransom',
    text:
      'A note appeared: pay 40 BTC and the stolen customer records "wonʼt be published". The CEO is panicking ' +
      'and wants to just pay to make it disappear. What do you advise?',
    seconds: 28,
    defaultChoice: 0,
    choices: [
      {
        id: 'refuse',
        label: 'Advise against paying; follow IR plan',
        tag: 'best practice',
        effects: { compliance: 8, reputation: 3, setFlags: ['ransomRefused'] },
        feedback:
          'Paying funds crime, gives no guarantee, and does not remove your GDPR duty to notify. Refusing is correct.',
      },
      {
        id: 'pay',
        label: 'Pay quietly to suppress the leak',
        tag: 'risky',
        effects: { cost: 28, compliance: -10, reputation: -6, setFlags: ['ransomPaid', 'coverup'] },
        feedback:
          'Paying to hide a breach is close to a cover-up — it does not erase the notification obligation and often backfires.',
      },
    ],
  },
  {
    id: 'regulator_call',
    afterHours: 30,
    excludeFlags: ['regulatorNotified'],
    kicker: 'PHONE CALL — Supervisory Authority',
    icon: '🏛️',
    heading: 'The regulator is calling — early',
    text:
      'The supervisory authority has "heard reports" and is on the line asking whether you have an incident. You ' +
      'have not formally notified yet. How do you handle the call?',
    seconds: 26,
    defaultChoice: 1,
    choices: [
      {
        id: 'transparent',
        label: 'Confirm, summarise, promise the Art.33 filing',
        tag: 'best practice',
        effects: { compliance: 7, reputation: 2, setFlags: ['regulatorEngaged'] },
        feedback: 'Cooperative transparency with the authority is a mitigating factor. Good.',
      },
      {
        id: 'stall',
        label: 'Say youʼre "still verifying", reveal little',
        effects: { compliance: -6, reputation: -3, timeCostHours: 1 },
        feedback:
          'Stonewalling the regulator rarely helps; candour about a known incident is expected under the GDPR.',
      },
    ],
  },
  {
    id: 'backup_encrypted',
    afterHours: 14,
    requireFlags: ['breachContained'],
    excludeFlags: ['backupHandled'],
    kicker: 'OPS — Recovery',
    icon: '💾',
    heading: 'Your latest backup is encrypted too',
    text:
      'Recovery just found the most recent nightly backup was also hit. The last clean restore point is 5 days old. ' +
      'Restoring it means losing recent data; rebuilding clean takes longer.',
    seconds: 24,
    defaultChoice: 1,
    choices: [
      {
        id: 'cleanroom',
        label: 'Rebuild from the clean restore point',
        tag: 'best practice',
        effects: { compliance: 4, cost: 8, timeCostHours: 2, setFlags: ['backupHandled'] },
        feedback: 'Restoring from a verified-clean point avoids reinfection. Slower, but safe.',
      },
      {
        id: 'risky_restore',
        label: 'Restore the newest backup to save time',
        tag: 'risky',
        effects: { compliance: -7, cost: 4, setFlags: ['backupHandled', 'reinfectionRisk'] },
        feedback:
          'Restoring a potentially-tainted backup risks dragging the attacker straight back in.',
      },
    ],
  },

  // ---- Consequence chains: these only fire BECAUSE of an earlier choice. ----

  // Fires only if you denied the press (press_leak → deny).
  {
    id: 'deny_backfires',
    afterHours: 12,
    requireFlags: ['pressDenied'],
    excludeFlags: ['pressRetracted'],
    kicker: 'BREAKING — Follow-up',
    icon: '🗞️',
    heading: 'Your denial just got contradicted',
    text:
      'The reporter published leaked internal tickets proving the breach you denied. "Company ' +
      'misled the public," the headline reads. The board is furious. This is the fallout from the denial.',
    seconds: 24,
    defaultChoice: 1,
    choices: [
      {
        id: 'retract',
        label: 'Retract, correct the record, apologise',
        tag: 'best practice',
        effects: { reputation: 6, compliance: 2, setFlags: ['pressRetracted'] },
        feedback:
          'Owning the correction fast caps the damage. A misstatement you fix beats one you defend.',
      },
      {
        id: 'doubledown',
        label: 'Double down on the denial',
        tag: 'risky',
        effects: { reputation: -16, compliance: -6, setFlags: ['pressRetracted', 'deepCoverup'] },
        feedback:
          'Defending a now-disproven denial is how a breach becomes a credibility scandal. Worst case.',
      },
    ],
  },

  // Fires only if you restored a tainted backup (backup_encrypted → risky_restore).
  {
    id: 'reinfection_hits',
    afterHours: 18,
    requireFlags: ['reinfectionRisk'],
    excludeFlags: ['reinfectionCleared'],
    kicker: 'SOC ALERT — EDR',
    icon: '♻️',
    heading: 'The restored system is beaconing again',
    text:
      'The backup you restored to save time carried the attacker’s persistence — fresh C2 traffic ' +
      'is back from the "recovered" host. The shortcut reopened the door.',
    seconds: 22,
    defaultChoice: 1,
    choices: [
      {
        id: 'cleanrebuild',
        label: 'Take it down, rebuild clean this time',
        tag: 'best practice',
        effects: { compliance: 6, cost: 8, timeCostHours: 3, setFlags: ['reinfectionCleared'] },
        feedback: 'Doing it right the second time stops the loop. Reinfection is why clean-room recovery exists.',
      },
      {
        id: 'patchpray',
        label: 'Kill the beacon and keep running',
        tag: 'risky',
        effects: { compliance: -9, reputation: -3, timeCostHours: 2, setFlags: ['reinfectionCleared'] },
        feedback:
          'Swatting the symptom leaves the persistence in place — you’ll keep paying for the rushed restore.',
      },
    ],
  },

  // Fires only if you paid the ransom to hush it up (ceo_ransom → pay sets `coverup`).
  {
    id: 'coverup_whistleblower',
    afterHours: 16,
    requireFlags: ['coverup'],
    excludeFlags: ['regulatorNotified', 'whistleblowerHandled'],
    kicker: 'INTERNAL — HR',
    icon: '🧑‍⚖️',
    heading: 'An employee threatens to go public',
    text:
      'A team member who knows you quietly paid to bury the breach says they’ll report it to the ' +
      'authority unless the company notifies properly. The cover-up is unravelling from inside.',
    seconds: 26,
    defaultChoice: 1,
    choices: [
      {
        id: 'comeclean',
        label: 'Stop, disclose properly, notify the authority',
        tag: 'best practice',
        effects: { compliance: 8, reputation: 2, setFlags: ['whistleblowerHandled'] },
        feedback:
          'Reversing course and notifying — even late — beats a concealed breach exposed by a whistleblower.',
      },
      {
        id: 'pressure',
        label: 'Pressure them with an NDA to stay silent',
        tag: 'risky',
        effects: { compliance: -10, reputation: -8, setFlags: ['whistleblowerHandled', 'deepCoverup'] },
        feedback:
          'Silencing a whistleblower compounds the cover-up — exactly the conduct regulators punish hardest.',
      },
    ],
  },
];

// Attacker-campaign injects: blue-team pressure events. Meters read as
// Stealth (compliance) / Loot (reputation) / Heat (cost). The "quiet" option is
// the smart tradecraft; each teaches the defensive control behind it.
export const ATTACKER_INJECTS: Inject[] = [
  {
    id: 'soc_flag',
    afterHours: 5,
    excludeFlags: ['tracksCovered'],
    kicker: 'SIGNAL — Their SOC',
    icon: '🛰️',
    heading: 'The SOC flagged your beacon',
    text:
      'An analyst opened a ticket on the periodic outbound traffic from your foothold. They are ' +
      'not sure yet what it is. Push on, or go quiet?',
    seconds: 24,
    defaultChoice: 2,
    choices: [
      {
        id: 'soc_quiet',
        label: 'Lengthen the beacon interval and add jitter',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, cost: -4, timeCostHours: 2 },
        feedback:
          'Slowing and randomising C2 beaconing defeats naive interval-detection. Defenders counter ' +
          'with JA3/TLS fingerprinting and long-haul beacon analytics, not just fixed-interval rules.',
      },
      {
        id: 'soc_push',
        label: 'Race to finish before they triage',
        tag: 'loud',
        effects: { reputation: 4, cost: 10 },
        feedback:
          'Speeding up spikes your traffic and confirms the analyst’s suspicion — Heat way up. A calm ' +
          'SOC wants exactly this panic.',
      },
      {
        id: 'soc_ignore',
        label: 'Do nothing and hope they close it',
        effects: { cost: 6, timeCostHours: 1 },
        feedback:
          'Hope is not tradecraft. An open ticket on unexplained egress almost always escalates to a hunt.',
      },
    ],
  },
  {
    id: 'edr_quarantine',
    afterHours: 9,
    requireFlags: ['accessGained'],
    excludeFlags: ['tracksCovered'],
    kicker: 'ALERT — Endpoint EDR',
    icon: '🧯',
    heading: 'EDR quarantined one of your hosts',
    text:
      'Your implant on a workstation just got isolated by their EDR. You still hold other access. ' +
      'How do you react?',
    seconds: 22,
    defaultChoice: 1,
    choices: [
      {
        id: 'edr_lowprofile',
        label: 'Abandon that host, fall back to living-off-the-land',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, cost: -3, timeCostHours: 2 },
        feedback:
          'Burning a caught implant and pivoting to built-in tooling (T1218) keeps you under the EDR’s ' +
          'signatures. This is why defenders need behavioural detection + tiered admin, not just AV.',
      },
      {
        id: 'edr_repersist',
        label: 'Redeploy the same implant elsewhere immediately',
        tag: 'loud',
        effects: { compliance: -6, cost: 11 },
        feedback:
          'Re-dropping a signatured implant lights up every other EDR sensor — you hand the defenders ' +
          'your IOCs and a clean attribution trail.',
      },
    ],
  },
  {
    id: 'threat_hunt',
    afterHours: 20,
    excludeFlags: ['dataExfiltrated'],
    kicker: 'INTEL — Threat hunt',
    icon: '🔦',
    heading: 'A proactive threat-hunt sweep has started',
    text:
      'Word is their team kicked off a hunt across the estate. The customer database is in reach ' +
      'but not yet exfiltrated. Grab it now, or wait them out?',
    seconds: 26,
    defaultChoice: 0,
    choices: [
      {
        id: 'hunt_lowandslow',
        label: 'Stay dark and wait for the sweep to pass',
        tag: 'quiet tradecraft',
        effects: { compliance: 7, cost: -3, timeCostHours: 4 },
        feedback:
          'Patience beats a hunt — going dormant denies hunters the live activity they look for. The ' +
          'trade-off is time, which is exactly the pressure a good hunt applies.',
      },
      {
        id: 'hunt_grabnow',
        label: 'Bulk-pull the database before they reach it',
        tag: 'loud',
        effects: { reputation: 10, cost: 14, setFlags: ['loud'] },
        feedback:
          'A bulk egress mid-hunt is the loudest possible move — DLP and NetFlow will catch it. High ' +
          'Loot, very high Heat.',
      },
    ],
  },

  // Consequence chain: only fires if you went loud (threat_hunt → hunt_grabnow).
  {
    id: 'loud_attribution',
    afterHours: 22,
    requireFlags: ['loud'],
    excludeFlags: ['tracksCovered', 'attributionDodged'],
    kicker: 'INTEL — Incident response',
    icon: '🎯',
    heading: 'Your noisy pull kicked off an IR effort',
    text:
      'The bulk egress lit up DLP and the SOC has spun up full incident response — they’re pulling ' +
      'NetFlow and pivoting on your C2. They are now hunting *you*, specifically. Adapt or get pinned.',
    seconds: 24,
    defaultChoice: 1,
    choices: [
      {
        id: 'burn_infra',
        label: 'Burn the infrastructure, exfil via a fresh channel',
        tag: 'quiet tradecraft',
        effects: { compliance: 6, cost: -5, timeCostHours: 3, setFlags: ['attributionDodged'] },
        feedback:
          'Rotating C2 infrastructure and redundant egress paths breaks the attribution thread. ' +
          'This is exactly why defenders need IOC-independent, behavioural detection.',
      },
      {
        id: 'keep_channel',
        label: 'Keep using the same channel to finish fast',
        tag: 'loud',
        effects: { compliance: -7, cost: 11, setFlags: ['attributionDodged', 'gotCaught'] },
        feedback:
          'Reusing burned infrastructure under active IR hands the SOC a clean attribution trail. Caught.',
      },
    ],
  },
];

export const INJECT_BY_ID: Record<string, Inject> = Object.fromEntries(
  [...INJECTS, ...ATTACKER_INJECTS].map((i) => [i.id, i]),
);
