const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('.planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-original.json', 'utf8'));

const fixed = JSON.parse(JSON.stringify(wf)); // deep clone

// --- 1. Fix: Search records1 (Airtable search → httpRequest GET Supabase leads) ---
const searchNode = fixed.nodes.find(n => n.name === 'Search records1');
searchNode.type = 'n8n-nodes-base.httpRequest';
searchNode.typeVersion = 4.2;
searchNode.parameters = {
  method: 'GET',
  url: "={{ $vars.SUPABASE_URL + '/rest/v1/leads' }}",
  authentication: 'none',
  sendHeaders: true,
  headerParameters: {
    parameters: [
      { name: 'apikey', value: '={{ $vars.SUPABASE_ANON_KEY }}' },
      { name: 'Authorization', value: "={{ 'Bearer ' + $vars.SUPABASE_ANON_KEY }}" },
      { name: 'Content-Type', value: 'application/json' }
    ]
  },
  sendQuery: true,
  queryParameters: {
    parameters: [
      { name: 'select', value: 'id,tenant_id,phone,name,status,score,metadata' },
      { name: 'tenant_id', value: 'eq.aaaaaaaa-0002-0002-0002-000000000002' },
      { name: 'phone', value: "={{ 'eq.' + $('Normaliza Webhook').item.json.telefoneCompleto }}" }
    ]
  },
  options: {}
};
console.log('✓ Search records1: Airtable → httpRequest GET Supabase leads');

// --- 2. Fix: If1 (check $json.id exists → check array notEmpty) ---
const if1Node = fixed.nodes.find(n => n.name === 'If1');
if1Node.parameters = {
  conditions: {
    options: {
      caseSensitive: true,
      leftValue: '',
      typeValidation: 'strict',
      version: 2
    },
    conditions: [
      {
        id: '4a6d9aac-8565-4c58-abe3-8741393a5535',
        leftValue: '={{ Array.isArray($json) ? $json : [] }}',
        rightValue: '',
        operator: {
          type: 'array',
          operation: 'notEmpty',
          singleValue: true
        }
      }
    ],
    combinator: 'and'
  },
  options: {}
};
console.log('✓ If1: $json.id exists → array notEmpty (lead found check)');

// --- 3. Fix: Get a record1 (Airtable GET by ID → Code passthrough search result) ---
const getRecordNode = fixed.nodes.find(n => n.name === 'Get a record1');
getRecordNode.type = 'n8n-nodes-base.code';
getRecordNode.typeVersion = 2;
getRecordNode.parameters = {
  jsCode: [
    "// Lead já foi buscado por phone+tenant_id no node anterior (Search records1)",
    "// Extrair o primeiro resultado do array retornado pelo GET Supabase",
    "const lead = Array.isArray($('Search records1').item.json)",
    "  ? $('Search records1').item.json[0]",
    "  : $('Search records1').item.json;",
    "return [{ json: lead }];"
  ].join('\n')
};
console.log('✓ Get a record1: Airtable GET by ID → Code passthrough $json[0]');

// --- 4. Fix: Create a record1 (Airtable create → httpRequest UPSERT Supabase leads) ---
const createRecordNode = fixed.nodes.find(n => n.name === 'Create a record1');
createRecordNode.type = 'n8n-nodes-base.httpRequest';
createRecordNode.typeVersion = 4.2;
createRecordNode.parameters = {
  method: 'POST',
  url: "={{ $vars.SUPABASE_URL + '/rest/v1/leads?on_conflict=tenant_id,phone' }}",
  authentication: 'none',
  sendHeaders: true,
  headerParameters: {
    parameters: [
      { name: 'apikey', value: '={{ $vars.SUPABASE_ANON_KEY }}' },
      { name: 'Authorization', value: "={{ 'Bearer ' + $vars.SUPABASE_ANON_KEY }}" },
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Prefer', value: 'resolution=merge-duplicates,return=representation' }
    ]
  },
  sendBody: true,
  contentType: 'json',
  body: "={{ JSON.stringify({ tenant_id: 'aaaaaaaa-0002-0002-0002-000000000002', phone: $('Normaliza Webhook').item.json.telefoneCompleto, name: $('Normaliza Webhook').item.json.nome || $('Normaliza Webhook').item.json.telefoneCompleto, status: 'new', metadata: { origem: $('Normaliza Webhook').item.json.origemLead, session_id: $('Normaliza Webhook').item.json.sessionId } }) }}",
  options: {}
};
console.log('✓ Create a record1: Airtable create → httpRequest UPSERT Supabase leads');

// --- 5. Fix: Create a row (Supabase leads_qualificados → Code passthrough first UPSERT item) ---
const createRowNode = fixed.nodes.find(n => n.name === 'Create a row');
createRowNode.type = 'n8n-nodes-base.code';
createRowNode.typeVersion = 2;
createRowNode.parameters = {
  jsCode: [
    "// UPSERT de leads retorna array com o lead criado/atualizado (Prefer: return=representation)",
    "// Extrair o primeiro item para passar ao Dados do Lead",
    "const lead = Array.isArray($json) ? $json[0] : $json;",
    "return [{ json: lead }];"
  ].join('\n')
};
console.log('✓ Create a row: Supabase leads_qualificados → Code passthrough first UPSERT item');

