const fs = require("fs");
const path = require("path");

const workflowPath = path.join("n8n", "production", "workflow-jurema-main.final-hardened.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

function ensureNode(node) {
  const existing = workflow.nodes.find((item) => item.name === node.name);
  if (existing) {
    Object.assign(existing, node);
    return existing;
  }
  workflow.nodes.push(node);
  return node;
}

function connectOnce(from, to) {
  workflow.connections[from] ||= { main: [[]] };
  workflow.connections[from].main ||= [[]];
  workflow.connections[from].main[0] ||= [];
  const exists = workflow.connections[from].main[0].some((target) => target.node === to && target.type === "main");
  if (!exists) {
    workflow.connections[from].main[0].push({ node: to, type: "main", index: 0 });
  }
}

const shadowCode = String.raw`
async function n8nHttpRequest(options) {
  if (this && this.helpers && typeof this.helpers.httpRequest === 'function') {
    return await this.helpers.httpRequest(options);
  }
  if (this && this.helpers && typeof this.helpers.request === 'function') {
    return await this.helpers.request(options);
  }
  throw new Error('Nenhum helper HTTP disponivel no Code node.');
}

async function supabaseRequest({ baseUrl, apiKey, method, path, body, prefer }) {
  const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
  const cleanPath = String(path || '').startsWith('/') ? path : '/' + path;
  const headers = {
    apikey: apiKey,
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const options = { method, url: cleanBase + cleanPath, headers, json: true };
  if (body !== undefined) options.body = body;
  return await n8nHttpRequest.call(this, options);
}

function optionalNodeJson(name) {
  try { return $(name).first().json || {}; } catch (error) { return {}; }
}

function clean(value) {
  return String(value ?? '').trim();
}

function asUuid(value) {
  const output = clean(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(output) ? output : null;
}

function asArray(value) {
  return Array.isArray(value) ? value.map((item) => clean(item)).filter(Boolean) : [];
}

const started = Date.now();
const input = $json || {};
const db = optionalNodeJson('dados do banco');
const env = typeof $env !== 'undefined' ? $env : {};
const runtimeUrl = clean(
  env.YZI_COGNITIVE_DECISION_URL ||
  env.YZI_COGNITIVE_RUNTIME_DECIDE_URL ||
  db.YZI_COGNITIVE_DECISION_URL ||
  'https://runtime.yzihub.com/cognitive/decide'
);
const runtimeSecret = clean(
  env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  env.EVOLUTION_WEBHOOK_SECRET ||
  env.N8N_API_KEY ||
  env.N8N_API ||
  db.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  db.EVOLUTION_WEBHOOK_SECRET ||
  db.N8N_API_KEY ||
  db.N8N_API ||
  ''
);

const n8nDecision = {
  governance_version: 'n8n_current',
  owner_pipeline: 'n8n',
  funnel_stage: clean(input.runtime_state?.funnel_stage || input.runtime_memory?.funnel_stage || input.operational_context?.funnel_stage) || null,
  next_best_action: clean(input.objective_state?.next_best_action || input.runtime_memory?.next_best_action || input.next_action) || null,
  property_presentation_due: input.property_presentation_due === true || input.runtime_state?.property_presentation_due === true || input.runtime_memory?.property_presentation_due === true,
  retrieval_policy: clean(input.retrieval_policy) || null,
  required_tools: asArray(input.required_tools),
  allowed_tools: asArray(input.allowed_tools),
  signals: {
    inventory_fatigue: input.runtime_memory?.inventory_fatigue === true,
    spouse_decision: input.runtime_memory?.spouse_decision_signal === true,
    revisit_inventory_signal: input.runtime_memory?.revisit_inventory_signal === true,
    favorite_signal: input.runtime_memory?.favorite_signal === true,
    visit_intent_signal: input.runtime_memory?.visit_intent_signal === true,
    property_intent_signal: input.runtime_memory?.property_intent_signal === true,
  },
};

const payload = {
  ...input,
  dry_run: true,
  shadow_original: {
    next_best_action: n8nDecision.next_best_action,
    property_presentation_due: n8nDecision.property_presentation_due,
    required_tools: n8nDecision.required_tools,
    funnel_stage: n8nDecision.funnel_stage,
    governance_flags: n8nDecision.signals,
    inventory_fatigue: n8nDecision.signals.inventory_fatigue,
    spouse_decision: n8nDecision.signals.spouse_decision,
    rendered_context: input._context || null,
  },
};

const baseUrl = db.URL_SUPABASE || db.SUPABASE_URL || 'https://dwmbklfkrtumfaxrbxio.supabase.co';
const apiKey = db.SUPABASE_SECRET_KEY || db.SUPABASE_SERVICE_ROLE_KEY || db.SUPABASE_ANON_KEY || '';

async function persistShadow(row) {
  if (!baseUrl || !apiKey) return;
  await supabaseRequest.call(this, {
    baseUrl,
    apiKey,
    method: 'POST',
    path: '/rest/v1/ju_runtime_shadow_decisions',
    body: row,
    prefer: 'return=minimal',
  });
}

try {
  const response = await n8nHttpRequest.call(this, {
    method: 'POST',
    url: runtimeUrl,
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': runtimeSecret,
      'x-request-id': input.message_id || input.conversation_id || input.sessionId || String(Date.now()),
    },
    body: payload,
    json: true,
    timeout: 800,
  });

  const divergence = response.divergence || {};
  const shadowStatus = response.ok === true ? 'ok' : 'failed';
  await persistShadow.call(this, {
    trace_id: clean(response.trace_id) || 'shadow_' + Date.now(),
    request_id: clean(response.request_id) || null,
    tenant_id: asUuid(response.tenant_id || input.tenant_id || input.lead?.tenant_id),
    conversation_id: asUuid(response.conversation_id || input.conversation_id || input.conversation?.id),
    lead_id: asUuid(response.lead_id || input.lead_id || input.lead?.id),
    deal_id: asUuid(response.deal_id || input.deal_id || input.deal?.id),
    message_id: clean(input.message_id || input.data?.key?.id) || null,
    phone: clean(response.phone || input.telefoneCompleto || input.remoteJid) || null,
    governance_version: clean(response.governance_version) || 'ju_hardened_hot_path_contract_v1',
    shadow_status: shadowStatus,
    owner_pipeline: 'n8n',
    shadow_pipeline: 'pipeline_b',
    n8n_decision: n8nDecision,
    pipeline_b_decision: response.decision || {},
    pipeline_b_signals: response.signals || {},
    pipeline_b_runtime_memory: response.runtime_memory || {},
    runtime_context: response.context || {},
    divergence_payload: divergence,
    retrieval_divergent: divergence.retrieval_divergent,
    next_best_action_divergent: divergence.next_best_action_divergent,
    stage_divergent: divergence.stage_divergent,
    property_presentation_due_divergent: divergence.property_presentation_due_divergent,
    retrieval_activation_mismatch: divergence.retrieval_activation_mismatch,
    tool_activation_divergent: divergence.tool_activation_divergent,
    property_presentation_mismatch: divergence.property_presentation_mismatch,
    fallback_used: false,
    timeout_occurred: false,
    shadow_failed: response.ok !== true,
    shadow_error: response.ok === true ? null : clean(response.error) || 'runtime_not_ok',
    latency_ms: Number(response.metrics?.latency_ms || (Date.now() - started)),
  });
} catch (error) {
  try {
    await persistShadow.call(this, {
      trace_id: 'shadow_failed_' + Date.now(),
      tenant_id: asUuid(input.tenant_id || input.lead?.tenant_id),
      conversation_id: asUuid(input.conversation_id || input.conversation?.id),
      lead_id: asUuid(input.lead_id || input.lead?.id),
      deal_id: asUuid(input.deal_id || input.deal?.id),
      message_id: clean(input.message_id || input.data?.key?.id) || null,
      phone: clean(input.telefoneCompleto || input.remoteJid) || null,
      shadow_status: /timeout|timed out|ETIMEDOUT/i.test(error instanceof Error ? error.message : String(error)) ? 'timeout' : 'failed',
      n8n_decision: n8nDecision,
      pipeline_b_decision: {},
      pipeline_b_signals: {},
      pipeline_b_runtime_memory: {},
      runtime_context: {},
      divergence_payload: { error: error instanceof Error ? error.message : String(error) },
      fallback_used: false,
      timeout_occurred: /timeout|timed out|ETIMEDOUT/i.test(error instanceof Error ? error.message : String(error)),
      shadow_failed: true,
      shadow_error: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - started,
    });
  } catch (persistError) {}
}

return [{ json: { ...input, shadow_cognitive_decision_dispatched: true } }];
`;

ensureNode({
  id: "9eb9de8c-9505-4c86-93d9-p0-shadow-decision",
  name: "Shadow Cognitive Decision",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [10304, 1264],
  parameters: {
    jsCode: shadowCode.trim(),
  },
});

connectOnce("Build Context", "Shadow Cognitive Decision");

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + "\n");
console.log("Patched " + workflowPath + " with Shadow Cognitive Decision branch.");
