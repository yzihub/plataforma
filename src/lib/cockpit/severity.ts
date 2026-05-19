import type { CognitiveSeverity } from "./types";

interface SeverityInput {
  loop_detected: boolean;
  loop_risk: string | null;
  valid_transition: boolean | null;
  fallback_triggered: boolean;
  retrieval_allowed: boolean | null;
}

export function computeCognitiveSeverity(t: SeverityInput): CognitiveSeverity {
  if (t.loop_detected || (t.loop_risk === "high" && t.valid_transition === false)) {
    return "critical";
  }
  if (t.loop_risk === "medium" || t.fallback_triggered || t.valid_transition === false) {
    return "warning";
  }
  if (t.retrieval_allowed === true) {
    return "info";
  }
  return "nominal";
}
