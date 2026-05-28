const fs = require("fs");
const path = require("path");

const root = process.cwd();
const workflowId = "lpvnVkc8CVDga5wv";
const localFile = path.join(root, "n8n", "production", "runtime-tools", "wrapper-tool-conhecimento-estrategico-ju.v1.json");
const snapshotDir = path.join(root, "n8n", "archive", "snapshots");

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
}

function apiKey(env) {
  if (env.N8N_API_KEY) return env.N8N_API_KEY;
  if (env.N8N_API && !/^https?:\/\//i.test(env.N8N_API)) return env.N8N_API;
  return "";
}

function apiBase(env) {
  if (env.N8N_API_BASE) return env.N8N_API_BASE.replace(/\/+$/, "");
  if (env.N8N_API_URL) return env.N8N_API_URL.replace(/\/+$/, "");
  if (env.N8N_API && /^https?:\/\//i.test(env.N8N_API)) return env.N8N_API.replace(/\/+$/, "");
  return "https://app.yzihub.com/api/v1";
}

function webhookBase(env) {
  return apiBase(env).replace(/\/api\/v1$/i, "");
}

function uuid(label) {
  const hex = Buffer.from(`${label}-${Date.now()}`).toString("hex").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function runtimeSecret(env) {
  return env.JUREMA_TOOL_WEBHOOK_SECRET || env.RUNTIME_COGNITIVE_WEBHOOK_SECRET || env.EVOLUTION_WEBHOOK_SECRET || "";
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
  $vars.JUREMA_TOOL_WEBHOOK_SECRET ||
  $vars.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  $vars.EVOLUTION_WEBHOOK_SECRET ||
  $env.JUREMA_TOOL_WEBHOOK_SECRET ||
  $env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  $env.EVOLUTION_WEBHOOK_SECRET ||
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

const query = pick(input.query, input.q, input.message, input.question, body.query, body.q, body.message, body.question);
const match_count = Math.min(Math.max(Number(input.match_count ?? body.match_count) || 4, 1), 8);

if (!canonical.tenant_id) throw new Error('payload invalido: tenant_id ausente');
if (!query) throw new Error('payload invalido: query/q/message ausente');
if (query.length > 1600) throw new Error('payload invalido: query > 1600 chars');

return [{
  json: {
    ...body,
    ...input,
    ...canonical,
    __started_at: started,
    __original_payload: body,
    __payload_preserved: true,
    query,
    match_count
  }
}];`;

const prepareCode = `// Extract embedding vector and forward the full validated runtime state.
const embRes = $input.first().json || {};
const vector = embRes?.data?.[0]?.embedding;
if (!Array.isArray(vector) || vector.length === 0) {
  throw new Error('embedding falhou: vetor vazio na resposta da OpenAI');
}

const state = $('Validate Auth + Payload').first().json || {};
return [{
  json: {
    ...state,
    query_embedding: vector
  }
}];`;

const formatCode = `const validated = $('Validate Auth + Payload').first().json || {};
const state = $('Prepare Vector RPC').first().json || validated;
const started = validated.__started_at || state.__started_at || Date.now();
const raw = $input.first().json;

let rows = [];
if (Array.isArray(raw)) rows = raw;
else if (Array.isArray(raw?.data)) rows = raw.data;
else if (Array.isArray(raw?.result)) rows = raw.result;
else if (Array.isArray(raw?.body)) rows = raw.body;

const clean = (v) => String(v ?? '').trim();
const chunks = rows.slice(0, state.match_count).map((row, idx) => ({
  rank: idx + 1,
  similarity: typeof row.similarity === 'number' ? row.similarity : (typeof row.score === 'number' ? row.score : null),
  content: clean(row.content || row.text || row.chunk || row.page_content).slice(0, 1800),
  source: row.metadata?.source || row.source || null,
  doc_id: row.id || row.metadata?.id || null,
  metadata: row.metadata || null
}));

const combined = chunks.map((c) => c.content).filter(Boolean).join('\\n\\n---\\n\\n').slice(0, 6000);

return [{
  json: {
    ok: true,
    tool: 'conhecimento_estrategico_Ju',
    latency_ms: Date.now() - started,
    payload_preserved: validated.__payload_preserved === true,
    context: {
      tenant_id: state.tenant_id || validated.tenant_id || null,
      phone: state.phone || validated.phone || null,
      lead_id: state.lead_id || validated.lead_id || null,
      deal_id: state.deal_id || validated.deal_id || null,
      conversation_id: state.conversation_id || validated.conversation_id || null,
      tool_call_id: state.tool_call_id || validated.tool_call_id || null,
      runtime_trace_id: state.runtime_trace_id || validated.runtime_trace_id || null
    },
    output: {
      success: chunks.length > 0,
      query: state.query,
      tenant_id: state.tenant_id,
      total: chunks.length,
      chunks,
      doctrine: chunks.slice(0, 2),
      output: combined,
      warning: chunks.length === 0 ? 'no_match_documents' : null
    }
  }
}];`;

function patchWorkflow(workflow) {
  const validate = workflow.nodes?.find((node) => node.name === "Validate Auth + Payload");
  const prepare = workflow.nodes?.find((node) => node.name === "Prepare Vector RPC");
  const format = workflow.nodes?.find((node) => node.name === "Format Response");

  if (!validate) throw new Error("Validate Auth + Payload not found");
  if (!prepare) throw new Error("Prepare Vector RPC not found");
  if (!format) throw new Error("Format Response not found");

  validate.parameters = validate.parameters || {};
  validate.parameters.jsCode = validateCode;
  prepare.parameters = prepare.parameters || {};
  prepare.parameters.jsCode = prepareCode;
  format.parameters = format.parameters || {};
  format.parameters.jsCode = formatCode;

  if (workflow.activeVersion?.nodes) {
    patchWorkflow(workflow.activeVersion);
  }

  return workflow;
}

async function requestJson(base, key, url, init = {}) {
  const response = await fetch(`${base}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": key,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status} ${text.slice(0, 1000)}`);
  return text ? JSON.parse(text) : {};
}

async function runE2E(env) {
  const secret = runtimeSecret(env);
  const payload = {
    tool: "conhecimento_estrategico_Ju",
    tenant_id: env.JU_BEHAVIORAL_QA_TENANT_ID || "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
    phone: env.JU_BEHAVIORAL_QA_PHONE || `5583999${String(Date.now()).slice(-6)}`,
    lead_id: uuid("lead"),
    deal_id: uuid("deal"),
    conversation_id: uuid("conversation"),
    tool_call_id: `codex-conhecimento-${Date.now()}`,
    runtime_trace_id: `codex-trace-${Date.now()}`,
    input: {
      query: "Quais principios institucionais orientam a qualificacao consultiva da Ju?",
      match_count: 2,
    },
  };

  const negative = await fetch(`${webhookBase(env)}/webhook/tool-conhecimento-estrategico`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!secret || /^https?:\/\//i.test(secret)) {
    return {
      skipped: true,
      reason: "JUREMA_TOOL_WEBHOOK_SECRET/RUNTIME_COGNITIVE_WEBHOOK_SECRET/EVOLUTION_WEBHOOK_SECRET ausente localmente",
      negative_auth_rejected: !negative.ok,
      negative_status: negative.status,
    };
  }

  const response = await fetch(`${webhookBase(env)}/webhook/tool-conhecimento-estrategico`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": secret,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
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
        body?.context?.runtime_trace_id,
    ),
    output_success: body?.output?.success === true,
    total: typeof body?.output?.total === "number" ? body.output.total : null,
    negative_auth_rejected: !negative.ok,
    negative_status: negative.status,
  };
}

function audit(workflow) {
  const findings = [];
  for (const node of workflow.nodes || []) {
    const code = String(node.parameters?.jsCode || node.parameters?.functionCode || "");
    if (!code) continue;
    if (/return\s+\[\s*\{\s*json\s*:\s*\{/.test(code) && !code.includes("...body") && !code.includes("...state")) {
      findings.push({
        node: node.name,
        type: node.type,
        reason: "Code node recria json minimo e pode descartar payload institucional.",
      });
    }
  }
  return findings;
}

function verifyNodeSet(workflow) {
  const validate = workflow.nodes?.find((node) => node.name === "Validate Auth + Payload");
  const prepare = workflow.nodes?.find((node) => node.name === "Prepare Vector RPC");
  const format = workflow.nodes?.find((node) => node.name === "Format Response");
  const validateCodeLive = String(validate?.parameters?.jsCode || "");
  const prepareCodeLive = String(prepare?.parameters?.jsCode || "");
  const formatCodeLive = String(format?.parameters?.jsCode || "");
  const requiredValidate = [
    "$env.JUREMA_TOOL_WEBHOOK_SECRET",
    "$vars.JUREMA_TOOL_WEBHOOK_SECRET",
    "$env.RUNTIME_COGNITIVE_WEBHOOK_SECRET",
    "$vars.RUNTIME_COGNITIVE_WEBHOOK_SECRET",
    "$env.EVOLUTION_WEBHOOK_SECRET",
    "$vars.EVOLUTION_WEBHOOK_SECRET",
    "__original_payload",
    "__payload_preserved",
    "...body",
    "...input",
    "conversation_id",
    "tool_call_id",
    "runtime_trace_id",
  ];
  const requiredFormat = [
    "payload_preserved",
    "context",
    "tenant_id",
    "lead_id",
    "deal_id",
    "conversation_id",
    "tool_call_id",
    "runtime_trace_id",
  ];
  const missingValidate = requiredValidate.filter((token) => !validateCodeLive.includes(token));
  const missingFormat = requiredFormat.filter((token) => !formatCodeLive.includes(token));
  return {
    ok: missingValidate.length === 0 && missingFormat.length === 0 && prepareCodeLive.includes("...state"),
    canonical_auth:
      validateCodeLive.includes("$env.JUREMA_TOOL_WEBHOOK_SECRET") &&
      validateCodeLive.includes("$vars.JUREMA_TOOL_WEBHOOK_SECRET") &&
      validateCodeLive.includes("$env.EVOLUTION_WEBHOOK_SECRET") &&
      validateCodeLive.includes("$vars.EVOLUTION_WEBHOOK_SECRET"),
    payload_preservation: validateCodeLive.includes("__payload_preserved") && prepareCodeLive.includes("...state") && formatCodeLive.includes("context"),
    fail_closed: validateCodeLive.includes("if (!expected)") && validateCodeLive.includes("provided !== expected"),
    missingValidate,
    missingFormat,
  };
}

function verify(workflow) {
  const root = verifyNodeSet(workflow);
  const activeVersion = workflow.activeVersion?.nodes ? verifyNodeSet(workflow.activeVersion) : null;
  return {
    ok: root.ok && (!activeVersion || activeVersion.ok),
    active: workflow.active,
    name: workflow.name,
    root,
    activeVersion,
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const publish = process.argv.includes("--publish");
  const verifyOnly = process.argv.includes("--verify");
  const e2e = process.argv.includes("--e2e");
  if (!key) throw new Error("N8N_API_KEY ausente. Configure N8N_API_KEY ou N8N_API.");

  const live = await requestJson(base, key, `/workflows/${workflowId}`);
  if (verifyOnly && !publish) {
    console.log(JSON.stringify({ workflow_id: workflowId, verification: verify(live) }, null, 2));
    if (!verify(live).ok) process.exitCode = 1;
    if (e2e) {
      const e2eResult = await runE2E(env);
      console.log(JSON.stringify({ e2e: e2eResult }, null, 2));
      if (
        !e2eResult.skipped &&
        (!e2eResult.ok || !e2eResult.payload_preserved || !e2eResult.context_preserved || !e2eResult.negative_auth_rejected)
      ) {
        process.exitCode = 1;
      }
    }
    return;
  }

  fs.mkdirSync(snapshotDir, { recursive: true });
  const beforeFile = path.join(snapshotDir, `workflow-${workflowId}.before-conhecimento-estrategico-ju-hardening.json`);
  const afterFile = path.join(snapshotDir, `workflow-${workflowId}.after-conhecimento-estrategico-ju-hardening.json`);
  fs.writeFileSync(beforeFile, JSON.stringify(live, null, 2) + "\n");

  const findings = audit(live);
  const patched = patchWorkflow(JSON.parse(JSON.stringify(live)));
  fs.writeFileSync(afterFile, JSON.stringify(patched, null, 2) + "\n");
  fs.writeFileSync(localFile, JSON.stringify(patched, null, 2) + "\n");

  console.log(
    JSON.stringify(
      {
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
        verification: verify(patched),
      },
      null,
      2,
    ),
  );

  if (publish) {
    await requestJson(base, key, `/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(compactWorkflowForPut(patched)),
    });
    if (live.active) {
      await requestJson(base, key, `/workflows/${workflowId}/deactivate`, { method: "POST" });
      await requestJson(base, key, `/workflows/${workflowId}/activate`, { method: "POST" });
    }
    const refreshed = await requestJson(base, key, `/workflows/${workflowId}`);
    const verification = verify(refreshed);
    console.log(JSON.stringify({ published: true, verification }, null, 2));
    if (!verification.ok) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
