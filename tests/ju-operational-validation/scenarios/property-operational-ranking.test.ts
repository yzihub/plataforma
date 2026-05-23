import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { propertyRankingRows, tenantId } from "../fixtures/property-ranking-fixtures";

type ToolInput = {
  tenant_id: string;
  phone?: string;
  codigo_ref?: string;
  bairro?: string;
  tipo_imovel?: string;
  quartos?: string;
  valor_max?: string;
  objetivo?: string;
  intencao?: string;
};

function runConsultarImoveis(input: ToolInput, rows = propertyRankingRows) {
  const workflowPath = path.join(
    process.cwd(),
    "n8n",
    "production",
    "workflow-jurema-consultar-imoveis.final-hardened.json",
  );
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  const node = workflow.nodes.find((item: { name: string }) => item.name === "Consultar Imoveis Supabase");
  if (!node) throw new Error("Consultar Imoveis Supabase node not found");

  const execute = new Function("items", "$", node.parameters.jsCode);
  const result = execute(
    rows.map((json) => ({ json })),
    (name: string) => {
      if (name !== "Quando chamada pela Ju") throw new Error(`Unexpected node lookup: ${name}`);
      return { first: () => ({ json: input }) };
    },
  );

  return result[0].json;
}

function assertMinimalPayload(payload: unknown) {
  const text = JSON.stringify(payload);
  expect(text).not.toContain("descricao_imovel");
  expect(text).not.toContain("Apartamento compacto com sala");
  expect(text).not.toContain("Casa em condominio fechado");
  expect(text).not.toContain("metadata inteira");
  expect(text).not.toContain("whatsapp_text");
  expect(text).not.toContain("caption");
  expect(text).not.toContain("Separei esta opcao pra voce");
}

describe("consultar_imoveis operational parser and ranking", () => {
  it("prioritizes high family_score for a family lead", () => {
    const output = runConsultarImoveis({
      tenant_id: tenantId,
      bairro: "Bessa",
      tipo_imovel: "casa",
      quartos: "3",
      valor_max: "950000",
      objetivo: "morar com familia e filhos",
    });

    expect(output.payload_policy).toBe("ju_minimal_operational_cards_v1");
    expect(output.cards).toHaveLength(1);
    expect(output.cards[0].metadata.referencia).toBe("FAM001");
    expect(output.cards[0].operational_features.family_score).toBeGreaterThanOrEqual(5);
    expect(output.cards[0].operational_features.tags).toContain("lazer");
    expect(output.cards[0].operational_features.tags).toContain("pet");
    expect(output.cards[0].presentation_policy).toBe("visual_card_primary_no_text_dump_v1");
    assertMinimalPayload(output);
  });

  it("prioritizes beach_score and vista_mar for a beach or sea-view lead", () => {
    const output = runConsultarImoveis({
      tenant_id: tenantId,
      bairro: "Cabo Branco",
      tipo_imovel: "apartamento",
      quartos: "3",
      valor_max: "1200000",
      objetivo: "quero algo perto da praia com vista mar",
    });

    expect(output.cards).toHaveLength(1);
    expect(output.cards[0].metadata.referencia).toBe("SEA001");
    expect(output.cards[0].operational_features.beach_score).toBeGreaterThanOrEqual(5);
    expect(output.cards[0].operational_features.tags).toContain("vista_mar");
    expect(output.cards[0].operational_features.lifestyle).toContain("praia");
    expect(output.cards[0].operational_summary).toContain("vista mar");
    assertMinimalPayload(output);
  });

  it("prioritizes luxury_score for a high-end lead", () => {
    const output = runConsultarImoveis({
      tenant_id: tenantId,
      bairro: "Manaira",
      tipo_imovel: "apartamento",
      quartos: "4",
      valor_max: "1800000",
      objetivo: "busco alto padrao com acabamento premium",
    });

    expect(output.cards).toHaveLength(1);
    expect(output.cards[0].metadata.referencia).toBe("LUX001");
    expect(output.cards[0].operational_features.luxury_score).toBeGreaterThanOrEqual(5);
    expect(output.cards[0].operational_features.tags).toContain("alto_padrao");
    expect(output.cards[0].operational_features.tags).toContain("gourmet");
    expect(output.cards[0].url).toBe("https://juremabksimoveis.com.br/imoveis/lux001/");
    assertMinimalPayload(output);
  });

  it("returns only top 3 ranked minimal cards when multiple candidates match", () => {
    const output = runConsultarImoveis({
      tenant_id: tenantId,
      tipo_imovel: "apartamento",
      valor_max: "2000000",
      objetivo: "quero apartamento alto padrao com praia ou vista mar",
    });

    expect(output.cards.length).toBeLessThanOrEqual(3);
    expect(output.cards[0].rank_score).toBeGreaterThanOrEqual(output.cards[1].rank_score);
    expect(output.cards.every((card: { operational_summary?: string }) => Boolean(card.operational_summary))).toBe(
      true,
    );
    assertMinimalPayload(output);
  });
});
