import type {
  CognitiveTurnResult,
  CutoverFeatureFlags,
  NormalizedTurnInput,
  PilotLatencyGuards,
  PilotRolloutDecision,
  PilotRolloutReason,
  PilotSafeFilter,
  TrafficRouteDecision,
  TrafficResponder,
} from "./types";
import { deterministicBucket } from "./traffic_router";
import { guardKernelResponse } from "./response_guardian";

type PilotOverride = {
  action: "move_to_n8n" | "move_to_kernel" | "freeze_rollout" | "pause_tenant" | "block_lead";
  reason?: string | null;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(text: string, needles: string[]): boolean {
  const normalized = normalize(text);
  return needles.some((needle) => normalized.includes(normalize(needle)));
}

function activeStagePercentage(stage: CutoverFeatureFlags["pilot_stage"]): number {
  if (stage <= 1) return 0;
  if (stage === 2) return 1;
  if (stage === 3) return 5;
  return 10;
}

function isInternal(flags: CutoverFeatureFlags, input: NormalizedTurnInput): boolean {
  const tenant = clean(input.tenant_id);
  const lead = clean(input.lead_id);
  const phone = clean(input.telefoneCompleto || input.remoteJid);
  return (
    flags.pilot_tenants.includes(tenant) ||
    flags.pilot_leads.includes(lead) ||
    flags.pilot_phones.includes(phone)
  );
}

function isBlocked(flags: CutoverFeatureFlags, input: NormalizedTurnInput): boolean {
  const tenant = clean(input.tenant_id);
  const lead = clean(input.lead_id);
  const phone = clean(input.telefoneCompleto || input.remoteJid);
  return (
    flags.blocked_tenants.includes(tenant) ||
    flags.blocked_leads.includes(lead) ||
    flags.blocked_phones.includes(phone)
  );
}

function edgeCaseBlockers(input: NormalizedTurnInput, result: CognitiveTurnResult): string[] {
  const blockers = new Set<string>();
  const text = normalize(input.mensagemCliente);
  const edgeCases = result.shadow?.calibration?.edge_cases ?? [];
  for (const edge of edgeCases) {
    if (
      edge === "casal_indeciso" ||
      edge === "followup_sensivel" ||
      edge === "revisit_inventory" ||
      edge === "investidor" ||
      edge === "multiplos_objetivos"
    ) {
      blockers.add(edge);
    }
  }
  if (result.decision.signals.spouse_decision_signal && !result.decision.signals.favorite_signal) blockers.add("casal_indeciso");
  if (result.decision.signals.revisit_inventory_signal && result.decision.signals.inventory_fatigue) blockers.add("revisit_inventory_complexo");
  if (result.decision.signals.followup_signal && result.shadow?.calibration?.conversational_rhythm.commercial_pressure) blockers.add("followup_critico");
  if (includesAny(text, ["roi", "cap rate", "renda passiva", "airbnb", "investimento avancado"])) blockers.add("investidor_avancado");
  if (includesAny(text, ["casa e apartamento", "comprar e alugar", "morar e investir", "praia e centro"])) blockers.add("multiplos_objetivos");
  if (result.llm.tool_calls.length > 2) blockers.add("tool_chain_longa");
  return [...blockers];
}

function safeConversationFilter(input: NormalizedTurnInput, result: CognitiveTurnResult, blockers: string[]): PilotSafeFilter {
  const messageType = normalize(input.messageType || "text");
  const eventType = normalize(input.event_type || "inbound");
  const text = clean(input.mensagemCliente);
  return {
    simple_text: ["", "text", "conversation"].includes(messageType) && text.length > 0 && text.length <= 1000,
    normal_inbound: ["", "inbound", "message", "messages.upsert"].includes(eventType),
    no_media: !["audio", "image", "video", "document", "ptt", "sticker"].includes(messageType),
    no_complex_followup: !result.decision.signals.followup_signal && !eventType.includes("followup"),
    no_multiple_objectives: !blockers.includes("multiplos_objetivos"),
    no_edge_cases: blockers.length === 0,
  };
}

function latencyGuards(result: CognitiveTurnResult, flags: CutoverFeatureFlags): PilotLatencyGuards {
  const orchestration = result.stages.reduce((sum, stage) => sum + stage.duration_ms, 0);
  const maxTool = result.llm.tool_results.reduce((max, tool) => Math.max(max, tool.latency_ms), 0);
  const total = orchestration;
  const guards = {
    orchestration_ms: orchestration,
    max_orchestration_ms: flags.max_orchestration_latency_ms,
    max_tool_ms: maxTool,
    max_tool_latency_ms: flags.max_tool_latency_ms,
    total_ms: total,
    max_total_ms: flags.max_total_latency_ms,
    ok:
      orchestration <= flags.max_orchestration_latency_ms &&
      maxTool <= flags.max_tool_latency_ms &&
      total <= flags.max_total_latency_ms,
  };
  return guards;
}

function readinessScore(result: CognitiveTurnResult, route: TrafficRouteDecision): number {
  const calibration = result.shadow?.calibration;
  if (calibration) {
    return Math.round(
      calibration.readiness_gates.readiness_score * 0.35 +
        calibration.consultative_parity_score.overall * 0.25 +
        route.guardian.confidence.overall * 0.25 +
        (calibration.tool_timing.stable ? 15 : 0),
    );
  }
  return route.guardian.confidence.overall;
}

function n8nDecision(
  args: {
    input: NormalizedTurnInput;
    result: CognitiveTurnResult;
    route: TrafficRouteDecision;
    flags: CutoverFeatureFlags;
    reason: PilotRolloutReason;
    fallbackReasons: string[];
  },
): PilotRolloutDecision {
  const blockers = edgeCaseBlockers(args.input, args.result);
  const safeFilter = safeConversationFilter(args.input, args.result, blockers);
  const liveValidation = guardKernelResponse(args.result);
  const latency = latencyGuards(args.result, args.flags);
  return {
    authorized_to_send: false,
    responder: "n8n",
    stage: args.flags.pilot_stage,
    reason: args.reason,
    fallback_reasons: [...new Set(args.fallbackReasons)],
    safe_filter: safeFilter,
    edge_case_blockers: blockers,
    live_validation: liveValidation,
    latency_guards: latency,
    readiness_score: readinessScore(args.result, args.route),
    response_to_send: null,
    dual_logging_required: true,
    parity_comparison_continues: true,
  };
}

export function evaluatePilotRollout(args: {
  input: NormalizedTurnInput;
  result: CognitiveTurnResult;
  route: TrafficRouteDecision;
  flags: CutoverFeatureFlags;
  previousOwner?: TrafficResponder | null;
  overrides?: PilotOverride[];
}): PilotRolloutDecision {
  const { input, result, route, flags } = args;
  const overrides = args.overrides ?? [];
  const overrideActions = new Set(overrides.map((override) => override.action));
  const overrideReasons = overrides.map((override) => override.reason).filter(Boolean) as string[];

  if (flags.rollout_frozen || overrideActions.has("freeze_rollout")) {
    return n8nDecision({ input, result, route, flags, reason: "rollout_frozen", fallbackReasons: ["rollout_frozen", ...overrideReasons] });
  }
  if (isBlocked(flags, input) || overrideActions.has("pause_tenant") || overrideActions.has("block_lead")) {
    return n8nDecision({ input, result, route, flags, reason: "operator_override", fallbackReasons: ["pilot_blocked", ...overrideReasons] });
  }
  if (overrideActions.has("move_to_n8n")) {
    return n8nDecision({ input, result, route, flags, reason: "operator_override", fallbackReasons: ["operator_forced_n8n", ...overrideReasons] });
  }
  if (!overrideActions.has("move_to_kernel") && flags.pilot_stage === 1 && !isInternal(flags, input)) {
    return n8nDecision({ input, result, route, flags, reason: "internal_only", fallbackReasons: ["not_internal"] });
  }

  const blockers = edgeCaseBlockers(input, result);
  const safeFilter = safeConversationFilter(input, result, blockers);
  const liveValidation = guardKernelResponse(result);
  const latency = latencyGuards(result, flags);
  const score = readinessScore(result, route);

  let responder: TrafficResponder = route.responder;
  let reason: PilotRolloutReason =
    flags.pilot_stage === 1 ? "internal_only" :
    flags.pilot_stage === 2 ? "simple_inbound" :
    flags.pilot_stage === 3 ? "controlled_traffic" :
    flags.pilot_stage === 4 ? "selected_tenant" :
    "shadow_or_disabled";
  const fallbackReasons = new Set<string>(route.fallback_reasons);

  if (overrideActions.has("move_to_kernel")) {
    responder = "kernel";
    reason = "operator_override";
  } else if (route.responder !== "kernel") {
    responder = "n8n";
    reason = "traffic_router_fallback";
    fallbackReasons.add(route.reason);
  } else if (args.previousOwner === "kernel" || route.reason === "conversation_owner") {
    responder = "kernel";
    reason = "conversation_continuity";
  } else if (flags.pilot_stage === 0 || flags.shadow_only) {
    responder = "n8n";
    reason = "shadow_or_disabled";
    fallbackReasons.add("pilot_stage_disabled");
  } else if (flags.pilot_stage === 1 && !isInternal(flags, input)) {
    responder = "n8n";
    reason = "internal_only";
    fallbackReasons.add("not_internal");
  } else if (flags.pilot_stage >= 2) {
    const allowedPercentage = activeStagePercentage(flags.pilot_stage);
    const bucket = deterministicBucket(input.tenant_id, input.lead_id, input.conversation_id);
    if (bucket >= allowedPercentage && !isInternal(flags, input)) {
      responder = "n8n";
      reason = flags.pilot_stage === 4 ? "selected_tenant" : "controlled_traffic";
      fallbackReasons.add("outside_pilot_percentage");
    }
  }

  if (responder === "kernel" && blockers.length > 0) {
    responder = "n8n";
    reason = "edge_case_block";
    for (const blocker of blockers) fallbackReasons.add(blocker);
  }
  if (responder === "kernel" && !Object.values(safeFilter).every(Boolean)) {
    responder = "n8n";
    reason = "safe_filter_block";
    for (const [key, ok] of Object.entries(safeFilter)) {
      if (!ok) fallbackReasons.add(key);
    }
  }
  if (responder === "kernel" && !latency.ok) {
    responder = "n8n";
    reason = "latency_guard";
    fallbackReasons.add("latency_guard");
  }
  if (responder === "kernel" && (liveValidation.fallback_required || score < 97)) {
    responder = "n8n";
    reason = "live_validation_failed";
    for (const violation of liveValidation.violations) fallbackReasons.add(violation);
    if (score < 97) fallbackReasons.add("readiness_score_low");
  }

  return {
    authorized_to_send: responder === "kernel",
    responder,
    stage: flags.pilot_stage,
    reason,
    fallback_reasons: [...fallbackReasons],
    safe_filter: safeFilter,
    edge_case_blockers: blockers,
    live_validation: liveValidation,
    latency_guards: latency,
    readiness_score: score,
    response_to_send: responder === "kernel" ? result.llm.output : null,
    dual_logging_required: true,
    parity_comparison_continues: true,
  };
}
