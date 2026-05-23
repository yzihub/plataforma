const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const root = process.cwd();
const xmlPath = path.join(root, 'docs', 'knowledge', 'ju-real-estate-semantic-intelligence.xml');
const outputDir = path.join(root, 'tests', 'ju-operational-validation', 'simulation_logs');

const scenarioFiles = {
  '01_hot_lead': 'scenario_01_hot_lead.md',
  '02_cold_lead': 'scenario_02_cold_lead.md',
  '03_investor': 'scenario_03_investor.md',
  '04_family': 'scenario_04_family.md',
  '05_luxury': 'scenario_05_luxury.md',
};

const scenarios = [
  {
    id: '01_hot_lead',
    title: 'Cenario 1 - Lead quente',
    utm_source: 'instagram',
    utm_campaign: 'manaira_high_standard',
    lead_context: 'casal, filho pequeno, orcamento alto, decisao em ate 60 dias, interesse Manaira/Tambau',
    user_message: 'Estamos olhando algo melhor em Manaira ou Tambau, com estrutura para nosso filho pequeno. Queremos decidir em ate uns 60 dias.',
    detected: {
      bairro: 'Manaira',
      intent: 'alto_padrao',
      stage: 'refinamento',
      maturity: 'alta',
      emotional_context: 'familia com decisao ativa e criterio premium',
    },
    retrieval_sections: ['conversation_governance', 'relational_intelligence', 'buyer_psychology', 'urban_semantics', 'matching_intelligence', 'payload_governance'],
    expected_behavior: 'premium consultivo, familia alto padrao, sem pressao artificial',
  },
  {
    id: '02_cold_lead',
    title: 'Cenario 2 - Lead frio',
    utm_source: 'google',
    utm_campaign: 'apartamento_joao_pessoa',
    lead_context: 'curioso, orcamento incompativel, sem timing, baixa maturidade',
    user_message: 'Estou so olhando apartamento em Joao Pessoa ainda. Nao tenho muita ideia de valor nem prazo.',
    detected: {
      bairro: 'Joao Pessoa',
      intent: 'explorar',
      stage: 'descoberta',
      maturity: 'baixa',
      emotional_context: 'curiosidade inicial sem decisao formada',
    },
    retrieval_sections: ['conversation_governance', 'relational_intelligence', 'retrieval_governance', 'payload_governance'],
    expected_behavior: 'pacing exploratorio, baixo retrieval, sem agressividade e sem SDR',
  },
  {
    id: '03_investor',
    title: 'Cenario 3 - Investidor',
    utm_source: 'meta_ads',
    utm_campaign: 'investimento_cabo_branco',
    lead_context: 'racional, foco valorizacao, retorno financeiro, emocional baixo',
    user_message: 'Tenho interesse em algo em Cabo Branco pensando em valorizacao e possibilidade de retorno. Quero entender se faz sentido financeiramente.',
    detected: {
      bairro: 'Cabo Branco',
      intent: 'investir',
      stage: 'comparacao',
      maturity: 'media_alta',
      emotional_context: 'criterio financeiro e decisao racional',
    },
    retrieval_sections: ['acquisition_semantics', 'buyer_psychology', 'urban_semantics', 'geo_semantics', 'retrieval_governance', 'matching_intelligence', 'payload_governance'],
    expected_behavior: 'objetivo, economico, sem exagero emocional e sem promessa de rentabilidade',
  },
  {
    id: '04_family',
    title: 'Cenario 4 - Familia',
    utm_source: 'referral',
    utm_campaign: 'familia_bessa',
    lead_context: 'familia crescendo, preocupacao com escola, rotina, seguranca e qualidade de vida',
    user_message: 'A familia esta crescendo e a gente queria algo no Bessa ou perto, com rotina boa, escola por perto e seguranca.',
    detected: {
      bairro: 'Bessa',
      intent: 'morar',
      stage: 'exploracao',
      maturity: 'media',
      emotional_context: 'familia buscando seguranca e rotina sustentavel',
    },
    retrieval_sections: ['acquisition_semantics', 'conversation_governance', 'relational_intelligence', 'buyer_psychology', 'urban_semantics', 'matching_intelligence'],
    expected_behavior: 'trust building, inferencia familiar, bairros coerentes e ritmo relacional',
  },
  {
    id: '05_luxury',
    title: 'Cenario 5 - Alto padrao emocional',
    utm_source: 'instagram',
    utm_campaign: 'altissimo_padrao_ponta_de_campina',
    lead_context: 'lifestyle-driven, estetica, exclusividade e status implicito',
    user_message: 'A gente busca algo mais exclusivo, com uma estetica muito boa e uma sensacao diferente. Ponta de Campina nos chama atencao.',
    detected: {
      bairro: 'Ponta de Campina',
      intent: 'alto_padrao',
      stage: 'conexao_emocional',
      maturity: 'media_alta',
      emotional_context: 'desejo estetico, exclusividade e status implicito',
    },
    retrieval_sections: ['conversation_governance', 'relational_intelligence', 'buyer_psychology', 'regional_semantics', 'geo_semantics', 'matching_intelligence', 'payload_governance'],
    expected_behavior: 'sofisticacao contextual, exclusividade implicita, sem hype e sem venda agressiva',
  },
];

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function section(xml, name) {
  const match = xml.match(new RegExp(`<${name}>[\\s\\S]*?<\\/${name}>`, 'm'));
  return match ? match[0] : '';
}

