const fs = require('fs');
const path = require('path');

const workflowFiles = [
  'n8n/production/workflow-jurema-main.final-hardened.json',
];

const runtimeNodeName = 'Runtime State Engine';
const runtimeNodeId = 'runtime-state-engine-governance-v1';

const runtimeNode = {
  parameters: {
    method: 'POST',
    url: "={{ (($env.YZI_RUNTIME_API_URL || $vars.YZI_RUNTIME_API_URL || '').replace(/\\/$/, '')) + '/api/runtime/ju/state' }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'x-runtime-key',
          value: "={{ $env.YZI_RUNTIME_INTERNAL_KEY || $vars.YZI_RUNTIME_INTERNAL_KEY || '' }}",
        },
        {
          name: 'x-correlation-id',
          value: "={{ $('Code in JavaScript').first().json.external_message_id || $('Code in JavaScript').first().json.conversation?.id || $execution.id }}",
        },
      ],
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ persist: true, channel: 'whatsapp', origin: 'n8n:evolution', correlation_id: $('Code in JavaScript').first().json.external_message_id || $('Code in JavaScript').first().json.conversation?.id || $execution.id, tenant_id: $('Code in JavaScript').first().json.tenant_id || $('Code in JavaScript').first().json.lead?.tenant_id, conversation_id: $('Code in JavaScript').first().json.conversation?.id, lead: $('Code in JavaScript').first().json.lead, deal: $('Code in JavaScript').first().json.deal, conversation: $('Code in JavaScript').first().json.conversation, recent_messages: $('Code in JavaScript').first().json.recent_messages || [], current_message: $json.mensagemCliente || $('Code in JavaScript').first().json.mensagemCliente || $('Code in JavaScript').first().json.mensagem || '', media_state: $('Code in JavaScript').first().json.media_warning ? 'failed' : 'none', entry_profile: $('Code in JavaScript').first().json.origemLead || $('Code in JavaScript').first().json.source || 'whatsapp' }) }}",
    options: {
      timeout: 10000,
    },
  },
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.4,
  position: [9824, 1744],
  id: runtimeNodeId,
  name: runtimeNodeName,
  onError: 'continueRegularOutput',
};

const buildContextCode = String.raw`const base = $('Code in JavaScript').first().json || {};
const input = $json || {};
let runtime = {};

try {
  runtime = $('Runtime State Engine').first().json || {};
} catch (error) {
  runtime = {};
}

const decision = runtime.decision || runtime.body?.decision || null;
const runtimeContext = runtime.context || runtime.body?.context || {};
const governedContext =
  runtimeContext.context ||
  '';

const mensagemCliente =
  input.mensagemCliente ||
  base.mensagemCliente ||
  base.mensagem ||
  '';

function compactFallbackContext() {
  const lead = base.lead || {};
  const deal = base.deal || {};
  const conversation = base.conversation || {};
  return [
    '<runtime_contract>',
    'LLM fala. Backend decide. Banco guarda verdade.',
    'Runtime State Engine indisponivel neste turno; use fallback minimo e nao reabra campos ja informados.',
    '</runtime_contract>',
    '',
    '<critical_state>',
    'tenant_id: ' + (lead.tenant_id || base.tenant_id || ''),
    'lead_id: ' + (lead.id || base.lead_id || ''),
    'deal_id: ' + (deal.id || base.deal_id || ''),
    'conversation_id: ' + (conversation.id || base.conversation_id || ''),
    'lead_status: ' + (lead.status || base.status || 'new'),
    'conversation_status: ' + (conversation.status || 'open'),
    'ai_paused: ' + (conversation.ai_paused === true ? 'true' : 'false'),
    '</critical_state>',
    '',
    '<mensagem_atual>',
    mensagemCliente,
    '</mensagem_atual>',
  ].join('\n');
}

const ctx = governedContext || compactFallbackContext();

return [{
  json: {
    ...base,
    ...input,
    mensagemCliente,
    _context: ctx,
    runtime_decision: decision,
    runtime_state: decision?.runtime_state || null,
    objective_state: decision?.objective_state || null,
    objective_priority: decision?.objective_priority || 0,
    expected_output: decision?.expected_output || null,
    valid_objective_transition: decision?.valid_objective_transition ?? true,
    next_action: decision?.next_action || null,
    conversation_mode: decision?.conversation_mode || null,
    allowed_tools: decision?.allowed_tools || [],
    required_tools: decision?.required_tools || [],
    retrieval_governance: runtimeContext.retrieval_rules || null,
    retrieval_policy: decision?.retrieval_policy || 'disabled',
    blocked_questions: decision?.blocked_questions || [],
    loop_risk: decision?.loop_risk || 'low',
    runtime_context_source: governedContext ? 'state_engine' : 'fallback_minimal',
  },
  binary: input.binary || undefined,
}];`;

