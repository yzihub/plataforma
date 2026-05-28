const fs = require("fs");
const path = require("path");

const root = process.cwd();
const CONSULTAR_WORKFLOW_ID = "0udn6N4YelE6F2Ws";
const CONSULTAR_WORKFLOW_NAME = "consultar_imoveis";

const oldApiKeyBlock = `const apiKey =
$env.SUPABASE_SERVICE_ROLE_KEY ||
$env.JUREMA_SUPABASE_SERVICE_ROLE_KEY;`;

const newApiKeyBlock = `const apiKey = String(
$vars.SUPABASE_SERVICE_ROLE_KEY ||
$vars.JUREMA_SUPABASE_SERVICE_ROLE_KEY ||
$env.SUPABASE_SERVICE_ROLE_KEY ||
$env.JUREMA_SUPABASE_SERVICE_ROLE_KEY ||
''
).trim();

if (!apiKey) {
throw new Error(
'SUPABASE_SERVICE_ROLE_KEY nao configurada no ambiente n8n.'
);
}`;

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

function runtimeSecret(env) {
  const value = env.JUREMA_TOOL_WEBHOOK_SECRET || env.RUNTIME_COGNITIVE_WEBHOOK_SECRET || env.EVOLUTION_WEBHOOK_SECRET || "";
  return /^https?:\/\//i.test(value) ? "" : value;
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

function patchConsultarWorkflow(workflow) {
  let changed = false;
  let targetNode = null;
  const nodeSets = [
    ...(workflow.nodes || []).map((node) => ({ node, source: "root" })),
    ...(workflow.activeVersion?.nodes || []).map((node) => ({ node, source: "activeVersion" })),
  ];
  for (const { node, source } of nodeSets) {
    const code = String(node.parameters?.jsCode || "");
    if (!code.includes("consultar_imoveis") && !code.includes("SUPABASE_SERVICE_ROLE_KEY")) continue;
    if (code.includes(oldApiKeyBlock)) {
      node.parameters.jsCode = code.replace(oldApiKeyBlock, newApiKeyBlock);
      changed = true;
      targetNode = `${source}:${node.name}`;
      continue;
    }
    if (code.includes(newApiKeyBlock)) targetNode = `${source}:${node.name}`;
  }
  return { changed, targetNode };
}

function verifySandboxPatch(workflow) {
  const nodes = [...(workflow.nodes || []), ...(workflow.activeVersion?.nodes || [])];
  const code = nodes.map((node) => String(node.parameters?.jsCode || "")).join("\n\n");
  return {
    varsBeforeEnv:
      code.includes("$vars.SUPABASE_SERVICE_ROLE_KEY") &&
      code.includes("$env.SUPABASE_SERVICE_ROLE_KEY") &&
      code.indexOf("$vars.SUPABASE_SERVICE_ROLE_KEY") < code.indexOf("$env.SUPABASE_SERVICE_ROLE_KEY"),
    hasJuremaFallback: code.includes("$vars.JUREMA_SUPABASE_SERVICE_ROLE_KEY") && code.includes("$env.JUREMA_SUPABASE_SERVICE_ROLE_KEY"),
    trimsString: code.includes("const apiKey = String(") && code.includes(").trim();"),
    failClosed: code.includes("SUPABASE_SERVICE_ROLE_KEY nao configurada no ambiente n8n."),
    oldBlockAbsent: !code.includes(oldApiKeyBlock),
  };
}

function inspectCandidates(workflow) {
  return [
    ...(workflow.nodes || []).map((node) => ({ node, source: "root" })),
    ...(workflow.activeVersion?.nodes || []).map((node) => ({ node, source: "activeVersion" })),
  ]
    .map(({ node, source }) => {
      const code = String(node.parameters?.jsCode || "");
      const text = JSON.stringify(node.parameters || {});
      return {
        source,
        name: node.name,
        type: node.type,
        hasCode: Boolean(code),
        codeLength: code.length,
        mentionsConsultar: text.includes("consultar_imoveis"),
        mentionsSupabaseServiceRole: text.includes("SUPABASE_SERVICE_ROLE_KEY"),
        mentionsVarsServiceRole: text.includes("$vars.SUPABASE_SERVICE_ROLE_KEY"),
        mentionsEnvServiceRole: text.includes("$env.SUPABASE_SERVICE_ROLE_KEY"),
      };
    })
    .filter((item) => item.hasCode || item.mentionsConsultar || item.mentionsSupabaseServiceRole);
}

async function e2e(env) {
  const secret = runtimeSecret(env);
  if (!secret) return { skipped: true, reason: "secret canonico ausente localmente" };
  const url = `${webhookBase(env)}/webhook/tool-consultar-imoveis`;
  const payload = {
    tool: "consultar_imoveis",
    tenant_id: env.JU_BEHAVIORAL_QA_TENANT_ID || "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
    phone: env.JU_BEHAVIORAL_QA_PHONE || `5583998${String(Date.now()).slice(-6)}`,
    bairro: "Bessa",
    tipo_imovel: "apartamento",
    quartos: "3",
    valor_max: "600000",
    budget_max: "600000",
    tool_call_id: `codex-consultar-${Date.now()}`,
    runtime_trace_id: `codex-trace-${Date.now()}`,
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-N8N-API-KEY": secret },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {}
  return {
    skipped: false,
    status: response.status,
    ok: response.ok,
    tool: body?.tool || body?.data?.tool || null,
    total: body?.total ?? body?.data?.total ?? body?.result?.total ?? null,
    hasCards: Boolean(body?.cards?.length || body?.data?.cards?.length || body?.result?.cards?.length),
    rawPreview: text.slice(0, 500),
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const publish = process.argv.includes("--publish");
  const runE2e = process.argv.includes("--e2e");
  if (!key) throw new Error("N8N_API_KEY ausente.");

  if (process.argv.includes("--find-all")) {
    const listed = await requestJson(base, key, "/workflows");
    const workflowList = Array.isArray(listed.data) ? listed.data : Array.isArray(listed) ? listed : [];
    const matches = [];
    for (const item of workflowList) {
      const workflow = await requestJson(base, key, `/workflows/${item.id}`);
      const candidates = inspectCandidates(workflow)
        .filter((candidate) => candidate.mentionsConsultar || candidate.mentionsSupabaseServiceRole);
      if (candidates.length || String(workflow.name || "").toLowerCase().includes("consultar")) {
        matches.push({
          id: item.id,
          name: workflow.name,
          active: workflow.active,
          candidates,
        });
      }
    }
    console.log(JSON.stringify({ matches }, null, 2));
    return;
  }

  const workflow = await requestJson(base, key, `/workflows/${CONSULTAR_WORKFLOW_ID}`);
  if (workflow.name !== CONSULTAR_WORKFLOW_NAME) {
    throw new Error(`workflow inesperado ${CONSULTAR_WORKFLOW_ID}: ${workflow.name}`);
  }

  const patched = JSON.parse(JSON.stringify(workflow));
  const patch = patchConsultarWorkflow(patched);
  if (!patch.targetNode && !process.argv.includes("--inspect")) {
    console.log(JSON.stringify({
      workflow_id: CONSULTAR_WORKFLOW_ID,
      workflow_name: workflow.name,
      active: workflow.active,
      changed: false,
      published: false,
      error: "bloco SUPABASE_SERVICE_ROLE_KEY nao encontrado na tool consultar_imoveis",
      candidates: inspectCandidates(workflow),
    }, null, 2));
    process.exit(1);
  }
  if (publish && patch.changed) {
    await requestJson(base, key, `/workflows/${CONSULTAR_WORKFLOW_ID}`, {
      method: "PUT",
      body: JSON.stringify(compactWorkflowForPut(patched)),
    });
    if (workflow.active) {
      await requestJson(base, key, `/workflows/${CONSULTAR_WORKFLOW_ID}/deactivate`, { method: "POST" });
      await requestJson(base, key, `/workflows/${CONSULTAR_WORKFLOW_ID}/activate`, { method: "POST" });
    }
  }

  const refreshed = publish && patch.changed ? await requestJson(base, key, `/workflows/${CONSULTAR_WORKFLOW_ID}`) : patched;
  const verification = verifySandboxPatch(refreshed);
  const ok = Object.values(verification).every(Boolean);
  console.log(JSON.stringify({
    workflow_id: CONSULTAR_WORKFLOW_ID,
    workflow_name: workflow.name,
    active: refreshed.active,
    target_node: patch.targetNode,
    changed: patch.changed,
    published: publish && patch.changed,
    verification: { ok, ...verification },
    candidates: process.argv.includes("--inspect") ? inspectCandidates(refreshed) : undefined,
    e2e: runE2e ? await e2e(env) : undefined,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
