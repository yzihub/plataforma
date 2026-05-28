import type { Pool } from "pg";
import { canonicalKernelInputSchema } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { compactHydrationProjection, hydrateTurn } from "./hydration";
import { buildMemoryRuntime } from "./memory_runtime";
import { syncOperationalContext } from "./behavioral_engine";
import { renderOfficialContext } from "./context_renderer";
import { normalizeTurnInput } from "./cognitive_turn";
import { traceStage } from "./observability";
import type { NormalizedTurnInput, RuntimeConfig, RuntimeStageTrace } from "./types";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function sameStringSet(a: string[], b: string[]): boolean | null {
  if (!a.length) return null;
  if (a.length !== b.length) return false;
  const right = new Set(b);
  return a.every((item) => right.has(item));
}

function optionalBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim"].includes(normalized)) return true;
    if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  }
  return null;
}

function optionalString(value: unknown): string | null {
  const output = clean(value);
  return output || null;
}

function sameString(a: string | null, b: string | null): boolean | null {
  if (!a) return null;
  return a === b;
}

function sameBool(a: boolean | null, b: boolean): boolean | null {
  if (a === null) return null;
  return a === b;
}

function resolveN8nDecision(raw: unknown, normalized: NormalizedTurnInput): Record<string, unknown> {
  const record = asRecord(raw);
  const runtimeState = asRecord(record.runtime_state);
  const objectiveState = asRecord(record.objective_state);
  const operational = asRecord(record.operational_context);
  const runtimeMemory = asRecord(record.runtime_memory);
  const shadowOriginal = normalized.shadow_original;

  const requiredTools = asStringArray(record.required_tools);
  const allowedTools = asStringArray(record.allowed_tools);
  const retrievalPolicy =
    optionalString(record.retrieval_policy) ||
    (requiredTools.includes("consultar_imoveis") ? "tool_required" : null);

  return {
    governance_version: optionalString(record.governance_version) || "n8n_current",
    owner_pipeline: "n8n",
    funnel_stage:
      optionalString(shadowOriginal?.funnel_stage) ||
      optionalString(runtimeState.funnel_stage) ||
      optionalString(runtimeMemory.funnel_stage) ||
      optionalString(operational.funnel_stage),
    next_best_action:
      optionalString(shadowOriginal?.next_best_action) ||
      optionalString(objectiveState.next_best_action) ||
      optionalString(runtimeMemory.next_best_action) ||
      optionalString(record.next_action) ||
      optionalString(record.next_best_action),
    property_presentation_due:
      shadowOriginal?.property_presentation_due ??
      optionalBool(record.property_presentation_due) ??
      optionalBool(runtimeState.property_presentation_due) ??
      optionalBool(runtimeMemory.property_presentation_due),
    retrieval_policy: retrievalPolicy,
    required_tools: shadowOriginal?.required_tools ?? requiredTools,
    allowed_tools: allowedTools,
    signals: {
      inventory_fatigue: shadowOriginal?.inventory_fatigue ?? optionalBool(runtimeMemory.inventory_fatigue),
      spouse_decision: shadowOriginal?.spouse_decision ?? optionalBool(runtimeMemory.spouse_decision_signal),
      revisit_inventory_signal: optionalBool(runtimeMemory.revisit_inventory_signal),
      favorite_signal: optionalBool(runtimeMemory.favorite_signal),
      visit_intent_signal: optionalBool(runtimeMemory.visit_intent_signal),
      property_intent_signal: optionalBool(runtimeMemory.property_intent_signal),
    },
  };
}

