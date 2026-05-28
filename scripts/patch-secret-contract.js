const fs = require("fs");

const files = [
  "n8n/production/runtime-tools/wrapper-tool-setar-lead-quente.v1.json",
  "n8n/production/runtime-tools/wrapper-tool-consultar-imoveis.v1.json",
  "n8n/production/runtime-tools/wrapper-tool-conhecimento-estrategico.v1.json",
  "n8n/production/runtime-tools/wrapper-tool-conhecimento-estrategico-ju.v1.json",
  "n8n/production/runtime-tools/wrapper-tool-atualizar-qualificacao.v1.json",
  "n8n/production/workflow-jurema-main.v3-cognitive-runtime-bridge.json",
];

const bridgeCanonicalExpression =
  "$vars.JUREMA_TOOL_WEBHOOK_SECRET || $vars.RUNTIME_COGNITIVE_WEBHOOK_SECRET || $vars.EVOLUTION_WEBHOOK_SECRET || $env.JUREMA_TOOL_WEBHOOK_SECRET || $env.RUNTIME_COGNITIVE_WEBHOOK_SECRET || $env.EVOLUTION_WEBHOOK_SECRET || ''";
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

function patchString(value) {
  let updated = value;
  if (updated.includes("const expected =") && (updated.includes("WEBHOOK_SECRET") || updated.includes("webhook-secret"))) {
    updated = updated
      .replace(
        /const expected\s*=\s*(?:\([\s\S]*?\)\.trim\(\)|['"][^'"]*['"])\s*;[\s\S]*?const clean\s*=/,
        `${authCanonical}\nconst clean =`,
      )
      .replace(/const expected\s*=\s*(?:\([\s\S]*?\)\.trim\(\)|['"][^'"]*['"])\s*;/, wrapperCanonical);
  }
  if (updated.startsWith("={{") && updated.includes("WEBHOOK_SECRET")) {
    updated = `={{ ${bridgeCanonicalExpression} }}`;
  }
  return updated;
}

function patchValue(value) {
  if (typeof value === "string") return patchString(value);
  if (Array.isArray(value)) return value.map(patchValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, patchValue(item)]));
}

for (const file of files) {
  const original = JSON.parse(fs.readFileSync(file, "utf8"));
  const patched = patchValue(original);
  const text = JSON.stringify(original, null, 2);
  const updated = JSON.stringify(patched, null, 2);
  if (updated === text) {
    console.log(`nochange ${file}`);
    continue;
  }
  fs.writeFileSync(file, `${updated}\n`);
  console.log(`patched ${file}`);
}
