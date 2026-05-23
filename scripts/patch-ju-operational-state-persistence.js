const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, 'n8n/production/workflow-jurema-main.final-hardened.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function node(workflow, name) {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error(`Node not found: ${name}`);
  return found;
}

const workflow = readJson(workflowPath);
const codeNode = node(workflow, 'Code in JavaScript');
let code = codeNode.parameters.jsCode;

const helperAnchor = `function validHttpUrl(value) {`;
const helpers = `function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}

function normalizeForInference(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase();
}

function parseOperationalMoney(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compact = raw
    .replace(/r\\$/gi, '')
    .replace(/\\s/g, '')
    .replace(/\\./g, '')
    .replace(',', '.');
  const number = Number(compact);
  if (!Number.isFinite(number)) return null;
  if (/\\b(milhao|milhoes|mi)\\b/i.test(raw)) return Math.round(number * 1000000);
  if (/\\b(k|mil)\\b/i.test(raw) && number < 10000) return Math.round(number * 1000);
  return Math.round(number);
}

function inferOperationalExtraction({ lead, deal, mensagem, origemLead }) {
  const meta = mergeMetadata(lead?.metadata, deal?.metadata);
  const text = normalizeForInference([
    mensagem,
    meta.primeira_mensagem,
    meta.bairro_interesse,
    meta.tipo_imovel,
    meta.finalidade,
    meta.objetivo,
    deal?.location_preference,
    deal?.property_type,
    deal?.intent,
    deal?.purpose,
    origemLead,
  ].filter(Boolean).join(' '));

  const neighborhoods = [
    ['ponta de campina', 'Ponta de Campina'],
    ['jardim oceania', 'Jardim Oceania'],
    ['cabo branco', 'Cabo Branco'],
    ['intermares', 'Intermares'],
    ['manaira', 'Manaira'],
    ['tambau', 'Tambau'],
    ['bessa', 'Bessa'],
    ['camboinha', 'Camboinha'],
    ['altiplano', 'Altiplano'],
    ['aeroclube', 'Aeroclube'],
  ];

  const location = firstNonEmpty(
    deal?.location_preference,
    meta.bairro_interesse,
    meta.bairro,
    neighborhoods.find(([needle]) => text.includes(needle))?.[1],
  );

  const propertyType = firstNonEmpty(
    deal?.property_type,
    meta.tipo_imovel,
    text.includes('cobertura') ? 'cobertura' : null,
    text.includes('apartamento') || text.includes('apto') ? 'apartamento' : null,
    text.includes('casa') ? 'casa' : null,
    text.includes('flat') || text.includes('studio') ? 'flat' : null,
    text.includes('terreno') ? 'terreno' : null,
  );

  const intent = firstNonEmpty(
    deal?.intent,
    meta.objetivo,
    text.includes('invest') || text.includes('rentabilidade') || text.includes('valorizacao') ? 'investir' : null,
    text.includes('alugar') || text.includes('locacao') ? 'alugar' : null,
    text.includes('comprar') || text.includes('morar') ? 'comprar' : null,
  );

  const bedroomsMatch = text.match(/\\b([1-6])\\s*(?:quartos?|qts?|dormitorios?|dorms?)\\b/);
  const budgetMatch =
    text.match(/(?:ate|maximo|max|teto|orcamento(?: de)?|valor(?: de)?|faixa(?: de)?)\\s*(?:r\\$)?\\s*([0-9]+(?:[.,][0-9]+)?\\s*(?:milhao|milhoes|mi|mil|k)?)/) ||
    text.match(/(?:r\\$)\\s*([0-9]+(?:[.,][0-9]+)?\\s*(?:milhao|milhoes|mi|mil|k)?)/);
  const timelineMatch = text.match(/\\b(?:ate\\s*)?([0-9]{1,2})\\s*(dias|meses|mes)\\b/);

  return {
    intent,
    bedrooms: firstNonEmpty(deal?.bedrooms, meta.quartos, bedroomsMatch?.[1]),
    location,
    timeline: firstNonEmpty(deal?.timeline, meta.timeline, meta.prazo, timelineMatch ? timelineMatch[0] : null),
    budget_max: deal?.budget_max ?? parseOperationalMoney(meta.faixa_valor ?? meta.valor_max ?? budgetMatch?.[1]),
    motivation: firstNonEmpty(
      deal?.motivation,
      meta.motivation,
      text.includes('familia') || text.includes('filho') || text.includes('escola') ? 'familia_rotina' : null,
      text.includes('praia') || text.includes('mar') ? 'lifestyle_praia' : null,
      text.includes('invest') || text.includes('retorno') ? 'investimento' : null,
    ),
    property_type: propertyType,
    decision_maker: firstNonEmpty(
      deal?.decision_maker,
      meta.decision_maker,
      text.includes('casal') || text.includes('esposa') || text.includes('marido') ? 'casal' : null,
      text.includes('familia') ? 'familia' : null,
    ),
    payment_method: firstNonEmpty(
      deal?.payment_method,
      meta.payment_method,
      meta.pagamento,
      text.includes('financiamento') ? 'financiamento' : null,
      text.includes('fgts') ? 'fgts' : null,
      text.includes('a vista') || text.includes('à vista') ? 'a_vista' : null,
    ),
  };
}

function mergeExtractedState(existing, inferred) {
  const base = isPlainObject(existing) ? existing : {};
  const merged = { ...base };
  for (const [key, value] of Object.entries(inferred || {})) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      merged[key] = value;
    } else if (!(key in merged)) {
      merged[key] = null;
    }
  }
  return merged;
}

function buildOperationalDealMetadata({ lead, deal, mensagem, origemLead, now }) {
  const current = isPlainObject(deal?.metadata) ? deal.metadata : {};
  const lastExtracted = mergeExtractedState(
    current.last_extracted,
    inferOperationalExtraction({ lead, deal, mensagem, origemLead }),
  );
  const missingFields = ['intent', 'location', 'budget_max', 'timeline', 'property_type']
    .filter((key) => !firstNonEmpty(lastExtracted[key]));

  return mergeMetadata(current, {
    entrypoint: firstNonEmpty(current.entrypoint, 'evolution'),
    lead_source_context: firstNonEmpty(current.lead_source_context, normalizeForInference(origemLead).includes('whatsapp') ? 'whatsapp' : origemLead, 'whatsapp'),
    last_extracted: lastExtracted,
    missing_fields: missingFields,
    profile_complete: missingFields.length === 0,
    last_state_sync_at: now,
  });
}

function buildOperationalDealPatch({ lead, deal, mensagem, origemLead, telefone, nome, now }) {
  const metadata = buildOperationalDealMetadata({ lead, deal, mensagem, origemLead, now });
  const extracted = metadata.last_extracted || {};
  const patch = {
    client_name: deal?.client_name || lead?.name || nome || null,
    client_phone: deal?.client_phone || telefone || null,
    metadata,
    updated_at: now,
  };

  if (!deal?.intent && firstNonEmpty(extracted.intent)) patch.intent = extracted.intent;
  if (!deal?.location_preference && firstNonEmpty(extracted.location)) patch.location_preference = extracted.location;
  if (!deal?.budget_max && extracted.budget_max) patch.budget_max = extracted.budget_max;
  if (!deal?.bedrooms && firstNonEmpty(extracted.bedrooms)) patch.bedrooms = String(extracted.bedrooms);
  if (!deal?.property_type && firstNonEmpty(extracted.property_type)) patch.property_type = extracted.property_type;
  if (!deal?.timeline && firstNonEmpty(extracted.timeline)) patch.timeline = extracted.timeline;
  if (!deal?.payment_method && firstNonEmpty(extracted.payment_method)) patch.payment_method = extracted.payment_method;
  if (!deal?.motivation && firstNonEmpty(extracted.motivation)) patch.motivation = extracted.motivation;
  if (!deal?.decision_maker && firstNonEmpty(extracted.decision_maker)) patch.decision_maker = extracted.decision_maker;
  if (!deal?.qualification_status) patch.qualification_status = metadata.profile_complete ? 'morno' : 'incompleto';
  if (!deal?.deal_stage) patch.deal_stage = 'qualificacao';

  Object.keys(patch).forEach((key) => {
    if (patch[key] === null || patch[key] === undefined || patch[key] === '') delete patch[key];
  });

  return patch;
}

`;

