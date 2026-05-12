const fs = require("fs");

const sourcePath = "n8n/workflow-bzK9KbNa5zEYcurj.before.json";
const outputPath = "n8n/workflow-bzK9KbNa5zEYcurj.refactored.json";

const current = JSON.parse(fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, ""));

const googleDriveCred = { googleDriveOAuth2Api: { id: "LME3tpAzMGMzIJUd", name: "Google Drive Jurema" } };
const googleDocsCred = { googleDocsOAuth2Api: { id: "bsKqvPSRI5gp3KHd", name: "Google Docs Jurema" } };
const gmailCred = { gmailOAuth2: { id: "zFt7P11mr94HENmI", name: "Gmail Jurema" } };
const evolutionCred = { evolutionApi: { id: "sX2Z4jQVEwbEivqP", name: "Evolution YZIHUB" } };
const supabaseCred = { supabaseApi: { id: "iXeca2EfcALMOD8H", name: "Supabase JUREMA" } };

function node(id, name, type, typeVersion, position, parameters, credentials, extra = {}) {
  const n = { parameters, id, name, type, typeVersion, position, ...extra };
  if (credentials) n.credentials = credentials;
  return n;
}

const normalizeCode = `const body = $json.body ?? $json;
const tenant_id = body.tenant_id ?? null;
const contract_id = body.contract_id ?? body.contractId ?? body.id ?? null;
const lead_id = body.lead_id ?? body.leadId ?? null;
const canais = body.canais ?? { whatsapp: true, email: true };
const template_file_id =
  body.template_file_id ??
  body.templateFileId ??
  body.template_doc_id ??
  body.templateDocId ??
  body.template_id ??
  null;

if (!tenant_id || !contract_id || !lead_id) {
  throw new Error('tenant_id, contract_id e lead_id sao obrigatorios');
}

return [{
  json: {
    tenant_id,
    contract_id,
    lead_id,
    canais: {
      whatsapp: canais.whatsapp !== false,
      email: canais.email !== false,
    },
    template_file_id,
    conteudo: body.conteudo ?? body.renderedBody ?? body.content ?? null,
    output_folder_id: body.output_folder_id ?? body.outputFolderId ?? $vars.CONTRACT_OUTPUT_FOLDER_ID ?? '',
  },
}];`;

const prepareCode = `const payload = $('Normalizar Payload').first().json;
const contract = $('Buscar Contrato Supabase').first().json;
const lead = $('Buscar Lead Supabase').first().json;
const imovel = $('Buscar Imovel Supabase').first().json ?? {};
const broker = $('Buscar Corretor Supabase').first().json ?? {};

if (!contract?.id) throw new Error('Contrato nao encontrado');
if (!lead?.id) throw new Error('Lead nao encontrado');

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function toNumber(value) {
  const n = Number(String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/\\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function toBRL(value) {
  return money.format(toNumber(value));
}
function valueOf(...values) {
  return values.find((v) => v !== undefined && v !== null && String(v).trim() !== '') ?? '';
}

const valorBase = toNumber(valueOf(contract.value, imovel.valor, lead.value, 0));
const commissionPercentage = toNumber(valueOf(contract.commission_percentage, 5));
const commissionAmount = toNumber(valueOf(contract.commission_amount, valorBase * commissionPercentage / 100));
const comprador = valueOf(lead.name, contract.lead_name);
const imovelNome = valueOf(imovel.titulo_comercial, contract.project_name);
const corretorNome = valueOf(broker.name, contract.corretor_name);
const title = valueOf(contract.title, \`Contrato - \${comprador || contract.id}\`);
const copiedName = \`\${title} - \${new Date().toISOString().slice(0, 10)}\`;
function looksLikeDriveFileId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,}$/.test(value.trim());
}
const frontTemplateFileId = valueOf(payload.template_file_id, contract.template_file_id);
const templateFileId = looksLikeDriveFileId(frontTemplateFileId)
  ? frontTemplateFileId
  : valueOf($vars.CONTRACT_TEMPLATE_DOC_ID);

if (!templateFileId) {
  throw new Error('template_file_id nao informado e CONTRACT_TEMPLATE_DOC_ID nao configurado');
}

const placeholders = {
  '{{comprador}}': comprador,
  '{{lead_nome}}': comprador,
  '{{email}}': lead.email ?? '',
  '{{telefone}}': lead.phone ?? '',
  '{{imovel}}': imovelNome,
  '{{imovel_nome}}': imovelNome,
  '{{id_imovel}}': valueOf(imovel.id_imovel, imovel.referencia_unica, imovel.id, contract.imovel_id, contract.project_id),
  '{{bairro}}': imovel.bairro ?? '',
  '{{corretor}}': corretorNome,
  '{{corretor_nome}}': corretorNome,
  '{{valor}}': toBRL(valorBase),
  '{{comissao}}': toBRL(commissionAmount),
  '{{data}}': new Date().toLocaleDateString('pt-BR'),
  '{{data_contrato}}': new Date().toLocaleDateString('pt-BR'),
};

return [{
  json: {
    tenant_id: payload.tenant_id,
    contract_id: payload.contract_id,
    lead_id: payload.lead_id,
    canais: payload.canais,
    should_email: Boolean(payload.canais.email && lead.email),
    should_whatsapp: Boolean(payload.canais.whatsapp && lead.phone),
    template_file_id: templateFileId,
    output_folder_id: payload.output_folder_id,
    contract,
    lead,
    imovel,
    broker,
    placeholders,
    copied_name: copiedName,
    pdf_file_name: \`\${title}.pdf\`,
    email_to: lead.email ?? '',
    whatsapp_to: lead.phone ?? '',
    email_subject: title,
    email_message: \`Segue em anexo o contrato em PDF para conferencia.\\n\\nApos revisar, voce pode assinar digitalmente pelo GOV.br e nos devolver o PDF assinado por aqui.\\n\\nAtenciosamente,\\nJurema Brokers\`,
    whatsapp_message: \`Segue o contrato em PDF para conferencia. Baixe o arquivo, assine digitalmente pelo GOV.br e envie o PDF assinado de volta por aqui.\`,
  },
}];`;

