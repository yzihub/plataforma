export type PropertyCardFixture = {
  id: string;
  title: string;
  bairro: string;
  price: number;
  url: string;
  image: string;
};

export type RetrievalDecisionFixture = {
  route: "direct_reply" | "retrieve" | "tool" | "handoff" | "fallback";
  useVector: boolean;
  vectorQuery?: string | null;
  maxChunks?: number;
  reason: string;
};

export type ToolDecisionFixture = {
  route: "direct_reply" | "retrieve" | "tool" | "handoff" | "fallback";
  toolName?: string | null;
  toolRequired?: boolean;
  toolInput?: Record<string, unknown>;
};

export type ToolRevalidationScenarioFixture = {
  label: string;
  customerMessage: string;
  decision: ToolDecisionFixture;
  responseText: string;
  expectedCardId: string;
};

export type TurnMetricsFixture = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  toolCalls: number;
  retrievalCalls: number;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractUrls(text: string) {
  return Array.from(text.matchAll(/https?:\/\/[^\s)>\]]+/g), (match) =>
    match[0].replace(/[.,;!?]+$/, ""),
  );
}

export function assertUrlIntegrity(responseText: string, cards: PropertyCardFixture[]) {
  const allowedUrls = new Set(cards.map((card) => card.url));
  const urls = extractUrls(responseText);

  for (const url of urls) {
    if (!allowedUrls.has(url)) {
      throw new Error(`URL not returned by consultar_imoveis: ${url}`);
    }
  }

  for (const card of cards) {
    if (responseText.includes(card.title) && !responseText.includes(card.url)) {
      throw new Error(`Card title was mentioned without exact URL: ${card.title}`);
    }
  }
}

export function assertModelDidNotBuildUrl(responseText: string, cards: PropertyCardFixture[]) {
  const allowedUrls = cards.map((card) => card.url);
  const urls = extractUrls(responseText);

  for (const url of urls) {
    const isExactToolUrl = allowedUrls.includes(url);
    const isJuremaPropertyUrl = /^https:\/\/juremabksimoveis\.com\.br\/imoveis\//i.test(url);
    if (isJuremaPropertyUrl && !isExactToolUrl) {
      throw new Error(`Model appears to have reconstructed a property URL: ${url}`);
    }
  }
}

