import type { Phase, Role } from '../core/types';

// ---------------------------------------------------------------------------
// Data-driven GDPR breach scenario.
//
// Narrative (realistic intrusion kill-chain):
//   Initial access  : spear-phish -> macro-enabled doc on WKS-FIN-07, EDR fires.
//   Privilege esc.   : LSASS credential dump (Mimikatz-class), local admin -> domain creds.
//   Lateral movement : WinRM/SMB pivot to DB-PROD-02 using harvested creds.
//   Collection/exfil : dump of `customers` PII table, ~2.3 GB egress over TLS to C2.
//   Response         : contain -> assess -> notify (72h Art.33) -> remediate.
//
// All branching lives here as data. `scoring.resolveChoice` is the only resolver.
// ---------------------------------------------------------------------------

export interface Effects {
  reputation?: number;
  compliance?: number;
  cost?: number;
  /** Advances the game-time clock (deliberation / wrong turns cost time). */
  timeCostHours?: number;
  setFlags?: string[];
  advancePhaseTo?: Phase;
}

export interface Choice {
  id: string;
  label: string;
  /** Optional one-line tag shown on the button (e.g. "best practice" / "risky"). */
  tag?: string;
  effects: Effects;
  /** Immediate in-dialogue reaction explaining why this was good/bad. */
  feedback: string;
}

export interface DecisionNode {
  id: string;
  stakeholder: Role;
  /** Phase at which this node becomes available. */
  phase: Phase;
  /** Node hidden until all these flags are set. */
  requireFlags?: string[];
  /** Title shown above the prompt. */
  heading: string;
  /** The NPC's framing of the decision (rich technical context). */
  prompt: string;
  choices: Choice[];
  oneShot?: boolean;
}

export const PHASE_ORDER: Phase[] = [
  'detection',
  'containment',
  'assessment',
  'notification',
  'resolution',
];

export const SCENARIO_INTRO =
  'A Sysmon + EDR alert just fired on WKS-FIN-07. At 02:14 an Outlook attachment ' +
  '("Invoice_Q2.docm") spawned an encoded PowerShell child process. You are the Incident ' +
  'Commander. You have 72 hours to run this correctly — and to meet your GDPR obligations.';

