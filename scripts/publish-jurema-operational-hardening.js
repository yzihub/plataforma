const fs = require('fs');
const path = require('path');

const root = process.cwd();

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

function updatePayload(workflow) {
  const settings = workflow.settings || {};

  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      ...(settings.executionOrder ? { executionOrder: settings.executionOrder } : {}),
    },
    staticData: workflow.staticData || {},
  };
}

async function publishOne({ base, key, id, file }) {
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
  const response = await fetch(`${base}/workflows/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': key,
    },
    body: JSON.stringify(updatePayload(workflow)),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${id} publish failed: HTTP ${response.status} ${text.slice(0, 1000)}`);
  }

  return text ? JSON.parse(text) : {};
}

async function validateRuntimeGateway({ runtimeUrl, runtimeKey }) {
  const endpoint = `${runtimeUrl.replace(/\/+$/, '')}/api/runtime/ju/state`;
  const body = {
    persist: false,
    channel: 'whatsapp',
    origin: 'n8n-production-preflight',
    correlation_id: `n8n-production-preflight-${Date.now()}`,
    tenant_id: '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361',
    conversation: {
      id: '33333333-3333-4333-8333-333333333333',
      tenant_id: '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361',
    },
    current_message: 'preflight runtime gateway',
  };

  const unauthorized = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual',
  });

  if (unauthorized.status !== 401) {
    const text = await unauthorized.text();
    throw new Error(
      `Runtime Gateway preflight falhou: esperado 401 sem chave, recebido ${unauthorized.status} ${text.slice(0, 300)}`
    );
  }

  const authorized = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-runtime-key': runtimeKey,
      'x-correlation-id': body.correlation_id,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await authorized.text();

  if (authorized.status !== 200) {
    throw new Error(
      `Runtime Gateway preflight falhou: esperado 200 com x-runtime-key, recebido ${authorized.status} ${text.slice(0, 500)}`
    );
  }

  const payload = text ? JSON.parse(text) : {};
  if (payload.ok !== true || payload.decision?.objective_state === undefined) {
    throw new Error(`Runtime Gateway preflight retornou payload invalido: ${text.slice(0, 500)}`);
  }

  console.log(
    `runtime gateway ok ${authorized.status} objective=${payload.decision.objective_state} correlation=${payload.correlation_id || body.correlation_id}`
  );
}

async function main() {
  const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);
  const runtimeUrl = String(env.YZI_RUNTIME_API_URL || '').trim();
  const runtimeKey = String(env.YZI_RUNTIME_INTERNAL_KEY || '').trim();

  if (!key) {
    throw new Error('N8N_API_KEY ausente. Configure N8N_API_KEY ou N8N_API com a chave da API do n8n.');
  }
  if (!runtimeUrl || !/^https:\/\//i.test(runtimeUrl) || /localhost|127\.0\.0\.1|app\.yzihub\.com/i.test(runtimeUrl)) {
    throw new Error('YZI_RUNTIME_API_URL invalido/ausente. Configure uma URL HTTPS publica do Runtime Gateway antes de publicar.');
  }
  const parsedRuntimeUrl = new URL(runtimeUrl);
  if (parsedRuntimeUrl.pathname !== '/' && parsedRuntimeUrl.pathname !== '') {
    throw new Error('YZI_RUNTIME_API_URL deve ser apenas a origin/base URL, ex: https://plataforma-bb2h.vercel.app. Nao inclua /api/runtime/ju/state.');
  }
  if (!runtimeKey) {
    throw new Error('YZI_RUNTIME_INTERNAL_KEY ausente. Configure a chave interna do Runtime Gateway antes de publicar.');
  }
  await validateRuntimeGateway({ runtimeUrl, runtimeKey });

  const workflows = [
    {
      id: 'cj4V6DW0Qy6el0PM',
      file: path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json'),
    },
    {
      id: '0udn6N4YelE6F2Ws',
      file: path.join(root, 'n8n', 'production', 'workflow-jurema-consultar-imoveis.final-hardened.json'),
    },
  ];

  for (const workflow of workflows) {
    const result = await publishOne({ base, key, ...workflow });
    console.log(`${workflow.id} published`, result.updatedAt || '');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
