// Educational debrief shown on the end screen — the legally-correct response and why.

export interface DebriefItem {
  heading: string;
  body: string;
}

export const GDPR_DEBRIEF: DebriefItem[] = [
  {
    heading: '1 · Preserve evidence before you remediate',
    body:
      'Use EDR "network containment" to isolate a compromised host while keeping it live for ' +
      'memory forensics. Rebooting or re-imaging too early destroys volatile evidence (in-memory ' +
      'payloads, C2 config, decryption keys) and your forensic timeline. Recovery comes after ' +
      'eradication and evidence acquisition — never before.',
  },
  {
    heading: '2 · Contain the whole blast radius',
    body:
      'Once credentials are dumped (LSASS) and reused for lateral movement and privilege ' +
      'escalation, blocking a single C2 IP is not containment. Isolate every affected host, ' +
      'sinkhole C2 at DNS and the egress firewall, disable compromised accounts, revoke Kerberos ' +
      'tickets (krbtgt double-reset after a domain credential theft) and rotate exposed secrets.',
  },
  {
    heading: '3 · Scope with evidence, not guesswork',
    body:
      'Correlate database audit logs with proxy/NetFlow egress to enumerate exactly which records ' +
      'and fields left the network. You cannot accurately describe a breach to the regulator or ' +
      'to data subjects — both legal requirements — if you only guessed the scope.',
  },
  {
    heading: '4 · The 72-hour clock (Art. 33)',
    body:
      'You must notify the supervisory authority without undue delay and, where feasible, within ' +
      '72 hours of becoming aware of a personal-data breach — unless it is unlikely to result in a ' +
      'risk to individuals\' rights and freedoms. Notification is risk-based, not automatic for ' +
      'every breach. "Aware" means you have a reasonable degree of certainty a breach has occurred. ' +
      'The clock does not pause while you investigate — Art. 33(4) allows phased notification, so ' +
      'notify with what you know and follow up with the rest; a notification after 72h must explain ' +
      'the reasons for the delay.',
  },
  {
    heading: '5 · Involve the DPO; document everything',
    body:
      'The DPO advises on and monitors the notifiability and risk assessment and is the named ' +
      'contact in the filing, but the controller makes the decision (Art. 39). If a processor ' +
      'detects the breach, it must notify the controller without undue delay (Art. 33(2)) — the ' +
      '72-hour clock is the controller\'s. Every breach must be recorded in the Art. 33(5) internal ' +
      'register (facts, effects, remedial action) whether or not it is notified — that record is ' +
      'your evidence of accountability under Art. 5(2).',
  },
  {
    heading: '6 · Tell the people affected (Art. 34)',
    body:
      'Art. 34 sets a higher bar than Art. 33: only when a breach is likely to result in a HIGH ' +
      'risk must you also communicate it to the data subjects, in clear, plain language — what ' +
      'happened, the likely consequences, and concrete steps they can take (reset reused passwords, ' +
      'watch for phishing). Art. 34(3) carves out exceptions: e.g. the data was rendered ' +
      'unintelligible by appropriate encryption, subsequent measures mean the high risk is no longer ' +
      'likely, or individual contact would take disproportionate effort (then a public communication ' +
      'instead). "Hashed" passwords are not an automatic free pass — weak ones still crack, and ' +
      'names + DoB + email enable fraud.',
  },
  {
    heading: '7 · Never conceal a notifiable breach',
    body:
      'Hiding a breach is an infringement in its own right and sharply increases fine exposure ' +
      '(and potential personal liability) when it surfaces — and breaches almost always surface. ' +
      'Transparency, handled well, actually protects trust.',
  },
];
