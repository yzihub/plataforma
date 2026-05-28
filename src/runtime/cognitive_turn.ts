import type { Pool } from "pg";
import type Redis from "ioredis";
import {
  assertCanonicalResponseDraft,
  canonicalKernelInputSchema,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { compactHydrationProjection, hydrateTurn } from "./hydration";
import { buildMemoryRuntime } from "./memory_runtime";
import { syncOperationalContext } from "./behavioral_engine";
import { renderOfficialContext } from "./context_renderer";
import { acquireConversationLock, releaseConversationLock } from "./lock";
import { contextSize, logger, recordShadowComparison, traceStage, turnDuration } from "./observability";
import { compareShadowBehavior } from "./divergence_engine";
import { calibrateBehavior } from "./behavioral_calibration";
import { persistShadowComparison, persistShadowFixture } from "./shadow_storage";
import { recordBehavioralCalibration } from "./observability";
import type { BehavioralCalibration, CognitiveTurnResult, NormalizedTurnInput, RuntimeConfig, RuntimeStageTrace, ShadowOriginalSnapshot } from "./types";
import type { LlmRuntime } from "./llm_runtime";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function traceId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`${label} must be a canonical UUID (got: ${value.slice(0, 64)})`);
  }
}

export function normalizeTurnInput(raw: unknown): NormalizedTurnInput {
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const body = record.body && typeof record.body === "object" ? (record.body as Record<string, unknown>) : record;
  const data = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};
  const message = data.message && typeof data.message === "object" ? (data.message as Record<string, unknown>) : {};
  const key = data.key && typeof data.key === "object" ? (data.key as Record<string, unknown>) : {};
  const remoteJid = clean(record.remoteJid ?? key.remoteJid ?? key.remoteJidAlt);
  const phone = clean(record.telefoneCompleto ?? record.phone ?? (remoteJid.includes("@") ? remoteJid.split("@")[0] : remoteJid));
  const extended = message.extendedTextMessage && typeof message.extendedTextMessage === "object" ? message.extendedTextMessage as Record<string, unknown> : {};
  const shadowOriginalRecord = record.shadow_original && typeof record.shadow_original === "object" && !Array.isArray(record.shadow_original)
    ? record.shadow_original as Record<string, unknown>
    : null;
  const shadowOriginal: ShadowOriginalSnapshot | null = shadowOriginalRecord || record.n8n_output || record.original_output
    ? {
        output: clean(shadowOriginalRecord?.output ?? record.n8n_output ?? record.original_output) || null,
        next_best_action: clean(shadowOriginalRecord?.next_best_action ?? record.n8n_next_best_action) || null,
        property_presentation_due: typeof shadowOriginalRecord?.property_presentation_due === "boolean"
          ? shadowOriginalRecord.property_presentation_due
          : typeof record.n8n_property_presentation_due === "boolean"
            ? record.n8n_property_presentation_due
            : null,
        required_tools: Array.isArray(shadowOriginalRecord?.required_tools)
          ? shadowOriginalRecord.required_tools.map(clean)
          : Array.isArray(record.n8n_required_tools)
            ? record.n8n_required_tools.map(clean)
            : null,
        funnel_stage: clean(shadowOriginalRecord?.funnel_stage ?? record.n8n_funnel_stage) || null,
        qualification_depth: Number.isFinite(Number(shadowOriginalRecord?.qualification_depth ?? record.n8n_qualification_depth))
          ? Number(shadowOriginalRecord?.qualification_depth ?? record.n8n_qualification_depth)
          : null,
        governance_flags: shadowOriginalRecord?.governance_flags && typeof shadowOriginalRecord.governance_flags === "object"
          ? shadowOriginalRecord.governance_flags as Record<string, unknown>
          : null,
        inventory_fatigue: typeof shadowOriginalRecord?.inventory_fatigue === "boolean" ? shadowOriginalRecord.inventory_fatigue : null,
        spouse_decision: typeof shadowOriginalRecord?.spouse_decision === "boolean" ? shadowOriginalRecord.spouse_decision : null,
        rendered_context: clean(shadowOriginalRecord?.rendered_context ?? record.n8n_rendered_context) || null,
        tool_decisions: Array.isArray(shadowOriginalRecord?.tool_decisions) ? shadowOriginalRecord.tool_decisions.map(clean) : null,
        tool_usage: Array.isArray(shadowOriginalRecord?.tool_usage)
          ? shadowOriginalRecord.tool_usage.map(clean)
          : Array.isArray(record.n8n_tool_usage)
            ? record.n8n_tool_usage.map(clean)
            : null,
        timing_ms: Number.isFinite(Number(shadowOriginalRecord?.timing_ms ?? record.n8n_timing_ms))
          ? Number(shadowOriginalRecord?.timing_ms ?? record.n8n_timing_ms)
          : null,
      }
    : null;

  return {
    tenant_id: clean(record.tenant_id) || null,
    conversation_id: clean(record.conversation_id) || clean(record.conversationId) || null,
    lead_id: clean(record.lead_id) || null,
    deal_id: clean(record.deal_id) || null,
    sessionId: clean(record.sessionId) || phone || null,
    telefoneCompleto: phone || null,
    remoteJid: remoteJid || null,
    instance: clean(record.instance ?? body.instance) || null,
    mensagemCliente: clean(record.mensagemCliente ?? record.current_message ?? record.mensagem ?? message.conversation ?? extended.text),
    messageType: clean(record.messageType ?? data.messageType) || null,
    event_type: clean(record.event_type) || null,
    internal_behavioral_event: record.internal_behavioral_event && typeof record.internal_behavioral_event === "object"
      ? record.internal_behavioral_event as Record<string, unknown>
      : null,
    shadow_expected_output: clean(record.shadow_expected_output) || null,
    shadow_original: shadowOriginal,
    dry_run: record.dry_run === true,
  };
}

