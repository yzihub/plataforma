import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type E2EScenarioRequest = {
  scenario_id?: string;
  utm_source: string;
  utm_campaign: string;
  lead_context: string;
  user_message: string;
  expected?: {
    bairro?: string;
    intent?: string;
    conversation_stage?: string;
    maturity?: string;
    emotional_context?: string;
    retrieval_sections?: string[];
  };
};

type SemanticChunk = {
  section: string;
  excerpt: string;
  token_estimate: number;
};

const DEFAULT_RETRIEVAL_BY_SCENARIO: Record<string, string[]> = {
  "01_hot_lead": [
    "conversation_governance",
    "relational_intelligence",
    "buyer_psychology",
    "urban_semantics",
    "matching_intelligence",
    "payload_governance",
  ],
  "02_cold_lead": [
    "conversation_governance",
    "relational_intelligence",
    "retrieval_governance",
    "payload_governance",
  ],
  "03_investor": [
    "acquisition_semantics",
    "buyer_psychology",
    "urban_semantics",
    "geo_semantics",
    "retrieval_governance",
    "matching_intelligence",
    "payload_governance",
  ],
  "04_family": [
    "acquisition_semantics",
    "conversation_governance",
    "relational_intelligence",
    "buyer_psychology",
    "urban_semantics",
    "matching_intelligence",
  ],
  "05_luxury": [
    "conversation_governance",
    "relational_intelligence",
    "buyer_psychology",
    "regional_semantics",
    "geo_semantics",
    "matching_intelligence",
    "payload_governance",
  ],
};

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function estimateTokens(value: unknown) {
  return Math.ceil(Buffer.byteLength(String(value), "utf8") / 4);
}