function stripXml(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(value, max = 700) {
  const text = stripXml(value);
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function estimateTokens(value) {
  return Math.ceil(Buffer.byteLength(String(value), 'utf8') / 4);
}

function payloadSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function retrieve(xml, scenario) {
  return scenario.retrieval_sections.map((name) => {
    const raw = section(xml, name);
    if (!raw) throw new Error(`Missing XML section ${name}`);
    return {
      section: name,
      excerpt: excerpt(raw),
      token_estimate: estimateTokens(excerpt(raw)),
    };
  });
}

function buildPayload(scenario, chunks) {
  return {
    qa_type: 'institutional_semantic_behavior_validation',
    architecture: {
      hot_memory: 'Redis',
      semantic_memory: 'Supabase Vector',
      governance_layer: 'SUPER XML',
      parser: 'JS lightweight operational interpretation',
      orchestration: 'n8n lightweight support',
      language_model: 'GPT-4.1 contextual language adaptation',
      truth_rule: 'LLM fala; backend decide; banco guarda verdade',
      agno_hotpath: false,
    },
    lead_context: {
      utm_source: scenario.utm_source,
      utm_campaign: scenario.utm_campaign,
      profile: scenario.lead_context,
      current_message: scenario.user_message,
      bairro_detectado: scenario.detected.bairro,
      intent_detected: scenario.detected.intent,
      conversation_stage: scenario.detected.stage,
      maturity: scenario.detected.maturity,
      emotional_context: scenario.detected.emotional_context,
    },
    retrieved_xml_sections: chunks.map((chunk) => ({
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
    },
    expected_behavior: scenario.expected_behavior,
  };
}

function systemPrompt() {
  return [
    'Voce esta em um teste de institutional semantic behavior validation da Ju.',
    'Responda SOMENTE como a Ju responderia ao cliente no WhatsApp.',
    'Use o payload como governanca semantica institucional, nao como texto para copiar.',
    'Nao explique XML, retrieval, arquitetura, backend, banco, tokens ou teste.',
    'Nao use bullets, markdown, numeracao, tabela ou formato de relatorio.',
    'Nao invente imovel, preco, URL, disponibilidade ou rentabilidade.',
    'Nao pressione. Nem toda resposta precisa CTA. Nem toda resposta precisa pergunta.',
    'A resposta deve mostrar pacing, regionalidade e inferencia contextual com leveza.',
    'Evite linguagem jovem ou influencer como vibe, top, super, incrivel, gostoso/gostosa, sensacional ou imperdivel.',
    'Use portugues natural adulto de Joao Pessoa, com elegancia e contencao.',
  ].join('\n');
}

async function callResponsesApi({ apiKey, model, payload }) {
  const body = {
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemPrompt() }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: JSON.stringify(payload, null, 2) }],
      },
    ],
    max_output_tokens: 600,
    temperature: 0.4,
  };

  const started = performance.now();
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const latency = performance.now() - started;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Responses API failed HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }
  const json = JSON.parse(text);
  const outputText = json.output_text || (json.output || [])
    .flatMap((item) => item.content || [])
    .map((item) => item.text || '')
    .join('\n')
    .trim();
  return {
    provider: 'openai_responses',
    raw: json,
    response_text: outputText,
    latency_ms: Math.round(latency),
    usage: {
      input_tokens: json.usage?.input_tokens || 0,
      output_tokens: json.usage?.output_tokens || 0,
      total_tokens: json.usage?.total_tokens || 0,
    },
  };
}

