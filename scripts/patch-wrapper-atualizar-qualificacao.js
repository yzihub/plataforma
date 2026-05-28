const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflowId = 'Qi1lut9fEQJUNZd6';
const workflowName = 'Ju Runtime Tool Wrapper - atualizar_qualificacao';
const localFile = path.join(root, 'n8n', 'production', 'runtime-tools', 'wrapper-tool-atualizar-qualificacao.v1.json');
const snapshotDir = path.join(root, 'n8n', 'archive', 'snapshots');

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

function apiKey(env) {
  if (env.N8N_API_KEY) return env.N8N_API_KEY;
  if (env.N8N_API && !/^https?:\/\//i.test(env.N8N_API)) return env.N8N_API;
  return '';
}

function apiBase(env) {
  if (env.N8N_API_BASE) return env.N8N_API_BASE.replace(/\/+$/, '');
  if (env.N8N_API_URL) return env.N8N_API_URL.replace(/\/+$/, '');
  if (env.N8N_API && /^https?:\/\//i.test(env.N8N_API)) return env.N8N_API.replace(/\/+$/, '');
  return 'https://app.yzihub.com/api/v1';
}

function compactWorkflowForPut(workflow) {
  const settings = workflow.settings || {};
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      ...(settings.executionOrder ? { executionOrder: settings.executionOrder } : {}),
      ...(settings.callerPolicy ? { callerPolicy: settings.callerPolicy } : {}),
      ...(settings.saveExecutionProgress ? { saveExecutionProgress: settings.saveExecutionProgress } : {}),
      ...(settings.saveDataSuccessExecution ? { saveDataSuccessExecution: settings.saveDataSuccessExecution } : {}),
      ...(settings.saveDataErrorExecution ? { saveDataErrorExecution: settings.saveDataErrorExecution } : {}),
    },
    staticData: workflow.staticData || {},
  };
}

