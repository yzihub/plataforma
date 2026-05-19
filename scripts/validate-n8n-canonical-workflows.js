const fs = require('fs');
const path = require('path');

const root = process.cwd();
const n8nRoot = path.join(root, 'n8n');
const productionDir = path.join(n8nRoot, 'production');

const requiredProductionFiles = [
  'workflow-jurema-main.final-hardened.json',
  'workflow-jurema-consultar-imoveis.final-hardened.json',
  'workflow-jurema-enviar-contrato.final-hardened.json',
];

function readWorkflow(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rootJsonFiles = fs
  .readdirSync(n8nRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => entry.name);

assert(rootJsonFiles.length === 0, `n8n root contains non-canonical JSON files: ${rootJsonFiles.join(', ')}`);

for (const file of requiredProductionFiles) {
  const full = path.join(productionDir, file);
  assert(fs.existsSync(full), `missing production workflow: ${file}`);
  readWorkflow(full);
}

const main = readWorkflow(path.join(productionDir, 'workflow-jurema-main.final-hardened.json'));
const mainText = JSON.stringify(main);
const mainConnections = main.connections || {};

const requiredMainSignals = [
  '/api/runtime/ju/state',
  'x-runtime-key',
  'x-correlation-id',
  'runtime_state',
  'objective_state',
  'next_action',
  'allowed_tools',
  'blocked_questions',
  'retrieval_governance',
  'fallback_minimal',
];

for (const signal of requiredMainSignals) {
  assert(mainText.includes(signal), `main workflow missing canonical signal: ${signal}`);
}

for (const [from, connection] of Object.entries(mainConnections)) {
  const connectionText = JSON.stringify(connection);
  assert(
    !connectionText.includes('"type":"ai_memory"') || !connectionText.includes('"node":"Atendente1"'),
    `main workflow has legacy ai_memory connected to Atendente1 from ${from}`,
  );
}

const agent = (main.nodes || []).find((node) => node.name === 'Atendente1');
const systemMessage = String(agent?.parameters?.options?.systemMessage || '');
assert(!systemMessage.includes('# SYSTEM PROMPT'), 'Atendente1 still contains monolithic legacy system prompt');
assert(systemMessage.length < 2500, `Atendente1 system prompt is too large: ${systemMessage.length}`);
assert(!mainText.includes('app.yzihub.com'), 'main workflow still falls back to app.yzihub.com for Runtime Gateway');
assert(!mainText.includes('NEXT_PUBLIC_APP_URL'), 'main workflow still falls back to cockpit/frontend URL for Runtime Gateway');

const mainWarnings = {
  redis: /Redis/i.test(mainText),
  airtable: /Airtable/i.test(mainText),
  pam: /PAM|Caf/i.test(mainText),
  vectorStore: /vectorStore|Vector/i.test(mainText),
};

console.log(JSON.stringify({
  ok: true,
  production_files: requiredProductionFiles,
  main_workflow: {
    name: main.name,
    id: main.id ?? main.workflowId ?? null,
    nodes: Array.isArray(main.nodes) ? main.nodes.length : 0,
    runtime_gateway: true,
  },
  warnings: mainWarnings,
}, null, 2));