// --- 6. Fix: Dados do Lead (Airtable field names → Supabase field names) ---
const dadosLeadNode = fixed.nodes.find(n => n.name === 'Dados do Lead');
dadosLeadNode.parameters.jsCode = `const lead = Array.isArray($json) ? $json[0] : $json;
const meta = lead.metadata || {};

// =============================
// HELPERS
// =============================

function text(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// =============================
// STATUS (Supabase já armazena como slug)
// =============================

const status = lead.status || 'new';

// =============================
// IDENTIDADE
// =============================

const nome = lead.name || 'Lead';
const recordId = lead.id || '';
const imovelRef = meta.imovel_ref || 'Não identificado';

// =============================
// MÍDIA
// =============================

const tipoMidia =
  lead?.message?.content_type ||
  lead?.content_type ||
  'texto';

// =============================
// BI DO LEAD (campos em metadata)
// =============================

const bairro = text(meta.bairro_interesse);
const budget = text(meta.faixa_valor);
const finalidade = text(meta.finalidade);
const origem = text(meta.origem);

let infoBI = '';

if (bairro) infoBI += \`• Bairro: \${bairro}\\n\`;
if (budget) infoBI += \`• Budget: \${budget}\\n\`;
if (finalidade) infoBI += \`• Finalidade: \${finalidade}\\n\`;
if (origem) infoBI += \`• Origem: \${origem}\\n\`;

// =============================
// ALERTAS DE URGÊNCIA
// =============================

const urgencyMap = {
  qualified: '🔥 FOCO TOTAL: Este lead tem alto score. Feche a visita.\\n',
  proposal: '📅 LOGÍSTICA: Visita solicitada. Organize os horários.\\n',
  new: '🆕 RECEPÇÃO: Lead novo. Identifique a dor e o desejo.\\n'
};

const urgency = urgencyMap[status] || '';

// =============================
// BUILD CONTEXT
// =============================

let ctx = \`\\n<estado_atual>\\n\`;
ctx += \`STATUS: \${status}\\n\`;

if (urgency) ctx += urgency;

ctx += \`Cliente: \${nome}\\n\`;

if (imovelRef !== 'Não identificado') {
  ctx += \`Imóvel de Interesse: \${imovelRef}\\n\`;
}

if (infoBI) {
  ctx += \`\\nDados já coletados:\\n\${infoBI}\`;
}

if (recordId) {
  ctx += \`record_id: \${recordId}\\n\`;
}

ctx += \`\\n[INFO_TECNICA: Mídia atual é \${tipoMidia}]\\n\`;
ctx += \`</estado_atual>\`;

// =============================
// OUTPUT
// =============================

return [{
  json: {
    ...lead,
    _context: ctx,
    _status_slug: status,
    nome_cliente: nome,
    record_id_guardiao: recordId,
    // Backward-compat aliases for Atendente node message template references
    Telefone: lead.phone,
    'Status Lead': lead.status,
    'Score do Lead': lead.score
  }
}];`;
console.log('✓ Dados do Lead: Airtable field names → Supabase field names (metadata.*) + backward-compat aliases');

// --- 7. Fix: atualizar_qualificacao tool node — add telefone + tenant_id, rename airtable_record_id ---
const atualizaNode = fixed.nodes.find(n => n.name === 'atualizar_qualificacao');
// Add telefone and tenant_id to value
atualizaNode.parameters.workflowInputs.value['telefone'] = "={{ $('Dados do Lead').item.json.phone }}";
atualizaNode.parameters.workflowInputs.value['tenant_id'] = 'aaaaaaaa-0002-0002-0002-000000000002';
// Remove airtable_record_id from value
delete atualizaNode.parameters.workflowInputs.value['airtable_record_id'];
// Update schema
atualizaNode.parameters.workflowInputs.schema = atualizaNode.parameters.workflowInputs.schema.filter(s => s.id !== 'airtable_record_id');
atualizaNode.parameters.workflowInputs.schema.unshift(
  { id: 'telefone', displayName: 'telefone', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false },
  { id: 'tenant_id', displayName: 'tenant_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false }
);
console.log('✓ atualizar_qualificacao: removed airtable_record_id, added telefone + tenant_id');

// --- 8. Fix: setar_lead_quente tool node — same pattern ---
const setarNode = fixed.nodes.find(n => n.name === 'setar_lead_quente');
setarNode.parameters.workflowInputs.value['telefone'] = "={{ $('Dados do Lead').item.json.phone }}";
setarNode.parameters.workflowInputs.value['tenant_id'] = 'aaaaaaaa-0002-0002-0002-000000000002';
delete setarNode.parameters.workflowInputs.value['airtable_record_id'];
setarNode.parameters.workflowInputs.schema = setarNode.parameters.workflowInputs.schema.filter(s => s.id !== 'airtable_record_id');
setarNode.parameters.workflowInputs.schema.unshift(
  { id: 'telefone', displayName: 'telefone', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false },
  { id: 'tenant_id', displayName: 'tenant_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false }
);
console.log('✓ setar_lead_quente: removed airtable_record_id, added telefone + tenant_id');

// --- Verify positions unchanged ---
const origNodes = wf.nodes.map(n => ({ name: n.name, pos: n.position }));
const fixedNodes = fixed.nodes.map(n => ({ name: n.name, pos: n.position }));
let positionOk = true;
origNodes.forEach((o, i) => {
  const f = fixedNodes[i];
  if (o.name !== f.name || JSON.stringify(o.pos) !== JSON.stringify(f.pos)) {
    console.error('POSITION MISMATCH at index', i, o.name, '!=', f.name);
    positionOk = false;
  }
});
if (positionOk) console.log('✓ All node positions preserved (', fixed.nodes.length, 'nodes)');

// --- Verify connections unchanged ---
if (JSON.stringify(wf.connections) === JSON.stringify(fixed.connections)) {
  console.log('✓ All connections preserved');
} else {
  console.error('⚠ Connections changed!');
}

// Save the fixed workflow
fs.writeFileSync('.planning/quick/260408-sow-padronizar-entrada-do-lead-no-supabase/luana-agent-workflow-fixed.json', JSON.stringify(fixed, null, 2));
console.log('\n✅ Fixed workflow saved!');