function payloadSize(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function stripXml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function excerpt(value: string, max = 700) {
  const text = stripXml(value);
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function section(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}>[\\s\\S]*?<\\/${name}>`, "m"));
  return match ? match[0] : "";
}

function loadSuperXml() {
  const xmlPath = path.join(process.cwd(), "docs", "knowledge", "ju-real-estate-semantic-intelligence.xml");
  return fs.readFileSync(xmlPath, "utf8");
}

function detectContext(body: E2EScenarioRequest) {
  const text = normalize(`${body.utm_campaign} ${body.lead_context} ${body.user_message}`);
  const bairro =
    body.expected?.bairro ||
    (text.includes("ponta de campina")
      ? "Ponta de Campina"
      : text.includes("cabo branco")
        ? "Cabo Branco"
        : text.includes("bessa")
          ? "Bessa"
          : text.includes("manaira")
            ? "Manaira"
            : text.includes("tambau")
              ? "Tambau"
              : text.includes("joao pessoa")
                ? "Joao Pessoa"
                : "Joao Pessoa");

  const intent =
    body.expected?.intent ||
    (text.includes("invest") || text.includes("retorno") || text.includes("valorizacao")
      ? "investir"
      : text.includes("alto") || text.includes("exclusiv") || text.includes("estetica")
        ? "alto_padrao"
        : text.includes("olhando") && text.includes("nao tenho")
          ? "explorar"
          : "morar");

  const conversation_stage =
    body.expected?.conversation_stage ||
    (text.includes("decidir") || text.includes("60 dias")
      ? "refinamento"
      : text.includes("so olhando") || text.includes("nao tenho")
        ? "descoberta"
        : text.includes("financeiramente") || text.includes("retorno")
          ? "comparacao"
          : text.includes("sensacao") || text.includes("exclusivo")
            ? "conexao_emocional"
            : "exploracao");

  return {
    bairro,
    intent,
    conversation_stage,
    maturity: body.expected?.maturity || "nao_informada",
    emotional_context: body.expected?.emotional_context || "inferido_pelo_contexto",
  };
}

function retrieve(xml: string, body: E2EScenarioRequest): SemanticChunk[] {
  const sections =
    body.expected?.retrieval_sections ||
    DEFAULT_RETRIEVAL_BY_SCENARIO[body.scenario_id || ""] ||
    ["conversation_governance", "retrieval_governance", "payload_governance"];

  return sections.map((name) => {
    const raw = section(xml, name);
    if (!raw) throw new Error(`Missing XML section: ${name}`);
    const compact = excerpt(raw);
    return { section: name, excerpt: compact, token_estimate: estimateTokens(compact) };
  });
}

function buildPayload(body: E2EScenarioRequest, detected: ReturnType<typeof detectContext>, retrieval: SemanticChunk[]) {
  return {
    qa_type: "institutional_semantic_behavior_validation_e2e_curl",
    architecture: {
      hot_memory: "Redis",
      semantic_memory: "Supabase Vector",
      governance_layer: "SUPER XML",
      parser: "JS lightweight operational interpretation",
      orchestration: "n8n lightweight support",
      language_model: "GPT-4.1 contextual language adaptation",
      truth_rule: "LLM fala; backend decide; banco guarda verdade",
      agno_hotpath: false,
    },
    lead_context: {
      scenario_id: body.scenario_id || null,
      utm_source: body.utm_source,
      utm_campaign: body.utm_campaign,
      profile: body.lead_context,
      current_message: body.user_message,
      bairro_detectado: detected.bairro,
      intent_detected: detected.intent,
      conversation_stage: detected.conversation_stage,
      maturity: detected.maturity,
      emotional_context: detected.emotional_context,
    },
    retrieved_xml_sections: retrieval.map((chunk) => ({
      section: chunk.section,
      excerpt: chunk.excerpt,
    })),
    behavioral_constraints: {
      answer_as_ju: true,
      no_markdown: true,
      no_bullets: true,
      no_hype: true,
      no_sdr_behavior: true,
      no_property_or_price_invention: true,
      no_url_invention: true,
      no_runtime_explanation_to_customer: true,
      cta_moderation: true,
      semantic_intelligence_on_demand: true,
      avoid_influencer_terms: ["vibe", "top", "super", "incrivel", "sensacional", "ape"],
    },
  };
}

function systemPrompt() {
  return [
    "Voce esta em um teste E2E de institutional semantic behavior validation da Ju.",
    "Responda SOMENTE como a Ju responderia ao cliente no WhatsApp.",
    "Use o payload como governanca semantica institucional, nao como texto para copiar.",
    "Nao explique XML, retrieval, arquitetura, backend, banco, tokens ou teste.",
    "Nao use bullets, markdown, numeracao, tabela ou formato de relatorio.",
    "Nao invente imovel, preco, URL, disponibilidade ou rentabilidade.",
    "Nao pressione. Nem toda resposta precisa CTA. Nem toda resposta precisa pergunta.",
    "Evite linguagem jovem ou influencer como vibe, top, super, incrivel, gostoso/gostosa, sensacional ou imperdivel.",
    "Use portugues natural adulto de Joao Pessoa, com elegancia e contencao.",
  ].join("\n");
}

async function callOpenAI(payload: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY ausente");

  const model = process.env.OPENAI_MODEL || "gpt-4.1";
  const started = performance.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt() }] },
        { role: "user", content: [{ type: "input_text", text: JSON.stringify(payload, null, 2) }] },
      ],
      max_output_tokens: 600,
      temperature: 0.4,
    }),
  });
  const latencyMs = Math.round(performance.now() - started);
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 800)}`);

  const json = JSON.parse(text) as {
    model?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
  const outputText =
    json.output_text ||
    (json.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("\n")
      .trim();

  return {
    response: {
      model: json.model || model,
      text: outputText,
    },
    metrics: {
      input_tokens: json.usage?.input_tokens || 0,
      output_tokens: json.usage?.output_tokens || 0,
      total_tokens: json.usage?.total_tokens || 0,
      latency_ms: latencyMs,
    },
  };
}

function analyze(body: E2EScenarioRequest, detected: ReturnType<typeof detectContext>, responseText: string, payload: unknown, retrieval: SemanticChunk[]) {
  const normalized = normalize(responseText);
  const redFlags: string[] = [];
  if (/^\s*[-*]\s+/m.test(responseText) || /^\s*\d+[.)]\s+/m.test(responseText)) redFlags.push("list_or_bullet_behavior");
  if (/[*_`#]/.test(responseText)) redFlags.push("markdown_behavior");
  if (/xml|retrieval|backend|banco|token|payload|super xml|system prompt|n8n|redis|supabase vector/i.test(responseText)) redFlags.push("internal_architecture_leak");
  if (/\b(top|sensacional|incrivel|imperdivel|mega|ape|vibe|super|gostoso|gostosa)\b/i.test(normalized)) {
    redFlags.push("regional_language_or_hype_violation");
  }
  if (/rentabilidade garantida|retorno garantido|valorizacao garantida/i.test(normalized)) redFlags.push("financial_hallucination");
  if (/https?:\/\//i.test(responseText)) redFlags.push("url_invention_risk");

  const geoOk =
    detected.bairro === "Joao Pessoa" ||
    normalized.includes(normalize(detected.bairro)) ||
    normalized.includes("regiao") ||
    normalized.includes("bairro");
  const semanticCompressionOk = payloadSize(payload) < 12000 && retrieval.length <= 8 && !JSON.stringify(payload).includes("<yzi_operational_cognition");
  const pacingOk =
    detected.conversation_stage === "descoberta"
      ? !/agenda|visita|corretor/i.test(normalized)
      : true;

  return {
    geo_accuracy: geoOk ? "high" : "needs_review",
    pacing_quality: pacingOk ? "high" : "needs_review",
    semantic_alignment: redFlags.length ? "needs_review" : "high",
    matching_quality: "contextual_behavior_checked",
    drift_detected: redFlags.length > 0 || !geoOk || !pacingOk,
    red_flags: redFlags,
    semantic_analysis_md: [
      "## Semantic Analysis",
      "",
      `- geo_accuracy: ${geoOk ? "high" : "needs_review"}`,
      `- pacing_quality: ${pacingOk ? "high" : "needs_review"}`,
      `- semantic_alignment: ${redFlags.length ? "needs_review" : "high"}`,
      `- drift_detected: ${redFlags.length > 0 || !geoOk || !pacingOk}`,
      `- semantic_compression: ${semanticCompressionOk ? "compressed" : "needs_review"}`,
      `- retrieval_chunks: ${retrieval.length}`,
      `- payload_size: ${payloadSize(payload)}`,
      "",
      "### Response",
      "",
      responseText,
      "",
      redFlags.length ? `### Red Flags\n\n${redFlags.map((flag) => `- ${flag}`).join("\n")}` : "### Red Flags\n\nNenhum red flag critico detectado.",
    ].join("\n"),
  };
}

export async function POST(request: Request) {
  const started = performance.now();
  try {
    const body = (await request.json()) as E2EScenarioRequest;
    if (!body.utm_source || !body.utm_campaign || !body.lead_context || !body.user_message) {
      return NextResponse.json({ ok: false, error: "utm_source, utm_campaign, lead_context e user_message sao obrigatorios" }, { status: 400 });
    }

    const xml = loadSuperXml();
    const detected = detectContext(body);
    const retrieval = retrieve(xml, body);
    const payload = buildPayload(body, detected, retrieval);
    const gpt = await callOpenAI(payload);
    const analysis = analyze(body, detected, gpt.response.text, payload, retrieval);

    const metrics = {
      ...gpt.metrics,
      retrieval_chunks: retrieval.length,
      payload_size: payloadSize(payload),
      geo_accuracy: analysis.geo_accuracy,
      pacing_quality: analysis.pacing_quality,
      semantic_alignment: analysis.semantic_alignment,
      drift_detected: analysis.drift_detected,
      request_latency_ms: Math.round(performance.now() - started),
    };

    return NextResponse.json({
      ok: true,
      scenario_id: body.scenario_id || null,
      payload,
      response: gpt.response,
      retrieval: {
        chunks: retrieval,
        sections: retrieval.map((chunk) => chunk.section),
      },
      metrics,
      latency: {
        gpt_latency_ms: gpt.metrics.latency_ms,
        request_latency_ms: metrics.request_latency_ms,
      },
      semantic_analysis: analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
