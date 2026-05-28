import { describe, expect, it } from "vitest";
import { buildJuRuntimeContext } from "@/lib/ju-runtime/context-builder";
import { assertCanonicalResponseDraft, buildCanonicalKernelDecision } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { buildBehavioralGovernance } from "@/lib/ju-runtime/funnel-governance";
import { buildJuRuntimeDecision } from "@/lib/ju-runtime/state-engine";

describe("Ju behavioral contracts", () => {
  it("maps SAUDACAO to a trust-first contract with one question", () => {
    const governance = buildBehavioralGovernance("lead_novo");

    expect(governance.stage).toBe("SAUDACAO");
    expect(governance.enforced).toBe(true);
    expect(governance.contract).toMatchObject({
      must_explain_consultive_model: true,
      must_request_permission_to_continue: true,
      max_questions: 1,
    });
    expect(governance.contract?.forbidden_topics).toEqual(["orcamento", "financiamento"]);
    expect(governance.question_budget.max_questions_per_stage).toBe(1);
  });

  it("maps QUALIFICACAO_MINIMA to value-before-depth governance", () => {
    const governance = buildBehavioralGovernance("qualificando", [
      { direction: "outbound", sender_type: "agent", content: "Te pergunto isso porque muda a rotina. Qual bairro voce procura?" },
    ]);

    expect(governance.stage).toBe("QUALIFICACAO_MINIMA");
    expect(governance.contract).toMatchObject({
      must_generate_value_before_more_questions: true,
      must_contextualize_relevant_questions: true,
      max_consecutive_questions: 2,
    });
    expect(governance.question_budget.remaining_consecutive_questions).toBe(1);
  });

  it("injects the behavioral contract into runtime decisions and context", () => {
    const input = {
      tenant_id: "tenant",
      lead: { id: "lead", tenant_id: "tenant", status: "new" },
      conversation: { id: "conversation", tenant_id: "tenant", lead_id: "lead" },
      current_message: "oi",
    };

    const decision = buildJuRuntimeDecision(input);
    const context = buildJuRuntimeContext(input, decision);

    expect(decision.behavioral_governance?.stage).toBe("SAUDACAO");
    expect(decision.decision_payload.behavioral_contract).toBeTruthy();
    expect(context.context).toContain("<behavioral_contract>");
    expect(context.context).toContain("must_explain_consultive_model: true");
    expect(context.context).toContain("forbidden_topics: orcamento, financiamento");
  });

  it("flags uncontextualized budget questions during SAUDACAO", () => {
    const decision = buildCanonicalKernelDecision({
      mensagemCliente: "oi",
      recent_messages: [],
      runtime_memory: { qualification_depth: 0 },
    });

    const violations = assertCanonicalResponseDraft(decision, {
      text: "Qual seu orcamento e pretende financiar?",
      tools_called: [],
    });

    expect(decision.behavioral_contract.stage).toBe("SAUDACAO");
    expect(violations.map((violation) => violation.code)).toContain("sdr_behavior");
    expect(violations.map((violation) => violation.code)).toContain("abstract_qualification_loop");
  });
});

