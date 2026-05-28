const fs = require("fs");
const path = require("path");

const root = process.cwd();
const targetNames = new Set([
  "Ju Runtime Tool Wrapper - consultar_imoveis",
  "Ju Runtime Tool Wrapper - atualizar_qualificacao",
  "Ju Runtime Tool Wrapper - setar_lead_quente",
  "Ju Runtime Tool Wrapper - conhecimento_estrategico_luana1",
  "Ju Runtime Tool Wrapper - conhecimento_estrategico",
  "Ju Runtime Tool Wrapper - conhecimento_estrategico_Ju",
]);

const wrapperCanonical = `const expected = (
  $vars.JUREMA_TOOL_WEBHOOK_SECRET ||
  $vars.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  $vars.EVOLUTION_WEBHOOK_SECRET ||
  $env.JUREMA_TOOL_WEBHOOK_SECRET ||
  $env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
  $env.EVOLUTION_WEBHOOK_SECRET ||
  ''
).trim();`;

const authCanonical = `${wrapperCanonical}
if (!expected) {
  throw new Error('wrapper config error: JUREMA_TOOL_WEBHOOK_SECRET nao configurado em n8n');
}

const provided = (
  headers['x-n8n-api-key'] ||
  headers['X-N8N-API-KEY'] ||
  headers['x-webhook-secret'] ||
  headers['X-Webhook-Secret'] ||
  ''
).toString().trim();

if (provided !== expected) {
  throw new Error('unauthorized: x-n8n-api-key ausente ou invalido');
}
`;

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

function patchString(value) {
  if (!value.includes("const expected =") || (!value.includes("WEBHOOK_SECRET") && !value.includes("webhook-secret"))) return value;
  return value
    .replace(
      /const expected\s*=\s*(?:\([\s\S]*?\)\.trim\(\)|['"][^'"]*['"])\s*;[\s\S]*?const clean\s*=/,
      `${authCanonical}\nconst clean =`,
    )
    .replace(/const expected\s*=\s*(?:\([\s\S]*?\)\.trim\(\)|['"][^'"]*['"])\s*;/, wrapperCanonical);
}

function patchValue(value) {
  if (typeof value === "string") return patchString(value);
  if (Array.isArray(value)) return value.map(patchValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, patchValue(item)]));
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

function listWorkflowsPayload(payload) {
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function authBlocks(workflow) {
  const inspect = (nodes) => (nodes || [])
    .filter((node) => String(node.parameters?.jsCode || "").includes("const expected ="))
    .map((node) => {
      const code = String(node.parameters.jsCode);
      return {
        node: node.name,
        canonical:
          code.includes("$env.JUREMA_TOOL_WEBHOOK_SECRET") &&
          code.includes("$vars.JUREMA_TOOL_WEBHOOK_SECRET") &&
          code.includes("$env.EVOLUTION_WEBHOOK_SECRET") &&
          code.includes("$vars.EVOLUTION_WEBHOOK_SECRET"),
        sandboxCompatible:
          code.indexOf("$vars.JUREMA_TOOL_WEBHOOK_SECRET") < code.indexOf("$env.JUREMA_TOOL_WEBHOOK_SECRET") &&
          code.indexOf("$vars.EVOLUTION_WEBHOOK_SECRET") < code.indexOf("$env.JUREMA_TOOL_WEBHOOK_SECRET"),
        failClosed: /if\s*\(\s*!expected\s*\)/.test(code) && /provided\s*!==\s*expected/.test(code),
      };
    });
  return {
    root: inspect(workflow.nodes),
    activeVersion: inspect(workflow.activeVersion?.nodes),
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const publish = process.argv.includes("--publish");
  if (!key) throw new Error("N8N_API_KEY ausente.");

  const listed = await requestJson(base, key, "/workflows");
  const workflows = listWorkflowsPayload(listed).filter((workflow) => targetNames.has(workflow.name));
  if (!workflows.length) throw new Error("nenhum wrapper alvo encontrado no n8n");

  const results = [];
  for (const item of workflows) {
    const workflow = await requestJson(base, key, `/workflows/${item.id}`);
    const patched = patchValue(workflow);
    const changed = JSON.stringify(workflow.nodes) !== JSON.stringify(patched.nodes);
    if (publish && changed) {
      await requestJson(base, key, `/workflows/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(compactWorkflowForPut(patched)),
      });
      if (workflow.active) {
        await requestJson(base, key, `/workflows/${item.id}/deactivate`, { method: "POST" });
        await requestJson(base, key, `/workflows/${item.id}/activate`, { method: "POST" });
      }
    }
    const refreshed = publish && changed ? await requestJson(base, key, `/workflows/${item.id}`) : patched;
    results.push({
      id: item.id,
      name: item.name,
      active: workflow.active,
      changed,
      published: publish && changed,
      authBlocks: authBlocks(refreshed),
    });
  }

  console.log(JSON.stringify({ publish, results }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
