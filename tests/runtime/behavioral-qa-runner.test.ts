import { describe, expect, it } from "vitest";
import {
  behavioralQaScenarios,
  renderBehavioralQaMarkdown,
} from "@/runtime/behavioral_qa_runner";
import type { BehavioralQaAudit, BehavioralQaRunReport } from "@/runtime/types";

function audit(overrides: Partial<BehavioralQaAudit> = {}): BehavioralQaAudit {
  return {
    scenario_id: "cliente-objetivo",
    conversation_id: "636c6965-6e74-465f-8f62-6a657469766f",
    trace_ids: ["trace-1"],
    turns: [{
      inbound: "Apartamento no Bessa, 3 quartos, até 900 mil. Quero opções.",
      outbound: "Separei tres opcoes aderentes no Bessa para voce comparar.",
      context_chars: 1200,
      next_best_action: "apresentar_opcoes_aderentes",
      property_presentation_due: true,
      required_tools: ["consultar_imoveis"],
      tool_calls: ["consultar_imoveis"],
      guardian_violations: [],
      divergence_severity: "LOW",
    }],
    tool_timing: {
      consultar_imoveis: "correct",
      notes: ["consultar_imoveis era obrigatoria.", "consultar_imoveis foi acionada."],
    },
    sdr_regression: {
      detected: false,
      reasons: [],
    },
    governance: {
      violations: [],
      inventory_fatigue_ok: true,
      spouse_governance_ok: true,
      anti_loop_ok: true,
      followup_pressure_ok: true,
      revisit_inventory_ok: true,
      contextual_pacing_ok: true,
    },
    human_review: {
      naturalidade: 90,
      consultoria: 92,
      timing: 94,
      anti_sdr: 100,
      curadoria: 90,
      followup: 88,
      humanidade: 90,
      pressao_comercial: 100,
      qualidade_recomendacoes: 90,
      notes: ["Sem vazamento SDR detectado."],
    },
    score: 93,
    fallback_count: 0,
    guardian_rejections: 0,
    ...overrides,
  };
}

describe("BehavioralQaRunner", () => {
  it("defines all mandatory human-realistic QA scenarios", () => {
    const scenarios = behavioralQaScenarios();

    expect(scenarios).toHaveLength(15);
    expect(scenarios.map((scenario) => scenario.category)).toEqual([
      "lead_frio",
      "praia_fgts",
      "casal_indeciso",
      "investidor_airbnb",
      "revisita_imovel",
      "inventory_fatigue",
      "followup_sensivel",
      "alto_padrao",
      "lead_confuso",
      "visita_agendamento",
      "financiamento_complexo",
      "reenvio_imovel",
      "cliente_objetivo",
      "cliente_emocional",
      "lead_some_volta",
    ]);
    expect(scenarios.every((scenario) => scenario.messages.length > 0)).toBe(true);
  });

  it("renders the mandatory markdown audit sections", () => {
    const scenarios = behavioralQaScenarios();
    const report: BehavioralQaRunReport = {
      run_id: "behavioral_qa_test",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      phone: "5583999990002",
      started_at: "2026-05-25T12:00:00.000Z",
      completed_at: "2026-05-25T12:01:00.000Z",
      scenarios,
      audits: [audit()],
      summary: {
        total_scenarios: 15,
        total_conversations: 1,
        parity_rate: 100,
        fallback_rate: 0,
        sdr_regressions: 0,
        governance_violations: 0,
        guardian_rejections: 0,
        average_score: 93,
        ready_for_internal_pilot: true,
        ready_for_1_percent_rollout: true,
        ready_for_continuous_human_qa: true,
      },
      markdown: "",
    };

    const markdown = renderBehavioralQaMarkdown(report);

    expect(markdown).toContain("## Secao 1  Resumo Executivo");
    expect(markdown).toContain("## Secao 2  Melhores Conversas");
    expect(markdown).toContain("## Secao 3  Problemas Detectados");
    expect(markdown).toContain("## Secao 4  Analise Da Ju");
    expect(markdown).toContain("## Secao 5  Readiness");
    expect(markdown).toContain("## Secao 6  Acoes Recomendadas");
    expect(markdown).toContain("Nao introduzir nova arquitetura");
  });
});
