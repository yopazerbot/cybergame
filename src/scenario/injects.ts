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
];

export const INJECT_BY_ID: Record<string, Inject> = Object.fromEntries(
  INJECTS.map((i) => [i.id, i]),
);
