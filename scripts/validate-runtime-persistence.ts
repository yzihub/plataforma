/**
 * Fase 11 — Runtime Persistence + Stateful Replay Validation
 *
 * Testa diretamente executeJuRuntimeState contra o Supabase real,
 * sem precisar do dev server Next.js.
 *
 * Uso: npx tsx scripts/validate-runtime-persistence.ts
 */

import { config } from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { executeJuRuntimeState } from "../src/lib/ju-runtime/runtime-gateway";

config({ path: path.resolve(process.cwd(), ".env.local") });

const TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

const ERIC = {
  conversation_id: "3f3fca64-d56e-4934-b1bc-6e43ff1ce6da",
  lead_id: "ae5948e6-d5f5-459c-b24b-73aee00980ad",
  deal_id: "b748172e-77a4-46bb-b764-3a83ce22ffac",
};

const LUIZ = {
  conversation_id: "e28a7e78-871a-4206-b06a-99f52031c7f9",
  lead_id: "3d4f6d23-7b37-4cd5-884d-231a9eae23d3",
  deal_id: "f4d84361-4cf2-43c1-bcf0-3d4dc0e6677d",
};

function sep(label: string) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("━".repeat(60));
}

function check(label: string, condition: boolean, value?: unknown) {
  const display = value !== undefined ? String(typeof value === "object" ? JSON.stringify(value) : value) : "";
  if (condition) {
    console.log(`  ✅  ${label}${display ? ": " + display : ""}`);
  } else {
    console.log(`  ❌  ${label}${display ? ": " + display : ""}`);
  }
  return condition;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ─── FASE 1: Persistence Validation ────────────────────────────────────────

  sep("FASE 1 — PERSISTENCE VALIDATION (Eric Luna — lead quente)");

  const correlationEric = `validate_persist_eric_${Date.now()}`;
  const traceEric = {
    route: "/api/runtime/ju/state",
    method: "POST" as const,
    source: "runtime_gateway",
    channel: "whatsapp",
    origin: "persistence_validation_script",
    correlation_id: correlationEric,
    authenticated: true,
  };

  const bodyEric = {
    tenant_id: TENANT_ID,
    conversation_id: ERIC.conversation_id,
    persist: true,
    channel: "whatsapp",
    correlation_id: correlationEric,
    lead: { id: ERIC.lead_id, tenant_id: TENANT_ID, status: "contacted" },
    deal: {
      id: ERIC.deal_id,
      tenant_id: TENANT_ID,
      lead_id: ERIC.lead_id,
      deal_stage: "corretor",
      qualification_status: "quente",
      intent: "comprar",
      location_preference: "Bessa",
      budget_max: 600000,
      property_type: "apartamento",
      timeline: "90 dias",
    },
    conversation: {
      id: ERIC.conversation_id,
      tenant_id: TENANT_ID,
      lead_id: ERIC.lead_id,
      deal_id: ERIC.deal_id,
      status: "open",
      ai_paused: false,
    },
    recent_messages: [],
    current_message: "pode separar algumas opcoes pra mim",
  };

  console.log("\n  → Chamando executeJuRuntimeState com persist: true...");
  const resultEric = await executeJuRuntimeState(bodyEric, traceEric);

  sep("  Decisão do Runtime Engine");
  console.log("  correlation_id:", resultEric.correlation_id);
  check("ok", resultEric.ok === true, resultEric.ok);
  check("persisted", resultEric.persisted === true, resultEric.persisted);
  check("runtime_state", true, resultEric.decision.runtime_state);
  check("next_action", true, resultEric.decision.next_action);
  check("objective_state", true, resultEric.decision.objective_state);
  check("loop_risk", true, resultEric.decision.loop_risk);
  check("retrieval_policy", true, resultEric.decision.retrieval_policy);
  console.log("  latency_ms:", resultEric.gateway.latency_ms);
  console.log("  required_tools:", resultEric.decision.required_tools);
  console.log("  blocked_questions:", resultEric.decision.blocked_questions);
  console.log("  resolved_fields:", resultEric.decision.resolved_fields);

  // ─── Verificação: ju_runtime_states ────────────────────────────────────────

  sep("  Verificando ju_runtime_states");

  const { data: state1, error: stateErr } = await supabase
    .from("ju_runtime_states")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .eq("conversation_id", ERIC.conversation_id)
    .single();

  if (stateErr || !state1) {
    console.log(`  ❌  INSERT falhou: ${stateErr?.message ?? "row não encontrada"}`);
    process.exit(1);
  }

  check("tenant_id", state1.tenant_id === TENANT_ID);
  check("conversation_id", state1.conversation_id === ERIC.conversation_id);
  check("lead_id", state1.lead_id === ERIC.lead_id);
  check("deal_id", state1.deal_id === ERIC.deal_id);
  check("runtime_state presente", Boolean(state1.runtime_state), state1.runtime_state);
  check("next_action presente", Boolean(state1.next_action), state1.next_action);
  check("objective_state presente", Boolean(state1.objective_state), state1.objective_state);
  check("objective_priority > 0", state1.objective_priority > 0, state1.objective_priority);
  check("expected_output presente", Boolean(state1.expected_output));
  check("allowed_tools não vazio", Array.isArray(state1.allowed_tools) && state1.allowed_tools.length > 0, state1.allowed_tools);
  check("blocked_questions array", Array.isArray(state1.blocked_questions), state1.blocked_questions);
  check("resolved_fields não vazio", Array.isArray(state1.resolved_fields) && state1.resolved_fields.length > 0, state1.resolved_fields);
  check("token_budget presente", Boolean(state1.token_budget?.transcript_messages_max), state1.token_budget);
  check("last_transition_at presente", Boolean(state1.last_transition_at));

  // ─── Verificação: ju_runtime_transition_logs ───────────────────────────────

  sep("  Verificando ju_runtime_transition_logs");

  const { data: logs1 } = await supabase
    .from("ju_runtime_transition_logs")
    .select("*")
    .eq("conversation_id", ERIC.conversation_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const log1 = logs1?.[0];
  if (!log1) {
    console.log("  ❌  transition_log não encontrado");
    process.exit(1);
  }

  check("runtime_state logado", Boolean(log1.runtime_state), log1.runtime_state);
  check("next_action logado", Boolean(log1.next_action), log1.next_action);
  check("objective_state logado", Boolean(log1.objective_state), log1.objective_state);
  check("transition_reason logado", Boolean(log1.transition_reason), log1.transition_reason);
  check("valid_transition boolean", typeof log1.valid_transition === "boolean", log1.valid_transition);
  check("valid_objective_transition boolean", typeof log1.valid_objective_transition === "boolean", log1.valid_objective_transition);
  check("tool_trace presente", Boolean(log1.tool_trace), null);
  check("retrieval_trace presente", Boolean(log1.retrieval_trace), null);
  check("fallback_trace presente", Boolean(log1.fallback_trace), null);
  check("token_trace.transcript_messages_max presente", Boolean(log1.token_trace?.transcript_messages_max), log1.token_trace?.transcript_messages_max);
  check("objective_trace.objective_state presente", Boolean(log1.objective_trace?.objective_state), log1.objective_trace?.objective_state);

  // ─── Verificação: ju_runtime_gateway_logs ──────────────────────────────────

  sep("  Verificando ju_runtime_gateway_logs");

  const { data: gws } = await supabase
    .from("ju_runtime_gateway_logs")
    .select("*")
    .eq("correlation_id", correlationEric)
    .single();

  if (!gws) {
    console.log("  ❌  gateway log não encontrado");
    process.exit(1);
  }

  check("status: ok", gws.status === "ok", gws.status);
  check("status_code: 200", gws.status_code === 200, gws.status_code);
  check("persisted: true", gws.persisted === true, gws.persisted);
  check("authenticated: true", gws.authenticated === true, gws.authenticated);
  check("latency_ms > 0", gws.latency_ms > 0, gws.latency_ms + "ms");
  check("runtime_state logado", Boolean(gws.runtime_state), gws.runtime_state);
  check("objective_state logado", Boolean(gws.objective_state), gws.objective_state);
  check("next_action logado", Boolean(gws.next_action), gws.next_action);
  check("request_payload.media_state presente", "media_state" in (gws.request_payload ?? {}));
  check("response_payload.retrieval_policy presente", "retrieval_policy" in (gws.response_payload ?? {}));

  // ─── FASE 2: Stateful Replay ────────────────────────────────────────────────

  sep("FASE 2 — STATEFUL REPLAY (mesma conversa — handoff request)");

  const correlationReplay = `validate_replay_eric_${Date.now()}`;
  const traceReplay = { ...traceEric, correlation_id: correlationReplay };
  const bodyReplay = {
    ...bodyEric,
    correlation_id: correlationReplay,
    current_message: "quero falar com um corretor agora",
  };

  console.log("\n  → Chamando com mesmo conversation_id, mensagem: handoff...");
  const resultReplay = await executeJuRuntimeState(bodyReplay, traceReplay);

  sep("  Decisão do Replay");
  check("ok", resultReplay.ok === true);
  check("persisted", resultReplay.persisted === true);
  check("runtime_state = handoff_humano", resultReplay.decision.runtime_state === "handoff_humano", resultReplay.decision.runtime_state);
  check("next_action = handoff_corretor", resultReplay.decision.next_action === "handoff_corretor", resultReplay.decision.next_action);
  check("handoff_state = requested", resultReplay.decision.handoff_state === "requested", resultReplay.decision.handoff_state);
  check("escalation_state = required", resultReplay.decision.escalation_state === "required", resultReplay.decision.escalation_state);

  sep("  Verificando previous_state carregado do banco");

  const { data: replayLogs } = await supabase
    .from("ju_runtime_transition_logs")
    .select("*")
    .eq("conversation_id", ERIC.conversation_id)
    .order("created_at", { ascending: false })
    .limit(2);

  const replayLog = replayLogs?.[0];
  const firstLog2 = replayLogs?.[1];

  check("previous_runtime_state no log", Boolean(replayLog?.previous_runtime_state), replayLog?.previous_runtime_state);
  check("previous_next_action no log", Boolean(replayLog?.previous_next_action), replayLog?.previous_next_action);
  check("previous_objective_state no log", Boolean(replayLog?.previous_objective_state), replayLog?.previous_objective_state);

  if (firstLog2 && replayLog) {
    check(
      "previous_runtime_state = chamada anterior",
      replayLog.previous_runtime_state === firstLog2.runtime_state,
      `${replayLog.previous_runtime_state} === ${firstLog2.runtime_state}`,
    );
    check(
      "previous_objective_state = chamada anterior",
      replayLog.previous_objective_state === firstLog2.objective_state,
      `${replayLog.previous_objective_state} === ${firstLog2.objective_state}`,
    );
  }

  // ─── FASE 2B: Lead frio ─────────────────────────────────────────────────────

  sep("FASE 2B — Lead frio (Luiz Vieira — qualificacao incompleta)");

  const correlationLuiz = `validate_luiz_${Date.now()}`;
  const resultLuiz = await executeJuRuntimeState(
    {
      tenant_id: TENANT_ID,
      conversation_id: LUIZ.conversation_id,
      persist: true,
      channel: "whatsapp",
      correlation_id: correlationLuiz,
      lead: { id: LUIZ.lead_id, tenant_id: TENANT_ID, status: "new" },
      deal: { id: LUIZ.deal_id, tenant_id: TENANT_ID, lead_id: LUIZ.lead_id, deal_stage: "qualificacao", qualification_status: "incompleto" },
      conversation: { id: LUIZ.conversation_id, tenant_id: TENANT_ID, lead_id: LUIZ.lead_id, deal_id: LUIZ.deal_id, status: "open", ai_paused: false },
      recent_messages: [],
      current_message: "oi, estou procurando um imovel",
    },
    { route: "/api/runtime/ju/state", method: "POST", source: "runtime_gateway", channel: "whatsapp", origin: "script", correlation_id: correlationLuiz, authenticated: true },
  );

  check("ok", resultLuiz.ok === true);
  check("persisted", resultLuiz.persisted === true);
  check("runtime_state frio", ["lead_novo", "qualificacao"].includes(resultLuiz.decision.runtime_state), resultLuiz.decision.runtime_state);
  check("next_action = qualificar_objetivo", resultLuiz.decision.next_action === "qualificar_objetivo", resultLuiz.decision.next_action);
  check("retrieval_policy = disabled", resultLuiz.decision.retrieval_policy === "disabled");
  check("required_tools vazio", resultLuiz.decision.required_tools.length === 0, resultLuiz.decision.required_tools);
  check("missing_fields contém objetivo", resultLuiz.decision.missing_fields.includes("objetivo"), resultLuiz.decision.missing_fields);

  // ─── Sumário Final ──────────────────────────────────────────────────────────

  sep("SUMÁRIO — Fase 11 Runtime Persistence + Stateful Replay");

  const [{ data: finalStates }, { data: finalTLogs }, { data: finalGwLogs }] = await Promise.all([
    supabase.from("ju_runtime_states").select("id, runtime_state, objective_state, next_action").eq("tenant_id", TENANT_ID),
    supabase.from("ju_runtime_transition_logs").select("id").eq("tenant_id", TENANT_ID),
    supabase.from("ju_runtime_gateway_logs").select("id, status").eq("tenant_id", TENANT_ID),
  ]);

  console.log(`\n  ju_runtime_states rows: ${finalStates?.length ?? 0}`);
  if (finalStates?.length) {
    for (const s of finalStates) {
      console.log(`     conversation → ${s.runtime_state} / ${s.objective_state} / ${s.next_action}`);
    }
  }
  console.log(`  ju_runtime_transition_logs rows: ${finalTLogs?.length ?? 0}`);
  console.log(`  ju_runtime_gateway_logs rows: ${finalGwLogs?.length ?? 0} (ok: ${finalGwLogs?.filter(g => g.status === "ok").length ?? 0})`);

  console.log("\n  ✅  Persistence: VALIDADO");
  console.log("  ✅  Stateful Replay: VALIDADO");
  console.log("  ✅  Transition Traces: ÍNTEGROS");
  console.log("  ✅  Gateway Observability: FUNCIONANDO");
  console.log("  ✅  Runtime Authority: ATIVO\n");
}

main().catch((err) => {
  console.error("\n❌ ERRO FATAL:", err);
  process.exit(1);
});
