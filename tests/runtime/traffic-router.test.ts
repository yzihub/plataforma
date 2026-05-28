import { describe, expect, it } from "vitest";
import { decideTrafficRoute, deterministicBucket, idempotencyKey } from "@/runtime/traffic_router";
import { cutoverInput, cutoverResult, rolloutFlags, shadowOnlyFlags, withCalibration } from "./cutover-fixtures";

describe("TrafficRouter", () => {
  it("keeps shadow-only traffic on n8n while continuing live comparison", () => {
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: shadowOnlyFlags(),
    });

    expect(decision.responder).toBe("n8n");
    expect(decision.reason).toBe("shadow_only");
    expect(decision.live_comparison_continues).toBe(true);
  });

  it("routes eligible 100 percent rollout traffic to the kernel", () => {
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: rolloutFlags,
    });

    expect(decision.responder).toBe("kernel");
    expect(decision.reason).toBe("percentage_rollout");
    expect(decision.fallback_reasons).toEqual([]);
  });

  it("honors emergency fallback before rollout logic", () => {
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: { ...rolloutFlags, emergency_fallback: true },
    });

    expect(decision.responder).toBe("n8n");
    expect(decision.reason).toBe("emergency_fallback");
  });

  it("routes explicit pilot tenants to the kernel when gates pass", () => {
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: {
        ...rolloutFlags,
        pilot_group: true,
        percentage_rollout: 0,
        pilot_tenants: [cutoverInput.tenant_id ?? ""],
      },
    });

    expect(decision.responder).toBe("kernel");
    expect(decision.reason).toBe("pilot_group");
  });

  it("deduplicates inbound messages before any real response", () => {
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: rolloutFlags,
      duplicate: true,
    });

    expect(decision.responder).toBe("n8n");
    expect(decision.reason).toBe("idempotent_duplicate");
    expect(decision.fallback_reasons).toContain("duplicate_inbound");
  });

  it("keeps conversation ownership stable", () => {
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result: cutoverResult(),
      flags: { ...rolloutFlags, percentage_rollout: 0 },
      previousOwner: "kernel",
    });

    expect(decision.responder).toBe("kernel");
    expect(decision.reason).toBe("conversation_owner");
  });

  it("falls back when safety gates are below cutover threshold", () => {
    const result = withCalibration(cutoverResult(), {
      readiness_gates: {
        parity_gt_97: false,
        zero_critical_sdr_regressions: true,
        zero_critical_governance_violations: true,
        tool_timing_stable: true,
        property_presentation_due_stable: true,
        consultative_score_stable: true,
        ready_for_cutover: false,
        readiness_score: 90,
      },
    });
    const decision = decideTrafficRoute({
      input: cutoverInput,
      result,
      flags: rolloutFlags,
    });

    expect(decision.responder).toBe("n8n");
    expect(decision.reason).toBe("safety_gate_block");
    expect(decision.safety_gates.parity_ok).toBe(false);
  });

  it("uses deterministic hashing for rollout buckets and idempotency", () => {
    expect(deterministicBucket(cutoverInput.tenant_id, cutoverInput.lead_id)).toBe(
      deterministicBucket(cutoverInput.tenant_id, cutoverInput.lead_id),
    );
    expect(idempotencyKey(cutoverInput)).toContain(cutoverInput.conversation_id ?? "");
  });
});
