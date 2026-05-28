import { describe, expect, it } from "vitest";
import { buildCostAuditSnapshot } from "@/runtime/cost_audit";
import { cutoverInput, cutoverResult, runtimeConfig } from "./cutover-fixtures";

describe("CostAudit", () => {
  it("builds deterministic token and cost snapshot for a cognitive turn", () => {
    const result = cutoverResult();
    const snapshot = buildCostAuditSnapshot(cutoverInput, result, runtimeConfig());

    expect(snapshot.trace_id).toBe(result.trace_id);
    expect(snapshot.tokens.input).toBe(700);
    expect(snapshot.tokens.output).toBe(80);
    expect(snapshot.tokens.total).toBe(780);
    expect(snapshot.cost.total_usd).toBe(0.00204);
    expect(snapshot.funnel_stage).toBe(result.decision.runtime_state);
  });

  it("marks context truncation when the renderer hard limit was applied", () => {
    const snapshot = buildCostAuditSnapshot(
      cutoverInput,
      cutoverResult({
        context: {
          context: "abc\n<context_truncated>true</context_truncated>",
          context_chars: 42,
          required_blocks_present: true,
        },
      }),
      runtimeConfig(),
    );

    expect(snapshot.context_truncated).toBe(true);
  });
});
