const fs = require('fs');
const path = require('path');

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

function requireRuntimeEnv(env) {
  const runtimeUrl = String(env.YZI_RUNTIME_API_URL || '').trim();
  const runtimeKey = String(env.YZI_RUNTIME_INTERNAL_KEY || '').trim();

  if (!runtimeUrl || !/^https:\/\//i.test(runtimeUrl) || /localhost|127\.0\.0\.1|app\.yzihub\.com/i.test(runtimeUrl)) {
    throw new Error('YZI_RUNTIME_API_URL invalido/ausente. Use uma URL HTTPS publica do Runtime Gateway.');
  }
  if (!runtimeKey) throw new Error('YZI_RUNTIME_INTERNAL_KEY ausente.');

  return { runtimeUrl: runtimeUrl.replace(/\/+$/, ''), runtimeKey };
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await response.text();
  return { response, text };
}

async function main() {
  const env = { ...readEnvFile(path.join(process.cwd(), '.env.local')), ...process.env };
  const { runtimeUrl, runtimeKey } = requireRuntimeEnv(env);
  const endpoint = `${runtimeUrl}/api/runtime/ju/state`;
  const correlationId = `runtime-production-check-${Date.now()}`;
  const body = {
    persist: false,
    channel: 'whatsapp',
    origin: 'runtime-production-check',
    correlation_id: correlationId,
    tenant_id: '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361',
    conversation: {
      id: '33333333-3333-4333-8333-333333333333',
      tenant_id: '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361',
    },
    current_message: 'qual o perfil desse bairro?',
  };

  const unauthorized = await postJson(endpoint, body);
  if (unauthorized.response.status !== 401) {
    throw new Error(`Esperado 401 sem chave; recebido ${unauthorized.response.status}: ${unauthorized.text.slice(0, 400)}`);
  }

  const authorized = await postJson(endpoint, body, {
    'x-runtime-key': runtimeKey,
    'x-correlation-id': correlationId,
  });
  if (authorized.response.status !== 200) {
    throw new Error(`Esperado 200 com chave; recebido ${authorized.response.status}: ${authorized.text.slice(0, 500)}`);
  }

  const payload = JSON.parse(authorized.text);
  if (payload.ok !== true || !payload.decision?.runtime_state || !payload.decision?.objective_state) {
    throw new Error(`Payload runtime invalido: ${authorized.text.slice(0, 500)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    endpoint,
    unauthorized_status: unauthorized.response.status,
    authorized_status: authorized.response.status,
    correlation_id: authorized.response.headers.get('x-correlation-id') || payload.correlation_id || correlationId,
    runtime_state: payload.decision.runtime_state,
    objective_state: payload.decision.objective_state,
    next_action: payload.decision.next_action,
    retrieval_policy: payload.decision.retrieval_policy,
    persisted: payload.persisted,
    gateway: payload.gateway || null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