async function persistRuntimeState(pool: Pool, normalized: NormalizedTurnInput, result: CognitiveTurnResult): Promise<void> {
  const decision = result.decision;
  if (!decision || !result.conversation_id) return;
  const tenantId = clean(normalized.tenant_id);
  if (!tenantId) return;
  await pool.query(
    `
      insert into ju_runtime_states
        (tenant_id, conversation_id, runtime_state, next_best_action, operational_context, runtime_memory, summary, updated_at)
      values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, now())
      on conflict (conversation_id)
      do update set
        runtime_state = excluded.runtime_state,
        next_best_action = excluded.next_best_action,
        operational_context = excluded.operational_context,
        runtime_memory = excluded.runtime_memory,
        summary = excluded.summary,
        updated_at = now()
    `,
    [
      tenantId,
      result.conversation_id,
      decision.runtime_state,
      decision.next_best_action,
      JSON.stringify({ funnel_stage: decision.runtime_state }),
      JSON.stringify({ ...decision.signals, next_best_action: decision.next_best_action }),
      "",
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "runtime state persistence skipped");
  });
}

async function persistOutbound(pool: Pool, normalized: NormalizedTurnInput, result: CognitiveTurnResult): Promise<void> {
  const output = clean(result.llm.output);
  if (!output || !result.conversation_id) return;
  await pool.query(
    `
      insert into conversation_messages
        (tenant_id, conversation_id, direction, sender_type, content, message_type, metadata, created_at)
      values ($1, $2, 'outbound', 'agent', $3, 'text', $4::jsonb, now())
    `,
    [
      normalized.tenant_id,
      result.conversation_id,
      output,
      JSON.stringify({
        source: "cognitive_runtime",
        mode: result.mode,
        trace_id: result.trace_id,
        required_tools: result.decision.required_tools,
        tool_results: result.llm.tool_results.map((tool) => ({ tool: tool.tool, ok: tool.ok, latency_ms: tool.latency_ms })),
      }),
    ],
  ).catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "outbound persistence skipped");
  });
}

