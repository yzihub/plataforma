import { describe, expect, it } from "vitest";
import { evaluatePilotRollout } from "@/runtime/pilot_rollout";
import { decideTrafficRoute } from "@/runtime/traffic_router";
import { cutoverInput, cutoverResult, rolloutFlags, withCalibration } from "./cutover-fixtures";

function route(result = cutoverResult(), flags = rolloutFlags) {
  return decideTrafficRoute({
    input: cutoverInput,
    result,
    flags,
  });
}

describe("PilotRollout", () => {
  it("authorizes internal-only pilot traffic when all live safeguards pass", () => {
    const flags = {
      ...rolloutFlags,
      pilot_stage: 1 as const,
      internal_only: true,
      pilot_tenants: [cutoverInput.tenant_id ?? ""],
    };
    const result = cutoverResult();
    const decision = evaluatePilotRollout({
      input: cutoverInput,
      result,
      route: route(result, flags),
      flags,
    });

    expect(decision.authorized_to_send).toBe(true);
    expect(decision.responder).toBe("kernel");
    expect(decision.response_to_send).toBe(result.llm.output);
  });

  it("blocks non-internal traffic in stage 1", () => {
    const flags = {
      ...rolloutFlags,
      pilot_stage: 1 as const,
      internal_only: true,
      pilot_tenants: [],
      percentage_rollout: 100,
    };
    const result = cutoverResult();
    const decision = evaluatePilotRollout({
      input: cutoverInput,
      result,
      route: route(result, flags),
      flags,
    });

    expect(decision.authorized_to_send).toBe(false);
    expect(decision.reason).toBe("internal_only");
    expect(decision.fallback_reasons).toContain("not_internal");
  });

  it("blocks media and non-simple inbound before live response", () => {
    const result = cutoverResult();
    const flags = { ...rolloutFlags, pilot_tenants: [cutoverInput.tenant_id ?? ""] };
    const decision = evaluatePilotRollout({
      input: { ...cutoverInput, messageType: "audio" },
      result,
      route: route(result, flags),
      flags,
    });

    expect(decision.authorized_to_send).toBe(false);
    expect(decision.reason).toBe("safe_filter_block");
    expect(decision.safe_filter.no_media).toBe(false);
  });

  it("blocks known edge cases from automatic pilot rollout", () => {
    const result = withCalibration(cutoverResult(), {
      edge_cases: ["casal_indeciso"],
    });
    const flags = { ...rolloutFlags, pilot_tenants: [cutoverInput.tenant_id ?? ""] };
    const decision = evaluatePilotRollout({
      input: cutoverInput,
      result,
      route: route(result, flags),
      flags,
    });

    expect(decision.authorized_to_send).toBe(false);
    expect(decision.reason).toBe("edge_case_block");
    expect(decision.edge_case_blockers).toContain("casal_indeciso");
  });

  it("preserves kernel conversation continuity after ownership is established", () => {
    const flags = {
      ...rolloutFlags,
      pilot_stage: 2 as const,
      percentage_rollout: 0,
    };
    const result = cutoverResult();
    const traffic = decideTrafficRoute({
      input: cutoverInput,
      result,
      flags,
      previousOwner: "kernel",
    });
    const decision = evaluatePilotRollout({
      input: cutoverInput,
      result,
      route: traffic,
      flags,
      previousOwner: "kernel",
    });

    expect(decision.authorized_to_send).toBe(true);
    expect(decision.reason).toBe("conversation_continuity");
  });

  it("honors operator override to move a conversation back to n8n", () => {
    const result = cutoverResult();
    const decision = evaluatePilotRollout({
      input: cutoverInput,
      result,
      route: route(result),
      flags: rolloutFlags,
      overrides: [{ action: "move_to_n8n", reason: "manual review" }],
    });

    expect(decision.authorized_to_send).toBe(false);
    expect(decision.reason).toBe("operator_override");
    expect(decision.fallback_reasons).toContain("operator_forced_n8n");
  });

  it("falls back when live latency guards are exceeded", () => {
    const result = cutoverResult({
      llm: {
        ...cutoverResult().llm,
        tool_results: [{ tool: "consultar_imoveis", ok: true, latency_ms: 5000, output: { count: 3 } }],
      },
    });
    const flags = { ...rolloutFlags, pilot_tenants: [cutoverInput.tenant_id ?? ""], max_tool_latency_ms: 1000 };
    const decision = evaluatePilotRollout({
      input: cutoverInput,
      result,
      route: route(result, flags),
      flags,
    });

    expect(decision.authorized_to_send).toBe(false);
    expect(decision.reason).toBe("latency_guard");
  });
});
