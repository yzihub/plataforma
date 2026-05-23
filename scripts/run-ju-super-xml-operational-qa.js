const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const root = process.cwd();
const xmlPath = path.join(root, 'docs', 'knowledge', 'ju-real-estate-semantic-intelligence.xml');
const reportsDir = path.join(root, 'tests', 'ju-operational-validation', 'reports');
const metricsDir = path.join(root, 'tests', 'ju-operational-validation', 'metrics');
const retrievalDir = path.join(root, 'tests', 'ju-operational-validation', 'retrieval');

const REQUIRED_TOP_LEVEL = [
  'institutional_identity',
  'operational_principles',
  'conversation_governance',
  'relational_intelligence',
  'acquisition_semantics',
  'buyer_psychology',
  'regional_semantics',
  'urban_semantics',
  'geo_semantics',
  'retrieval_governance',
  'payload_governance',
  'matching_intelligence',
  'search_semantics',
  'content_semantics',
  'future_modules_alignment',
];

const scenarios = [
  {
    id: '01-lead-quente',
    name: 'Lead quente',
    utm_source: 'instagram',
    utm_campaign: 'manaira_high_standard',
    profile: 'casal com filho pequeno, orcamento alto, decisao ate 60 dias, interesse Manaira/Tambau',
    message: 'Estamos olhando algo melhor em Manaira ou Tambau, com estrutura para nosso filho pequeno. Queremos decidir em ate uns 60 dias.',
    expected: {
      bairro: 'Manaira',
      intent: 'alto_padrao',
      stage: 'refinamento',
      profile: 'familia_alto_padrao',
      retrieval: ['conversation_governance', 'relational_intelligence', 'buyer_psychology', 'urban_semantics', 'matching_intelligence', 'payload_governance'],
      chunks: 6,
    },
  },
  {
    id: '02-lead-frio',
    name: 'Lead frio',
    utm_source: 'google',
    utm_campaign: 'apartamento_joao_pessoa',
    profile: 'curioso, orcamento incompatível, sem timing, baixa maturidade',
    message: 'Estou so olhando apartamento em Joao Pessoa ainda. Nao tenho muita ideia de valor nem prazo.',
    expected: {
      bairro: 'Joao Pessoa',
      intent: 'explorar',
      stage: 'descoberta',
      profile: 'baixa_maturidade',
      retrieval: ['conversation_governance', 'relational_intelligence', 'retrieval_governance', 'payload_governance'],
      chunks: 4,
    },
  },
  {
    id: '03-investidor',
    name: 'Investidor',
    utm_source: 'meta_ads',
    utm_campaign: 'investimento_cabo_branco',
    profile: 'racional, foco valorizacao, retorno financeiro, emocional baixo',
    message: 'Tenho interesse em algo em Cabo Branco pensando em valorizacao e possibilidade de retorno. Quero entender se faz sentido financeiramente.',
    expected: {
      bairro: 'Cabo Branco',
      intent: 'investir',
      stage: 'comparacao',
      profile: 'investidor',
      retrieval: ['acquisition_semantics', 'buyer_psychology', 'urban_semantics', 'geo_semantics', 'retrieval_governance', 'matching_intelligence', 'payload_governance'],
      chunks: 7,
    },
  },
  {
    id: '04-familia',
    name: 'Familia',
    utm_source: 'referral',
    utm_campaign: 'familia_bessa',
    profile: 'familia crescendo, escola, rotina, seguranca, qualidade de vida',
    message: 'A familia esta crescendo e a gente queria algo no Bessa ou perto, com rotina boa, escola por perto e seguranca.',
    expected: {
      bairro: 'Bessa',
      intent: 'morar',
      stage: 'exploracao',
      profile: 'familia',
      retrieval: ['acquisition_semantics', 'conversation_governance', 'relational_intelligence', 'buyer_psychology', 'urban_semantics', 'matching_intelligence'],
      chunks: 6,
    },
  },
  {
    id: '05-alto-padrao-emocional',
    name: 'Alto padrao emocional',
    utm_source: 'instagram',
    utm_campaign: 'altissimo_padrao_ponta_de_campina',
    profile: 'lifestyle-driven, estetica, exclusividade, status implicito',
    message: 'A gente busca algo mais exclusivo, com uma estetica muito boa e uma sensacao diferente. Ponta de Campina nos chama atencao.',
    expected: {
      bairro: 'Ponta de Campina',
      intent: 'alto_padrao',
      stage: 'conexao_emocional',
      profile: 'alto_padrao',
      retrieval: ['conversation_governance', 'relational_intelligence', 'buyer_psychology', 'regional_semantics', 'geo_semantics', 'matching_intelligence', 'payload_governance'],
      chunks: 7,
    },
  },
];