async function callChatCompletionsApi({ apiKey, model, payload }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: JSON.stringify(payload, null, 2) },
    ],
    max_tokens: 600,
    temperature: 0.4,
  };
  const started = performance.now();
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const latency = performance.now() - started;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Chat Completions API failed HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }
  const json = JSON.parse(text);
  return {
    provider: 'openai_chat_completions',
    raw: json,
    response_text: json.choices?.[0]?.message?.content || '',
    latency_ms: Math.round(latency),
    usage: {
      input_tokens: json.usage?.prompt_tokens || 0,
      output_tokens: json.usage?.completion_tokens || 0,
      total_tokens: json.usage?.total_tokens || 0,
    },
  };
}

async function callOpenAI(args) {
  try {
    return await callResponsesApi(args);
  } catch (error) {
    if (!/temperature|Unsupported parameter|unknown parameter|Responses API failed HTTP 400/i.test(error.message)) throw error;
    return await callChatCompletionsApi(args);
  }
}

function analyzeResponse({ scenario, chunks, payload, response, usage }) {
  const text = response.response_text || '';
  const normalized = normalize(text);
  const redFlags = [];
  if (/^\s*[-*]\s+/m.test(text) || /^\s*\d+[.)]\s+/m.test(text)) redFlags.push('list_or_bullet_behavior');
  if (/[*_`#]/.test(text)) redFlags.push('markdown_behavior');
  if (/xml|retrieval|backend|banco|token|payload|super xml|system prompt|n8n|redis|supabase vector/i.test(text)) redFlags.push('internal_architecture_leak');
  if (/top|sensacional|incrivel|imperdivel|mega|ap[eê]|vibe|super|gostos[ao]/i.test(normalized)) redFlags.push('regional_language_or_hype_violation');
  if (/agenda|visita|corretor|vamos marcar/i.test(normalized) && scenario.detected.stage === 'descoberta') redFlags.push('premature_cta');
  if (/rentabilidade garantida|retorno garantido|valorizacao garantida/i.test(normalized)) redFlags.push('financial_hallucination');
  if (/https?:\/\//i.test(text)) redFlags.push('url_invention_risk');

  const bairroOk = scenario.detected.bairro === 'Joao Pessoa' || normalized.includes(normalize(scenario.detected.bairro)) || normalized.includes('regiao');
  const intentOk =
    scenario.detected.intent === 'investir' ? /valorizacao|retorno|financeir|liquidez|invest/i.test(normalized) :
    scenario.detected.intent === 'alto_padrao' ? /criterio|exclusiv|estetica|padrao|estrutura|sensacao|manaira|tambau|ponta/i.test(normalized) :
    scenario.detected.intent === 'explorar' ? /sem pressa|olhar|entender|começar|comecar|ideia/i.test(normalized) :
    /familia|rotina|seguranca|morar|qualidade/i.test(normalized);

  const pacingOk =
    scenario.detected.stage === 'descoberta' ? !/agenda|visita|corretor/i.test(normalized) :
    scenario.detected.stage === 'comparacao' ? /faz sentido|comparar|olhar|avaliar|financeir|criterio/i.test(normalized) :
    true;

  const semanticCompressionOk = payloadSize(payload) < 12000 && chunks.length <= 8 && !JSON.stringify(payload).includes('<yzi_operational_cognition');
  const tokenOk = usage.input_tokens >= 1500 && usage.input_tokens <= 4000 && usage.output_tokens >= 50 && usage.output_tokens <= 600 && usage.total_tokens < 5000;

  return {
    pacing_analysis: pacingOk ? 'pacing institucional aderente ao estagio' : 'pacing com risco de pressao ou etapa incorreta',
    geo_inference: bairroOk ? `bairro/regiao coerente: ${scenario.detected.bairro}` : `risco de GEO drift para ${scenario.detected.bairro}`,
    acquisition_inference: `UTM ${scenario.utm_source}/${scenario.utm_campaign} alinhada a ${scenario.detected.intent}`,
    matching_analysis: intentOk ? 'matching contextual emergiu sem ficha tecnica' : 'matching contextual fraco ou pouco explicito',
    drift_detection: redFlags.length ? `red flags: ${redFlags.join(', ')}` : 'sem drift comportamental critico',
    semantic_compression_analysis: semanticCompressionOk ? 'payload comprimido; XML completo nao foi injetado' : 'payload excessivo ou XML bruto detectado',
    retrieval_quality: chunks.length >= 3 && chunks.length <= 8 ? 'retrieval dentro da janela alvo' : 'retrieval fora da janela alvo',
    token_quality: tokenOk ? 'tokens dentro da meta operacional' : 'tokens fora da meta ideal',
    red_flags: redFlags,
    drift_detected: redFlags.length > 0 || !bairroOk || !intentOk || !pacingOk,
  };
}

function mdBlock(title, content) {
  return [`## ${title}`, '', content, ''].join('\n');
}

function writeScenarioLog({ scenario, chunks, payload, response, analysis }) {
  const usage = response.usage;
  const conversation = [
    `Cliente: ${scenario.user_message}`,
    '',
    `Ju: ${response.response_text}`,
  ].join('\n');

  const body = [
    `# ${scenario.title}`,
    '',
    mdBlock('Contexto do Lead', scenario.lead_context),
    mdBlock('UTM Utilizada', `utm_source=${scenario.utm_source}\nutm_campaign=${scenario.utm_campaign}`),
    mdBlock('Retrieval Realizado', `Chunks recuperados: ${chunks.length}\n\n${chunks.map((chunk, index) => `${index + 1}. ${chunk.section} (${chunk.token_estimate} tokens estimados)`).join('\n')}`),
    mdBlock('Secoes XML Recuperadas', chunks.map((chunk) => `### ${chunk.section}\n\n${chunk.excerpt}`).join('\n\n')),
    mdBlock('Payload Enviado ao GPT', `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``),
    mdBlock('Conversa Completa', conversation),
    mdBlock('Métricas Operacionais', [
      `provider: ${response.provider}`,
      `model: ${response.raw.model || 'gpt-4.1'}`,
      `input_tokens: ${usage.input_tokens}`,
      `output_tokens: ${usage.output_tokens}`,
      `total_tokens: ${usage.total_tokens}`,
      `latency_ms: ${response.latency_ms}`,
      `retrieval_chunks: ${chunks.length}`,
      `payload_size: ${payloadSize(payload)}`,
    ].join('\n')),
    mdBlock('Pacing Analysis', analysis.pacing_analysis),
    mdBlock('GEO Inference', analysis.geo_inference),
    mdBlock('Acquisition Inference', analysis.acquisition_inference),
    mdBlock('Matching Analysis', analysis.matching_analysis),
    mdBlock('Drift Detection', analysis.drift_detection),
    mdBlock('Semantic Compression Analysis', analysis.semantic_compression_analysis),
  ].join('\n');

  fs.writeFileSync(path.join(outputDir, scenarioFiles[scenario.id]), body, 'utf8');
}

async function main() {
  const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || 'gpt-4.1';
  if (!apiKey) throw new Error('OPENAI_API_KEY ausente em .env.local ou ambiente.');

  fs.mkdirSync(outputDir, { recursive: true });
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const summary = [];

  for (const scenario of scenarios) {
    const chunks = retrieve(xml, scenario);
    const payload = buildPayload(scenario, chunks);
    const response = await callOpenAI({ apiKey, model, payload });
    const analysis = analyzeResponse({ scenario, chunks, payload, response, usage: response.usage });
    writeScenarioLog({ scenario, chunks, payload, response, analysis });
    summary.push({
      scenario: scenario.id,
      file: path.join('tests', 'ju-operational-validation', 'simulation_logs', scenarioFiles[scenario.id]),
      utm_source: scenario.utm_source,
      utm_campaign: scenario.utm_campaign,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.total_tokens,
      latency_ms: response.latency_ms,
      retrieval_chunks: chunks.length,
      payload_size: payloadSize(payload),
      bairro_detectado: scenario.detected.bairro,
      intent_detected: scenario.detected.intent,
      conversation_stage: scenario.detected.stage,
      pacing_quality: analysis.pacing_analysis,
      geo_accuracy: analysis.geo_inference,
      matching_quality: analysis.matching_analysis,
      semantic_alignment: analysis.drift_detected ? 'needs_review' : 'high',
      drift_detected: analysis.drift_detected,
      red_flags: analysis.red_flags,
    });
  }

  fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    model,
    output_dir: path.relative(root, outputDir),
    scenarios: summary.length,
    total_tokens: summary.reduce((sum, item) => sum + item.total_tokens, 0),
    avg_latency_ms: Math.round(summary.reduce((sum, item) => sum + item.latency_ms, 0) / summary.length),
    drift_detected: summary.some((item) => item.drift_detected),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
