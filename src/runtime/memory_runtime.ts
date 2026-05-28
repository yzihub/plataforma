import type { Pool } from "pg";
import type { CanonicalKernelInput, CanonicalMessage } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { HydratedTurn, MemoryRuntimeResult, RuntimeHardLimits } from "./types";

const DEFAULT_LIMITS: RuntimeHardLimits = {
  max_recent_messages: 20,
  max_summary_chars: 2400,
  max_retrieval_chunks: 6,
  max_doctrine_retrieval: 2,
  max_metadata_chars: 4000,
  max_context_chars: 24000,
  max_orchestration_passes: 2,
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function speaker(message: CanonicalMessage): string {
  return message.direction === "outbound" || message.sender_type === "agent" ? "Ju" : "Cliente";
}

function compactLine(message: CanonicalMessage): string {
  return `${speaker(message)}: ${clean(message.content).replace(/\s+/g, " ")}`.slice(0, 500);
}

function mergeSummary(previousSummary: string, messages: CanonicalMessage[], maxSummaryChars: number): string {
  const useful = messages.filter((message) => clean(message.content));
  if (!useful.length) return previousSummary.slice(-maxSummaryChars);
  const appended = useful.map(compactLine).join("\n");
  return [previousSummary, appended].filter(Boolean).join("\n").slice(-maxSummaryChars);
}

function behavioralMemory(input: CanonicalKernelInput): Record<string, unknown> {
  const text = [input.mensagemCliente, ...(input.recent_messages ?? []).slice(-20).map((m) => m.content)].join(" ").toLowerCase();
  return {
    mentions_spouse: /esposa|marido|casal/.test(text),
    mentions_fgts: text.includes("fgts"),
    mentions_financing: /financiamento|financiar/.test(text),
    mentions_visit: /visita|visitar|conhecer pessoalmente/.test(text),
    mentions_revisit: /manda de novo|reenvia|aquele im/.test(text),
  };
}

function operationalMemory(input: HydratedTurn): Record<string, unknown> {
  return {
    tenant_id: input.tenant_id ?? input.lead?.tenant_id ?? null,
    lead_id: input.lead?.id ?? null,
    deal_id: input.deal?.id ?? null,
    conversation_id: input.conversation?.id ?? null,
    known_region: input.operational_context?.preferred_regions?.[0] ?? input.deal?.location_preference ?? null,
    known_type: input.operational_context?.property_type ?? input.deal?.property_type ?? null,
    known_budget_max: input.operational_context?.budget_max ?? input.deal?.budget_max ?? null,
    known_objective: input.operational_context?.objective ?? input.deal?.intent ?? input.lead?.ai_last_intent ?? null,
  };
}

async function loadPreviousSummary(pool: Pool, conversationId: string): Promise<string> {
  const result = await pool
    .query("select summary from ju_runtime_memory where conversation_id = $1 order by updated_at desc limit 1", [conversationId])
    .catch(() => ({ rows: [] }));
  return clean(result.rows[0]?.summary);
}

async function persistSummary(pool: Pool, input: HydratedTurn, summary: string, behavioral: Record<string, unknown>, operational: Record<string, unknown>): Promise<boolean> {
  const conversationId = clean(input.conversation?.id);
  const tenantId = clean(input.tenant_id ?? input.lead?.tenant_id);
  if (!conversationId || !tenantId) return false;
  await pool
    .query(
      `
        insert into ju_runtime_memory
          (tenant_id, conversation_id, lead_id, deal_id, summary, behavioral_memory, operational_memory, updated_at)
        values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, now())
        on conflict (conversation_id)
        do update set
          summary = excluded.summary,
          behavioral_memory = excluded.behavioral_memory,
          operational_memory = excluded.operational_memory,
          updated_at = now()
      `,
      [
        tenantId,
        conversationId,
        input.lead?.id ?? null,
        input.deal?.id ?? null,
        summary,
        JSON.stringify(behavioral),
        JSON.stringify(operational),
      ],
    )
    .catch(() => undefined);
  return true;
}

export async function buildMemoryRuntime(
  pool: Pool,
  hydrated: HydratedTurn,
  options: { persist: boolean; limits?: Partial<RuntimeHardLimits> },
): Promise<MemoryRuntimeResult> {
  const limits = { ...DEFAULT_LIMITS, ...(options.limits ?? {}) };
  const recent = (hydrated.recent_messages ?? []).filter((message) => clean(message.content)).slice(-limits.max_recent_messages);
  const compactCount = Math.min(10, limits.max_recent_messages);
  const compact = recent.slice(-compactCount);
  const previousSummary = hydrated.conversation?.id ? await loadPreviousSummary(pool, hydrated.conversation.id) : "";
  const summary = mergeSummary(previousSummary, recent.slice(0, Math.max(0, recent.length - compactCount)), limits.max_summary_chars);
  const behavioral = behavioralMemory({ ...hydrated, recent_messages: recent });
  const operational = operationalMemory(hydrated);
  const runtimeMemory = {
    ...(hydrated.runtime_memory ?? {}),
    summary_chars: summary.length,
    recent_messages_count: recent.length,
  };
  const persisted = options.persist ? await persistSummary(pool, hydrated, summary, behavioral, operational) : false;

  return {
    recent_messages: recent,
    compact_history: compact,
    summary,
    behavioral_memory: behavioral,
    operational_memory: operational,
    runtime_memory: runtimeMemory,
    persisted,
  };
}
