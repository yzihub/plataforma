import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = path.join(
  process.cwd(),
  "n8n",
  "production",
  "workflow-jurema-main.final-hardened.json",
);

function readWorkflow() {
  return JSON.parse(fs.readFileSync(workflowPath, "utf8"));
}

function mainTargets(workflow: { connections?: Record<string, { main?: Array<Array<{ node: string }>> }> }, node: string) {
  return (workflow.connections?.[node]?.main ?? []).flat().map((connection) => connection.node);
}

describe("Ju lightweight hot-path architecture", () => {
  it("keeps Agno out of the operational hot-path export", () => {
    const workflow = readWorkflow();
    const workflowText = JSON.stringify(workflow);

    expect(workflowText.toLowerCase()).not.toContain("agno");
  });

  it("keeps Runtime Gateway out of the mandatory WhatsApp hot-path", () => {
    const workflow = readWorkflow();
    const workflowText = JSON.stringify(workflow);

    expect(workflow.nodes.some((node: { name: string }) => node.name === "Runtime State Engine")).toBe(false);
    expect(workflowText).not.toContain("/api/runtime/ju/state");
    expect(workflowText).not.toContain("x-runtime-key");
    expect(mainTargets(workflow, "Detecta Finalização1")).toEqual(["Build Context1"]);
  });

  it("preserves operational delivery, cards and tool governance after simplification", () => {
    const workflow = readWorkflow();
    const nodeNames = new Set(workflow.nodes.map((node: { name: string }) => node.name));
    const agent = workflow.nodes.find((node: { name: string }) => node.name === "Atendente1");
    const tool = workflow.nodes.find((node: { name: string }) => node.name === "consultar_imoveis");

    expect(nodeNames.has("Presentation Governance")).toBe(true);
    expect(nodeNames.has("Conversational Style Governance")).toBe(true);
    expect(nodeNames.has("Salvar Outbound Supabase")).toBe(true);
    expect(nodeNames.has("Evolution API")).toBe(true);
    expect(tool?.parameters?.description).toContain("Fonte unica de verdade");
    expect(tool?.parameters?.description).toContain("reenvio");
    expect(agent?.parameters?.options?.systemMessage).toContain("LIGHTWEIGHT OPERATING CONTRACT");
    expect(agent?.parameters?.options?.systemMessage).toContain("TOOL REVALIDATION");
  });

  it("does not duplicate context, retrieval or orchestration through parallel runtime nodes", () => {
    const workflow = readWorkflow();
    const workflowText = JSON.stringify(workflow).toLowerCase();

    expect(workflowText).not.toContain("shadow routing");
    expect(workflowText).not.toContain("shadow runtime");
    expect(workflowText).not.toContain("agno");
    expect(mainTargets(workflow, "Build Context1")).toEqual(["Atendente1"]);
    expect(mainTargets(workflow, "Presentation Governance")).toEqual(["Conversational Style Governance"]);
    expect(mainTargets(workflow, "Conversational Style Governance")).toEqual(["Salvar Outbound Supabase"]);
  });
});
