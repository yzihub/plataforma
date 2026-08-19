// Source-of-truth sanitizer for outbound (customer-facing) text.
//
// Internal governance/audit signals (e.g. `[governance_violation:...]`) must NEVER
// reach the customer on WhatsApp. They are produced for logs/audit only. This strips
// any such tag at the runtime boundary as defense-in-depth, so even if some upstream
// code accidentally injects a tag, the message that leaves the runtime stays clean.

const TAG_PATTERNS: RegExp[] = [
  /\[governance_violation:[^\]]*\]\s*/gi,
  /\[internal:[^\]]*\]\s*/gi,
  /\[debug:[^\]]*\]\s*/gi,
  /\[guardrail:[^\]]*\]\s*/gi,
];

// Fail-safe used only when the ENTIRE message was an internal tag. We never emit a
// blank/silent turn — a minimal human handoff line is sent instead.
const BLANK_RECOVERY = "Posso te chamar em alguns minutos pra continuar nossa conversa por aqui?";

export function collectGovernanceSignals(value: unknown): string[] {
  const text = String(value ?? "");
  const tags: string[] = [];
  for (const pattern of TAG_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) tags.push(...matches.map((tag) => tag.trim()));
  }
  return tags;
}

export function stripGovernanceSignals(value: unknown): string {
  const original = String(value ?? "");
  if (!original) return "";

  let text = original;
  for (const pattern of TAG_PATTERNS) {
    text = text.replace(pattern, "");
  }
  const sanitized = text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  // If the original had real content but stripping emptied it, the whole message was
  // a tag — recover with a minimal handoff line instead of a blank turn.
  if (!sanitized && original.trim()) return BLANK_RECOVERY;
  return sanitized;
}