const nodes = [
  node("9d587240-159c-4069-a309-83adf97409ef", "Webhook", "n8n-nodes-base.webhook", 2, [240, 560], {
    httpMethod: "POST",
    path: "enviarcontrato",
    options: {},
  }, null, { webhookId: "236eec66-ddc5-4414-a652-acacf7a4b508" }),
  node("61ee766b-66e3-465b-b1cc-7b9c14642df4", "Normalizar Payload", "n8n-nodes-base.code", 2, [500, 560], { jsCode: normalizeCode }),
  node("8f5e2c42-a2f9-474f-af50-fa63de0e25ff", "Buscar Contrato Supabase", "n8n-nodes-base.supabase", 1, [760, 560], {
    useCustomSchema: true,
    operation: "get",
    tableId: "contracts",
    filters: { conditions: [
      { keyName: "id", condition: "eq", keyValue: "={{ $json.contract_id }}" },
      { keyName: "tenant_id", condition: "eq", keyValue: "={{ $json.tenant_id }}" },
    ] },
  }, supabaseCred),
  node("d91ed9cd-fab9-42cf-afe5-271d83a44d5e", "Buscar Lead Supabase", "n8n-nodes-base.supabase", 1, [1020, 560], {
    useCustomSchema: true,
    operation: "get",
    tableId: "leads",
    filters: { conditions: [
      { keyName: "id", condition: "eq", keyValue: "={{ $('Normalizar Payload').item.json.lead_id }}" },
      { keyName: "tenant_id", condition: "eq", keyValue: "={{ $('Normalizar Payload').item.json.tenant_id }}" },
    ] },
  }, supabaseCred),
  node("cc0e5d41-fc13-49d8-84f0-613e987e5fc7", "Buscar Imovel Supabase", "n8n-nodes-base.supabase", 1, [1280, 560], {
    useCustomSchema: true,
    operation: "get",
    tableId: "imoveis",
    filters: { conditions: [
      { keyName: "id", condition: "eq", keyValue: "={{ $('Buscar Contrato Supabase').item.json.imovel_id || $('Buscar Contrato Supabase').item.json.project_id }}" },
      { keyName: "tenant_id", condition: "eq", keyValue: "={{ $('Normalizar Payload').item.json.tenant_id }}" },
    ] },
  }, supabaseCred, { alwaysOutputData: true }),
  node("a424c7a2-a0f9-42ce-a8f7-a1cf0f91d3af", "Buscar Corretor Supabase", "n8n-nodes-base.supabase", 1, [1540, 560], {
    useCustomSchema: true,
    operation: "get",
    tableId: "corretores",
    filters: { conditions: [
      { keyName: "id", condition: "eq", keyValue: "={{ $('Buscar Contrato Supabase').item.json.broker_id }}" },
      { keyName: "tenant_id", condition: "eq", keyValue: "={{ $('Normalizar Payload').item.json.tenant_id }}" },
    ] },
  }, supabaseCred, { alwaysOutputData: true }),
  node("95ac38ec-a3d5-4d1f-9347-0ae279bfcb9f", "Preparar Documento", "n8n-nodes-base.code", 2, [1800, 560], { jsCode: prepareCode }),
  node("f0132fc2-1a97-4d29-88c1-35630f65d28c", "Copiar Template Oficial", "n8n-nodes-base.googleDrive", 3, [2060, 560], {
    operation: "copy",
    fileId: { __rl: true, value: "={{ $json.template_file_id }}", mode: "id" },
    name: "={{ $json.copied_name }}",
    options: {},
  }, googleDriveCred),
  node("b66d8e09-4521-419f-86d0-1ecb9e227a1f", "Atualizar Documento", "n8n-nodes-base.googleDocs", 2, [2320, 560], {
    operation: "update",
    documentURL: "=https://docs.google.com/document/d/{{ $('Copiar Template Oficial').item.json.id }}/edit",
    simple: false,
    actionsUi: { actionFields: [
      { action: "replaceAll", text: "{{comprador}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{comprador}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{lead_nome}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{lead_nome}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{email}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{email}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{telefone}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{telefone}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{imovel}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{imovel}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{imovel_nome}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{imovel_nome}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{id_imovel}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{id_imovel}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{bairro}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{bairro}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{corretor}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{corretor}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{corretor_nome}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{corretor_nome}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{valor}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{valor}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{comissao}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{comissao}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{data}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{data}}'] }}", matchCase: true },
      { action: "replaceAll", text: "{{data_contrato}}", replaceText: "={{ $('Preparar Documento').item.json.placeholders['{{data_contrato}}'] }}", matchCase: true },
    ] },
  }, googleDocsCred),
  node("4044e11e-5d05-4508-a255-77cf336e88dd", "Exportar PDF Real", "n8n-nodes-base.googleDrive", 3, [2580, 560], {
    operation: "download",
    fileId: { __rl: true, value: "={{ $('Copiar Template Oficial').item.json.id }}", mode: "id" },
    options: { googleFileConversion: { conversion: { docsToFormat: "application/pdf" } } },
  }, googleDriveCred),
  node("d8b1cd86-0999-47b9-9b1b-0b17ffcc4149", "IF Canal Email", "n8n-nodes-base.if", 2.2, [2840, 420], {
    conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "loose" }, conditions: [
      { id: "cond-email-001", leftValue: "={{ $('Preparar Documento').item.json.should_email }}", rightValue: true, operator: { type: "boolean", operation: "equals" } },
    ], combinator: "and" },
    options: {},
  }),
  node("a9955f43-40b6-4ad4-9fb7-4728126ffdf2", "Enviar Email", "n8n-nodes-base.gmail", 2.1, [3100, 420], {
    sendTo: "={{ $('Preparar Documento').item.json.email_to }}",
    subject: "={{ $('Preparar Documento').item.json.email_subject }}",
    emailType: "text",
    message: "={{ $('Preparar Documento').item.json.email_message }}",
    options: { appendAttribution: false, attachmentsUi: { attachmentsBinary: [{}] }, senderName: "Jurema Brokers" },
  }, gmailCred),
  node("d87f90da-1573-4a8f-b72c-c78541bac4a6", "IF Canal WhatsApp", "n8n-nodes-base.if", 2.2, [2840, 700], {
    conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "loose" }, conditions: [
      { id: "cond-wpp-001", leftValue: "={{ $('Preparar Documento').item.json.should_whatsapp }}", rightValue: true, operator: { type: "boolean", operation: "equals" } },
    ], combinator: "and" },
    options: {},
  }),
  node("67e304f9-e1a1-4781-bd87-e7f3a81c29d2", "PDF para Base64", "n8n-nodes-base.extractFromFile", 1, [3100, 700], {
    operation: "binaryToPropery",
    options: {},
  }),
  node("a7bd6361-f2b0-458c-946c-60efce4e664e", "Enviar PDF WhatsApp", "n8n-nodes-evolution-api.evolutionApi", 1, [3360, 700], {
    resource: "messages-api",
    operation: "send-document",
    instanceName: "Jurema Brokers",
    remoteJid: "={{ $('Preparar Documento').item.json.whatsapp_to }}",
    media: "={{ $json.data }}",
    caption: "={{ $('Preparar Documento').item.json.whatsapp_message }}",
    fileName: "={{ $('Preparar Documento').item.json.pdf_file_name }}",
    options_message: {},
  }, evolutionCred),
  node("e5a03e2e-3c34-4cf8-94a9-844fc2a2de6c", "Atualizar Status Contrato", "n8n-nodes-base.supabase", 1, [3620, 560], {
    useCustomSchema: true,
    operation: "update",
    tableId: "contracts",
    filters: { conditions: [
      { keyName: "id", condition: "eq", keyValue: "={{ $('Preparar Documento').item.json.contract_id }}" },
      { keyName: "tenant_id", condition: "eq", keyValue: "={{ $('Preparar Documento').item.json.tenant_id }}" },
    ] },
    fieldsUi: { fieldValues: [
      { fieldId: "status", fieldValue: "sent" },
      { fieldId: "sent_at", fieldValue: "={{ $now.toISO() }}" },
      { fieldId: "updated_at", fieldValue: "={{ $now.toISO() }}" },
      { fieldId: "file_url", fieldValue: "=https://docs.google.com/document/d/{{ $('Copiar Template Oficial').item.json.id }}/export?format=pdf" },
    ] },
  }, supabaseCred),
];

