const fs = require("fs");
const path = require("path");

const root = process.cwd();
const targets = new Map([
  ["Qi1lut9fEQJUNZd6", "Ju Runtime Tool Wrapper - atualizar_qualificacao"],
  ["lpvnVkc8CVDga5wv", "Ju Runtime Tool Wrapper - conhecimento_estrategico_Ju"],
]);

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

function uuid(label) {
  const hex = Buffer.from(`${label}-${Date.now()}`).toString("hex").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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

function patchValidateNode(node) {
  if (!node || node.name !== "Validate Auth + Payload") return false;
  const before = String(node.parameters?.jsCode || "");
  if (!before.includes("const expected =")) return false;
  let after = before.replace("const item = $input.first().json;", "const item = $input.first().json || {};");
  after = after.replace(
    /const expected\s*=\s*\(\s*([\s\S]*?\|\|\s*''\s*)\)\.trim\(\);/,
    "const expected = String(\n$1).trim();",
  );
  if (after === before) return false;
  node.parameters.jsCode = after;
  return true;
}

function patchWorkflow(workflow) {
  let changed = false;
  for (const node of workflow.nodes || []) changed = patchValidateNode(node) || changed;
  if (workflow.activeVersion?.nodes) {
    for (const node of workflow.activeVersion.nodes) patchValidateNode(node);
  }
  return changed;
}

function validateNodeSet(workflow) {
  const code = String(workflow.nodes?.find((node) => node.name === "Validate Auth + Payload")?.parameters?.jsCode || "");
  return {
    stringExpected: /const expected\s*=\s*String\s*\(/.test(code),
    safeItem: code.includes("const item = $input.first().json || {};"),
    sandboxCompatible:
      code.indexOf("$vars.JUREMA_TOOL_WEBHOOK_SECRET") >= 0 &&
      code.indexOf("$vars.JUREMA_TOOL_WEBHOOK_SECRET") < code.indexOf("$env.JUREMA_TOOL_WEBHOOK_SECRET"),
    failClosed: /if\s*\(\s*!expected\s*\)/.test(code) && /provided\s*!==\s*expected/.test(code),
    payloadPreservation: code.includes("__payload_preserved") || workflow.name?.includes("atualizar_qualificacao"),
  };
}

function verify(workflow) {
  const root = validateNodeSet(workflow);
  const activeVersion = workflow.activeVersion?.nodes ? validateNodeSet(workflow.activeVersion) : null;
  const ok = [root, activeVersion].filter(Boolean).every((item) => item.stringExpected && item.safeItem && item.sandboxCompatible && item.failClosed);
  return { ok, root, activeVersion };
}

async function e2e(env, workflowName) {
  const secret = runtimeSecret(env);
  if (!secret) return { skipped: true, reason: "secret canonico ausente localmente" };
  const base = webhookBase(env);
  const common = {
    tenant_id: env.JU_BEHAVIORAL_QA_TENANT_ID || "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
    phone: env.JU_BEHAVIORAL_QA_PHONE || `5583999${String(Date.now()).slice(-6)}`,
    lead_id: uuid("lead"),
    deal_id: uuid("deal"),
    conversation_id: uuid("conversation"),
    tool_call_id: `codex-sandbox-${Date.now()}`,
    runtime_trace_id: `codex-trace-${Date.now()}`,
  };
  const isConhecimento = workflowName.includes("conhecimento_estrategico");
  const url = `${base}/webhook/${isConhecimento ? "tool-conhecimento-estrategico" : "tool-atualizar-qualificacao"}`;
  const payload = isConhecimento
    ? { tool: "conhecimento_estrategico_Ju", ...common, input: { query: "principios institucionais da qualificacao consultiva", match_count: 1 } }
    : {
        tool: "atualizar_qualificacao",
        ...common,
        input: {
          temperatura: "quente",
          qualificacao_status: "cliente_interessado",
          motivo: "validacao task runner sandbox",
          observacao: "payload real autenticado via Codex",
        },
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
    validateGreen: response.ok,
    payloadPreserved: body?.payload_preserved === true,
    contextPreserved: Boolean(body?.context?.tenant_id && body?.context?.conversation_id && body?.context?.tool_call_id),
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const publish = process.argv.includes("--publish");
  const runE2e = process.argv.includes("--e2e");
  if (!key) throw new Error("N8N_API_KEY ausente.");

  const results = [];
  for (const [id, expectedName] of targets) {
    const workflow = await requestJson(base, key, `/workflows/${id}`);
    if (workflow.name !== expectedName) throw new Error(`workflow inesperado ${id}: ${workflow.name}`);
    const patched = JSON.parse(JSON.stringify(workflow));
    const changed = patchWorkflow(patched);
    if (publish && changed) {
      await requestJson(base, key, `/workflows/${id}`, { method: "PUT", body: JSON.stringify(compactWorkflowForPut(patched)) });
      if (workflow.active) {
        await requestJson(base, key, `/workflows/${id}/deactivate`, { method: "POST" });
        await requestJson(base, key, `/workflows/${id}/activate`, { method: "POST" });
      }
    }
    const refreshed = publish && changed ? await requestJson(base, key, `/workflows/${id}`) : patched;
    results.push({
      id,
      name: workflow.name,
      active: refreshed.active,
      changed,
      published: publish && changed,
      verification: verify(refreshed),
      e2e: runE2e ? await e2e(env, workflow.name) : undefined,
    });
  }
  console.log(JSON.stringify({ publish, results }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