function compareDecision(n8nDecision: Record<string, unknown>, pipelineDecision: {
  runtime_state: string;
  next_best_action: string;
  property_presentation_due: boolean;
  retrieval_policy: string;
  required_tools: string[];
  allowed_tools: string[];
}) {
  const n8nRequiredTools = asStringArray(n8nDecision.required_tools);
  const n8nAllowedTools = asStringArray(n8nDecision.allowed_tools);
  const n8nStage = optionalString(n8nDecision.funnel_stage);
  const n8nNextBestAction = optionalString(n8nDecision.next_best_action);
  const n8nRetrievalPolicy = optionalString(n8nDecision.retrieval_policy);
  const n8nPropertyPresentationDue = optionalBool(n8nDecision.property_presentation_due);
  const n8nRetrievalActive = n8nRequiredTools.includes("consultar_imoveis") || n8nRetrievalPolicy === "tool_required";
  const pipelineRetrievalActive =
    pipelineDecision.required_tools.includes("consultar_imoveis") ||
    pipelineDecision.retrieval_policy === "tool_required";

  const parity = {
    stage: sameString(n8nStage, pipelineDecision.runtime_state),
    next_best_action: sameString(n8nNextBestAction, pipelineDecision.next_best_action),
    property_presentation_due: sameBool(n8nPropertyPresentationDue, pipelineDecision.property_presentation_due),
    retrieval_policy: sameString(n8nRetrievalPolicy, pipelineDecision.retrieval_policy),
    retrieval_activation: n8nRetrievalPolicy || n8nRequiredTools.length ? n8nRetrievalActive === pipelineRetrievalActive : null,
    required_tools: sameStringSet(n8nRequiredTools, pipelineDecision.required_tools),
    allowed_tools: sameStringSet(n8nAllowedTools, pipelineDecision.allowed_tools),
  };
  const toolActivationDivergent =
    parity.required_tools === null && parity.allowed_tools === null
      ? null
      : parity.required_tools === false || parity.allowed_tools === false;
  const retrievalDivergent =
    parity.retrieval_policy === null && parity.retrieval_activation === null
      ? null
      : parity.retrieval_policy === false || parity.retrieval_activation === false;

  return {
    parity,
    retrieval_divergent: retrievalDivergent,
    next_best_action_divergent: parity.next_best_action === null ? null : !parity.next_best_action,
    stage_divergent: parity.stage === null ? null : !parity.stage,
    property_presentation_due_divergent:
      parity.property_presentation_due === null ? null : !parity.property_presentation_due,
    retrieval_activation_mismatch: parity.retrieval_activation === null ? null : !parity.retrieval_activation,
    tool_activation_divergent: toolActivationDivergent,
    property_presentation_mismatch:
      parity.property_presentation_due === null ? null : !parity.property_presentation_due,
    compared_fields: {
      n8n: {
        funnel_stage: n8nStage,
        next_best_action: n8nNextBestAction,
        property_presentation_due: n8nPropertyPresentationDue,
        retrieval_policy: n8nRetrievalPolicy,
        retrieval_active: n8nRetrievalPolicy || n8nRequiredTools.length ? n8nRetrievalActive : null,
        required_tools: n8nRequiredTools,
        allowed_tools: n8nAllowedTools,
      },
      pipeline_b: {
        funnel_stage: pipelineDecision.runtime_state,
        next_best_action: pipelineDecision.next_best_action,
        property_presentation_due: pipelineDecision.property_presentation_due,
        retrieval_policy: pipelineDecision.retrieval_policy,
        retrieval_active: pipelineRetrievalActive,
        required_tools: pipelineDecision.required_tools,
        allowed_tools: pipelineDecision.allowed_tools,
      },
    },
  };
}

export async function executeShadowDecision(args: {
  raw: unknown;
  pool: Pool;
  config: RuntimeConfig;
  requestId?: string;
}) {
  const started = Date.now();
  const stages: RuntimeStageTrace[] = [];
  const traceId = `decide_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const normalized = await traceStage(stages, "normalize", () => normalizeTurnInput(args.raw));
  const hydrated = await traceStage(stages, "hydrate", async () => compactHydrationProjection(
    await hydrateTurn(args.pool, normalized),
    args.config.limits,
  ));
  const memory = await traceStage(stages, "memory", () => buildMemoryRuntime(args.pool, hydrated, {
    persist: false,
    limits: args.config.limits,
  }));
  const behavioral = await traceStage(stages, "behavioral", () => syncOperationalContext(
    {
      ...hydrated,
      recent_messages: memory.compact_history,
      runtime_memory: memory.runtime_memory,
    },
    memory,
  ));
  const context = await traceStage(stages, "context", () => renderOfficialContext(
    {
      ...hydrated,
      recent_messages: memory.compact_history,
      runtime_memory: behavioral.runtime_memory,
      operational_context: behavioral.operational_context,
    },
    memory,
    behavioral,
    args.config.limits,
  ));
  canonicalKernelInputSchema.parse({
    ...hydrated,
    recent_messages: memory.compact_history,
    runtime_memory: behavioral.runtime_memory,
    operational_context: behavioral.operational_context,
  });
  const n8nDecision = resolveN8nDecision(args.raw, normalized);
  const divergence = await traceStage(stages, "shadow_compare", () => compareDecision(n8nDecision, behavioral.decision));

  return {
    ok: true,
    readonly: true,
    side_effects: false,
    mode: "shadow_decision",
    trace_id: traceId,
    request_id: args.requestId ?? null,
    tenant_id: hydrated.tenant_id ?? hydrated.lead?.tenant_id ?? normalized.tenant_id ?? null,
    conversation_id: hydrated.conversation?.id ?? normalized.conversation_id ?? null,
    lead_id: hydrated.lead?.id ?? normalized.lead_id ?? null,
    deal_id: hydrated.deal?.id ?? normalized.deal_id ?? null,
    message_id: clean(asRecord(args.raw).message_id) || null,
    phone: normalized.telefoneCompleto ?? normalized.remoteJid ?? null,
    governance_version: behavioral.decision.version,
    owner_pipeline: "pipeline_b",
    next_best_action: behavioral.decision.next_best_action,
    retrieval_policy: behavioral.decision.retrieval_policy,
    funnel_stage: behavioral.decision.runtime_state,
    required_tools: behavioral.decision.required_tools,
    allowed_tools: behavioral.decision.allowed_tools,
    property_presentation_due: behavioral.decision.property_presentation_due,
    n8n_decision: n8nDecision,
    decision: behavioral.decision,
    signals: behavioral.decision.signals,
    runtime_memory: behavioral.runtime_memory,
    operational_context: behavioral.operational_context,
    context: {
      context_chars: context.context_chars,
      required_blocks_present: context.required_blocks_present,
    },
    divergence,
    metrics: {
      latency_ms: Date.now() - started,
      stage_count: stages.length,
    },
    decision_trace: stages,
    stages,
  };
}
