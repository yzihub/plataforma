const fs = require("fs");
const path = require("path");

const root = process.cwd();
const workflowId = "cj4V6DW0Qy6el0PM";
const localWorkflowPath = path.join(root, "n8n", "production", "workflow-jurema-main.final-hardened.json");

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

function connectOnce(workflow, from, to) {
  workflow.connections[from] ||= { main: [[]] };
  workflow.connections[from].main ||= [[]];
  workflow.connections[from].main[0] ||= [];
  const exists = workflow.connections[from].main[0].some((target) => target.node === to && target.type === "main");
  if (!exists) {
    workflow.connections[from].main[0].push({ node: to, type: "main", index: 0 });
    return true;
  }
  return false;
}

function patchWorkflow(live, shadowNode) {
  let changed = false;
  const existing = live.nodes.find((node) => node.name === shadowNode.name);
  if (existing) {
    const before = JSON.stringify(existing);
    Object.assign(existing, shadowNode);
    changed = JSON.stringify(existing) !== before || changed;
  } else {
    live.nodes.push(shadowNode);
    changed = true;
  }
  changed = connectOnce(live, "Build Context", "Shadow Cognitive Decision") || changed;
  return changed;
}

function verify(workflow) {
  const shadow = workflow.nodes.find((node) => node.name === "Shadow Cognitive Decision");
  const targets = workflow.connections?.["Build Context"]?.main?.[0]?.map((target) => target.node) || [];
  return {
    shadow_exists: Boolean(shadow),
    timeout_800: Boolean(shadow?.parameters?.jsCode?.includes("timeout: 800,")),
    build_context_targets: targets,
    hot_path_preserved: targets.includes("Preparar Runtime Payload"),
    shadow_parallel: targets.includes("Shadow Cognitive Decision"),
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  if (!key) throw new Error("N8N_API_KEY ausente.");

  const local = JSON.parse(fs.readFileSync(localWorkflowPath, "utf8"));
  const shadowNode = local.nodes.find((node) => node.name === "Shadow Cognitive Decision");
  if (!shadowNode) throw new Error("Shadow Cognitive Decision ausente no workflow local.");
  if (!String(shadowNode.parameters?.jsCode || "").includes("timeout: 800,")) {
    throw new Error("Shadow Cognitive Decision local nao esta com timeout de 800ms.");
  }

  const live = await requestJson(base, key, `/workflows/${workflowId}`);
  const patched = JSON.parse(JSON.stringify(live));
  const changed = patchWorkflow(patched, JSON.parse(JSON.stringify(shadowNode)));

  if (changed) {
    await requestJson(base, key, `/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(compactWorkflowForPut(patched)),
    });
  }

  const refreshed = await requestJson(base, key, `/workflows/${workflowId}`);
  console.log(JSON.stringify({
    id: workflowId,
    active: refreshed.active,
    changed,
    updatedAt: refreshed.updatedAt,
    verification: verify(refreshed),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
