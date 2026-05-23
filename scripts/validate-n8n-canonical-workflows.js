const fs = require('fs');
const path = require('path');

const root = process.cwd();
const n8nRoot = path.join(root, 'n8n');
const productionDir = path.join(n8nRoot, 'production');

const requiredProductionFiles = [
  'workflow-jurema-main.final-hardened.json',
  'workflow-jurema-consultar-imoveis.final-hardened.json',
  'workflow-jurema-enviar-contrato.final-hardened.json',
];

function readWorkflow(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rootJsonFiles = fs
  .readdirSync(n8nRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => entry.name);

assert(rootJsonFiles.length === 0, `n8n root contains non-canonical JSON files: ${rootJsonFiles.join(', ')}`);

for (const file of requiredProductionFiles) {
  const full = path.join(productionDir, file);
  assert(fs.existsSync(full), `missing production workflow: ${file}`);
  readWorkflow(full);
}

const main = readWorkflow(path.join(productionDir, 'workflow-jurema-main.final-hardened.json'));
const mainText = JSON.stringify(main);
const mainConnections = main.connections || {};
const consultar = readWorkflow(path.join(productionDir, 'workflow-jurema-consultar-imoveis.final-hardened.json'));
const consultarText = JSON.stringify(consultar);

const requiredMainSignals = [
  'lightweight_hotpath',
  'TOOL REVALIDATION',
  'consultar_imoveis',
  'url_truth: consultar_imoveis',
  'never_reconstruct_property_url',
  'Presentation Governance',
  'Presentation Governance v2 - Native Preview Safe',
  'Conversational Style Governance',
];

for (const signal of requiredMainSignals) {
  assert(mainText.includes(signal), `main workflow missing canonical signal: ${signal}`);
}

assert(!/agno/i.test(mainText), 'main workflow contains Agno reference in hot-path export');
assert(!mainText.includes('/api/runtime/ju/state'), 'main workflow still calls Runtime Gateway in hot-path');
assert(!mainText.includes('x-runtime-key'), 'main workflow still sends Runtime Gateway key in hot-path');
assert(!main.nodes.some((node) => node.name === 'Runtime State Engine'), 'main workflow still contains Runtime State Engine node');

for (const [from, connection] of Object.entries(mainConnections)) {
  const connectionText = JSON.stringify(connection);
  assert(
    !connectionText.includes('"type":"ai_memory"') || !connectionText.includes('"node":"Atendente1"'),
    `main workflow has legacy ai_memory connected to Atendente1 from ${from}`,
  );
}

const agent = (main.nodes || []).find((node) => node.name === 'Atendente1');
const systemMessage = String(agent?.parameters?.options?.systemMessage || '');
assert(!systemMessage.includes('# SYSTEM PROMPT'), 'Atendente1 still contains monolithic legacy system prompt');
assert(systemMessage.length < 2500, `Atendente1 system prompt is too large: ${systemMessage.length}`);
assert(systemMessage.includes('LIGHTWEIGHT OPERATING CONTRACT'), 'Atendente1 missing lightweight operating contract');
assert(systemMessage.includes('TOOL REVALIDATION'), 'Atendente1 missing tool revalidation policy');
assert(systemMessage.includes('URL pura isolada'), 'Atendente1 missing isolated property URL presentation policy');
assert(!systemMessage.includes('mantenha a URL do imovel em linha propria'), 'Atendente1 still instructs raw URL repetition after cards');
assert(!mainText.includes('app.yzihub.com'), 'main workflow still falls back to app.yzihub.com');
assert(!mainText.includes('NEXT_PUBLIC_APP_URL'), 'main workflow still falls back to cockpit/frontend URL');

const legacyPresentationNode = (main.nodes || []).find((node) => node.name === 'Presentation Governance');
assert(legacyPresentationNode, 'main workflow must keep legacy Presentation Governance node for rollback');
const presentationNode = (main.nodes || []).find((node) => node.name === 'Presentation Governance v2 - Native Preview Safe');
const presentationCode = String(presentationNode?.parameters?.jsCode || '');
assert(presentationNode, 'main workflow missing Presentation Governance v2 - Native Preview Safe node');
assert(
  presentationCode.includes('native_preview_safe_v2'),
  'Presentation Governance v2 missing native preview safe policy',
);
assert(
  presentationCode.includes('stripLegacyPropertyDump') && presentationCode.includes('preserveContextAndUrl'),
  'Presentation Governance v2 missing sanitizer/context-url preservation functions',
);
assert(
  presentationCode.includes('validPropertyUrl') && !presentationCode.includes('cardUrls') && !presentationCode.includes('cards.length'),
  'Presentation Governance v2 must validate URLs without parsing/replacing Ju output from cards',
);
assert(
  !presentationCode.includes('renderCards') && !presentationCode.includes('abstractNativePreviewGuidance'),
  'Presentation Governance v2 must not create post-card copy',
);
assert(
  !presentationCode.includes('guidanceReason') &&
    !presentationCode.includes('beach_score') &&
    !presentationCode.includes('lifestyle e potencial de valorizacao'),
  'Presentation Governance still derives post-card copy from property descriptors',
);
assert(
  !presentationCode.includes('withoutInvalidUrls.push(url)'),
  'Presentation Governance still appends raw property URLs after cards',
);
assert(
  !presentationCode.includes("'Separei esta opcao pra voce: ' + title"),
  'Presentation Governance still repeats property title after cards',
);
assert(
  !presentationCode.includes('card.description || card.preview?.description'),
  'Presentation Governance still repeats card descriptions after cards',
);
assert(!presentationCode.includes('whatsapp_text'), 'Presentation Governance still references legacy whatsapp_text');
assert(!presentationCode.includes('caption'), 'Presentation Governance still references legacy card caption');
assert(!presentationCode.includes('card.title'), 'Presentation Governance still serializes card title');
assert(!presentationCode.includes('card.description'), 'Presentation Governance still serializes card description');
assert(!presentationCode.includes('card.bairro'), 'Presentation Governance still serializes card bairro');
assert(
  JSON.stringify(main.connections?.Atendente1 || {}).includes('Presentation Governance v2 - Native Preview Safe') &&
    JSON.stringify(main.connections?.['Presentation Governance v2 - Native Preview Safe'] || {}).includes('Conversational Style Governance'),
  'main workflow must route Atendente1 -> Presentation Governance v2 - Native Preview Safe -> Conversational Style Governance',
);

const arrayRespostaNode = (main.nodes || []).find((node) => node.name === 'ArrayResposta');
const arrayRespostaExpression = String(arrayRespostaNode?.parameters?.assignments?.assignments?.[0]?.value || '');
assert(
    arrayRespostaExpression.includes('function isUrl') &&
    arrayRespostaExpression.includes('startsNewPropertyContext') &&
    arrayRespostaExpression.includes('hasUrl') &&
    arrayRespostaExpression.includes('blocks.push') &&
    arrayRespostaExpression.includes('current.join') &&
    arrayRespostaExpression.includes('if (!output) return []') &&
    !arrayRespostaExpression.includes('.split("\\\\n\\\\n")'),
  'ArrayResposta must preserve text+URL semantic blocks instead of splitting blindly on blank lines',
);

for (const node of main.nodes || []) {
  if (node.credentials?.openAiApi) {
    assert(
      node.credentials.openAiApi.id === 'W7viCvKb9IkuKdvf' && node.credentials.openAiApi.name === 'OpenAi JUREMA',
      `${node.name} must use OpenAi JUREMA credentials`,
    );
  }
}

const normalizeAudioNode = (main.nodes || []).find((node) => node.name === 'Normalize Audio Payload');
const normalizeAudioCode = String(normalizeAudioNode?.parameters?.jsCode || '');
assert(
  normalizeAudioCode.includes('evolution_audio_converter_process_audio_v1'),
  'audio pipeline missing Evolution Audio Converter normalization policy',
);
assert(
  normalizeAudioCode.includes('/chat/getBase64FromMediaMessage/') && normalizeAudioCode.includes('/process-audio'),
  'audio pipeline must decrypt via Evolution API and convert through /process-audio',
);
assert(
  normalizeAudioCode.includes('isOggBase64') && normalizeAudioCode.includes('direct_decrypted_ogg'),
  'audio pipeline must accept decrypted WhatsApp OGG directly when converter service is unavailable',
);
assert(
  normalizeAudioCode.includes('audio: converted.base64') && normalizeAudioCode.includes('data: converted.base64'),
  'audio pipeline must map converter audio response into json.audio and json.data before Convert to File',
);
assert(
  normalizeAudioCode.includes('body.apikey') && normalizeAudioCode.includes('$vars.EVOLUTION_API_KEY'),
  'audio pipeline must fall back to existing Evolution API key when converter-specific key is not configured',
);
assert(!normalizeAudioCode.includes('requestBinary'), 'audio pipeline still downloads encrypted .enc directly');
assert(!normalizeAudioCode.includes("downloaded.buffer.toString('base64')"), 'audio pipeline still forwards raw downloaded media to OpenAI');

const convertAudioNode = (main.nodes || []).find((node) => node.name === 'Convert to audio1');
const audioMediaValidNode = (main.nodes || []).find((node) => node.name === 'Audio Media Valid?');
assert(
  JSON.stringify(audioMediaValidNode?.parameters?.conditions || {}).includes('$json.audioValid === true && !!$json.data'),
  'Audio Media Valid? must require strict true audioValid and non-empty data before Convert to File',
);
assert(convertAudioNode?.parameters?.binaryPropertyName === 'data', 'Convert to audio1 must emit binary.data');
assert(convertAudioNode?.parameters?.options?.fileName === 'audio.ogg', 'Convert to audio1 must name output audio.ogg');
assert(convertAudioNode?.parameters?.options?.mimeType === 'audio/ogg', 'Convert to audio1 must emit audio/ogg');

const transcribeNode = (main.nodes || []).find((node) => node.name === 'OpenAI1');
assert(transcribeNode?.parameters?.binaryPropertyName === 'data', 'OpenAI1 must transcribe binary.data');
assert(transcribeNode?.parameters?.inputDataFieldName === 'data', 'OpenAI1 inputDataFieldName must be data');

const persistAudioTranscriptNode = (main.nodes || []).find((node) => node.name === 'Persist Audio Transcript');
const persistAudioTranscriptCode = String(persistAudioTranscriptNode?.parameters?.jsCode || '');
assert(persistAudioTranscriptNode, 'audio pipeline missing Persist Audio Transcript node');
assert(
  persistAudioTranscriptCode.includes('audio_as_normal_inbound_message_v1'),
  'audio pipeline missing audio-as-normal-message operational policy',
);
assert(
  persistAudioTranscriptCode.includes('/rest/v1/conversation_messages') &&
    persistAudioTranscriptCode.includes("content: transcript") &&
    persistAudioTranscriptCode.includes('mensagemCliente: inboundText') &&
    persistAudioTranscriptCode.includes('fallbackAudioText'),
  'audio pipeline must persist transcript and inject it as mensagemCliente',
);
assert(
  JSON.stringify(main.connections?.OpenAI1 || {}).includes('Persist Audio Transcript') &&
    JSON.stringify(main.connections?.['Persist Audio Transcript'] || {}).includes('Audio Memory1'),
  'audio pipeline must route OpenAI1 -> Persist Audio Transcript -> Audio Memory1',
);
const buildContextAudioCode = String((main.nodes || []).find((node) => node.name === 'Build Context1')?.parameters?.jsCode || '');
assert(
  buildContextAudioCode.includes('shouldRebuildContextForAudio') &&
    buildContextAudioCode.includes('shouldRebuildContextForAudio ? compactContext()'),
  'Build Context1 must rebuild context after audio transcript normalization instead of reusing stale [audio] context',
);

const mainPersistenceNode = (main.nodes || []).find((node) => node.name === 'Code in JavaScript');
const mainPersistenceCode = String(mainPersistenceNode?.parameters?.jsCode || '');
const requiredPersistenceSignals = [
  'buildOperationalDealMetadata',
  'buildOperationalDealPatch',
  'last_extracted',
  'profile_complete',
  'last_state_sync_at',
  'lead_source_context',
  '/rest/v1/jurema_deals',
];

for (const signal of requiredPersistenceSignals) {
  assert(
    mainPersistenceCode.includes(signal),
    `main workflow missing operational state persistence signal: ${signal}`,
  );
}

assert(
  mainPersistenceCode.includes('...buildOperationalDealPatch({'),
  'main workflow creates jurema_deals without operational state patch',
);
assert(
  mainPersistenceCode.includes('const operationalDealPatch = buildOperationalDealPatch'),
  'main workflow does not merge operational metadata into existing jurema_deals',
);

const consultarNode = (consultar.nodes || []).find((node) => node.name === 'Consultar Imoveis Supabase');
const consultarCode = String(consultarNode?.parameters?.jsCode || '');
assert(consultarCode.includes('operational_features'), 'consultar_imoveis missing operational feature enrichment');
assert(consultarCode.includes('operational_summary'), 'consultar_imoveis missing operational summary output');
assert(consultarCode.includes('ju_minimal_operational_cards_v1'), 'consultar_imoveis missing minimal payload policy');
assert(consultarCode.includes('visual_card_primary_no_text_dump_v1'), 'consultar_imoveis missing visual card no-text-dump policy');
assert(consultarCode.includes('ranked.slice(0, 3)'), 'consultar_imoveis must return only top 3 ranked cards');
assert(!consultarCode.includes('descricao_imovel:'), 'consultar_imoveis exposes raw descricao_imovel in output');
assert(!consultarCode.includes('function whatsappText'), 'consultar_imoveis still builds legacy whatsapp_text/caption formatter');
assert(!consultarCode.includes('caption: whatsappText'), 'consultar_imoveis still emits legacy caption dump');
assert(!consultarCode.includes('whatsapp_text: whatsappText'), 'consultar_imoveis still emits legacy whatsapp_text dump');
assert(!consultarCode.includes('Separei esta opcao pra voce'), 'consultar_imoveis still embeds legacy post-card message template');

const consultarSupabase = (consultar.nodes || []).find((node) => node.name === 'Get many rows');
const consultarFilters = consultarSupabase?.parameters?.filters?.conditions || [];
assert(
  consultarFilters.length === 1 && consultarFilters[0]?.keyName === 'tenant_id',
  'consultar_imoveis Supabase candidate fetch should only hard-filter tenant_id before JS ranking',
);

const mainWarnings = {
  redis: /Redis/i.test(mainText),
  airtable: /Airtable/i.test(mainText),
  pam: /PAM|Caf/i.test(mainText),
  vectorStore: /vectorStore|Vector/i.test(mainText),
};

console.log(JSON.stringify({
  ok: true,
  production_files: requiredProductionFiles,
  main_workflow: {
    name: main.name,
    id: main.id ?? main.workflowId ?? null,
    nodes: Array.isArray(main.nodes) ? main.nodes.length : 0,
    lightweight_hotpath: true,
    runtime_gateway_hotpath: false,
  },
  consultar_imoveis: {
    name: consultar.name,
    id: consultar.id ?? consultar.workflowId ?? null,
    nodes: Array.isArray(consultar.nodes) ? consultar.nodes.length : 0,
    payload_policy: 'ju_minimal_operational_cards_v1',
    top_ranked_cards: 3,
  },
  warnings: mainWarnings,
}, null, 2));