function audit(workflow) {
  const findings = [];
  for (const node of workflow.nodes || []) {
    const type = node.type || '';
    const parameters = node.parameters || {};
    const text = JSON.stringify(parameters);
    if (type.includes('.set') || node.name.match(/edit fields|set/i)) {
      findings.push({ node: node.name, type, reason: 'Set/Edit Fields can replace the whole item if includeOtherFields is disabled.' });
    }
    if (type.includes('.code') || type.includes('.function')) {
      if (/return\s+\[\s*\{\s*json\s*:\s*\{/.test(String(parameters.jsCode || parameters.functionCode || ''))) {
        findings.push({ node: node.name, type, reason: 'Code/Function returns a new json object and can drop original payload fields.' });
      }
    }
    if (type.includes('.executeWorkflow')) {
      findings.push({ node: node.name, type, reason: 'Execute Workflow receives only mapped workflowInputs; unmapped context is dropped.' });
    }
    if (/tenant_id|lead_id|deal_id|phone|conversation_id|tool_call_id|runtime_trace_id/.test(text) === false) {
      continue;
    }
  }
  return findings;
}

const validateCode = `// Validate auth + payload. Fail-closed while preserving canonical runtime context.
const started = Date.now();
const item = $input.first().json || {};
const body = item.body || item;
const headers = item.headers || {};
const input = body.input && typeof body.input === 'object' ? body.input : {};
const context = {
  ...(body.context && typeof body.context === 'object' ? body.context : {}),
  ...(body.runtime_context && typeof body.runtime_context === 'object' ? body.runtime_context : {}),
  ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {})
};

const expected = (
  $env.JUREMA_TOOL_WEBHOOK_SECRET ||
  $vars.JUREMA_TOOL_WEBHOOK_SECRET ||
  $env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  $vars.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  $env.EVOLUTION_WEBHOOK_SECRET ||
  $vars.EVOLUTION_WEBHOOK_SECRET ||
  ''
).trim();
if (!expected) {
  throw new Error('wrapper config error: JUREMA_TOOL_WEBHOOK_SECRET nao configurado em n8n');
}

const provided = (headers['x-n8n-api-key'] || headers['X-N8N-API-KEY'] || headers['x-webhook-secret'] || headers['X-Webhook-Secret'] || '').toString().trim();
if (provided !== expected) {
  throw new Error('unauthorized: x-n8n-api-key ausente ou invalido');
}

const clean = (v) => String(v ?? '').trim();
const pick = (...values) => {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return '';
};

const canonical = {
  tenant_id: pick(body.tenant_id, input.tenant_id, context.tenant_id),
  phone: pick(body.phone, body.telefoneCompleto, input.phone, input.telefoneCompleto, context.phone, context.telefoneCompleto),
  lead_id: pick(body.lead_id, input.lead_id, context.lead_id),
  deal_id: pick(body.deal_id, input.deal_id, context.deal_id),
  conversation_id: pick(body.conversation_id, input.conversation_id, context.conversation_id),
  tool_call_id: pick(body.tool_call_id, input.tool_call_id, context.tool_call_id),
  runtime_trace_id: pick(body.runtime_trace_id, input.runtime_trace_id, context.runtime_trace_id)
};

if (!canonical.tenant_id) throw new Error('payload invalido: tenant_id ausente');
if (!canonical.phone) throw new Error('payload invalido: phone ausente');

const temperatura = pick(input.temperatura, body.temperatura, body.ai_temperature);
const qualificacao_status = pick(input.qualificacao_status, body.qualificacao_status, body.qualification_status, body.status_lead, body['Status Lead']);
const motivo = pick(input.motivo, body.motivo);
const observacao = pick(input.observacao, body.observacao);

return [{
  json: {
    ...body,
    ...input,
    ...canonical,
    __started_at: started,
    __original_payload: body,
    __payload_preserved: true,
    temperatura,
    qualificacao_status,
    motivo,
    observacao,
    objetivo: pick(input.objetivo, body.objetivo, body.intent),
    faixa_valor: pick(input.faixa_valor, body.faixa_valor, body.budget_max),
    'Perfil Resumido': pick(input['Perfil Resumido'], input.perfil_resumido, input.perfil, body['Perfil Resumido'], body.perfil_resumido, body.perfil),
    'Bairro / Regiao de Interesse': pick(input['Bairro / Regiao de Interesse'], input['Bairro / Região de Interesse'], input.bairro, input.location_preference, body['Bairro / Regiao de Interesse'], body['Bairro / Região de Interesse'], body.bairro, body.location_preference),
    'Interesse Principal': pick(input['Interesse Principal'], input.interesse_principal, body['Interesse Principal'], body.interesse_principal),
    'Score do Lead': pick(input['Score do Lead'], input.score_lead, input.lead_score, body['Score do Lead'], body.score_lead, body.lead_score),
    'Status Lead': qualificacao_status || pick(input['Status Lead'], body['Status Lead']),
    Finalidade: pick(input.Finalidade, input.finalidade, input.purpose, body.Finalidade, body.finalidade, body.purpose),
    'Como chegou ate a Jurema': pick(input['Como chegou ate a Jurema'], input['Como chegou até a Jurema'], input.origem_lead, input.source, body['Como chegou ate a Jurema'], body['Como chegou até a Jurema'], body.origem_lead, body.source),
    tipo_imovel: pick(input.tipo_imovel, input.property_type, body.tipo_imovel, body.property_type),
    quartos: pick(input.quartos, input.bedrooms, body.quartos, body.bedrooms),
    prazo: pick(input.prazo, input.timeline, body.prazo, body.timeline),
    forma_pagamento: pick(input.forma_pagamento, input.payment_method, body.forma_pagamento, body.payment_method)
  }
}];`;

const formatCode = `const validated = $('Validate Auth + Payload').first().json || {};
const started = validated.__started_at || Date.now();
const inner = $input.first().json || {};

return [{
  json: {
    ok: true,
    tool: 'atualizar_qualificacao',
    latency_ms: Date.now() - started,
    payload_preserved: validated.__payload_preserved === true,
    context: {
      tenant_id: validated.tenant_id,
      phone: validated.phone,
      lead_id: validated.lead_id || inner.lead_id || null,
      deal_id: validated.deal_id || inner.deal_id || null,
      conversation_id: validated.conversation_id || null,
      tool_call_id: validated.tool_call_id || null,
      runtime_trace_id: validated.runtime_trace_id || null
    },
    output: {
      success: inner.success !== false,
      lead_id: inner.lead_id || validated.lead_id || null,
      deal_id: inner.deal_id || validated.deal_id || null,
      temperatura: inner.temperatura || inner.ai_temperature || validated.temperatura || null,
      qualificacao_status: inner.qualificacao_status || inner.qualification_status || inner['Status Lead'] || validated.qualificacao_status || null,
      motivo: inner.motivo || validated.motivo || null,
      observacao: inner.observacao || validated.observacao || null,
      qualification_status: inner.qualification_status || inner.qualificacao_status || inner['Status Lead'] || validated.qualificacao_status || null,
      lead_score: inner.lead_score ?? inner['Score do Lead'] ?? null,
      deal_stage: inner.deal_stage || null,
      missing_fields: Array.isArray(inner.missing_fields) ? inner.missing_fields : [],
      details: inner
    }
  }
}];`;

function field(id) {
  return { id, displayName: id, required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false };
}

function patchWorkflow(workflow) {
  const validate = workflow.nodes.find((node) => node.name === 'Validate Auth + Payload');
  const execute = workflow.nodes.find((node) => node.name === 'Execute atualizar_qualificacao');
  const format = workflow.nodes.find((node) => node.name === 'Format Response');

  if (!validate) throw new Error('Validate Auth + Payload not found');
  if (!execute) throw new Error('Execute atualizar_qualificacao not found');
  if (!format) throw new Error('Format Response not found');

  validate.parameters = validate.parameters || {};
  validate.parameters.jsCode = validateCode;

  execute.parameters = execute.parameters || {};
  execute.parameters.workflowInputs = execute.parameters.workflowInputs || {};
  execute.parameters.workflowInputs.mappingMode = 'defineBelow';
  execute.parameters.workflowInputs.value = {
    tenant_id: '={{ $json.tenant_id }}',
    phone: '={{ $json.phone }}',
    lead_id: '={{ $json.lead_id }}',
    deal_id: '={{ $json.deal_id }}',
    conversation_id: '={{ $json.conversation_id }}',
    tool_call_id: '={{ $json.tool_call_id }}',
    runtime_trace_id: '={{ $json.runtime_trace_id }}',
    temperatura: '={{ $json.temperatura }}',
    qualificacao_status: '={{ $json.qualificacao_status }}',
    motivo: '={{ $json.motivo }}',
    observacao: '={{ $json.observacao }}',
    objetivo: '={{ $json.objetivo }}',
    faixa_valor: '={{ $json.faixa_valor }}',
    'Perfil Resumido': "={{ $json['Perfil Resumido'] }}",
    'Bairro / Regiao de Interesse': "={{ $json['Bairro / Regiao de Interesse'] }}",
    'Interesse Principal': "={{ $json['Interesse Principal'] }}",
    'Score do Lead': "={{ $json['Score do Lead'] }}",
    'Status Lead': "={{ $json['Status Lead'] }}",
    Finalidade: '={{ $json.Finalidade }}',
    'Como chegou ate a Jurema': "={{ $json['Como chegou ate a Jurema'] }}",
    tipo_imovel: '={{ $json.tipo_imovel }}',
    quartos: '={{ $json.quartos }}',
    prazo: '={{ $json.prazo }}',
    forma_pagamento: '={{ $json.forma_pagamento }}',
    original_payload: '={{ JSON.stringify($json.__original_payload || {}) }}',
  };
  execute.parameters.workflowInputs.schema = Object.keys(execute.parameters.workflowInputs.value).map(field);
  execute.parameters.workflowInputs.matchingColumns = [];
  execute.parameters.workflowInputs.attemptToConvertTypes = false;
  execute.parameters.workflowInputs.convertFieldsToString = false;

  format.parameters = format.parameters || {};
  format.parameters.jsCode = formatCode;

  return workflow;
}

async function fetchWorkflow(base, key) {
  const response = await fetch(`${base}/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': key },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status} ${text.slice(0, 1000)}`);
  return JSON.parse(text);
}

async function publishWorkflow(base, key, workflow) {
  const response = await fetch(`${base}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': key },
    body: JSON.stringify(compactWorkflowForPut(workflow)),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`publish failed: HTTP ${response.status} ${text.slice(0, 1000)}`);
  return text ? JSON.parse(text) : {};
}

function verifyPatched(workflow) {
  const validate = workflow.nodes.find((node) => node.name === 'Validate Auth + Payload');
  const execute = workflow.nodes.find((node) => node.name === 'Execute atualizar_qualificacao');
  const format = workflow.nodes.find((node) => node.name === 'Format Response');
  const validateCodeLive = String(validate?.parameters?.jsCode || '');
  const formatCodeLive = String(format?.parameters?.jsCode || '');
  const mapped = Object.keys(execute?.parameters?.workflowInputs?.value || {});
  const requiredCodeTokens = [
    '__original_payload',
    '__payload_preserved',
    'conversation_id',
    'tool_call_id',
    'runtime_trace_id',
    'temperatura',
    'qualificacao_status',
    'motivo',
    'observacao',
    '...body',
    '...input',
  ];
  const requiredMappings = [
    'tenant_id',
    'phone',
    'lead_id',
    'deal_id',
    'conversation_id',
    'tool_call_id',
    'runtime_trace_id',
    'temperatura',
    'qualificacao_status',
    'motivo',
    'observacao',
    'original_payload',
  ];
  const missingCodeTokens = requiredCodeTokens.filter((token) => !validateCodeLive.includes(token));
  const missingMappings = requiredMappings.filter((token) => !mapped.includes(token));
  const formatHasContext = ['payload_preserved', 'context', 'conversation_id', 'tool_call_id', 'runtime_trace_id'].every((token) =>
    formatCodeLive.includes(token)
  );
  return {
    ok: missingCodeTokens.length === 0 && missingMappings.length === 0 && formatHasContext,
    active: workflow.active,
    missingCodeTokens,
    missingMappings,
    formatHasContext,
    mapped,
  };
}

function webhookBase(env) {
  return apiBase(env).replace(/\/api\/v1$/i, '');
}

function uuid(label) {
  const hex = Buffer.from(`${label}-${Date.now()}`).toString('hex').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function runE2E(env) {
  const secret =
    env.JUREMA_TOOL_WEBHOOK_SECRET ||
    env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
    env.EVOLUTION_WEBHOOK_SECRET ||
    env.N8N_API_KEY ||
    env.N8N_API;
  if (!secret) {
    return { skipped: true, reason: 'JUREMA_TOOL_WEBHOOK_SECRET/RUNTIME_COGNITIVE_WEBHOOK_SECRET/EVOLUTION_WEBHOOK_SECRET ausente localmente' };
  }

  const payload = {
    tool: 'atualizar_qualificacao',
    tenant_id: env.JU_BEHAVIORAL_QA_TENANT_ID || '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361',
    phone: env.JU_BEHAVIORAL_QA_PHONE || `5583999${String(Date.now()).slice(-6)}`,
    lead_id: uuid('lead'),
    deal_id: uuid('deal'),
    conversation_id: uuid('conversation'),
    tool_call_id: `codex-atualizar-qualificacao-${Date.now()}`,
    runtime_trace_id: `codex-trace-${Date.now()}`,
    input: {
      temperatura: 'quente',
      qualificacao_status: 'cliente_interessado',
      motivo: 'cliente pediu visita',
      observacao: 'Busca apto em Joao Pessoa para morar',
    },
  };

  const response = await fetch(`${webhookBase(env)}/webhook/tool-atualizar-qualificacao`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': secret,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 1000);
  }

  return {
    skipped: false,
    status: response.status,
    ok: response.ok,
    payload_preserved: body?.payload_preserved === true,
    context_preserved: Boolean(
      body?.context?.tenant_id &&
        body?.context?.phone &&
        body?.context?.lead_id &&
        body?.context?.deal_id &&
        body?.context?.conversation_id &&
        body?.context?.tool_call_id &&
        body?.context?.runtime_trace_id
    ),
    output: body?.output
      ? {
          success: body.output.success,
          lead_id: body.output.lead_id,
          deal_id: body.output.deal_id,
          temperatura: body.output.temperatura,
          qualificacao_status: body.output.qualificacao_status,
          motivo: body.output.motivo,
          observacao: body.output.observacao,
        }
      : null,
    body: typeof body === 'string' ? body : undefined,
  };
}

async function fetchLastExecutions(base, key) {
  const response = await fetch(`${base}/executions?workflowId=${workflowId}&limit=3&includeData=true`, {
    headers: { 'X-N8N-API-KEY': key },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`executions fetch failed: HTTP ${response.status} ${text.slice(0, 1000)}`);
  const payload = JSON.parse(text);
  const executions = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return executions.map((execution) => {
    const runData = execution.data?.resultData?.runData || execution.resultData?.runData || {};
    const nodeSummaries = Object.entries(runData).map(([node, runs]) => {
      const first = Array.isArray(runs) ? runs[0] : {};
      return {
        node,
        error: first?.error
          ? {
              message: first.error.message,
              description: first.error.description,
              stack: String(first.error.stack || '').split('\n').slice(0, 2).join('\n'),
            }
          : null,
        output: first?.data?.main?.[0]?.[0]?.json || null,
      };
    });
    return {
      id: execution.id,
      status: execution.status,
      mode: execution.mode,
      startedAt: execution.startedAt,
      stoppedAt: execution.stoppedAt,
      nodeSummaries,
    };
  });
}

async function main() {
  const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const publish = process.argv.includes('--publish');
  const verify = process.argv.includes('--verify');
  const e2e = process.argv.includes('--e2e');
  const lastExecution = process.argv.includes('--last-execution');

  if (!key) throw new Error('N8N_API_KEY ausente. Configure N8N_API_KEY ou N8N_API com a chave da API do n8n.');
  fs.mkdirSync(snapshotDir, { recursive: true });

  const live = await fetchWorkflow(base, key);
  if (live.name !== workflowName) {
    throw new Error(`workflow inesperado: ${live.name}`);
  }

  if (verify && !publish) {
    const verification = verifyPatched(live);
    console.log(JSON.stringify({ workflow_id: workflowId, workflow_name: live.name, verification }, null, 2));
    if (!verification.ok) process.exitCode = 1;
    if (e2e) {
      const e2eResult = await runE2E(env);
      console.log(JSON.stringify({ e2e: e2eResult }, null, 2));
      if (!e2eResult.skipped && (!e2eResult.ok || !e2eResult.payload_preserved || !e2eResult.context_preserved)) {
        process.exitCode = 1;
      }
    }
    if (lastExecution) {
      const executions = await fetchLastExecutions(base, key);
      console.log(JSON.stringify({ executions }, null, 2));
    }
    return;
  }

  const beforeFile = path.join(snapshotDir, `workflow-${workflowId}.before-atualizar-qualificacao-hardening.json`);
  fs.writeFileSync(beforeFile, JSON.stringify(live, null, 2) + '\n');

  const findings = audit(live);
  const patched = patchWorkflow(JSON.parse(JSON.stringify(live)));
  const afterFile = path.join(snapshotDir, `workflow-${workflowId}.after-atualizar-qualificacao-hardening.json`);
  fs.writeFileSync(afterFile, JSON.stringify(patched, null, 2) + '\n');
  fs.writeFileSync(localFile, JSON.stringify(patched, null, 2) + '\n');

  console.log(JSON.stringify({
    workflow_id: workflowId,
    workflow_name: live.name,
    active: live.active,
    publish,
    findings,
    files: {
      before: path.relative(root, beforeFile),
      after: path.relative(root, afterFile),
      local: path.relative(root, localFile),
    },
  }, null, 2));

  if (publish) {
    const result = await publishWorkflow(base, key, patched);
    console.log(JSON.stringify({ published: true, updatedAt: result.updatedAt || null }, null, 2));
    const refreshed = await fetchWorkflow(base, key);
    const verification = verifyPatched(refreshed);
    console.log(JSON.stringify({ verification }, null, 2));
    if (!verification.ok) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
