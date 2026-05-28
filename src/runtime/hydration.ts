import type { Pool } from "pg";
import type { CanonicalDeal, CanonicalLead, CanonicalMessage } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { HydratedTurn, NormalizedTurnInput, RuntimeHardLimits } from "./types";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function compactLead(row: Record<string, unknown> | null): CanonicalLead | null {
  if (!row) return null;
  return {
    id: clean(row.id) || null,
    tenant_id: clean(row.tenant_id) || null,
    name: clean(row.name) || null,
    status: clean(row.status) || null,
    ai_status: clean(row.ai_status) || null,
    ai_last_intent: clean(row.ai_last_intent) || null,
  };
}

function compactDeal(row: Record<string, unknown> | null): CanonicalDeal | null {
  if (!row) return null;
  return {
    id: clean(row.id) || null,
    intent: clean(row.intent) || clean(row.purpose) || null,
    location_preference: clean(row.location_preference) || null,
    property_type: clean(row.property_type) || null,
    bedrooms: clean(row.bedrooms) || null,
    budget_min: clean(row.budget_min) || null,
    budget_max: clean(row.budget_max) || null,
    timeline: clean(row.timeline) || null,
    payment_method: clean(row.payment_method) || null,
    decision_maker: clean(row.decision_maker) || null,
  };
}

function compactMessages(rows: Record<string, unknown>[]): CanonicalMessage[] {
  return rows.map((row) => ({
    direction: clean(row.direction) || null,
    sender_type: clean(row.sender_type) || null,
    content: clean(row.content) || null,
    created_at: clean(row.created_at) || null,
  }));
}

async function first(pool: Pool, sql: string, params: unknown[]): Promise<Record<string, unknown> | null> {
  const result = await pool.query(sql, params);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function hydrateTurn(pool: Pool, input: NormalizedTurnInput): Promise<HydratedTurn> {
  const conversationId = clean(input.conversation_id);
  const tenantId = clean(input.tenant_id);
  const leadId = clean(input.lead_id);
  const dealId = clean(input.deal_id);

  const conversation = conversationId
    ? await first(
        pool,
        "select id, tenant_id, lead_id, deal_id, status, ai_paused from conversations where id = $1 limit 1",
        [conversationId],
      )
    : null;

  const resolvedTenantId = tenantId || clean(conversation?.tenant_id);
  const resolvedLeadId = leadId || clean(conversation?.lead_id);
  const resolvedDealId = dealId || clean(conversation?.deal_id);

  const lead = resolvedLeadId
    ? await first(
        pool,
        "select id, tenant_id, name, status, ai_status, ai_last_intent from leads where id = $1 limit 1",
        [resolvedLeadId],
      )
    : null;

  const deal = resolvedDealId
    ? await first(
        pool,
        "select id, intent, purpose, location_preference, property_type, bedrooms, budget_min, budget_max, timeline, payment_method, decision_maker from jurema_deals where id = $1 limit 1",
        [resolvedDealId],
      )
    : resolvedLeadId
      ? await first(
          pool,
          "select id, intent, purpose, location_preference, property_type, bedrooms, budget_min, budget_max, timeline, payment_method, decision_maker from jurema_deals where lead_id = $1 order by updated_at desc nulls last limit 1",
          [resolvedLeadId],
        )
      : null;

  const messagesResult = conversationId
    ? await pool.query(
        "select direction, sender_type, content, created_at from conversation_messages where conversation_id = $1 order by created_at desc limit 20",
        [conversationId],
      )
    : { rows: [] };

  const runtimeState = conversationId
    ? await first(
        pool,
        "select runtime_state, next_best_action, operational_context, runtime_memory, summary from ju_runtime_states where conversation_id = $1 order by updated_at desc nulls last limit 1",
        [conversationId],
      ).catch(() => null)
    : null;

  const operationalContext = asRecord(runtimeState?.operational_context);
  const runtimeMemory = asRecord(runtimeState?.runtime_memory);

  return {
    tenant_id: resolvedTenantId || compactLead(lead)?.tenant_id || null,
    lead: compactLead(lead),
    deal: compactDeal(deal),
    conversation: conversation
      ? {
          id: clean(conversation.id) || null,
          status: clean(conversation.status) || null,
          ai_paused: conversation.ai_paused === true,
        }
      : conversationId
        ? { id: conversationId, status: "open", ai_paused: false }
        : null,
    recent_messages: compactMessages([...messagesResult.rows].reverse()),
    mensagemCliente: input.mensagemCliente,
    messageType: input.messageType ?? null,
    event_type: input.event_type ?? null,
    internal_behavioral_event: input.internal_behavioral_event ?? null,
    operational_context: Object.keys(operationalContext).length ? operationalContext : null,
    runtime_memory: Object.keys(runtimeMemory).length ? runtimeMemory : null,
    sessionId: input.sessionId ?? input.telefoneCompleto ?? input.remoteJid ?? null,
    telefoneCompleto: input.telefoneCompleto ?? null,
    remoteJid: input.remoteJid ?? null,
    instance: input.instance ?? null,
    runtime_state_row: runtimeState,
  };
}

export function compactHydrationProjection(hydrated: HydratedTurn, limits?: Partial<RuntimeHardLimits>): HydratedTurn {
  const maxRecent = limits?.max_recent_messages ?? 20;
  return {
    ...hydrated,
    recent_messages: (hydrated.recent_messages ?? []).slice(-maxRecent),
    lead: hydrated.lead ? compactLead(hydrated.lead as Record<string, unknown>) : null,
    deal: hydrated.deal ? compactDeal(hydrated.deal as Record<string, unknown>) : null,
  };
}