if (!code.includes('function buildOperationalDealMetadata(')) {
  code = code.replace(helperAnchor, `${helpers}${helperAnchor}`);
}

code = code.replace(
  `  if (!deal) {
    deal = await getFirst.call(this, {
      baseUrl,
      apiKey,
      method: 'POST',
      path: '/rest/v1/jurema_deals',
      body: {
        tenant_id: tenantId,
        lead_id: lead.id,
        client_name: lead.name || nome,
        client_phone: telefone,
        deal_stage: 'qualificacao',
        qualification_status: 'incompleto',
      },
      prefer: 'return=representation',
    });
  }

  // 3) Conversation: buscar/criar por tenant_id + phone_normalized.`,
  `  if (!deal) {
    const nowForDealCreate = new Date().toISOString();
    const createDealBody = {
      tenant_id: tenantId,
      lead_id: lead.id,
      ...buildOperationalDealPatch({
        lead,
        deal: {},
        mensagem,
        origemLead,
        telefone,
        nome,
        now: nowForDealCreate,
      }),
    };

    deal = await getFirst.call(this, {
      baseUrl,
      apiKey,
      method: 'POST',
      path: '/rest/v1/jurema_deals',
      body: createDealBody,
      prefer: 'return=representation',
    });
  } else {
    const nowForDealSync = new Date().toISOString();
    const operationalDealPatch = buildOperationalDealPatch({
      lead,
      deal,
      mensagem,
      origemLead,
      telefone,
      nome,
      now: nowForDealSync,
    });

    const updatedDeal = await getFirst.call(this, {
      baseUrl,
      apiKey,
      method: 'PATCH',
      path: '/rest/v1/jurema_deals',
      qs: { id: \`eq.\${deal.id}\` },
      body: operationalDealPatch,
      prefer: 'return=representation',
    });
    if (updatedDeal) deal = updatedDeal;
  }

  // 3) Conversation: buscar/criar por tenant_id + phone_normalized.`
);

if (!code.includes('...buildOperationalDealPatch({')) {
  throw new Error('Failed to patch jurema_deals operational metadata create path');
}

if (!code.includes('const operationalDealPatch = buildOperationalDealPatch')) {
  throw new Error('Failed to patch jurema_deals operational metadata update path');
}

codeNode.parameters.jsCode = code;
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

console.log(`Patched ${path.relative(root, workflowPath)} with operational state persistence`);
