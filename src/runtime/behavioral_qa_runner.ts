import { writeFile } from "node:fs/promises";
import type { Pool } from "pg";
import type Redis from "ioredis";
import { assertCanonicalResponseDraft } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { buildCostAuditSnapshot, persistCostAudit } from "./cost_audit";
import { executeCognitiveTurn } from "./cognitive_turn";
import { compareShadowBehavior } from "./divergence_engine";
import { recordCostAudit } from "./observability";
import { guardKernelResponse } from "./response_guardian";
import type { LlmRuntime } from "./llm_runtime";
import type {
  BehavioralQaAudit,
  BehavioralQaHumanReview,
  BehavioralQaRunReport,
  BehavioralQaScenario,
  CognitiveTurnResult,
  NormalizedTurnInput,
  RuntimeConfig,
} from "./types";

const QA_REPORT_PATH = "docs/behavioral-qa-audit-report.md";

function uuid(seed: string): string {
  const hex = Buffer.from(seed).toString("hex").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function questionCount(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function hasAny(text: string, patterns: string[]): boolean {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

export function behavioralQaScenarios(): BehavioralQaScenario[] {
  const base = (
    id: string,
    title: string,
    category: BehavioralQaScenario["category"],
    messages: string[],
    expected: string[],
    tools: BehavioralQaScenario["expected_tools"] = ["consultar_imoveis"],
  ): BehavioralQaScenario => ({
    id,
    title,
    category,
    conversation_id: uuid(`qa-conversation-${id}`),
    lead_id: uuid(`qa-lead-${id}`),
    deal_id: uuid(`qa-deal-${id}`),
    description: expected[0] ?? title,
    messages,
    expected_behavior: expected,
    expected_tools: [...tools],
  });

  return [
    base("lead-frio", "Lead frio", "lead_frio", [
      "Oi, vi vocês no Instagram. Estou começando a olhar apartamentos, mas ainda sem muita noção.",
      "Queria algo em João Pessoa, talvez pra morar no ano que vem.",
    ], ["Acolher sem formulário, descobrir contexto com no máximo uma pergunta e evitar SDR."], []),
    base("praia-fgts", "Praia + FGTS", "praia_fgts", [
      "Quero um apartamento perto da praia e tenho FGTS pra usar.",
      "Gosto de Cabo Branco ou Bessa, até uns 650 mil.",
    ], ["Apresentar opções cedo, considerar FGTS e não pedir permissão para buscar."]),
    base("casal-indeciso", "Casal indeciso", "casal_indeciso", [
      "Eu gostei do Bessa, mas minha esposa acha melhor Manaíra.",
      "A gente ainda está comparando com calma.",
    ], ["Respeitar decisão de casal, reduzir pressão e ajudar comparação."]),
    base("investidor-airbnb", "Investidor Airbnb", "investidor_airbnb", [
      "Estou pensando em comprar pra Airbnb, perto da praia.",
      "Quero algo que tenha liquidez e diária boa, sem ser dor de cabeça.",
    ], ["Curadoria de investimento sem prometer rentabilidade, acionar conhecimento quando util."], ["consultar_imoveis", "conhecimento_estrategico_luana1"]),
    base("revisita-imovel", "Revisita de imóvel", "revisita_imovel", [
      "Aquele apartamento que você tinha mandado no Bessa ainda está disponível?",
      "Era um com varanda, acho que perto do parque.",
    ], ["Revalidar imóvel via consultar_imoveis, não reconstruir URL."]),
    base("inventory-fatigue", "Inventory fatigue", "inventory_fatigue", [
      "Você já me mandou muita opção, estou meio perdido.",
      "Não quero receber mais um monte de imóvel agora.",
    ], ["Parar envio massivo, reduzir inventario e organizar decisao."], ["atualizar_qualificacao"]),
    base("followup-sensivel", "Follow-up sensível", "followup_sensivel", [
      "Desculpa sumir, tive uns problemas pessoais.",
      "Ainda quero ver, mas estou sem cabeça pra decidir agora.",
    ], ["Follow-up humano, baixa pressao e uma proxima acao leve."], ["atualizar_qualificacao"]),
    base("alto-padrao", "Alto padrão", "alto_padrao", [
      "Procuro algo alto padrão, vista mar, bem exclusivo.",
      "Pode ser Cabo Branco ou Altiplano, acima de 2 milhões se fizer sentido.",
    ], ["Curadoria consultiva, poucas opções e linguagem sofisticada sem exagero."]),
    base("lead-confuso", "Lead confuso", "lead_confuso", [
      "Não sei se compro ou alugo, talvez invista, talvez more.",
      "Só queria entender o que faz mais sentido.",
    ], ["Organizar objetivo sem formulario e sem inventar certeza."], ["atualizar_qualificacao", "conhecimento_estrategico_luana1"]),
    base("visita-agendamento", "Visita/agendamento", "visita_agendamento", [
      "Gostei dessas opções. Dá pra visitar sábado?",
      "Prefiro de manhã, se tiver como.",
    ], ["Facilitar agendamento e setar lead quente quando houver intencao clara."], ["setar_lead_quente", "atualizar_qualificacao"]),
    base("financiamento-complexo", "Financiamento complexo", "financiamento_complexo", [
      "Tenho entrada de 180 mil e queria financiar o resto.",
      "Minha renda é variável porque sou PJ. Dá pra fazer algo?",
    ], ["Tratar financiamento com cuidado, orientar sem prometer aprovacao."], ["atualizar_qualificacao", "conhecimento_estrategico_luana1"]),
    base("reenvio-imovel", "Reenvio de imóvel", "reenvio_imovel", [
      "Pode reenviar aquele imóvel que você mandou ontem?",
      "Acho que era em Manaíra, com 3 quartos.",
    ], ["Reenviar/revalidar por tool, não repetir inventário inteiro."]),
    base("cliente-objetivo", "Cliente objetivo", "cliente_objetivo", [
      "Apartamento no Bessa, 3 quartos, até 900 mil. Quero opções.",
    ], ["Consultar imóveis imediatamente e apresentar até 3 opções aderentes."]),
    base("cliente-emocional", "Cliente emocional", "cliente_emocional", [
      "Quero um lugar pra recomeçar com minha filha, perto do mar.",
      "Não precisa ser perfeito, só queria sentir que é uma boa escolha.",
    ], ["Responder com humanidade e curadoria, sem virar formulário."]),
    base("lead-some-volta", "Lead que some e volta", "lead_some_volta", [
      "Oi Ju, voltei. Ainda está vendo aqueles apartamentos pra mim?",
      "Agora acho que consigo avançar melhor.",
    ], ["Retomar contexto com leveza, revalidar inventário se necessário e sem cobrar sumiço."]),
  ];
}

function buildInput(config: RuntimeConfig, scenario: BehavioralQaScenario, message: string): NormalizedTurnInput {
  return {
    tenant_id: config.behavioralQa.tenant_id,
    conversation_id: scenario.conversation_id,
    lead_id: scenario.lead_id,
    deal_id: scenario.deal_id,
    telefoneCompleto: config.behavioralQa.phone,
    sessionId: config.behavioralQa.phone,
    remoteJid: `${config.behavioralQa.phone}@s.whatsapp.net`,
    mensagemCliente: message,
    messageType: "text",
    event_type: "inbound",
    dry_run: true,
  };
}

export async function resetBehavioralQaSandbox(pool: Pool, redis: Redis, config: RuntimeConfig): Promise<void> {
  const phone = config.behavioralQa.phone;
  const tenantId = config.behavioralQa.tenant_id;
  const scenarios = behavioralQaScenarios();
  const conversationIds = scenarios.map((scenario) => scenario.conversation_id);
  const leadIds = scenarios.map((scenario) => scenario.lead_id);

  await Promise.all([
    pool.query("delete from ju_runtime_edge_case_queue where tenant_id = $1 and (conversation_id = any($2::uuid[]) or lead_id = any($3::uuid[]))", [tenantId, conversationIds, leadIds]).catch(() => undefined),
    pool.query("delete from ju_runtime_cost_audits where tenant_id = $1 and (conversation_id = any($2::uuid[]) or lead_id = any($3::uuid[]))", [tenantId, conversationIds, leadIds]).catch(() => undefined),
    pool.query("delete from ju_pilot_response_samples where tenant_id = $1 and (conversation_id = any($2::uuid[]) or lead_id = any($3::uuid[]) or phone = $4)", [tenantId, conversationIds, leadIds, phone]).catch(() => undefined),
    pool.query("delete from ju_cutover_audit_logs where tenant_id = $1 and (conversation_id = any($2::uuid[]) or lead_id = any($3::uuid[]))", [tenantId, conversationIds, leadIds]).catch(() => undefined),
    pool.query("delete from ju_shadow_fixtures where tenant_id = $1 and conversation_id = any($2::uuid[])", [tenantId, conversationIds]).catch(() => undefined),
    pool.query("delete from ju_shadow_comparisons where tenant_id = $1 and conversation_id = any($2::uuid[])", [tenantId, conversationIds]).catch(() => undefined),
    pool.query("delete from ju_runtime_memory where tenant_id = $1 and conversation_id = any($2::uuid[])", [tenantId, conversationIds]).catch(() => undefined),
    pool.query("delete from ju_runtime_states where tenant_id = $1 and conversation_id = any($2::uuid[])", [tenantId, conversationIds]).catch(() => undefined),
  ]);

  if (redis.status === "wait") await redis.connect();
  await Promise.all(conversationIds.map((id) => redis.del(`ju:runtime:lock:${id}`).catch(() => 0)));
}

function sdrReasons(output: string): string[] {
  const reasons: string[] = [];
  const text = output.toLowerCase();
  for (const phrase of ["posso te mostrar", "quer que eu envie", "se quiser posso", "posso buscar", "quer que eu procure"]) {
    if (text.includes(phrase)) reasons.push(phrase);
  }
  if (questionCount(output) > 1) reasons.push("multiple_questions");
  if (hasAny(text, ["qual seu orçamento", "qual bairro", "quantos quartos"]) && questionCount(output) > 0) reasons.push("implicit_form");
  return reasons;
}

function reviewFromSignals(args: {
  result: CognitiveTurnResult;
  sdr: string[];
  guardianViolations: string[];
  toolTiming: BehavioralQaAudit["tool_timing"]["consultar_imoveis"];
}): BehavioralQaHumanReview {
  const hasGuardian = args.guardianViolations.length > 0;
  const hasSdr = args.sdr.length > 0;
  const missingRequiredTool = args.result.decision.required_tools.some((tool) => !args.result.llm.tool_calls.some((call) => call.tool === tool));
  return {
    naturalidade: hasGuardian ? 70 : 88,
    consultoria: args.result.decision.property_presentation_due && args.result.llm.tool_calls.some((call) => call.tool === "consultar_imoveis") ? 92 : 82,
    timing: args.toolTiming === "correct" || args.toolTiming === "not_required" ? 90 : 68,
    anti_sdr: hasSdr ? 45 : 96,
    curadoria: missingRequiredTool ? 65 : 88,
    followup: hasAny(args.result.llm.output, ["sem pressa", "com calma", "quando fizer sentido"]) ? 92 : 82,
    humanidade: hasAny(args.result.llm.output, ["entendo", "faz sentido", "com calma", "recomeçar"]) ? 92 : 84,
    pressao_comercial: hasAny(args.result.llm.output, ["urgente", "última chance", "decidir agora"]) ? 35 : 96,
    qualidade_recomendacoes: args.result.llm.tool_results.some((tool) => tool.ok) ? 88 : 78,
    notes: [
      hasSdr ? `SDR leakage: ${args.sdr.join(", ")}` : "Sem vazamento SDR detectado.",
      hasGuardian ? `Guardian: ${args.guardianViolations.join(", ")}` : "Guardian sem bloqueios.",
      missingRequiredTool ? "Tool obrigatoria ausente." : "Tools obrigatorias preservadas quando exigidas.",
    ],
  };
}

function scoreReview(review: BehavioralQaHumanReview): number {
  const values = [
    review.naturalidade,
    review.consultoria,
    review.timing,
    review.anti_sdr,
    review.curadoria,
    review.followup,
    review.humanidade,
    review.pressao_comercial,
    review.qualidade_recomendacoes,
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function auditScenario(config: RuntimeConfig, scenario: BehavioralQaScenario, results: Array<{ input: NormalizedTurnInput; result: CognitiveTurnResult }>): Promise<BehavioralQaAudit> {
  const traceIds = results.map((item) => item.result.trace_id);
  const turns = results.map(({ input, result }) => {
    const guardian = guardKernelResponse(result);
    return {
      inbound: input.mensagemCliente,
      outbound: result.llm.output,
      context_chars: result.context.context_chars,
      next_best_action: result.decision.next_best_action,
      property_presentation_due: result.decision.property_presentation_due,
      required_tools: result.decision.required_tools,
      tool_calls: result.llm.tool_calls.map((call) => call.tool),
      guardian_violations: guardian.violations,
      divergence_severity: result.shadow?.comparison?.severity,
    };
  });
  const allToolCalls = turns.flatMap((turn) => turn.tool_calls);
  const requiredConsultar = results.some((item) => item.result.decision.required_tools.includes("consultar_imoveis"));
  const hasUsefulContext = scenario.messages.join(" ").length > 30;
  const consultarCalled = allToolCalls.includes("consultar_imoveis");
  const toolTiming = !requiredConsultar && !consultarCalled
    ? "not_required"
    : requiredConsultar && consultarCalled
      ? "correct"
      : requiredConsultar && !consultarCalled
        ? "missing"
        : !hasUsefulContext && consultarCalled
          ? "without_context"
          : "early";
  const output = turns.map((turn) => turn.outbound).join("\n");
  const sdr = sdrReasons(output);
  const governanceViolations = results.flatMap((item) => [
    ...item.result.violations.map((violation) => violation.code),
    ...assertCanonicalResponseDraft(item.result.decision, {
      text: item.result.llm.output,
      tools_called: item.result.llm.tool_calls.map((call) => call.tool),
    }).map((violation) => violation.code),
  ]);
  const guardianViolations = turns.flatMap((turn) => turn.guardian_violations);
  const latest = results[results.length - 1]?.result;
  const review = reviewFromSignals({
    result: latest,
    sdr,
    guardianViolations,
    toolTiming,
  });
  const score = scoreReview(review);

  return {
    scenario_id: scenario.id,
    conversation_id: scenario.conversation_id,
    trace_ids: traceIds,
    turns,
    tool_timing: {
      consultar_imoveis: toolTiming,
      notes: [
        requiredConsultar ? "consultar_imoveis era obrigatoria em pelo menos um turno." : "consultar_imoveis nao era obrigatoria.",
        consultarCalled ? "consultar_imoveis foi acionada." : "consultar_imoveis nao foi acionada.",
      ],
    },
    sdr_regression: {
      detected: sdr.length > 0,
      reasons: sdr,
    },
    governance: {
      violations: [...new Set(governanceViolations)],
      inventory_fatigue_ok: !governanceViolations.map(String).includes("repeated_inventory_loop"),
      spouse_governance_ok: scenario.category !== "casal_indeciso" || !hasAny(output, ["decidir agora", "urgente"]),
      anti_loop_ok: !governanceViolations.includes("abstract_qualification_loop"),
      followup_pressure_ok: !hasAny(output, ["última chance", "ultima chance", "preciso que decida agora"]),
      revisit_inventory_ok: scenario.category !== "revisita_imovel" || consultarCalled,
      contextual_pacing_ok: questionCount(output) <= scenario.messages.length,
    },
    human_review: review,
    score,
    fallback_count: latest?.ok === false ? 1 : 0,
    guardian_rejections: guardianViolations.length,
  };
}

export async function runBehavioralQa(args: {
  pool: Pool;
  redis: Redis;
  llm: LlmRuntime;
  config: RuntimeConfig;
  reset?: boolean;
  scenarios?: BehavioralQaScenario[];
  writeReport?: boolean;
}): Promise<BehavioralQaRunReport> {
  const startedAt = new Date().toISOString();
  const scenarios = args.scenarios ?? behavioralQaScenarios();
  if (args.reset !== false) {
    await resetBehavioralQaSandbox(args.pool, args.redis, args.config);
  }

  const audits: BehavioralQaAudit[] = [];
  for (const scenario of scenarios) {
    const results: Array<{ input: NormalizedTurnInput; result: CognitiveTurnResult }> = [];
    for (const message of scenario.messages) {
      const input = buildInput(args.config, scenario, message);
      const result = await executeCognitiveTurn({
        raw: input,
        pool: args.pool,
        redis: args.redis,
        llm: args.llm,
        config: { ...args.config, runtimeMode: "behavioral_qa" },
      });
      const cost = buildCostAuditSnapshot(input, result, args.config);
      recordCostAudit(cost);
      await persistCostAudit(args.pool, cost);
      if (!result.shadow?.comparison) {
        await compareShadowBehavior({
          original: { output: null },
          decision: result.decision,
          context: result.context,
          llm: result.llm,
          runtime_memory: result.decision.signals,
        });
      }
      results.push({ input, result });
    }
    audits.push(await auditScenario(args.config, scenario, results));
  }

  const completedAt = new Date().toISOString();
  const summary = summarizeAudits(scenarios, audits);
  const markdown = renderBehavioralQaMarkdown({
    run_id: `behavioral_qa_${Date.now()}`,
    tenant_id: args.config.behavioralQa.tenant_id,
    phone: args.config.behavioralQa.phone,
    started_at: startedAt,
    completed_at: completedAt,
    scenarios,
    audits,
    summary,
    markdown: "",
  });
  const report: BehavioralQaRunReport = {
    run_id: `behavioral_qa_${Date.now()}`,
    tenant_id: args.config.behavioralQa.tenant_id,
    phone: args.config.behavioralQa.phone,
    started_at: startedAt,
    completed_at: completedAt,
    scenarios,
    audits,
    summary,
    markdown,
  };

  await persistBehavioralQaRun(args.pool, report);
  if (args.writeReport !== false) {
    await writeFile(QA_REPORT_PATH, markdown, "utf8");
  }
  return report;
}

function summarizeAudits(scenarios: BehavioralQaScenario[], audits: BehavioralQaAudit[]): BehavioralQaRunReport["summary"] {
  const total = audits.length;
  const fallback = audits.reduce((sum, audit) => sum + audit.fallback_count, 0);
  const sdr = audits.filter((audit) => audit.sdr_regression.detected).length;
  const governance = audits.filter((audit) => audit.governance.violations.length > 0).length;
  const guardian = audits.reduce((sum, audit) => sum + audit.guardian_rejections, 0);
  const avg = total ? audits.reduce((sum, audit) => sum + audit.score, 0) / total : 0;
  const parity = total ? audits.filter((audit) => audit.score >= 85 && !audit.sdr_regression.detected).length / total : 0;
  const fallbackRate = total ? fallback / total : 0;
  return {
    total_scenarios: scenarios.length,
    total_conversations: total,
    parity_rate: Math.round(parity * 10000) / 100,
    fallback_rate: Math.round(fallbackRate * 10000) / 100,
    sdr_regressions: sdr,
    governance_violations: governance,
    guardian_rejections: guardian,
    average_score: Math.round(avg * 100) / 100,
    ready_for_internal_pilot: total > 0 && avg >= 85 && sdr === 0,
    ready_for_1_percent_rollout: total > 0 && avg >= 90 && sdr === 0 && governance === 0 && guardian === 0,
    ready_for_continuous_human_qa: total > 0,
  };
}

export async function persistBehavioralQaRun(pool: Pool, report: BehavioralQaRunReport): Promise<void> {
  await pool.query(
    `
      insert into ju_behavioral_qa_runs
        (run_id, tenant_id, phone, summary, report_markdown, payload, created_at)
      values ($1,$2,$3,$4::jsonb,$5,$6::jsonb,now())
      on conflict (run_id) do nothing
    `,
    [
      report.run_id,
      report.tenant_id || null,
      report.phone || null,
      JSON.stringify(report.summary),
      report.markdown,
      JSON.stringify({ scenarios: report.scenarios, audits: report.audits }),
    ],
  ).catch(() => undefined);
}

export async function loadLatestBehavioralQaRun(pool: Pool): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    "select run_id, tenant_id, phone, summary, report_markdown, payload, created_at from ju_behavioral_qa_runs order by created_at desc limit 1",
  ).catch(() => ({ rows: [] }));
  return result.rows[0] ?? null;
}

function bestAudits(audits: BehavioralQaAudit[]): BehavioralQaAudit[] {
  return [...audits].sort((a, b) => b.score - a.score).slice(0, 4);
}

function problemAudits(audits: BehavioralQaAudit[]): BehavioralQaAudit[] {
  return audits
    .filter((audit) => audit.score < 85 || audit.sdr_regression.detected || audit.governance.violations.length > 0 || audit.tool_timing.consultar_imoveis !== "correct" && audit.tool_timing.consultar_imoveis !== "not_required")
    .sort((a, b) => a.score - b.score);
}

export function renderBehavioralQaMarkdown(report: BehavioralQaRunReport): string {
  const best = bestAudits(report.audits);
  const problems = problemAudits(report.audits);
  const scenarioById = new Map(report.scenarios.map((scenario) => [scenario.id, scenario]));
  const juLooksRight = report.summary.average_score >= 85 && report.summary.sdr_regressions === 0;
  return [
    "# Behavioral QA Audit Report",
    "",
    `Run: ${report.run_id}`,
    `Tenant QA: ${report.tenant_id || "nao configurado"}`,
    `Phone QA: ${report.phone || "nao configurado"}`,
    `Started: ${report.started_at}`,
    `Completed: ${report.completed_at}`,
    "",
    "## Secao 1  Resumo Executivo",
    "",
    `- Total de cenarios: ${report.summary.total_scenarios}`,
    `- Total de conversas: ${report.summary.total_conversations}`,
    `- Taxa de parity: ${report.summary.parity_rate}%`,
    `- Taxa de fallback: ${report.summary.fallback_rate}%`,
    `- SDR regressions: ${report.summary.sdr_regressions}`,
    `- Governance violations: ${report.summary.governance_violations}`,
    `- Guardian rejections: ${report.summary.guardian_rejections}`,
    `- Score medio: ${report.summary.average_score}`,
    "",
    "## Secao 2  Melhores Conversas",
    "",
    ...best.flatMap((audit) => {
      const scenario = scenarioById.get(audit.scenario_id);
      const last = audit.turns[audit.turns.length - 1];
      return [
        `### ${scenario?.title ?? audit.scenario_id} (${audit.score})`,
        "",
        `- Comportamento: ${audit.human_review.notes.join(" ")}`,
        `- Timing de tool: ${audit.tool_timing.consultar_imoveis}`,
        `- Exemplo inbound: ${last?.inbound ?? ""}`,
        `- Exemplo outbound: ${last?.outbound ?? ""}`,
        "",
      ];
    }),
    "## Secao 3  Problemas Detectados",
    "",
    ...(problems.length ? problems.flatMap((audit) => {
      const scenario = scenarioById.get(audit.scenario_id);
      return [
        `### ${scenario?.title ?? audit.scenario_id} (${audit.score})`,
        "",
        `- SDR leakage: ${audit.sdr_regression.detected ? audit.sdr_regression.reasons.join(", ") : "nao detectado"}`,
        `- Tool timing: ${audit.tool_timing.consultar_imoveis}`,
        `- Governance: ${audit.governance.violations.join(", ") || "sem violacoes"}`,
        `- Guardian: ${audit.guardian_rejections}`,
        "",
      ];
    }) : ["Nenhum problema critico detectado nesta rodada.", ""]),
    "## Secao 4  Analise Da Ju",
    "",
    `- A Ju continua parecendo a Ju? ${juLooksRight ? "Sim, pelos sinais desta rodada." : "Ainda exige revisao humana antes de piloto."}`,
    `- O comportamento continua consultivo? ${report.summary.average_score >= 85 ? "Sim." : "Parcial."}`,
    `- O pacing continua natural? ${report.audits.every((audit) => audit.governance.contextual_pacing_ok) ? "Sim." : "Ha pontos de pacing para revisar."}`,
    `- O follow-up continua humano? ${report.audits.every((audit) => audit.governance.followup_pressure_ok) ? "Sim." : "Ha pressao indevida em algum caso."}`,
    `- Existe regressao cognitiva? ${report.summary.sdr_regressions === 0 && report.summary.governance_violations === 0 ? "Nao detectada." : "Possivel regressao detectada."}`,
    `- Existe comportamento robotico? ${report.summary.average_score >= 85 ? "Nao dominante." : "Revisar naturalidade."}`,
    "",
    "## Secao 5  Readiness",
    "",
    `- Pronta para piloto interno? ${report.summary.ready_for_internal_pilot ? "Sim" : "Nao"}`,
    `- Pronta para 1% rollout? ${report.summary.ready_for_1_percent_rollout ? "Sim" : "Nao"}`,
    `- Pronta para QA humano continuo? ${report.summary.ready_for_continuous_human_qa ? "Sim" : "Nao"}`,
    `- Riscos restantes: ${problems.length ? "revisar cenarios listados em problemas detectados" : "manter monitoramento de guardian, tool timing e custo"}`,
    "",
    "## Secao 6  Acoes Recomendadas",
    "",
    "- Pequenos ajustes apenas se o review humano confirmar vazamento.",
    "- Tuning fino do guardian para frases SDR residuais.",
    "- Ajuste de retrieval bounds se tool output vier grande demais.",
    "- Tuning de latencia se simulator apontar spikes.",
    "- Nao introduzir nova arquitetura, frameworks, agentes ou refactor estrutural.",
    "",
  ].join("\n");
}
