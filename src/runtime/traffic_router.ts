import type {
  CognitiveTurnResult,
  CutoverFeatureFlags,
  NormalizedTurnInput,
  ReadinessLevel,
  TrafficRouteDecision,
  TrafficRouteReason,
  TrafficResponder,
} from "./types";
import { guardKernelResponse } from "./response_guardian";

const LEVEL_PERCENTAGE: Record<ReadinessLevel, number> = {
  0: 0,
  1: 0,
  2: 1,
  3: 10,
  4: 50,
  5: 100,
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export function deterministicBucket(...parts: Array<string | null | undefined>): number {
  const key = parts.map(clean).filter(Boolean).join(":") || "anonymous";
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
}

export function idempotencyKey(input: NormalizedTurnInput): string {
  return [
    clean(input.conversation_id),
    clean(input.lead_id),
    clean(input.mensagemCliente).slice(0, 160),
    clean(input.event_type || input.messageType),
  ].join("|");
}

function pilotMatched(flags: CutoverFeatureFlags, input: NormalizedTurnInput): boolean {
  return (
    flags.pilot_tenants.includes(clean(input.tenant_id)) ||
    flags.pilot_leads.includes(clean(input.lead_id)) ||
    flags.pilot_phones.includes(clean(input.telefoneCompleto)) ||
    flags.pilot_phones.includes(clean(input.remoteJid))
  );
}

function safetyGates(result: CognitiveTurnResult) {
  const calibration = result.shadow?.calibration;
  const comparison = result.shadow?.comparison;
  return {
    parity_ok: (calibration?.readiness_gates.readiness_score ?? comparison?.score.parity ?? 0) >= 97,
    no_sdr_regression: calibration?.readiness_gates.zero_critical_sdr_regressions ?? comparison?.readiness.zero_sdr_regressions ?? false,
    governance_ok: calibration?.readiness_gates.zero_critical_governance_violations ?? comparison?.readiness.governance_stable ?? false,
    consultative_score_ok: (calibration?.consultative_parity_score.overall ?? comparison?.score.consultative_behavior ?? 0) >= 97,
    tool_timing_ok: calibration?.readiness_gates.tool_timing_stable ?? comparison?.readiness.tool_parity_stable ?? false,
    runtime_health_ok: result.ok && result.stages.every((stage) => stage.ok),
  };
}

function fallbackReasons(result: CognitiveTurnResult, maxLatencyMs: number): string[] {
  const reasons: string[] = [];
  const duration = result.stages.reduce((sum, stage) => sum + stage.duration_ms, 0);
  if (duration > maxLatencyMs) reasons.push("latency_spike");
  if (result.shadow?.comparison?.critical_failures.length) reasons.push("critical_divergence");
  if (result.violations.length) reasons.push("governance_violation");
  if (result.llm.tool_results.some((tool) => !tool.ok)) reasons.push("tool_failure");
  if (!result.stages.every((stage) => stage.ok)) reasons.push("runtime_crash");
  if (result.shadow?.calibration?.human_review.required) reasons.push("human_escalation");
  return reasons;
}

export function decideTrafficRoute(args: {
  input: NormalizedTurnInput;
  result: CognitiveTurnResult;
  flags: CutoverFeatureFlags;
  previousOwner?: TrafficResponder | null;
  duplicate?: boolean;
  maxLatencyMs?: number;
}): TrafficRouteDecision {
  const bucket = deterministicBucket(args.input.tenant_id, args.input.lead_id, args.input.conversation_id);
  const guardian = guardKernelResponse(args.result);
  const gates = safetyGates(args.result);
  const reasons = fallbackReasons(args.result, args.maxLatencyMs ?? 10000);
  const idKey = idempotencyKey(args.input);
  const readinessPercentage = LEVEL_PERCENTAGE[args.flags.readiness_level];
  const rolloutPercentage = Math.min(100, Math.max(0, args.flags.percentage_rollout || readinessPercentage));
  let responder: TrafficResponder = "n8n";
  let reason: TrafficRouteReason = "shadow_only";

  if (args.duplicate) {
    return {
      responder: "n8n",
      reason: "idempotent_duplicate",
      readiness_level: args.flags.readiness_level,
      rollout_bucket: bucket,
      fallback_reasons: ["duplicate_inbound"],
      safety_gates: gates,
      guardian,
      conversation_owner: args.previousOwner ?? "n8n",
      idempotency_key: idKey,
      live_comparison_continues: true,
    };
  }

  if (args.flags.emergency_fallback || args.flags.force_n8n) {
    responder = "n8n";
    reason = args.flags.emergency_fallback ? "emergency_fallback" : "force_n8n";
  } else if (args.previousOwner) {
    responder = args.previousOwner;
    reason = "conversation_owner";
  } else if (args.flags.force_kernel) {
    responder = "kernel";
    reason = "force_kernel";
  } else if (args.flags.shadow_only || args.flags.readiness_level === 0) {
    responder = "n8n";
    reason = "shadow_only";
  } else if (args.flags.internal_only && !pilotMatched(args.flags, args.input)) {
    responder = "n8n";
    reason = "internal_only";
  } else if (args.flags.followup_only && args.input.event_type !== "followup_resume") {
    responder = "n8n";
    reason = "pilot_group";
  } else if (args.flags.inbound_only && args.input.messageType && args.input.messageType !== "text") {
    responder = "n8n";
    reason = "pilot_group";
  } else if (args.flags.pilot_group && pilotMatched(args.flags, args.input)) {
    responder = "kernel";
    reason = "pilot_group";
  } else if (rolloutPercentage > 0 && bucket < rolloutPercentage) {
    responder = "kernel";
    reason = "percentage_rollout";
  }

  if (responder === "kernel" && (!Object.values(gates).every(Boolean) || guardian.fallback_required || reasons.length)) {
    responder = "n8n";
    reason = reasons.length ? "auto_fallback" : "safety_gate_block";
  }

  return {
    responder,
    reason,
    readiness_level: args.flags.readiness_level,
    rollout_bucket: bucket,
    fallback_reasons: responder === "n8n" ? [...new Set([...reasons, ...guardian.violations])] : [],
    safety_gates: gates,
    guardian,
    conversation_owner: responder,
    idempotency_key: idKey,
    live_comparison_continues: true,
  };
}
