import { describe, expect, it } from "vitest";
import { collectGovernanceSignals, stripGovernanceSignals } from "@/runtime/outbound_sanitizer";

describe("outbound sanitizer", () => {
  it("strips the governance_violation tag from customer-facing text", () => {
    const raw = "Oi! Aqui e a Ju, da Jurema Brokers. Como posso te chamar?\n\n[governance_violation:too_many_questions]";
    expect(stripGovernanceSignals(raw)).toBe("Oi! Aqui e a Ju, da Jurema Brokers. Como posso te chamar?");
  });

  it("strips internal/debug/guardrail tags too", () => {
    const raw = "Mensagem [internal:trace=1] limpa [debug:x] de [guardrail:y] tags.";
    expect(stripGovernanceSignals(raw)).toBe("Mensagem limpa de tags.");
  });

  it("returns clean text unchanged", () => {
    const clean = "Oi! Me conta o que voce ta procurando que eu te ajudo.";
    expect(stripGovernanceSignals(clean)).toBe(clean);
  });

  it("never produces a blank turn when the whole message was a tag (fail-safe)", () => {
    const raw = "[governance_violation:abstract_qualification_loop]";
    const out = stripGovernanceSignals(raw);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("governance_violation");
  });

  it("keeps empty input empty", () => {
    expect(stripGovernanceSignals("")).toBe("");
  });

  it("collects the internal signals for audit/logging", () => {
    const raw = "Texto.\n\n[governance_violation:too_many_questions,sdr_behavior]";
    expect(collectGovernanceSignals(raw)).toEqual(["[governance_violation:too_many_questions,sdr_behavior]"]);
  });
});
