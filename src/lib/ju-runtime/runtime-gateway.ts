import { createAdminClient } from "@/lib/supabase/admin";
import { buildJuRuntimeContext } from "@/lib/ju-runtime/context-builder";
import { buildJuRuntimeDecision } from "@/lib/ju-runtime/state-engine";
import type {
  JuRuntimeContext,
  JuRuntimeConversation,
  JuRuntimeDeal,
  JuRuntimeInput,
  JuRuntimeLead,
  JuRuntimeMessage,
} from "@/lib/ju-runtime/types";

export type RuntimeStateRequest = JuRuntimeInput & {
  persist?: boolean;
  conversation_id?: string | null;
  channel?: string | null;
  origin?: string | null;
  correlation_id?: string | null;
};

export type RuntimeGatewayTrace = {
  route: string;
  method: string;
  source: string;
  channel?: string | null;
  origin?: string | null;
  correlation_id: string;
  authenticated?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function newCorrelationId() {
  return `ju_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCorrelationId(headers: Headers, body?: Pick<RuntimeStateRequest, "correlation_id"> | null) {
  return (
    clean(headers.get("x-correlation-id")) ||
    clean(headers.get("x-request-id")) ||
    clean(body?.correlation_id) ||
    newCorrelationId()
  );
}

export function isRuntimeRequestAuthorized(headers: Headers) {
  const configured = clean(process.env.YZI_RUNTIME_INTERNAL_KEY);
  if (!configured) {
    return {
      ok: false,
      reason: "runtime_key_not_configured",
    };
  }

  const provided =
    clean(headers.get("x-runtime-key")) ||
    clean(headers.get("authorization")).replace(/^bearer\s+/i, "");

  return {
    ok: Boolean(provided) && provided === configured,
    reason: provided ? "invalid_runtime_key" : "missing_runtime_key",
  };
}

async function loadConversationContext(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
) {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new Error(conversationError?.message || "Conversation not found");
  }

  const conversationRecord = conversation as JuRuntimeConversation;

  let lead: JuRuntimeLead | null = null;
  if (conversationRecord.lead_id) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", conversationRecord.lead_id)
      .maybeSingle();
    lead = (data as JuRuntimeLead | null) ?? null;
  }

  let deal: JuRuntimeDeal | null = null;
  if (conversationRecord.deal_id) {
    const { data } = await supabase
      .from("jurema_deals")
      .select("*")
      .eq("id", conversationRecord.deal_id)
      .maybeSingle();
    deal = (data as JuRuntimeDeal | null) ?? null;
  } else if (conversationRecord.tenant_id && conversationRecord.lead_id) {
    const { data } = await supabase
      .from("jurema_deals")
      .select("*")
      .eq("tenant_id", conversationRecord.tenant_id)
      .eq("lead_id", conversationRecord.lead_id)
      .limit(1)
      .maybeSingle();
    deal = (data as JuRuntimeDeal | null) ?? null;
  }

  const { data: recentDesc } = await supabase
    .from("conversation_messages")
    .select("id,direction,sender_type,content,message_type,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

  const recentMessages = ((recentDesc ?? []) as JuRuntimeMessage[]).reverse();
  const lastInbound = [...recentMessages]
    .reverse()
    .find((message) => message.direction === "inbound" || message.sender_type === "lead");

  return {
    tenant_id: conversationRecord.tenant_id ?? lead?.tenant_id ?? deal?.tenant_id ?? null,
    lead,
    deal,
    conversation: conversationRecord,
    recent_messages: recentMessages,
    current_message: lastInbound?.content ?? conversationRecord.last_message ?? "",
  } satisfies JuRuntimeInput;
}

async function persistDecision(
  supabase: ReturnType<typeof createAdminClient>,
  input: JuRuntimeInput,
  previous: Record<string, unknown> | null,
  decision: ReturnType<typeof buildJuRuntimeDecision>,
  runtimeContext: JuRuntimeContext,
) {
  if (!decision.tenant_id || !decision.conversation_id) {
    throw new Error("tenant_id and conversation_id are required to persist runtime state");
  }

  const stateRow = {
    tenant_id: decision.tenant_id,
    lead_id: decision.lead_id,
    deal_id: decision.deal_id,
    conversation_id: decision.conversation_id,
    runtime_state: decision.runtime_state,
    next_action: decision.next_action,
    conversation_mode: decision.conversation_mode,
    escalation_state: decision.escalation_state,
    handoff_state: decision.handoff_state,
    objective_state: decision.objective_state,
    objective_priority: decision.objective_priority,
    expected_output: decision.expected_output,
    valid_objective_transition: decision.valid_objective_transition,
    allowed_tools: decision.allowed_tools,
    required_tools: decision.required_tools,
    retrieval_policy: decision.retrieval_policy,
    blocked_questions: decision.blocked_questions,
    resolved_fields: decision.resolved_fields,
    missing_fields: decision.missing_fields,
    loop_risk: decision.loop_risk,
    token_budget: decision.token_budget,
    state_payload: decision.state_payload,
    decision_payload: decision.decision_payload,
    objective_payload: {
      objective_state: decision.objective_state,
      objective_priority: decision.objective_priority,
      expected_output: decision.expected_output,
      valid_objective_transition: decision.valid_objective_transition,
    },
    last_transition_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("ju_runtime_states")
    .upsert(stateRow, { onConflict: "tenant_id,conversation_id" });

  if (upsertError) throw upsertError;

  const logRow = {
    tenant_id: decision.tenant_id,
    lead_id: decision.lead_id,
    deal_id: decision.deal_id,
    conversation_id: decision.conversation_id,
    previous_runtime_state: previous?.runtime_state ?? null,
    runtime_state: decision.runtime_state,
    previous_next_action: previous?.next_action ?? null,
    next_action: decision.next_action,
    previous_objective_state: previous?.objective_state ?? null,
    objective_state: decision.objective_state,
    objective_priority: decision.objective_priority,
    expected_output: decision.expected_output,
    valid_objective_transition: decision.valid_objective_transition,
    transition_reason: decision.transition_reason,
    valid_transition: decision.valid_transition,
    allowed_tools: decision.allowed_tools,
    required_tools: decision.required_tools,
    retrieval_policy: decision.retrieval_policy,
    loop_risk: decision.loop_risk,
    tool_trace: runtimeContext.tool_rules,
    retrieval_trace: runtimeContext.retrieval_rules,
    fallback_trace: { media_state: input.media_state ?? "none" },
    token_trace: {
      ...decision.token_budget,
      ...runtimeContext.token_metrics,
    },
    objective_trace: {
      objective_state: decision.objective_state,
      objective_priority: decision.objective_priority,
      expected_output: decision.expected_output,
      valid_objective_transition: decision.valid_objective_transition,
      previous_objective_state: previous?.objective_state ?? null,
    },
    decision_payload: decision.decision_payload,
  };

  const { error: logError } = await supabase
    .from("ju_runtime_transition_logs")
    .insert(logRow);

  if (logError) throw logError;
}

async function logGatewayRequest(
  supabase: ReturnType<typeof createAdminClient> | null,
  trace: RuntimeGatewayTrace,
  payload: {
    tenant_id?: string | null;
    lead_id?: string | null;
    deal_id?: string | null;
    conversation_id?: string | null;
    status: "ok" | "error" | "unauthorized";
    status_code: number;
    error_message?: string | null;
    started_at: number;
    persisted?: boolean;
    runtime_state?: string | null;
    objective_state?: string | null;
    next_action?: string | null;
    request_payload?: Record<string, unknown>;
    response_payload?: Record<string, unknown>;
  },
) {
  if (!supabase) return;

  const { error } = await supabase.from("ju_runtime_gateway_logs").insert({
    tenant_id: payload.tenant_id ?? null,
    lead_id: payload.lead_id ?? null,
    deal_id: payload.deal_id ?? null,
    conversation_id: payload.conversation_id ?? null,
    correlation_id: trace.correlation_id,
    route: trace.route,
    method: trace.method,
    source: trace.source,
    channel: trace.channel ?? null,
    origin: trace.origin ?? null,
    authenticated: trace.authenticated ?? false,
    status: payload.status,
    status_code: payload.status_code,
    error_message: payload.error_message ?? null,
    latency_ms: Date.now() - payload.started_at,
    persisted: payload.persisted ?? false,
    runtime_state: payload.runtime_state ?? null,
    objective_state: payload.objective_state ?? null,
    next_action: payload.next_action ?? null,
    request_payload: payload.request_payload ?? {},
    response_payload: payload.response_payload ?? {},
  });

  if (error) {
    console.error("[ju runtime gateway log]", error.message);
  }
}

export function validateRuntimeGatewayBody(body: RuntimeStateRequest) {
  const errors: string[] = [];
  const tenantId = clean(body.tenant_id ?? body.lead?.tenant_id ?? body.deal?.tenant_id ?? body.conversation?.tenant_id);
  const conversationId = clean(body.conversation_id ?? body.conversation?.id);

  if (!tenantId) errors.push("tenant_id is required");
  if (!conversationId) errors.push("conversation.id or conversation_id is required");
  if (!clean(body.channel ?? body.entry_profile ?? "whatsapp")) errors.push("channel is required");

  return {
    ok: errors.length === 0,
    errors,
  };
}

export async function executeJuRuntimeState(
  body: RuntimeStateRequest,
  trace: RuntimeGatewayTrace,
) {
  const startedAt = Date.now();
  const conversationId = body.conversation_id ?? body.conversation?.id ?? null;
  const shouldLoadFromDb = Boolean(body.conversation_id && !body.conversation);
  const shouldUseDb = body.persist === true || shouldLoadFromDb || trace.source === "runtime_gateway";
  const supabase = shouldUseDb ? createAdminClient() : null;

  try {
    const loaded = supabase && conversationId && shouldLoadFromDb
      ? await loadConversationContext(supabase, conversationId)
      : null;

    const input: JuRuntimeInput = {
      ...loaded,
      ...body,
      lead: body.lead ?? loaded?.lead ?? null,
      deal: body.deal ?? loaded?.deal ?? null,
      conversation: body.conversation ?? loaded?.conversation ?? null,
      recent_messages: body.recent_messages ?? loaded?.recent_messages ?? [],
      current_message: body.current_message ?? loaded?.current_message ?? null,
      tenant_id: body.tenant_id ?? loaded?.tenant_id ?? null,
      entry_profile: body.entry_profile ?? body.channel ?? null,
    };

    let previous: Record<string, unknown> | null = null;
    if (supabase && input.tenant_id && input.conversation?.id) {
      const { data } = await supabase
        .from("ju_runtime_states")
        .select("runtime_state,next_action,objective_state")
        .eq("tenant_id", input.tenant_id)
        .eq("conversation_id", input.conversation.id)
        .maybeSingle();
      previous = asRecord(data);
    }

    const previousDecision =
      previous?.runtime_state && previous?.next_action
        ? {
            runtime_state: previous.runtime_state as never,
            next_action: previous.next_action as never,
            objective_state: previous.objective_state as never,
          }
        : null;

    const decision = buildJuRuntimeDecision(input, previousDecision);
    const runtimeContext = buildJuRuntimeContext(input, decision);

    if (body.persist === true && supabase) {
      await persistDecision(supabase, input, previous, decision, runtimeContext);
    }

    const response = {
      ok: true,
      correlation_id: trace.correlation_id,
      persisted: body.persist === true,
      decision,
      context: runtimeContext,
      gateway: {
        route: trace.route,
        source: trace.source,
        channel: trace.channel ?? body.channel ?? body.entry_profile ?? null,
        origin: trace.origin ?? body.origin ?? null,
        latency_ms: Date.now() - startedAt,
      },
    };

    await logGatewayRequest(supabase, trace, {
      tenant_id: decision.tenant_id,
      lead_id: decision.lead_id,
      deal_id: decision.deal_id,
      conversation_id: decision.conversation_id,
      status: "ok",
      status_code: 200,
      started_at: startedAt,
      persisted: body.persist === true,
      runtime_state: decision.runtime_state,
      objective_state: decision.objective_state,
      next_action: decision.next_action,
      request_payload: {
        has_lead: Boolean(body.lead),
        has_deal: Boolean(body.deal),
        has_conversation: Boolean(body.conversation),
        recent_messages_count: body.recent_messages?.length ?? 0,
        media_state: body.media_state ?? "none",
      },
      response_payload: {
        retrieval_policy: decision.retrieval_policy,
        loop_risk: decision.loop_risk,
        valid_transition: decision.valid_transition,
        valid_objective_transition: decision.valid_objective_transition,
      },
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    await logGatewayRequest(supabase, trace, {
      tenant_id: body.tenant_id ?? body.lead?.tenant_id ?? body.deal?.tenant_id ?? body.conversation?.tenant_id ?? null,
      lead_id: body.lead?.id ?? body.conversation?.lead_id ?? body.deal?.lead_id ?? null,
      deal_id: body.deal?.id ?? body.conversation?.deal_id ?? null,
      conversation_id: body.conversation?.id ?? body.conversation_id ?? null,
      status: "error",
      status_code: 500,
      error_message: message,
      started_at: startedAt,
      persisted: false,
    });
    throw error;
  }
}

export async function logUnauthorizedRuntimeRequest(
  body: Partial<RuntimeStateRequest>,
  trace: RuntimeGatewayTrace,
  reason: string,
) {
  let supabase: ReturnType<typeof createAdminClient> | null = null;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = null;
  }

  await logGatewayRequest(supabase, trace, {
    tenant_id: body.tenant_id ?? body.lead?.tenant_id ?? body.deal?.tenant_id ?? body.conversation?.tenant_id ?? null,
    lead_id: body.lead?.id ?? body.conversation?.lead_id ?? body.deal?.lead_id ?? null,
    deal_id: body.deal?.id ?? body.conversation?.deal_id ?? null,
    conversation_id: body.conversation?.id ?? body.conversation_id ?? null,
    status: "unauthorized",
    status_code: 401,
    error_message: reason,
    started_at: Date.now(),
    persisted: false,
  });
}
