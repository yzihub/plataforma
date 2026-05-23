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

async function main() {
  const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
  const key = apiKey(env);
  const base = apiBase(env);

  if (!key) {
    throw new Error('N8N_API_KEY ausente. Configure N8N_API_KEY ou N8N_API com a chave da API do n8n.');
  }
  console.log('publishing Ju lightweight hot-path workflows; Runtime Gateway preflight is intentionally not required');

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
