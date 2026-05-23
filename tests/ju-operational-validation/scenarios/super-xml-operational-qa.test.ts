import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requiredTopLevel = [
  "institutional_identity",
  "operational_principles",
  "conversation_governance",
  "relational_intelligence",
  "acquisition_semantics",
  "buyer_psychology",
  "regional_semantics",
  "urban_semantics",
  "geo_semantics",
  "retrieval_governance",
  "payload_governance",
  "matching_intelligence",
  "search_semantics",
  "content_semantics",
  "future_modules_alignment",
];

describe("Ju Super XML operational semantic governance QA", () => {
  it("keeps the Super XML canonical macrostructure", () => {
    const xml = fs.readFileSync(
      path.join(process.cwd(), "docs", "knowledge", "ju-real-estate-semantic-intelligence.xml"),
      "utf8",
    );

    expect(xml).toContain("<yzi_operational_cognition");
    expect(xml).toContain('canonical="true"');
    expect(xml).toContain("LLM fala. Backend decide. Banco guarda verdade.");

    const rootBody = xml.match(/<yzi_operational_cognition[^>]*>([\s\S]*)<\/yzi_operational_cognition>/)?.[1] || "";
    const topLevel = Array.from(rootBody.matchAll(/^  <([a-z_]+)>/gm)).map((match) => match[1]);

    expect(topLevel).toEqual(requiredTopLevel);
  });

  it("validates all five operational QA scenarios within target budgets", () => {
    const metrics = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "tests", "ju-operational-validation", "metrics", "super-xml-e2e-metrics.json"),
        "utf8",
      ),
    );

    expect(metrics).toHaveLength(5);

    for (const scenario of metrics) {
      expect(scenario.input_tokens).toBeGreaterThanOrEqual(1500);
      expect(scenario.input_tokens).toBeLessThanOrEqual(4000);
      expect(scenario.output_tokens).toBeGreaterThanOrEqual(150);
      expect(scenario.output_tokens).toBeLessThanOrEqual(600);
      expect(scenario.total_tokens).toBeLessThan(5000);
      expect(scenario.retrieval_chunks).toBeGreaterThanOrEqual(3);
      expect(scenario.retrieval_chunks).toBeLessThanOrEqual(8);
      expect(scenario.latency_ms).toBeLessThan(2500);
      expect(scenario.payload_quality).toBe("compressed");
      expect(scenario.semantic_alignment).toBe("high");
      expect(scenario.drift_detected).toBe(false);
      expect(scenario.red_flags).toEqual([]);
    }
  });

  it("writes retrieval trace and the consolidated report", () => {
    const reportPath = path.join(
      process.cwd(),
      "tests",
      "ju-operational-validation",
      "reports",
      "super-xml-e2e-report.md",
    );
    const retrievalPath = path.join(
      process.cwd(),
      "tests",
      "ju-operational-validation",
      "retrieval",
      "super-xml-retrieval-trace.json",
    );

    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.existsSync(retrievalPath)).toBe(true);

    const retrievalTrace = JSON.parse(fs.readFileSync(retrievalPath, "utf8"));
    expect(retrievalTrace).toHaveLength(5);
    expect(retrievalTrace.every((trace: { sections: string[] }) => trace.sections.length >= 3)).toBe(true);
  });
});