const runtimeSystemPrefix = String.raw`# RUNTIME GOVERNANCE
O runtime operacional ja decidiu o fluxo deste turno.

Regra obrigatoria:
LLM fala.
Backend decide.
Banco guarda verdade.

Voce NAO decide fluxo, estado, regra de negocio ou transicao operacional.
Siga estritamente:
- runtime_state
- objective_state
- objective_priority
- expected_output
- next_action
- conversation_mode
- allowed_tools
- required_tools
- blocked_questions
- retrieval_governance

Nunca pergunte campo listado em blocked_questions.
Nunca use tool fora de allowed_tools.
Se required_tools contiver uma tool, use essa tool antes de responder quando ela estiver disponivel.
Se retrieval_governance.allowed for false, nao use RAG/conhecimento estrategico.
Nao troque objective_state por conta propria.
Entregue exatamente o expected_output do objetivo atual.
Se valid_objective_transition for false, seja conservadora e nao abra novas frentes.
Nao reabra qualificacao por causa de historico antigo.
Use apenas o contexto hierarquico recebido em _context.
Nao use memoria conversacional externa como fonte de estado.

# VOZ
Voce e Ju, consultora imobiliaria da Jurema Brokers.
Responda como WhatsApp: curto, humano, consultivo e objetivo.
Pergunte no maximo uma coisa quando o next_action exigir pergunta.
Nao use JSON, tabela, markdown tecnico ou bastidores.
Nao diga que e IA, automacao, sistema, RAG ou banco de dados.

# TOOLS
Use tools somente quando estiverem em allowed_tools.
Se uma tool estiver em required_tools, execute antes de responder quando ela estiver disponivel.
Nunca use conhecimento_estrategico_luana1 quando retrieval_governance.allowed for false.

# SAIDA
Responda somente a mensagem final para o cliente.
`;

function replaceConnection(workflow, from, oldTo, newTo) {
  const outputs = workflow.connections?.[from]?.main || [];
  for (const output of outputs) {
    for (const conn of output) {
      if (conn.node === oldTo) conn.node = newTo;
    }
  }
}

function setSingleMainConnection(workflow, from, to) {
  workflow.connections[from] = {
    main: [[{ node: to, type: 'main', index: 0 }]],
  };
}

function patchWorkflow(file) {
  const absolute = path.join(process.cwd(), file);
  const workflow = JSON.parse(fs.readFileSync(absolute, 'utf8'));

  const existingRuntime = workflow.nodes.find((node) => node.name === runtimeNodeName);
  if (existingRuntime) {
    Object.assign(existingRuntime, runtimeNode);
  } else {
    workflow.nodes.push(runtimeNode);
  }

  const buildContext = workflow.nodes.find((node) => node.name === 'Build Context1');
  if (!buildContext) throw new Error(`Build Context1 not found in ${file}`);
  buildContext.parameters = buildContext.parameters || {};
  buildContext.parameters.jsCode = buildContextCode;

  const agent = workflow.nodes.find((node) => node.name === 'Atendente1');
  if (!agent) throw new Error(`Atendente1 not found in ${file}`);
  agent.parameters = agent.parameters || {};
  agent.parameters.text = '=Mensagem do Cliente: {{ $json.mensagemCliente }}\n\n{{ $json._context }}';
  agent.parameters.options = agent.parameters.options || {};
  agent.parameters.options.systemMessage = '=' + runtimeSystemPrefix;

  workflow.connections = workflow.connections || {};
  replaceConnection(workflow, 'Detecta Finalização1', 'Build Context1', runtimeNodeName);
  setSingleMainConnection(workflow, runtimeNodeName, 'Build Context1');
  delete workflow.connections.postgres1;

  fs.writeFileSync(absolute, JSON.stringify(workflow, null, 2) + '\n');
  console.log(`patched ${file}`);
}

for (const file of workflowFiles) {
  if (fs.existsSync(path.join(process.cwd(), file))) patchWorkflow(file);
}