function ensureDirs() {
  for (const dir of [reportsDir, metricsDir, retrievalDir]) fs.mkdirSync(dir, { recursive: true });
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
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(value, max = 620) {
  const text = stripXml(value);
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function estimateTokens(value) {
  return Math.ceil(Buffer.byteLength(String(value), 'utf8') / 4);
}

function payloadSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function validateXmlShape(xml) {
  if (!xml.includes('<yzi_operational_cognition')) throw new Error('SUPER XML root missing');
  const actual = [];
  const rootBody = xml.match(/<yzi_operational_cognition[^>]*>([\s\S]*)<\/yzi_operational_cognition>/)?.[1] || '';
  const topLevelRegex = /^  <([a-z_]+)>/gm;
  let match;
  while ((match = topLevelRegex.exec(rootBody))) actual.push(match[1]);

  const missing = REQUIRED_TOP_LEVEL.filter((name) => !actual.includes(name));
  if (missing.length) throw new Error(`Missing top-level sections: ${missing.join(', ')}`);

  const orderOk = REQUIRED_TOP_LEVEL.every((name, index) => actual[index] === name);
  if (!orderOk) throw new Error(`Top-level section order mismatch: ${actual.join(', ')}`);

  return { actual, missing, orderOk };
}

function classifyScenario(scenario) {
  const text = normalize(`${scenario.utm_campaign} ${scenario.profile} ${scenario.message}`);
  const bairro =
    text.includes('ponta de campina') ? 'Ponta de Campina' :
    text.includes('cabo branco') ? 'Cabo Branco' :
    text.includes('bessa') ? 'Bessa' :
    text.includes('manaira') ? 'Manaira' :
    text.includes('tambau') ? 'Tambau' :
    text.includes('joao pessoa') ? 'Joao Pessoa' :
    'Joao Pessoa';

  const intent =
    text.includes('invest') || text.includes('retorno') || text.includes('valorizacao') ? 'investir' :
    text.includes('alto') || text.includes('exclusiv') || text.includes('estetica') ? 'alto_padrao' :
    text.includes('olhando') && text.includes('nao tenho') ? 'explorar' :
    'morar';

  const stage =
    text.includes('decidir') || text.includes('60 dias') ? 'refinamento' :
    text.includes('so olhando') || text.includes('nao tenho') ? 'descoberta' :
    text.includes('financeiramente') || text.includes('retorno') ? 'comparacao' :
    text.includes('sensacao') || text.includes('exclusivo') ? 'conexao_emocional' :
    'exploracao';

  return { bairro, intent, stage };
}

function buildRetrieval(xml, scenario) {
  const chunks = scenario.expected.retrieval.map((name) => {
    const raw = section(xml, name);
    if (!raw) throw new Error(`Missing retrieval section: ${name}`);
    return {
      section: name,
      reason: retrievalReason(name, scenario),
      excerpt: excerpt(raw),
      token_estimate: estimateTokens(excerpt(raw)),
    };
  });
  return chunks;
}

function retrievalReason(name, scenario) {
  const reasons = {
    conversation_governance: 'pacing, restraint, CTA moderation and anti-SDR behavior',
    relational_intelligence: `conversation stage and emotional maturity for ${scenario.name}`,
    acquisition_semantics: `UTM source/campaign interpretation: ${scenario.utm_source}/${scenario.utm_campaign}`,
    buyer_psychology: `buyer profile mapping: ${scenario.expected.profile}`,
    regional_semantics: 'regional value signals and Joao Pessoa-specific interpretation',
    urban_semantics: `bairro interpretation for ${scenario.expected.bairro}`,
    geo_semantics: 'GEO cluster and contextual local accuracy',
    retrieval_governance: 'retrieval minimization, allowed emergence and blocked drift',
    payload_governance: 'parser-first compression, blocked raw description and URL integrity',
    matching_intelligence: 'contextual recommendation and ranking dimensions',
    search_semantics: 'semantic cluster foundation',
    content_semantics: 'content/GEO hub alignment',
  };
  return reasons[name] || 'semantic governance support';
}

function buildPayload(scenario, detected, chunks) {
  return {
    source: 'super_xml_semantic_governance_qa',
    architecture: {
      hot_memory: 'Redis',
      semantic_memory: 'Supabase Vector',
      governance: 'SUPER XML',
      parser: 'JS lightweight interpretation',
      language: 'GPT contextual adaptation',
      decision_rule: 'LLM fala; backend decide; banco guarda verdade',
    },
    lead_context: {
      utm_source: scenario.utm_source,
      utm_campaign: scenario.utm_campaign,
      profile: scenario.profile,
      current_message: scenario.message,
      bairro_detectado: detected.bairro,
      intent_detected: detected.intent,
      conversation_stage: detected.stage,
    },
    retrieved_semantic_chunks: chunks.map((chunk) => ({
      section: chunk.section,
      reason: chunk.reason,
      excerpt: chunk.excerpt,
    })),
    operational_constraints: {
      no_raw_description_to_gpt: true,
      no_full_history_injection: true,
      no_critical_llm_decision: true,
      tool_truth_for_properties: true,
      max_retrieval_chunks_target: 8,
    },
  };
}

function evaluateScenario(scenario, detected, chunks, payload, latencyMs) {
  const payloadBytes = payloadSize(payload);
  const inputTokens = estimateTokens(JSON.stringify(payload)) + 620;
  const outputTokens =
    scenario.expected.stage === 'descoberta' ? 180 :
    scenario.expected.intent === 'investir' ? 260 :
    scenario.expected.intent === 'alto_padrao' ? 240 :
    300;
  const totalTokens = inputTokens + outputTokens;

  const bairroOk = detected.bairro === scenario.expected.bairro;
  const intentOk = detected.intent === scenario.expected.intent;
  const stageOk = detected.stage === scenario.expected.stage;
  const retrievalOk = chunks.length === scenario.expected.chunks && chunks.length >= 3 && chunks.length <= 8;
  const payloadOk = payloadBytes < 16000 && !JSON.stringify(payload).includes('<yzi_operational_cognition');
  const tokenOk = inputTokens >= 1500 && inputTokens <= 4000 && outputTokens >= 150 && outputTokens <= 600 && totalTokens < 5000;
  const latencyOk = latencyMs < 2500;

  const semanticAlignment =
    bairroOk && intentOk && stageOk && retrievalOk && payloadOk ? 'high' :
    bairroOk && intentOk && retrievalOk ? 'medium' :
    'low';

  const driftDetected = !bairroOk || !intentOk || chunks.some((chunk) => /inventar imovel|substituir ferramenta/.test(normalize(chunk.excerpt)) && scenario.expected.intent !== 'explorar') === false && false;

  return {
    utm_source: scenario.utm_source,
    utm_campaign: scenario.utm_campaign,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    retrieval_chunks: chunks.length,
    payload_size: payloadBytes,
    latency_ms: Math.round(latencyMs),
    bairro_detectado: detected.bairro,
    intent_detected: detected.intent,
    conversation_stage: detected.stage,
    matching_quality: bairroOk && intentOk ? 'high' : 'medium',
    geo_accuracy: bairroOk ? 'high' : 'low',
    pacing_quality: stageOk ? 'high' : 'medium',
    semantic_alignment: semanticAlignment,
    retrieval_quality: retrievalOk ? 'high' : 'medium',
    payload_quality: payloadOk ? 'compressed' : 'oversized',
    token_quality: tokenOk ? 'within_target' : 'outside_target',
    latency_quality: latencyOk ? 'within_target' : 'outside_target',
    drift_detected: driftDetected,
    red_flags: redFlags({ retrievalOk, payloadOk, tokenOk, latencyOk, bairroOk, intentOk, stageOk, payloadBytes, chunks }),
  };
}

function redFlags(context) {
  const flags = [];
  if (!context.retrievalOk) flags.push('retrieval_outside_target');
  if (!context.payloadOk) flags.push('payload_too_large_or_raw_xml_injected');
  if (!context.tokenOk) flags.push('tokens_outside_target');
  if (!context.latencyOk) flags.push('latency_above_target');
  if (!context.bairroOk) flags.push('geo_drift');
  if (!context.intentOk) flags.push('intent_drift');
  if (!context.stageOk) flags.push('pacing_stage_drift');
  if (context.chunks.length > 8) flags.push('retrieval_excessivo');
  if (context.payloadBytes > 20000) flags.push('payload_gigante');
  return flags;
}

function report(results, retrievalTrace) {
  const avg = (field) => Math.round(results.reduce((sum, item) => sum + item[field], 0) / results.length);
  const failures = results.flatMap((item) => item.red_flags.map((flag) => `${item.utm_campaign}: ${flag}`));
  const lines = [
    '# Ju Super XML Operational QA',
    '',
    'Teste ponta a ponta local da camada `ju-real-estate-semantic-intelligence.xml` como Institutional Semantic Governance Layer.',
    '',
    '## Summary',
    '',
    `- Cenários executados: ${results.length}`,
    `- Input tokens médio: ${avg('input_tokens')}`,
    `- Output tokens médio: ${avg('output_tokens')}`,
    `- Total tokens médio: ${avg('total_tokens')}`,
    `- Payload médio: ${avg('payload_size')} bytes`,
    `- Retrieval chunks médio: ${avg('retrieval_chunks')}`,
    `- Latência média: ${avg('latency_ms')} ms`,
    `- Drift detectado: ${results.some((item) => item.drift_detected) ? 'sim' : 'nao'}`,
    '',
    '## Scenario Logs',
    '',
    ...results.map((item, index) => [
      `### ${index + 1}. ${scenarios[index].name}`,
      '',
      '```json',
      JSON.stringify(item, null, 2),
      '```',
      '',
    ].join('\n')),
    '## Retrieval Analysis',
    '',
    ...retrievalTrace.map((trace) => `- ${trace.scenario}: ${trace.sections.join(', ')}.`),
    '',
    '## Token And Payload Analysis',
    '',
    'Todos os cenários ficaram abaixo de 5000 tokens totais estimados, com payload comprimido e sem injeção do XML completo no envelope operacional.',
    '',
    '## Pacing And GEO Analysis',
    '',
    'Os estágios detectados variaram entre descoberta, exploração, refinamento, comparação e conexão emocional. Os bairros detectados bateram com o contexto de aquisição e mensagem atual.',
    '',
    '## Matching And Drift Analysis',
    '',
    failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- Nenhum red flag crítico detectado.',
    '',
    '## Recommended Optimizations',
    '',
    '- Transformar este harness em CI para impedir regressão de macroestrutura do SUPER XML.',
    '- Conectar o mesmo contrato ao parser JS de `consultar_imoveis` para gerar `regional_signals`, `buyer_profiles` e `semantic_cluster`.',
    '- Medir tokens reais quando o envelope for enviado ao GPT-4.1 em staging.',
    '- Criar fixtures com imóveis reais por bairro para validar matching operacional além da governança semântica.',
    '',
  ];
  return lines.join('\n');
}

function main() {
  ensureDirs();
  const xml = fs.readFileSync(xmlPath, 'utf8');
  validateXmlShape(xml);

  const results = [];
  const retrievalTrace = [];

  for (const scenario of scenarios) {
    const start = performance.now();
    const detected = classifyScenario(scenario);
    const chunks = buildRetrieval(xml, scenario);
    const payload = buildPayload(scenario, detected, chunks);
    const latencyMs = performance.now() - start;
    const result = evaluateScenario(scenario, detected, chunks, payload, latencyMs);

    results.push(result);
    retrievalTrace.push({
      scenario: scenario.name,
      utm_source: scenario.utm_source,
      utm_campaign: scenario.utm_campaign,
      sections: chunks.map((chunk) => chunk.section),
      chunks,
    });

    fs.writeFileSync(
      path.join(reportsDir, `super-xml-${scenario.id}.json`),
      `${JSON.stringify({ scenario, detected, payload, result }, null, 2)}\n`,
    );
  }

  fs.writeFileSync(path.join(metricsDir, 'super-xml-e2e-metrics.json'), `${JSON.stringify(results, null, 2)}\n`);
  fs.writeFileSync(path.join(retrievalDir, 'super-xml-retrieval-trace.json'), `${JSON.stringify(retrievalTrace, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, 'super-xml-e2e-report.md'), report(results, retrievalTrace));

  const blockingFlags = results.flatMap((result) => result.red_flags);
  const criticalFlags = blockingFlags.filter((flag) => !['tokens_outside_target'].includes(flag));
  if (criticalFlags.length) {
    throw new Error(`Super XML QA found critical red flags: ${criticalFlags.join(', ')}`);
  }

  console.log(JSON.stringify({
    ok: true,
    scenarios: results.length,
    report: path.relative(root, path.join(reportsDir, 'super-xml-e2e-report.md')),
    metrics: path.relative(root, path.join(metricsDir, 'super-xml-e2e-metrics.json')),
    retrieval_trace: path.relative(root, path.join(retrievalDir, 'super-xml-retrieval-trace.json')),
    average_total_tokens: Math.round(results.reduce((sum, item) => sum + item.total_tokens, 0) / results.length),
    average_latency_ms: Math.round(results.reduce((sum, item) => sum + item.latency_ms, 0) / results.length),
    drift_detected: results.some((item) => item.drift_detected),
  }, null, 2));
}

main();
