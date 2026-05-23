import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = path.join(
  process.cwd(),
  "n8n",
  "production",
  "workflow-jurema-main.final-hardened.json",
);

function mainCodeNode() {
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8")) as {
    nodes: Array<{ name: string; parameters?: { jsCode?: string } }>;
  };

  const codeNode = workflow.nodes.find((node) => node.name === "Code in JavaScript");
  return String(codeNode?.parameters?.jsCode || "");
}

describe("Ju operational state persistence", () => {
  it("merges the existing operational metadata contract into jurema_deals", () => {
    const code = mainCodeNode();

    expect(code).toContain("buildOperationalDealMetadata");
    expect(code).toContain("buildOperationalDealPatch");
    expect(code).toContain("last_extracted");
    expect(code).toContain("profile_complete");
    expect(code).toContain("last_state_sync_at");
    expect(code).toContain("lead_source_context");
    expect(code).toContain("...buildOperationalDealPatch({");
    expect(code).toContain("const operationalDealPatch = buildOperationalDealPatch");
  });

  it("does not overwrite jurema_deals.metadata with an empty object", () => {
    const code = mainCodeNode();

    expect(code).not.toMatch(/metadata:\s*\{\s*\}/);
    expect(code).toContain("mergeMetadata(current, {");
    expect(code).toContain("mergeExtractedState(");
  });
});
