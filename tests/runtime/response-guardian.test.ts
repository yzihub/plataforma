import { describe, expect, it } from "vitest";
import { guardKernelResponse } from "@/runtime/response_guardian";
import { cutoverResult, withCalibration } from "./cutover-fixtures";

describe("ResponseGuardian", () => {
  it("allows a high-confidence consultative response with required inventory tool", () => {
    const guard = guardKernelResponse(cutoverResult());

    expect(guard.allowed).toBe(true);
    expect(guard.fallback_required).toBe(false);
    expect(guard.confidence.overall).toBe(100);
  });

  it("blocks permission-to-search language before real outbound", () => {
    const guard = guardKernelResponse(
      cutoverResult({
        llm: {
          ...cutoverResult().llm,
          output: "Posso buscar algumas opcoes para voce?",
        },
      }),
    );

    expect(guard.allowed).toBe(false);
    expect(guard.violations).toContain("permission_to_search");
  });

  it("blocks SDR-style multi-question qualification", () => {
    const guard = guardKernelResponse(
      cutoverResult({
        llm: {
          ...cutoverResult().llm,
          output: "Vou fazer algumas perguntas: qual bairro voce quer? Qual valor maximo?",
        },
      }),
    );

    expect(guard.allowed).toBe(false);
    expect(guard.violations).toContain("sdr_behavior");
    expect(guard.violations).toContain("max_one_question_violation");
  });

  it("blocks property-presentation turns that skipped consultar_imoveis", () => {
    const base = cutoverResult();
    const guard = guardKernelResponse(
      cutoverResult({
        llm: {
          ...base.llm,
          tool_calls: [],
          tool_results: [],
        },
      }),
    );

    expect(guard.allowed).toBe(false);
    expect(guard.violations).toContain("missing_required_tool");
  });

  it("requires stable cutover calibration before allowing a response", () => {
    const guard = guardKernelResponse(
      withCalibration(cutoverResult(), {
        readiness_gates: {
          parity_gt_97: true,
          zero_critical_sdr_regressions: true,
          zero_critical_governance_violations: true,
          tool_timing_stable: true,
          property_presentation_due_stable: true,
          consultative_score_stable: false,
          ready_for_cutover: false,
          readiness_score: 80,
        },
      }),
    );

    expect(guard.allowed).toBe(false);
    expect(guard.confidence.overall).toBeLessThan(97);
  });
});