const connections = {
  Webhook: { main: [[{ node: "Normalizar Payload", type: "main", index: 0 }]] },
  "Normalizar Payload": { main: [[{ node: "Buscar Contrato Supabase", type: "main", index: 0 }]] },
  "Buscar Contrato Supabase": { main: [[{ node: "Buscar Lead Supabase", type: "main", index: 0 }]] },
  "Buscar Lead Supabase": { main: [[{ node: "Buscar Imovel Supabase", type: "main", index: 0 }]] },
  "Buscar Imovel Supabase": { main: [[{ node: "Buscar Corretor Supabase", type: "main", index: 0 }]] },
  "Buscar Corretor Supabase": { main: [[{ node: "Preparar Documento", type: "main", index: 0 }]] },
  "Preparar Documento": { main: [[{ node: "Copiar Template Oficial", type: "main", index: 0 }]] },
  "Copiar Template Oficial": { main: [[{ node: "Atualizar Documento", type: "main", index: 0 }]] },
  "Atualizar Documento": { main: [[{ node: "Exportar PDF Real", type: "main", index: 0 }]] },
  "Exportar PDF Real": { main: [[
    { node: "IF Canal Email", type: "main", index: 0 },
    { node: "IF Canal WhatsApp", type: "main", index: 0 },
  ]] },
  "IF Canal Email": { main: [[{ node: "Enviar Email", type: "main", index: 0 }], []] },
  "Enviar Email": { main: [[{ node: "Atualizar Status Contrato", type: "main", index: 0 }]] },
  "IF Canal WhatsApp": { main: [[{ node: "PDF para Base64", type: "main", index: 0 }], []] },
  "PDF para Base64": { main: [[{ node: "Enviar PDF WhatsApp", type: "main", index: 0 }]] },
  "Enviar PDF WhatsApp": { main: [[{ node: "Atualizar Status Contrato", type: "main", index: 0 }]] },
};

const refactored = {
  name: current.name,
  nodes,
  connections,
  settings: { ...(current.settings ?? {}), executionOrder: "v1", binaryMode: "separate", availableInMCP: false },
};

fs.writeFileSync(outputPath, JSON.stringify(refactored, null, 2));
console.log(`Wrote ${outputPath}`);
console.log(`${nodes.length} nodes`);
