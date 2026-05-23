const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainFile = path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');

const lightweightSystemMessage = String.raw`=LIGHTWEIGHT OPERATING CONTRACT
Ju opera no hot-path leve: n8n orquestra, Redis segura continuidade curta, Supabase guarda a verdade, Supabase Vector recupera memoria semantica quando necessario, tools validam dados operacionais e GPT-4.1 gera linguagem humana.

VOZ DA JU
Voce e Ju, consultora imobiliaria da Jurema Brokers. Converse como corretora real no WhatsApp: texto corrido, curto, organico, calmo, seguro, contextual e profissional. Nao soe como IA, chatbot, SDR, formulario, FAQ ou relatorio. Nao use bullets, numeracao, markdown, titulos, tabelas, blocos organizados, emojis de direcao ou simpatia artificial.

CONTINUIDADE
Use o contexto recebido em _context e a memoria curta para nao repetir pergunta ja respondida. Se o cliente ja indicou casa, apartamento, bairro, finalidade, budget ou dificuldade especifica, avance a conversa a partir disso. Quando precisar descobrir algo, faca uma unica pergunta natural.

TOOL GOVERNANCE
Use tools com parcimonia. consultar_imoveis e a unica fonte de verdade para imoveis, disponibilidade, cards e URLs. conhecimento_estrategico_luana1 so entra para duvida consultiva; nao substitui consultar_imoveis. atualizar_qualificacao salva dado operacional novo. setar_lead_quente so quando houver visita, corretor, ligacao ou avancar.

TOOL REVALIDATION
Se o cliente pedir reenvio, disser que o link falhou, pedir detalhes do imovel anterior ou fizer referencia ao ultimo imovel enviado, chame consultar_imoveis novamente antes de responder. Nunca reconstrua URL, slug ou link por memoria textual. A URL final deve ser exatamente a retornada por consultar_imoveis.

PRESENTATION GOVERNANCE
Quando consultar_imoveis retornar cards, preserve o whatsapp_text/caption e mantenha a URL do imovel em linha propria para gerar preview no WhatsApp. Envie no maximo 3 opcoes. Nunca exponha success, total_received, filters_used, metadata, media, JSON ou bastidores.

SAIDA
Responda somente a mensagem final para o cliente.`;

const buildContextCode = String.raw`const base = $('Code in JavaScript').first().json || {};
const input = $json || {};

const mensagemCliente =
  input.mensagemCliente ||
  base.mensagemCliente ||
  base.mensagem ||
  '';

const existingContext = input._context || base._context || '';

function compactContext() {
  const lead = base.lead || {};
  const deal = base.deal || {};
  const conversation = base.conversation || {};
  const recent = Array.isArray(base.recent_messages) ? base.recent_messages.slice(-6) : [];
  const meta = {
    ...(lead.metadata || {}),
    ...(deal.metadata || {}),
    ...(conversation.metadata || {}),
  };

  return [
    '<lightweight_contract>',
    'n8n orquestra. Supabase guarda verdade. Redis da continuidade curta. Tools validam fatos operacionais. GPT-4.1 fala.',
    'Nao reconstrua URL de imovel. consultar_imoveis e a unica fonte de verdade para links, cards e disponibilidade.',
    '</lightweight_contract>',
    '',
    '<estado_operacional>',
    'tenant_id: ' + (lead.tenant_id || base.tenant_id || ''),
    'lead_id: ' + (lead.id || base.lead_id || ''),
    'deal_id: ' + (deal.id || base.deal_id || ''),
    'conversation_id: ' + (conversation.id || base.conversation_id || ''),
    'lead_status: ' + (lead.status || base.status || 'new'),
    'conversation_status: ' + (conversation.status || 'open'),
    'ai_paused: ' + (conversation.ai_paused === true ? 'true' : 'false'),
    '</estado_operacional>',
    '',
    '<memoria_util>',
    'nome: ' + (lead.name || base.nome_cliente || 'Cliente'),
    'cidade: ' + (meta.cidade || meta.city || 'Joao Pessoa'),
    'bairro: ' + (deal.location_preference || meta.bairro_interesse || meta.bairro || 'nao informado'),
    'tipo_imovel: ' + (deal.property_type || meta.tipo_imovel || 'nao informado'),
    'quartos: ' + (meta.quartos || deal.bedrooms || 'nao informado'),
    'faixa_valor: ' + ([deal.budget_min, deal.budget_max].filter(Boolean).join(' / ') || meta.faixa_valor || meta.valor_max || 'nao informado'),
    'intencao: ' + (deal.intent || deal.purpose || meta.objetivo || meta.finalidade || 'nao informado'),
    'timing: ' + (deal.timeline || meta.timeline || meta.prazo || 'nao informado'),
    'ultimo_imovel_ref: ' + (meta.codigo_ref || meta.imovel_ref || meta.property_ref || 'nao informado'),
    '</memoria_util>',
    '',
    '<historico_curto>',
    recent.map((m) => (m.direction === 'outbound' || m.sender_type === 'agent' ? 'Ju: ' : 'Cliente: ') + (m.content || '')).join('\n') || 'sem historico curto util',
    '</historico_curto>',
    '',
    '<mensagem_atual>',
    mensagemCliente,
    '</mensagem_atual>',
  ].join('\n');
}

const toolRevalidationTriggers = [
  'manda de novo',
  'manda novamente',
  'reenvia',
  'link deu erro',
  'link falhou',
  'qual era aquele imovel',
  'qual era aquele imóvel',
  'abre mais aquele apartamento',
  'detalhes do imovel anterior',
];

const normalizedMessage = String(mensagemCliente || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();
const requiresToolRevalidation = toolRevalidationTriggers.some((trigger) => normalizedMessage.includes(trigger.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));

const governance = [
  '',
  '<tool_revalidation>',
  'requires_consultar_imoveis: ' + (requiresToolRevalidation ? 'true' : 'false'),
  'url_truth: consultar_imoveis',
  'never_reconstruct_property_url: true',
  '</tool_revalidation>',
].join('\n');

return [{
  json: {
    ...base,
    ...input,
    mensagemCliente,
    _context: (existingContext || compactContext()) + governance,
    runtime_context_source: 'lightweight_hotpath',
    runtime_state: null,
    objective_state: null,
    next_action: requiresToolRevalidation ? 'revalidar_imovel_com_consultar_imoveis' : null,
    required_tools: requiresToolRevalidation ? ['consultar_imoveis'] : [],
    retrieval_policy: requiresToolRevalidation ? 'disabled' : 'minimal',
    blocked_questions: [],
    loop_risk: 'low',
    tool_revalidation_required: requiresToolRevalidation,
  },
  binary: input.binary || undefined,
}];`;

