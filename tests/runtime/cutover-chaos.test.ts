import { describe, expect, it } from "vitest";
import { decideTrafficRoute } from "@/runtime/traffic_router";
import { cutoverInput, cutoverResult, rolloutFlags } from "./cutover-fixtures";

describe("Cutover chaos controls", () => {
  it("falls back to n8n on tool failure", () => {
    const result = cutoverResult({
      llm: {
        ...cutoverResult().llm,
        tool_results: [{ tool: "consultar_imoveis", ok: false, latency_ms: 300, output: null, error: "timeout" }],
      },
    });
    const decision = decideTrafficRoute({ input: cutoverInput, result, flags: rolloutFlags });

    expect(decision.responder).toBe("n8n");
    expect(decision.reason).toBe("auto_fallback");
    expect(decision.fallback_reasons).toContain("tool_failure");
  });

  it("falls back to n8n on latency spike", () => {
    const result = cutoverResult({
      stages: [{ stage: "llm", started_at: "2026-05-25T12:00:00.000Z", duration_ms: 12000, ok: true }],
    });
    const decision = decideTrafficRoute({ input: cutoverInput, result, flags: rolloutFlags, maxLatencyMs: 1000 });

    expect(decision.responder).toBe("n8n");
    expect(decision.fallback_reasons).toContain("latency_spike");
  });

  it("falls back to n8n on runtime crash trace", () => {
    const result = cutoverResult({
      ok: false,
      stages: [{ stage: "hydrate", started_at: "2026-05-25T12:00:00.000Z", duration_ms: 2, ok: false }],
    });
    const decision = decideTrafficRoute({ input: cutoverInput, result, flags: rolloutFlags });

    expect(decision.responder).toBe("n8n");
    expect(decision.fallback_reasons).toContain("runtime_crash");
  });

  it("falls back to n8n on critical divergence", () => {
    const base = cutoverResult();
    const result = cutoverResult({
      shadow: {
        ...base.shadow!,
        comparison: {
          ...base.shadow!.comparison!,
          severity: "CRITICAL",
          critical_failures: [
            {
              field: "output_behavior",
              severity: "CRITICAL",
              code: "sdr_regression",
              message: "Runtime asked permission to search.",
              original: false,
              candidate: true,
            },
          ],
        },
      },
    });
    const decision = decideTrafficRoute({ input: cutoverInput, result, flags: rolloutFlags });

    expect(decision.responder).toBe("n8n");
    expect(decision.fallback_reasons).toContain("critical_divergence");
  });

  it("falls back to n8n for duplicate concurrent inbound messages", () => {
    const first = decideTrafficRoute({ input: cutoverInput, result: cutoverResult(), flags: rolloutFlags });
    const retry = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: rolloutFlags,
      previousOwner: first.responder,
      duplicate: true,
    });

    expect(first.responder).toBe("kernel");
    expect(retry.responder).toBe("n8n");
    expect(retry.reason).toBe("idempotent_duplicate");
  });
});
