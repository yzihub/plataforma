import type {
  PropertyCardFixture,
  RetrievalDecisionFixture,
  ToolRevalidationScenarioFixture,
  ToolDecisionFixture,
  TurnMetricsFixture,
} from "../assertions/operational-contracts";

export const propertyCards: PropertyCardFixture[] = [
  {
    id: "JP1842",
    title: "Casa no Bessa",
    bairro: "Bessa",
    price: 890000,
    url: "https://juremabksimoveis.com.br/imoveis/1842/",
    image: "https://cdn.juremabksimoveis.com.br/cards/1842.jpg",
  },
  {
    id: "JP2199",
    title: "Casa em Intermares",
    bairro: "Intermares",
    price: 920000,
    url: "https://juremabksimoveis.com.br/imoveis/2199/",
    image: "https://cdn.juremabksimoveis.com.br/cards/2199.jpg",
  },
];

export const redisContinuityFixture = {
  sessionId: "5583999999999",
  hotMemory: {
    usefulSummary: "Cliente procura casa no Bessa, mas aceita avaliar Intermares se fizer sentido.",
    resolvedFields: ["tipo_imovel", "bairro", "quartos"],
    lastQuestionAsked: "faixa de valor",
    lastPropertiesSent: ["JP1842"],
  },
  currentMessage: "a dificuldade ta grande de achar casa mesmo",
};

export const validCardResponse = [
  "Entendi. Casa no Bessa realmente aparece pouco, entao separei duas opcoes proximas para voce olhar com calma.",
  "",
  "Casa no Bessa, 3 quartos, R$ 890.000.",
  "https://juremabksimoveis.com.br/imoveis/1842/",
  "",
  "Casa em Intermares, 3 quartos, R$ 920.000.",
  "https://juremabksimoveis.com.br/imoveis/2199/",
].join("\n");

export const revalidatedApartmentResponse = [
  "Claro, revalidei por aqui e o link correto e este.",
  "https://juremabksimoveis.com.br/imoveis/1842/",
].join("\n");

export const invalidReconstructedUrlResponse = [
  "Encontrei uma casa no Bessa que pode fazer sentido.",
  "https://juremabksimoveis.com.br/imoveis/casa-no-bessa-3-quartos/",
].join("\n");

export const invalidMarkdownResponse = [
  "Bessa mais interno:",
  "",
  "- Jardim Oceania",
  "- Aeroclube",
  "- Intermares",
].join("\n");

export const redundantQuestionResponse =
  "Entendi a busca por casa no Bessa. Voce procura apartamento ou casa?";

export const hallucinatedPropertyResponse = [
  "Achei uma casa JP9999 em Tambau por R$ 1.300.000.",
  "https://juremabksimoveis.com.br/imoveis/1842/",
].join("\n");

export const retrievalDecisions: Record<string, RetrievalDecisionFixture> = {
  greeting: {
    route: "direct_reply",
    useVector: false,
    reason: "cumprimento simples nao exige retrieval",
  },
  neighborhoodQuestion: {
    route: "retrieve",
    useVector: true,
    vectorQuery: "perfil bairro Bessa casa familia",
    maxChunks: 2,
    reason: "duvida consultiva sobre bairro",
  },
  propertySearch: {
    route: "tool",
    useVector: false,
    reason: "busca transacional deve usar consultar_imoveis",
  },
};

export const toolDecisions: Record<string, ToolDecisionFixture> = {
  directReply: {
    route: "direct_reply",
    toolName: null,
  },
  propertySearch: {
    route: "tool",
    toolName: "consultar_imoveis",
    toolRequired: true,
    toolInput: {
      bairro: "Bessa",
      tipo_imovel: "casa",
      quartos: "3",
    },
  },
  handoff: {
    route: "tool",
    toolName: "setar_lead_quente",
    toolRequired: true,
    toolInput: {
      reason: "cliente pediu corretor",
    },
  },
};

export const toolRevalidationScenarios: ToolRevalidationScenarioFixture[] = [
  {
    label: "o link deu erro",
    customerMessage: "o link deu erro",
    expectedCardId: "JP1842",
    decision: {
      route: "tool",
      toolName: "consultar_imoveis",
      toolRequired: true,
      toolInput: { codigo_ref: "JP1842" },
    },
    responseText: revalidatedApartmentResponse,
  },
  {
    label: "manda novamente",
    customerMessage: "manda novamente",
    expectedCardId: "JP1842",
    decision: {
      route: "tool",
      toolName: "consultar_imoveis",
      toolRequired: true,
      toolInput: { codigo_ref: "JP1842" },
    },
    responseText: revalidatedApartmentResponse,
  },
  {
    label: "qual era aquele imovel",
    customerMessage: "qual era aquele imovel?",
    expectedCardId: "JP1842",
    decision: {
      route: "tool",
      toolName: "consultar_imoveis",
      toolRequired: true,
      toolInput: { codigo_ref: "JP1842" },
    },
    responseText: revalidatedApartmentResponse,
  },
  {
    label: "reenvia pra mim",
    customerMessage: "reenvia pra mim",
    expectedCardId: "JP1842",
    decision: {
      route: "tool",
      toolName: "consultar_imoveis",
      toolRequired: true,
      toolInput: { codigo_ref: "JP1842" },
    },
    responseText: revalidatedApartmentResponse,
  },
  {
    label: "abre mais aquele apartamento",
    customerMessage: "abre mais aquele apartamento",
    expectedCardId: "JP1842",
    decision: {
      route: "tool",
      toolName: "consultar_imoveis",
      toolRequired: true,
      toolInput: { codigo_ref: "JP1842" },
    },
    responseText: revalidatedApartmentResponse,
  },
];

export const metricsFixtures: Record<string, TurnMetricsFixture> = {
  simpleTurn: {
    inputTokens: 720,
    outputTokens: 74,
    totalTokens: 794,
    latencyMs: 2100,
    toolCalls: 0,
    retrievalCalls: 0,
  },
  propertySearchTurn: {
    inputTokens: 1180,
    outputTokens: 148,
    totalTokens: 1328,
    latencyMs: 4200,
    toolCalls: 1,
    retrievalCalls: 0,
  },
};