function readWorkflow(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeWorkflow(file, workflow) {
  fs.writeFileSync(file, JSON.stringify(workflow, null, 2) + '\n');
}

function setSingleMainConnection(workflow, from, to) {
  workflow.connections[from] = {
    main: [[{ node: to, type: 'main', index: 0 }]],
  };
}

const workflow = readWorkflow(mainFile);

workflow.nodes = workflow.nodes.filter((node) => node.name !== 'Runtime State Engine');
delete workflow.connections['Runtime State Engine'];

const agent = workflow.nodes.find((node) => node.name === 'Atendente1');
if (!agent) throw new Error('Atendente1 not found');
agent.parameters = agent.parameters || {};
agent.parameters.options = agent.parameters.options || {};
agent.parameters.options.systemMessage = lightweightSystemMessage;

const buildContext = workflow.nodes.find((node) => node.name === 'Build Context1');
if (!buildContext) throw new Error('Build Context1 not found');
buildContext.parameters = buildContext.parameters || {};
buildContext.parameters.jsCode = buildContextCode;

const tool = workflow.nodes.find((node) => node.name === 'consultar_imoveis');
if (!tool) throw new Error('consultar_imoveis not found');
tool.parameters = tool.parameters || {};
tool.parameters.description = [
  'Fonte unica de verdade para imoveis, disponibilidade, cards e URLs.',
  'Use quando o lead citar codigo JP, bairro, tipologia, quartos, valor, pedir opcoes ou pedir detalhes de imovel.',
  'Use obrigatoriamente quando o cliente pedir reenvio, disser que o link falhou, pedir novamente o imovel, perguntar qual era aquele imovel ou referenciar o ultimo imovel enviado.',
  'Nunca deixe o modelo reconstruir URL, inferir slug, reutilizar link textual antigo ou responder de memoria; a URL final deve ser exatamente a retornada por esta tool.',
].join(' ');

workflow.connections = workflow.connections || {};
setSingleMainConnection(workflow, 'Detecta Finalização1', 'Build Context1');
setSingleMainConnection(workflow, 'Atendente1', 'Presentation Governance');
setSingleMainConnection(workflow, 'Presentation Governance', 'Conversational Style Governance');
setSingleMainConnection(workflow, 'Conversational Style Governance', 'Salvar Outbound Supabase');
setSingleMainConnection(workflow, 'Salvar Outbound Supabase', 'ArrayResposta');

for (const [from, connection] of Object.entries(workflow.connections)) {
  if (!connection || typeof connection !== 'object') continue;
  if (!Array.isArray(connection.ai_memory)) continue;

  connection.ai_memory = connection.ai_memory
    .map((group) => group.filter((target) => target.node !== 'Atendente1'))
    .filter((group) => group.length > 0);

  if (connection.ai_memory.length === 0) {
    delete connection.ai_memory;
  }

  if (Object.keys(connection).length === 0) {
    delete workflow.connections[from];
  }
}

writeWorkflow(mainFile, workflow);
console.log(`patched ${path.relative(root, mainFile)}`);
