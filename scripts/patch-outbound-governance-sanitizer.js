const fs = require("fs");
const path = require("path");

const root = process.cwd();
const workflowId = "cj4V6DW0Qy6el0PM";
const sanitizerName = "Sanitize Outbound Governance Signals";

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
      ...(settings.timezone ? { timezone: settings.timezone } : {}),
    },
    staticData: workflow.staticData || {},
  };
}

function nodeByName(workflow, name) {
  return (workflow.nodes || []).find((node) => node.name === name);
}

function outgoingMain(workflow, name) {
  return workflow.connections?.[name]?.main?.[0] || [];
}

function hasConnection(workflow, from, to) {
  return outgoingMain(workflow, from).some((edge) => edge.node === to && edge.type === "main");
}

function connect(workflow, from, to) {
  workflow.connections = workflow.connections || {};
  workflow.connections[from] = workflow.connections[from] || {};
  workflow.connections[from].main = workflow.connections[from].main || [[]];
  if (!workflow.connections[from].main[0]) workflow.connections[from].main[0] = [];
  if (!hasConnection(workflow, from, to)) {
    workflow.connections[from].main[0].push({ node: to, type: "main", index: 0 });
  }
}

function disconnect(workflow, from, to) {
  const edges = outgoingMain(workflow, from);
  workflow.connections[from].main[0] = edges.filter((edge) => edge.node !== to);
}

function sanitizerNode(position) {
  return {
    parameters: {
      jsCode: `// Strip governance/internal/debug/guardrail tags from outbound text,
// preserving the rest of the message. NEVER drop the item; never produce blank turns.
const TAG_PATTERNS = [
  /\\[governance_violation:[^\\]]*\\]\\s*/gi,
  /\\[internal:[^\\]]*\\]\\s*/gi,
  /\\[debug:[^\\]]*\\]\\s*/gi,
  /\\[guardrail:[^\\]]*\\]\\s*/gi,
];

function stripTags(value) {
  let text = String(value || '');
  for (const pattern of TAG_PATTERNS) {
    text = text.replace(pattern, '');
  }
  return text.replace(/\\s{2,}/g, ' ').trim();
}

function collectTags(value) {
  const tags = [];
  for (const pattern of TAG_PATTERNS) {
    const matches = String(value || '').match(pattern);
    if (matches) tags.push(...matches.map((tag) => tag.trim()));
  }
  return tags;
}

return items.map(item => {
  const data = item.json || {};
  const originalKey = ['resposta', 'output', 'message'].find((key) => typeof data[key] === 'string' && data[key].length);
  const original = originalKey ? data[originalKey] : '';
  const tagsRemoved = collectTags(original);
  const sanitized = stripTags(original);

  // Fail-safe: if everything was a tag, surface a minimal handoff message
  // instead of producing a blank/silent turn.
  const safe = sanitized || (original ? 'Posso te chamar em alguns minutos pra continuar nossa conversa por aqui?' : '');

  return {
    json: {
      ...data,
      ...(originalKey ? { [originalKey]: safe } : {}),
      __governance_tags_removed: tagsRemoved,
      __governance_sanitized: tagsRemoved.length > 0,
      __governance_blank_recovered: Boolean(original) && !sanitized,
    },
  };
});`,
    },
    id: "sanitize-outbound-governance-signals",
    name: sanitizerName,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
  };
}

function findPatchPoint(workflow) {
  const arrayName = nodeByName(workflow, "ArrayResposta") ? "ArrayResposta" : "ArrayResposta1";
  const array = nodeByName(workflow, arrayName);
  if (!array) throw new Error("node ArrayResposta nao encontrado");
  const edges = outgoingMain(workflow, arrayName);
  const sanitizerEdge = edges.find((edge) => edge.node === sanitizerName);
  if (sanitizerEdge) {
    const downstream = outgoingMain(workflow, sanitizerName)[0];
    if (!downstream) throw new Error(`${sanitizerName} sem saida main`);
    return { source: arrayName, target: downstream.node };
  }
  const splitEdge =
    edges.find((edge) => /split/i.test(edge.node)) ||
    edges.find((edge) => /Evolution/i.test(edge.node)) ||
    edges[0];
  if (!splitEdge) throw new Error(`${arrayName} sem saida main`);
  return { source: arrayName, target: splitEdge.node };
}

function patchWorkflow(workflow) {
  const { source, target } = findPatchPoint(workflow);
  let changed = false;
  let sanitizer = nodeByName(workflow, sanitizerName);
  if (!sanitizer) {
    const sourceNode = nodeByName(workflow, source);
    const targetNode = nodeByName(workflow, target);
    const sx = sourceNode?.position?.[0] ?? 0;
    const sy = sourceNode?.position?.[1] ?? 0;
    const tx = targetNode?.position?.[0] ?? sx + 400;
    const position = [Math.round((sx + tx) / 2), sy];
    sanitizer = sanitizerNode(position);
    workflow.nodes.push(sanitizer);
    changed = true;
  }

  const beforeDirect = hasConnection(workflow, source, target);
  if (beforeDirect) {
    disconnect(workflow, source, target);
    changed = true;
  }
  if (!hasConnection(workflow, source, sanitizerName)) {
    connect(workflow, source, sanitizerName);
    changed = true;
  }
  if (!hasConnection(workflow, sanitizerName, target)) {
    connect(workflow, sanitizerName, target);
    changed = true;
  }

  return { changed, source, target };
}

function verify(workflow) {
  const sanitizer = nodeByName(workflow, sanitizerName);
  const point = findPatchPoint(workflow);
  const code = String(sanitizer?.parameters?.jsCode || "");
  const stripsTags =
    code.includes("governance_violation:") &&
    code.includes("internal:") &&
    code.includes("debug:") &&
    code.includes("guardrail:") &&
    code.includes("stripTags") &&
    !/items\.filter\s*\(/.test(code);
  return {
    ok:
      Boolean(sanitizer) &&
      hasConnection(workflow, point.source, sanitizerName) &&
      hasConnection(workflow, sanitizerName, point.target) &&
      !hasConnection(workflow, point.source, point.target) &&
      stripsTags,
    source: point.source,
    sanitizer: sanitizerName,
    target: point.target,
    directBypassRemoved: !hasConnection(workflow, point.source, point.target),
    mode: stripsTags ? "strip_and_forward" : "filter_drop",
    filters: {
      governance_violation: code.includes("governance_violation:"),
      internal: code.includes("internal:"),
      debug: code.includes("debug:"),
      guardrail: code.includes("guardrail:"),
    },
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const publish = process.argv.includes("--publish");
  if (!key) throw new Error("N8N_API_KEY ausente.");

  const workflow = await requestJson(base, key, `/workflows/${workflowId}`);
  const patched = JSON.parse(JSON.stringify(workflow));
  const patch = patchWorkflow(patched);
  const verification = verify(patched);

  if (publish && patch.changed) {
    await requestJson(base, key, `/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(compactWorkflowForPut(patched)),
    });
    if (workflow.active) {
      await requestJson(base, key, `/workflows/${workflowId}/deactivate`, { method: "POST" });
      await requestJson(base, key, `/workflows/${workflowId}/activate`, { method: "POST" });
    }
  }

  const refreshed = publish && patch.changed ? await requestJson(base, key, `/workflows/${workflowId}`) : patched;
  console.log(
    JSON.stringify(
      {
        workflow_id: workflowId,
        workflow_name: workflow.name,
        active: refreshed.active,
        publish,
        changed: patch.changed,
        published: publish && patch.changed,
        patch,
        verification: verify(refreshed),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