export async function executeCognitiveTurn(args: {
  raw: unknown;
  pool: Pool;
  redis: Redis;
  llm: LlmRuntime;
  config: RuntimeConfig;
}): Promise<CognitiveTurnResult> {
  const started = Date.now();
  const stages: RuntimeStageTrace[] = [];
  const id = traceId();
  let lock: Awaited<ReturnType<typeof acquireConversationLock>> = null;
  const normalized = await traceStage(stages, "normalize", () => normalizeTurnInput(args.raw));
  const conversationIdForLock = clean(normalized.conversation_id);
  if (!conversationIdForLock) throw new Error("conversation_id is required for single-threaded runtime lock");
  assertUuid(conversationIdForLock, "conversation_id");

  try {
    lock = await traceStage(stages, "lock", () => acquireConversationLock(args.redis, conversationIdForLock, args.config.lockTtlMs));
    if (!lock) throw new Error(`conversation ${conversationIdForLock} is already locked`);

    const hydrated = await traceStage(stages, "hydrate", async () => compactHydrationProjection(
      await hydrateTurn(args.pool, normalized),
      args.config.limits,
    ));
    const memory = await traceStage(stages, "memory", () => buildMemoryRuntime(args.pool, hydrated, {
      persist: args.config.runtimeMode === "active" && normalized.dry_run !== true,
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
    contextSize.set(context.context_chars);
    canonicalKernelInputSchema.parse({
      ...hydrated,
      recent_messages: memory.compact_history,
      runtime_memory: behavioral.runtime_memory,
      operational_context: behavioral.operational_context,
    });

    const baseToolPayload = {
      tenant_id: hydrated.tenant_id ?? hydrated.lead?.tenant_id ?? null,
      lead_id: hydrated.lead?.id ?? null,
      deal_id: hydrated.deal?.id ?? null,
      conversation_id: hydrated.conversation?.id ?? normalized.conversation_id ?? null,
      phone: normalized.telefoneCompleto ?? null,
      telefoneCompleto: normalized.telefoneCompleto,
      bairro: behavioral.operational_context.preferred_regions?.[0] ?? hydrated.deal?.location_preference ?? null,
      tipo_imovel: behavioral.operational_context.property_type ?? hydrated.deal?.property_type ?? null,
      quartos: behavioral.operational_context.bedrooms ?? hydrated.deal?.bedrooms ?? null,
      valor_max: behavioral.operational_context.budget_max ?? hydrated.deal?.budget_max ?? null,
    };

    const llm = await traceStage(stages, "llm", () => args.llm.run({
      mensagemCliente: normalized.mensagemCliente,
      context,
      behavioral,
      baseToolPayload,
    }));
    const violations = [
      ...behavioral.violations,
      ...assertCanonicalResponseDraft(behavioral.decision, {
        text: llm.output,
        tools_called: llm.tool_calls.map((call) => call.tool),
      }),
    ];
    const comparison = args.config.runtimeMode === "shadow" || args.config.runtimeMode === "behavioral_qa"
      ? await traceStage(stages, "shadow_compare", () => compareShadowBehavior({
          original: normalized.shadow_original ?? {
            output: normalized.shadow_expected_output,
          },
          decision: behavioral.decision,
          context,
          llm,
          runtime_memory: behavioral.runtime_memory,
        }))
      : undefined;
    if (comparison) recordShadowComparison(comparison);
    const calibration: BehavioralCalibration | undefined = comparison
      ? await traceStage(stages, "calibration", () => calibrateBehavior({
          input: normalized,
          decision: behavioral.decision,
          llm,
          comparison,
        }), { calibration: true })
      : undefined;
    if (calibration) recordBehavioralCalibration(calibration);

    const result: CognitiveTurnResult = {
      ok: violations.length === 0 && (!comparison || comparison.critical_failures.length === 0),
      mode: args.config.runtimeMode,
      trace_id: id,
      conversation_id: hydrated.conversation?.id ?? normalized.conversation_id ?? null,
      decision: behavioral.decision,
      context,
      llm,
      violations,
      stages,
      shadow: args.config.runtimeMode === "shadow" || args.config.runtimeMode === "behavioral_qa"
        ? {
            expected_output: normalized.shadow_expected_output,
            actual_output: llm.output,
            exact_match: clean(normalized.shadow_expected_output) === clean(llm.output),
            comparison,
            calibration,
          }
        : undefined,
    };

    await traceStage(stages, "persist", async () => {
      if (normalized.dry_run === true) return;
      if (args.config.runtimeMode === "shadow") {
        const storageInput = {
          ...normalized,
          tenant_id: normalized.tenant_id ?? hydrated.tenant_id ?? hydrated.lead?.tenant_id ?? null,
        };
        await persistShadowComparison(args.pool, storageInput, result);
        await persistShadowFixture(args.pool, storageInput, result);
        return;
      }
      await persistRuntimeState(args.pool, normalized, result);
      await persistOutbound(args.pool, normalized, result);
    });

    await traceStage(stages, "outbound", async () => undefined, {
      delegated_to: "n8n_operational_outbound",
      mode: args.config.runtimeMode,
    });
    turnDuration.labels(args.config.runtimeMode, String(result.ok)).observe(Date.now() - started);
    return result;
  } finally {
    if (lock) {
      const acquiredLock = lock;
      await traceStage(stages, "release", () => releaseConversationLock(args.redis, acquiredLock));
    }
  }
}
