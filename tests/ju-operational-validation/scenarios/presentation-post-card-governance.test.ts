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

describe("Ju post-card WhatsApp presentation governance", () => {
  function presentationCode() {
    const workflow = readWorkflow();
    const presentation = workflow.nodes.find(
      (node: { name: string }) => node.name === "Presentation Governance v2 - Native Preview Safe",
    );
    return String(presentation?.parameters?.jsCode ?? "");
  }

  it("keeps the legacy presentation node and routes the main flow through v2", () => {
    const workflow = readWorkflow();
    const legacy = workflow.nodes.find((node: { name: string }) => node.name === "Presentation Governance");
    const v2 = workflow.nodes.find(
      (node: { name: string }) => node.name === "Presentation Governance v2 - Native Preview Safe",
    );

    expect(legacy).toBeTruthy();
    expect(v2).toBeTruthy();
    expect(workflow.connections.Atendente1.main[0][0].node).toBe("Presentation Governance v2 - Native Preview Safe");
    expect(workflow.connections["Presentation Governance v2 - Native Preview Safe"].main[0][0].node).toBe(
      "Conversational Style Governance",
    );
  });

  it("uses native preview safe v2 as a sanitizer, not a copywriter", () => {
    const code = presentationCode();

    expect(code).toContain("native_preview_safe_v2");
    expect(code).toContain("stripLegacyPropertyDump");
    expect(code).toContain("preserveContextAndUrl");
    expect(code).toContain("validPropertyUrl");
    expect(code).not.toContain("cardUrls");
    expect(code).not.toContain("cards.length");
    expect(code).not.toContain("renderCards");
    expect(code).not.toContain("abstractNativePreviewGuidance");
    expect(code).not.toContain("guidanceReason");
    expect(code).not.toContain("beach_score");
    expect(code).not.toContain("lifestyle e potencial");
    expect(code).not.toContain("Essa aqui ficou mais alinhada");
    expect(code).not.toContain("Separei algumas opcoes");
  });

  it("does not rebuild post-card text from title, bairro, SEO description or duplicated caption", () => {
    const code = presentationCode();

    expect(code).not.toContain("withoutInvalidUrls.push(url)");
    expect(code).not.toContain("whatsapp_text");
    expect(code).not.toContain("caption");
    expect(code).not.toContain("whatsapp_text || card.caption");
    expect(code).not.toContain("'Separei esta opcao pra voce: ' + title");
    expect(code).not.toContain("card.description || card.preview?.description");
    expect(code).not.toContain("card.title");
    expect(code).not.toContain("card.description");
    expect(code).not.toContain("card.bairro");
  });

  it("preserves Ju human context and URL instead of replacing output with URLs", () => {
    const code = presentationCode();
    const execute = new Function("$json", code);
    const outputText = [
      "Essa ficou mais alinhada com o que vocês comentaram.",
      "",
      "https://juremabksimoveis.com.br/imoveis/flat-para-venda-no-jardim-oceania/",
    ].join("\n");

    const result = execute({
      output: outputText,
    });

    const output = String(result[0].json.output);

    expect(output).toBe(
      "Essa ficou mais alinhada com o que vocês comentaram.\nhttps://juremabksimoveis.com.br/imoveis/flat-para-venda-no-jardim-oceania/",
    );
    expect(result[0].json.presentation_policy).toBe("native_preview_safe_v2");
  });

  it("removes only legacy dumps while preserving valid human guidance", () => {
    const code = presentationCode();
    const execute = new Function("$json", code);
    const result = execute({
      output: [
        "Flat perto da praia faz mais sentido pra vocês?",
        "FLAT PARA VENDA NO JARDIM OCEANIA",
        "22m2, 1 quarto, R$ 450.000",
        "https://juremabksimoveis.com.br/imoveis/flat-para-venda-no-jardim-oceania/",
      ].join("\n"),
    });

    const output = String(result[0].json.output);
    expect(output).toContain("Flat perto da praia faz mais sentido pra vocês?");
    expect(output).toContain("https://juremabksimoveis.com.br/imoveis/flat-para-venda-no-jardim-oceania/");
    expect(output).not.toContain("FLAT PARA VENDA NO JARDIM OCEANIA");
    expect(output).not.toContain("22m2, 1 quarto");
  });

  it("keeps the tool as source of truth for isolated native-preview URLs", () => {
    const workflow = readWorkflow();
    const tool = workflow.nodes.find((node: { name: string }) => node.name === "consultar_imoveis");
    const description = String(tool?.parameters?.description ?? "");

    expect(description).toContain("URL valida");
    expect(description).toContain("URL pura isolada");
    expect(description).toContain("nao cria copy");
    expect(description).toContain("nao substitui output da Ju");
    expect(description).toContain("bloqueia serializacao");
    expect(description).toContain("titulo");
    expect(description).toContain("tipologia");
    expect(description).toContain("praia");
    expect(description).toContain("descricao");
    expect(description).toContain("preview nativo");
  });

  it("keeps text plus following URL together as one semantic transport block", () => {
    const workflow = readWorkflow();
    const arrayResposta = workflow.nodes.find((node: { name: string }) => node.name === "ArrayResposta");
    const expression = String(arrayResposta?.parameters?.assignments?.assignments?.[0]?.value ?? "");

    expect(expression).toContain("const lines = output");
    expect(expression).toContain("if (!output) return []");
    expect(expression).toContain("function isUrl");
    expect(expression).toContain("startsNewPropertyContext");
    expect(expression).toContain("hasUrl");
    expect(expression).toContain("blocks.push");
    expect(expression).toContain("current.join");
    expect(expression).not.toContain(".split(\"\\n\\n\")");
  });

  it("keeps context, URL and micro-follow-up in one conversation-aware block", () => {
    const workflow = readWorkflow();
    const arrayResposta = workflow.nodes.find((node: { name: string }) => node.name === "ArrayResposta");
    const expression = String(arrayResposta?.parameters?.assignments?.assignments?.[0]?.value ?? "");
    const body = expression.replace(/^=\{\{\s*/, "").replace(/\s*\}\}$/, "");
    const execute = new Function("$json", `return (${body});`);

    const result = execute({
      output: [
        "Claro, Eric, posso sim.",
        "",
        "Aquele que a gente viu no Cabo Branco era esse aqui:",
        "https://juremabksimoveis.com.br/imoveis/apartamento-cabo-branco/",
        "",
        "Confere se é ele mesmo que você tinha gostado.",
      ].join("\n"),
    });

    expect(result).toEqual([
      [
        "Claro, Eric, posso sim.",
        "Aquele que a gente viu no Cabo Branco era esse aqui:",
        "https://juremabksimoveis.com.br/imoveis/apartamento-cabo-branco/",
        "Confere se é ele mesmo que você tinha gostado.",
      ].join("\n"),
    ]);
  });

  it("splits only when a new property context starts after a URL", () => {
    const workflow = readWorkflow();
    const arrayResposta = workflow.nodes.find((node: { name: string }) => node.name === "ArrayResposta");
    const expression = String(arrayResposta?.parameters?.assignments?.assignments?.[0]?.value ?? "");
    const body = expression.replace(/^=\{\{\s*/, "").replace(/\s*\}\}$/, "");
    const execute = new Function("$json", `return (${body});`);

    const result = execute({
      output: [
        "Essa ficou alinhada:",
        "https://juremabksimoveis.com.br/imoveis/primeira-opcao/",
        "",
        "Essa outra já tem perfil mais praia:",
        "https://juremabksimoveis.com.br/imoveis/segunda-opcao/",
        "Vê se faz sentido também.",
      ].join("\n"),
    });

    expect(result).toEqual([
      "Essa ficou alinhada:\nhttps://juremabksimoveis.com.br/imoveis/primeira-opcao/",
      "Essa outra já tem perfil mais praia:\nhttps://juremabksimoveis.com.br/imoveis/segunda-opcao/\nVê se faz sentido também.",
    ]);
  });

  it("uses OpenAi JUREMA credentials for OpenAI nodes", () => {
    const workflow = readWorkflow();
    const openAiNodes = workflow.nodes.filter((node: { credentials?: { openAiApi?: unknown } }) =>
      Boolean(node.credentials?.openAiApi),
    );

    expect(openAiNodes.length).toBeGreaterThan(0);
    for (const node of openAiNodes) {
      expect(node.credentials.openAiApi).toEqual({
        id: "W7viCvKb9IkuKdvf",
        name: "OpenAi JUREMA",
      });
    }
  });

  it("keeps consultar_imoveis cards free of legacy caption or whatsapp_text dumps", () => {
    const workflowPath = path.join(
      process.cwd(),
      "n8n",
      "production",
      "workflow-jurema-consultar-imoveis.final-hardened.json",
    );
    const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
    const node = workflow.nodes.find((item: { name: string }) => item.name === "Consultar Imoveis Supabase");
    const code = String(node?.parameters?.jsCode ?? "");

    expect(code).toContain("visual_card_primary_no_text_dump_v1");
    expect(code).not.toContain("function whatsappText");
    expect(code).not.toContain("caption: whatsappText");
    expect(code).not.toContain("whatsapp_text: whatsappText");
    expect(code).not.toContain("Separei esta opcao pra voce");
  });
});
