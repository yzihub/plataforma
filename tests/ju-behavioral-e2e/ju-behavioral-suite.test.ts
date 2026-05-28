import { describe, expect, it } from "vitest";

const { SCENARIOS } = require("./scenarios/ju-behavioral-scenarios");
const { buildWebhookPayload } = require("./lib/payload-builder");
const { scoreTurn } = require("./lib/behavioral-engine");

describe("Ju behavioral E2E suite structure", () => {
  it("defines the full 15-scenario cognitive audit catalog", () => {
    expect(SCENARIOS).toHaveLength(15);

    for (const scenario of SCENARIOS) {
      expect(scenario.id).toMatch(/^[a-z0-9_]+$/);
      expect(scenario.name).toBeTruthy();
      expect(scenario.persona).toBeTruthy();
      expect(scenario.emotionalContext).toBeTruthy();
      expect(scenario.sourceChannel).toBeTruthy();
      expect(scenario.initialUserMessage).toBeTruthy();
      expect(scenario.expectedBehavior.length).toBeGreaterThanOrEqual(3);
      expect(scenario.antiPatterns.length).toBeGreaterThanOrEqual(3);
      expect(scenario.validationChecklist.length).toBeGreaterThanOrEqual(4);
      expect(Object.keys(scenario.scoringRubric).length).toBeGreaterThanOrEqual(4);
      expect(scenario.turns.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("builds provider-free curl audit payloads compatible with the Ju webhook normalizer", () => {
    const scenario = SCENARIOS[0];
    const payload = buildWebhookPayload({
      scenario,
      turn: scenario.turns[0],
      turnIndex: 0,
      scenarioIndex: 0,
      runId: "unit-run",
      tenantId: "00000000-0000-4000-8000-000000000001",
    });

    expect(payload.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
    expect(payload.test_run_id).toBe("unit-run");
    expect(payload.query.test_run_id).toBe("unit-run");
    expect(payload.audit.test_run_id).toBe("unit-run");
    expect(payload.audit.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
    expect(payload.audit.transport).toBe("curl");
    expect(payload.audit.provider_sdk).toBe("none");
    expect(payload.audit.browser_automation).toBe(false);
    expect(payload.audit.evolution_client).toBe(false);
    expect(payload.data.key.fromMe).toBe(false);
    expect(payload.data.key.remoteJid).toContain("@s.whatsapp.net");
    expect(payload.data.message.conversation).toBe(scenario.turns[0].user);
  });

  it("penalizes permission asking when a turn requires direct property presentation", () => {
    const scenario = SCENARIOS.find((item: { id: string }) => item.id === "high_intent_visit_lead");
    const turn = scenario.turns[0];

    const bad = scoreTurn({
      scenario,
      turn,
      responseText: "Posso te mostrar?",
      httpStatus: 200,
      latencyMs: 1000,
    });

    const good = scoreTurn({
      scenario,
      turn,
      responseText: "Encontrei uma opcao que ficou alinhada com o que voce pediu.\nhttps://juremabksimoveis.com.br/imoveis/apartamento-jardim-oceania/",
      httpStatus: 200,
      latencyMs: 1000,
    });

    expect(bad.violations.some((item: { id: string }) => item.id === "permission_posso_te_mostrar")).toBe(true);
    expect(bad.violations.some((item: { id: string }) => item.id === "asked_permission_instead_of_presenting")).toBe(true);
    expect(good.score).toBeGreaterThan(bad.score);
  });
});