export const NODES: DecisionNode[] = [
  // ---------------------------------------------------------------- DETECTION
  {
    id: 'tech_triage',
    stakeholder: 'tech',
    phase: 'detection',
    oneShot: true,
    heading: 'SOC triage — endpoint alert',
    prompt:
      "Sam (SOC): \"EDR flagged WKS-FIN-07 — winword.exe → powershell.exe -enc, then a " +
      'beacon to 185.244.x.x every 60s with jitter. The SIEM correlated it with a Sysmon ' +
      'process-create and an outbound TLS session to a domain registered three days ago. ' +
      'Classic loader behaviour. How do we work it?"',
    choices: [
      {
        id: 'tech_triage_good',
        label: 'Pull the full EDR process tree, preserve volatile data, network-contain the host',
        tag: 'best practice',
        effects: {
          compliance: 4,
          reputation: 2,
          cost: 3,
          timeCostHours: 2,
          setFlags: ['investigating'],
          advancePhaseTo: 'containment',
        },
        feedback:
          'Right call. EDR "network containment" isolates WKS-FIN-07 from everything except the ' +
          'console, so the host stays live for memory forensics while the C2 channel is cut. ' +
          'You capture the process tree, command lines, and the loaded modules before anything ' +
          'is lost.',
      },
      {
        id: 'tech_triage_reboot',
        label: 'Tell the user to reboot and re-image the machine to be safe',
        tag: 'destroys evidence',
        effects: {
          compliance: -8,
          cost: 6,
          timeCostHours: 6,
          setFlags: ['investigating'],
          advancePhaseTo: 'containment',
        },
        feedback:
          'A reboot wipes volatile memory — injected payloads, decryption keys, the C2 config and ' +
          'the attacker\'s in-memory tooling are gone. You can still proceed, but your forensic ' +
          'timeline now has a hole in it and root-cause will be harder to prove to the regulator.',
      },
      {
        id: 'tech_triage_fp',
        label: 'Looks like a noisy false positive — close the ticket',
        tag: 'critical mistake',
        effects: {
          compliance: -12,
          reputation: -6,
          cost: -2,
          timeCostHours: 14,
          setFlags: ['investigating'],
          advancePhaseTo: 'containment',
        },
        feedback:
          'Encoded PowerShell from an Office child process with periodic beaconing is not a false ' +
          'positive — it is a textbook loader. Dismissing it gives the attacker hours of free dwell ' +
          'time. You burn 14 hours before the next alert forces you back in.',
      },
    ],
  },

  // -------------------------------------------------------------- CONTAINMENT
  {
    id: 'tech_contain',
    stakeholder: 'tech',
    phase: 'containment',
    requireFlags: ['investigating'],
    oneShot: true,
    heading: 'Containment — the blast radius grew',
    prompt:
      "Sam (SOC): \"It moved. EDR shows lsass.exe access from the loader — credential dump. " +
      'Those creds were replayed over WinRM to DB-PROD-02 (lateral movement), then a service ' +
      'account got added to a privileged group (privilege escalation). I see beaconing from the ' +
      'DB host too. What\'s the containment play?"',
    choices: [
      {
        id: 'tech_contain_good',
        label:
          'Contain all affected hosts (EDR), sinkhole the C2 at DNS + egress firewall, disable & ' +
          'reset compromised accounts, revoke Kerberos tickets, rotate exposed secrets',
        tag: 'best practice',
        effects: {
          compliance: 6,
          reputation: 4,
          cost: 6,
          timeCostHours: 4,
          setFlags: ['breachContained'],
          advancePhaseTo: 'assessment',
        },
        feedback:
          'Proper containment. You isolate WKS-FIN-07 and DB-PROD-02, block the C2 IOCs at the ' +
          'DNS resolver and egress firewall, disable the compromised user + service accounts, and ' +
          'because domain creds were dumped you plan a krbtgt double-reset and rotate DB/API ' +
          'secrets. The attacker loses every channel at once.',
      },
      {
        id: 'tech_contain_pullplug',
        label: 'Yank the network cables and power off DB-PROD-02 immediately',
        tag: 'risky',
        effects: {
          compliance: -4,
          reputation: -3,
          cost: 8,
          timeCostHours: 6,
          setFlags: ['breachContained'],
          advancePhaseTo: 'assessment',
        },
        feedback:
          'Hard power-off stops exfil but destroys memory-resident evidence, takes production ' +
          'down (customer-facing outage = reputational + cost hit), and tips the attacker that ' +
          'they are detected — they may burn other footholds. EDR isolation would have kept the ' +
          'host live and quarantined.',
      },
      {
        id: 'tech_contain_partial',
        label: 'Just block the C2 IP at the firewall and keep watching',
        tag: 'insufficient',
        effects: {
          compliance: -7,
          reputation: -4,
          cost: 2,
          timeCostHours: 12,
          setFlags: ['breachContained'],
          advancePhaseTo: 'assessment',
        },
        feedback:
          'Blocking a single IP is not containment. The actor has domain creds, a second beacon, ' +
          'and likely fallback C2 (domain-fronting / DNS). They keep operating for another 12 ' +
          'hours and pull more data before you fully lock it down.',
      },
    ],
  },
  {
    id: 'ciso_irplan',
    stakeholder: 'ciso',
    phase: 'containment',
    requireFlags: ['investigating'],
    oneShot: true,
    heading: 'Activate the incident response plan',
    prompt:
      "Dana (CISO): \"This is now a declared incident. Before we go further I want our process " +
      'right. How do we stand up the response?"',
    choices: [
      {
        id: 'ciso_irplan_good',
        label:
          'Declare a Sev-1, name an Incident Commander, open a war room, engage the DFIR ' +
          'retainer, start a timestamped incident log',
        tag: 'best practice',
        effects: {
          compliance: 5,
          reputation: 3,
          cost: 5,
          timeCostHours: 1,
          setFlags: ['irActivated'],
        },
        feedback:
          'Exactly. A single Incident Commander, a contemporaneous timestamped log, and the DFIR ' +
          'retainer engaged early. That log is also your evidence the breach was handled diligently ' +
          '— GDPR Art. 33(5) requires you to document the facts, effects and remedial action.',
      },
      {
        id: 'ciso_irplan_adhoc',
        label: 'Keep it informal — a few engineers in a Slack channel is faster',
        tag: 'risky',
        effects: {
          compliance: -5,
          reputation: -2,
          timeCostHours: 3,
          setFlags: ['irActivated'],
        },
        feedback:
          'Ad-hoc response means no clear owner, no decision record and no defensible timeline. ' +
          'When the regulator asks "what did you know and when," an unstructured Slack scroll is ' +
          'not an answer.',
      },
    ],
  },

  // --------------------------------------------------------------- ASSESSMENT
  {
    id: 'tech_forensics',
    stakeholder: 'tech',
    phase: 'assessment',
    requireFlags: ['breachContained'],
    oneShot: true,
    heading: 'Forensics — confirm and quantify the exfiltration',
    prompt:
      "Sam (SOC): \"Containment holds. Now, did data actually leave, and how much? DB-PROD-02 " +
      'audit log shows a `SELECT *` against the `customers` table at 02:51. Proxy NetFlow shows ' +
      '~2.3 GB egress to the C2 over the next 40 minutes. How do we nail the scope?"',
    choices: [
      {
        id: 'tech_forensics_good',
        label:
          'Acquire disk + memory images (chain of custody), correlate DB audit + egress logs to ' +
          'enumerate exact records and fields',
        tag: 'best practice',
        effects: {
          compliance: 6,
          reputation: 2,
          cost: 5,
          timeCostHours: 8,
          setFlags: ['exfilConfirmed', 'scopeKnown'],
        },
        feedback:
          'Evidence-led scoping. The `customers` table held 48,200 records: full name, email, ' +
          'postal address, phone, date of birth and bcrypt password hashes — no card data (that ' +
          'is tokenised at the PSP). Egress volume matches a near-full table dump. Now you have ' +
          'defensible facts for the DPO and the regulator.',
      },
      {
        id: 'tech_forensics_guess',
        label: 'Assume worst case and move on — we don\'t have time for imaging',
        tag: 'risky',
        effects: {
          compliance: -4,
          reputation: -2,
          timeCostHours: 1,
          setFlags: ['exfilConfirmed', 'scopeKnown'],
        },
        feedback:
          'Guessing the scope means you cannot accurately describe the breach to the regulator or ' +
          'to data subjects — both are GDPR requirements. You may over- or under-notify, and you ' +
          'have no forensic record if this is later disputed or litigated.',
      },
      {
        id: 'tech_forensics_wipe',
        label: 'Reimage DB-PROD-02 now to restore service fast',
        tag: 'critical mistake',
        effects: {
          compliance: -10,
          reputation: -3,
          cost: 4,
          timeCostHours: 4,
          setFlags: ['exfilConfirmed', 'scopeKnown'],
        },
        feedback:
          'Reimaging before acquiring images destroys the primary evidence — root cause, dwell ' +
          'time and exact data accessed become unprovable. Recovery comes *after* eradication and ' +
          'evidence preservation, never before.',
      },
    ],
  },
  {
    id: 'dpo_assess',
    stakeholder: 'dpo',
    phase: 'assessment',
    requireFlags: ['scopeKnown'],
    oneShot: true,
    heading: 'Is this a notifiable personal-data breach?',
    prompt:
      "Mara (DPO): \"I have Sam's forensic scope. 48,200 data subjects; identifiers plus dates of " +
      'birth and password hashes. Card data is out of scope (tokenised). My role is to advise — ' +
      'the controller makes the Article 33 / 34 call. What do you want to put to them?"',
    choices: [
      {
        id: 'dpo_assess_good',
        label:
          'Treat it as a notifiable breach likely to result in high risk (identity-theft / ' +
          'credential-stuffing exposure) — prepare Art. 33 notification and Art. 34 comms',
        tag: 'best practice',
        effects: {
          compliance: 8,
          reputation: 3,
          timeCostHours: 3,
          setFlags: ['dpoConsulted', 'highRisk', 'breachRegistered'],
          advancePhaseTo: 'notification',
        },
        feedback:
          'Correct analysis. This is personal data and the confidentiality breach is confirmed, so ' +
          'it clears the Art. 33 threshold (a risk to rights and freedoms) → notify the authority. ' +
          'The combination of identity data + DoB + reused-password risk pushes it to "likely to ' +
          'result in a high risk," which also triggers Art. 34 communication to the data subjects. ' +
          'You log it in the Art. 33(5) register either way.',
      },
      {
        id: 'dpo_assess_downplay',
        label: 'Hashes aren\'t plaintext — argue it\'s low risk and skip data-subject notice',
        tag: 'risky',
        effects: {
          compliance: -9,
          reputation: -4,
          timeCostHours: 2,
          setFlags: ['dpoConsulted', 'breachRegistered'],
          advancePhaseTo: 'notification',
        },
        feedback:
          '"It was hashed" is not a free pass — bcrypt slows but does not prevent cracking of weak ' +
          'passwords, and names + DoB + email alone enable phishing and identity theft. ' +
          'Understating the risk to avoid notifying data subjects is exactly what regulators ' +
          'penalise.',
      },
    ],
  },

  // ------------------------------------------------------------- NOTIFICATION
  {
    id: 'mgmt_signoff',
    stakeholder: 'management',
    phase: 'notification',
    requireFlags: ['dpoConsulted'],
    oneShot: true,
    heading: 'Disclosure sign-off',
    prompt:
      "Victor (CEO): \"The DPO says we have to notify. That's going to be public and it's going to " +
      'hurt. What are you recommending I authorise?"',
    choices: [
      {
        id: 'mgmt_signoff_good',
        label:
          'Authorise full Art. 33 notification, fund DFIR + remediation, approve honest customer ' +
          'comms',
        tag: 'best practice',
        effects: {
          compliance: 6,
          reputation: 5,
          cost: 6,
          timeCostHours: 1,
          setFlags: ['mgmtApproved'],
        },
        feedback:
          'Leadership backing the lawful, transparent path. Funding the DFIR retainer and ' +
          'remediation now also limits the long-term cost and demonstrates accountability ' +
          '(Art. 5(2)) to the regulator.',
      },
      {
        id: 'mgmt_signoff_delay',
        label: 'Tell him to delay disclosure until "we have the full picture"',
        tag: 'risky',
        effects: {
          compliance: -8,
          reputation: -3,
          timeCostHours: 20,
          setFlags: ['mgmtApproved'],
        },
        feedback:
          'You do not have to know everything to notify — Art. 33(4) explicitly allows phased / ' +
          'incomplete notification, and the 72-hour clock does not pause while you "get the full ' +
          'picture." A notification later than 72h is still possible but must be accompanied by ' +
          'reasons for the delay. Sitting on it just eats the deadline.',
      },
      {
        id: 'mgmt_signoff_coverup',
        label: 'Agree to keep it quiet — no notification, no customer comms',
        tag: 'critical mistake',
        effects: {
          compliance: -20,
          reputation: 4,
          cost: -6,
          timeCostHours: 1,
          setFlags: ['mgmtApproved', 'coverup'],
        },
        feedback:
          'Concealing a notifiable breach is an infringement in its own right and dramatically ' +
          'increases the fine exposure (and personal/criminal liability in some regimes) if it ' +
          'later comes out — and breaches almost always come out.',
      },
    ],
  },
  {
    id: 'regulator_notify',
    stakeholder: 'regulator',
    phase: 'notification',
    requireFlags: ['dpoConsulted'],
    oneShot: true,
    heading: 'Notify the supervisory authority (Art. 33)',
    prompt:
      "Authority desk: \"If this is a notifiable breach, we expect to hear from you without undue " +
      'delay and within 72 hours of you becoming aware. What are you submitting?"',
    choices: [
      {
        id: 'regulator_notify_good',
        label:
          'Submit the Art. 33 notification now: nature, categories & approximate number of ' +
          'subjects/records, likely consequences, measures taken — flag that some detail will ' +
          'follow',
        tag: 'best practice',
        effects: {
          compliance: 14,
          reputation: 4,
          timeCostHours: 1,
          setFlags: ['regulatorNotified'],
          advancePhaseTo: 'resolution',
        },
        feedback:
          'This is the headline GDPR obligation, met correctly. You provided the four required ' +
          'elements of Art. 33(3) and used the phased approach permitted by Art. 33(4) for anything ' +
          'still under investigation. The DPO is named as the contact point.',
      },
      {
        id: 'regulator_notify_premature',
        label: 'Fire off a vague notification immediately, before any assessment',
        tag: 'note',
        effects: {
          compliance: 2,
          reputation: -2,
          timeCostHours: 1,
          setFlags: ['regulatorNotified'],
          advancePhaseTo: 'resolution',
        },
        feedback:
          'Notifying is better than not — but a content-free "something happened" filing without ' +
          'scope or measures wastes the authority\'s time and yours, and you will have to ' +
          'substantially re-file. Contain and assess first, *then* notify within the 72h window.',
      },
      {
        id: 'regulator_notify_skip',
        label: 'Decide not to notify the authority at all',
        tag: 'critical mistake',
        effects: {
          compliance: -22,
          reputation: -2,
          timeCostHours: 1,
          setFlags: ['notifyRefused'],
          advancePhaseTo: 'resolution',
        },
        feedback:
          'For a breach that is likely to risk individuals\' rights, failing to notify is a direct ' +
          'infringement of Art. 33. This is the single most damaging compliance choice you can make.',
      },
    ],
  },

  // --------------------------------------------------------------- RESOLUTION
  {
    id: 'customer_notify',
    stakeholder: 'customer',
    phase: 'notification',
    requireFlags: ['dpoConsulted'],
    oneShot: true,
    heading: 'Communicate to affected data subjects (Art. 34)',
    prompt:
      "Priya (customer): \"I got a weird email and now I'm worried. Was my data in this? What are " +
      'you actually telling people like me?"',
    choices: [
      {
        id: 'customer_notify_good',
        label:
          'Send a clear, plain-language Art. 34 notice: what happened, what data, concrete steps ' +
          '(reset password, beware phishing), and a support contact',
        tag: 'best practice',
        effects: {
          compliance: 8,
          reputation: 8,
          cost: 4,
          timeCostHours: 2,
          setFlags: ['customerNotified'],
        },
        feedback:
          'This is what Art. 34 requires for a high-risk breach: communicate to the data subject ' +
          'in clear language, describe the likely consequences and the measures they can take. ' +
          'Honest, actionable comms actually *protects* trust.',
      },
      {
        id: 'customer_notify_spin',
        label: 'Send a vague "we take security seriously" note with no specifics',
        tag: 'risky',
        effects: {
          compliance: -5,
          reputation: -6,
          timeCostHours: 1,
          setFlags: ['customerNotified'],
        },
        feedback:
          'A reassurance email that hides what data was lost fails the Art. 34 "clear and plain ' +
          'language" test, leaves people unable to protect themselves, and reads as a cover-up the ' +
          'moment the real details surface.',
      },
      {
        id: 'customer_notify_silent',
        label: 'Say nothing to customers and hope it blows over',
        tag: 'critical mistake',
        effects: {
          compliance: -12,
          reputation: -10,
          timeCostHours: 1,
          setFlags: ['coverup'],
        },
        feedback:
          'For a high-risk breach, silence violates Art. 34 and destroys trust when (not if) it ' +
          'surfaces. Data subjects have a right to know so they can defend themselves against ' +
          'credential-stuffing and phishing.',
      },
    ],
  },
  {
    id: 'mgmt_remediation',
    stakeholder: 'management',
    phase: 'resolution',
    requireFlags: ['regulatorNotified'],
    oneShot: true,
    heading: 'Eradication, recovery & lessons learned',
    prompt:
      "Victor (CEO): \"We've notified. I don't want to be back here in six months. What do we " +
      'invest in to actually fix this?"',
    choices: [
      {
        id: 'mgmt_remediation_good',
        label:
          'Fund eradication (rebuild from known-good, patch the entry vector), phishing-resistant ' +
          'MFA, EDR everywhere, log retention, and a blameless post-incident review',
        tag: 'best practice',
        effects: {
          compliance: 6,
          reputation: 6,
          cost: 5,
          timeCostHours: 2,
          setFlags: ['remediated'],
        },
        feedback:
          'Closing the loop: eradicate the foothold, fix the macro-execution + MFA gaps that ' +
          'allowed initial access and lateral movement, and run a blameless retro so the controls ' +
          'actually improve. This is the "measures taken" you promised the regulator.',
      },
      {
        id: 'mgmt_remediation_cheap',
        label: 'Just restore service and move on — we\'ve spent enough',
        tag: 'risky',
        effects: {
          compliance: -4,
          reputation: -4,
          cost: -3,
          timeCostHours: 1,
          setFlags: ['remediated'],
        },
        feedback:
          'Restoring without eradicating the root cause invites re-compromise — and failing to ' +
          'implement the remedial measures you described to the authority undermines your ' +
          'accountability position if it recurs.',
      },
    ],
  },
];

export const NODE_BY_ID: Record<string, DecisionNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
);
