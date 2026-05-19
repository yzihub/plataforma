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

async function fetchExecution({ base, key, id }) {
  const response = await fetch(`${base}/executions/${id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': key },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`execution ${id} HTTP ${response.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function main() {
  const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
  const base = apiBase(env);
  const key = apiKey(env);
  const sourceExecutionId = process.argv[2] || '3697';
  const execution = await fetchExecution({ base, key, id: sourceExecutionId });
  const runData = execution.data?.resultData?.runData || execution.resultData?.runData || {};
  const body = structuredClone(runData.Webhook1?.[0]?.data?.main?.[0]?.[0]?.json?.body);

  if (!body?.data?.message?.audioMessage) {
    throw new Error(`execution ${sourceExecutionId} does not contain an audioMessage`);
  }

  body.data.key.id = `codex-replay-real-${Date.now()}`;
  body.data.messageTimestamp = Math.floor(Date.now() / 1000);
  body.date_time = new Date().toISOString();
  if (process.argv.includes('--normal-audio')) {
    body.data.message.audioMessage.ptt = false;
  }

  const webhookBase = base.replace(/\/api\/v1$/i, '');
  const response = await fetch(`${webhookBase}/webhook/ju`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log(JSON.stringify({
    sourceExecutionId,
    replayMessageId: body.data.key.id,
    status: response.status,
    body: (await response.text()).slice(0, 1000),
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