export function assertNoMarkdownOrBullets(responseText: string) {
  const forbiddenPatterns = [
    /^[ \t]*[-*•]\s+/m,
    /^[ \t]*\d+[.)]\s+/m,
    /\*\*[^*]+\*\*/,
    /```/,
    /^#{1,6}\s+/m,
    /\|.+\|/,
    /👉/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(responseText)) {
      throw new Error(`Response contains markdown/list formatting: ${pattern}`);
    }
  }
}

export function assertNoRedundantQuestion(responseText: string, resolvedFields: string[]) {
  const fieldQuestions: Record<string, RegExp[]> = {
    tipo_imovel: [
      /voce procura (apartamento|casa|qual tipo)/i,
      /apartamento ou casa/i,
      /qual tipo de imovel/i,
    ],
    bairro: [/qual bairro/i, /bairro de interesse/i, /em qual regiao/i],
    quartos: [/quantos quartos/i, /numero de quartos/i],
    faixa_valor: [/faixa de valor/i, /qual valor/i, /ate quanto/i],
  };

  for (const field of resolvedFields) {
    for (const pattern of fieldQuestions[field] ?? []) {
      if (pattern.test(responseText)) {
        throw new Error(`Response repeats resolved field ${field}: ${pattern}`);
      }
    }
  }
}

export function assertNoHallucinatedPropertyFacts(responseText: string, cards: PropertyCardFixture[]) {
  const allowedTitles = cards.map((card) => card.title.toLowerCase());
  const allowedBairros = new Set(cards.map((card) => card.bairro.toLowerCase()));
  const allowedPrices = new Set(cards.map((card) => String(card.price)));

  const propertyCodeMatches = Array.from(responseText.matchAll(/\bJP\d{2,}\b/gi), (match) => match[0]);
  const allowedCodes = new Set(cards.map((card) => card.id.toUpperCase()));
  for (const code of propertyCodeMatches) {
    if (!allowedCodes.has(code.toUpperCase())) {
      throw new Error(`Hallucinated property code: ${code}`);
    }
  }

  const juremaNeighborhoods = ["bessa", "jardim oceania", "intermares", "aeroclube", "tambau", "manaira"];
  for (const bairro of juremaNeighborhoods) {
    if (responseText.toLowerCase().includes(bairro) && !allowedBairros.has(bairro)) {
      const titleMentionsBairro = allowedTitles.some((title) => title.includes(bairro));
      if (!titleMentionsBairro) throw new Error(`Hallucinated neighborhood: ${bairro}`);
    }
  }

  const priceMatches = Array.from(responseText.matchAll(/R\$\s?([\d.]+)/g), (match) =>
    match[1].replace(/\./g, ""),
  );
  for (const price of priceMatches) {
    if (!allowedPrices.has(price)) {
      throw new Error(`Hallucinated property price: ${price}`);
    }
  }
}

export function assertCardPreviewContract(responseText: string, cards: PropertyCardFixture[]) {
  for (const card of cards) {
    if (!responseText.includes(card.url)) continue;

    const exactUrlPattern = new RegExp(`(^|\\n)${escapeRegExp(card.url)}($|\\n)`);
    if (!exactUrlPattern.test(responseText)) {
      throw new Error(`Card URL is not on its own WhatsApp preview line: ${card.url}`);
    }
  }
}

export function assertRetrievalGovernance(decision: RetrievalDecisionFixture, expected: Partial<RetrievalDecisionFixture>) {
  if (expected.route && decision.route !== expected.route) {
    throw new Error(`Unexpected route: ${decision.route}, expected ${expected.route}`);
  }
  if (expected.useVector !== undefined && decision.useVector !== expected.useVector) {
    throw new Error(`Unexpected vector usage: ${decision.useVector}, expected ${expected.useVector}`);
  }
  if (decision.useVector && (decision.maxChunks ?? 0) > 2) {
    throw new Error(`Vector retrieval over budget: ${decision.maxChunks}`);
  }
}

export function assertToolContract(decision: ToolDecisionFixture, expectedTool: string | null) {
  if (expectedTool === null) {
    if (decision.toolName) throw new Error(`Unexpected tool call: ${decision.toolName}`);
    return;
  }

  if (decision.route !== "tool") throw new Error(`Expected tool route, got ${decision.route}`);
  if (decision.toolName !== expectedTool) throw new Error(`Expected ${expectedTool}, got ${decision.toolName}`);
  if (!decision.toolRequired) throw new Error(`Expected required tool: ${expectedTool}`);
}

export function assertToolRevalidationPolicy(
  scenario: ToolRevalidationScenarioFixture,
  cards: PropertyCardFixture[],
) {
  assertToolContract(scenario.decision, "consultar_imoveis");
  assertUrlIntegrity(scenario.responseText, cards);
  assertModelDidNotBuildUrl(scenario.responseText, cards);
  assertCardPreviewContract(scenario.responseText, cards);

  const expectedCard = cards.find((card) => card.id === scenario.expectedCardId);
  if (!expectedCard) throw new Error(`Missing expected fixture card: ${scenario.expectedCardId}`);
  if (!scenario.responseText.includes(expectedCard.url)) {
    throw new Error(`Revalidation response did not include expected tool URL: ${expectedCard.url}`);
  }
}

export function assertOperationalMetrics(metrics: TurnMetricsFixture) {
  if (metrics.totalTokens > 2500) throw new Error(`Turn token budget exceeded: ${metrics.totalTokens}`);
  if (metrics.latencyMs > 8000) throw new Error(`Turn latency budget exceeded: ${metrics.latencyMs}`);
  if (metrics.toolCalls > 1) throw new Error(`Tool overcalling detected: ${metrics.toolCalls}`);
  if (metrics.retrievalCalls > 1) throw new Error(`Retrieval overuse detected: ${metrics.retrievalCalls}`);
}
