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

function apiBase(env) {
  if (env.N8N_API_BASE) return env.N8N_API_BASE.replace(/\/+$/, '');
  if (env.N8N_API_URL) return env.N8N_API_URL.replace(/\/+$/, '');
  if (env.N8N_API && /^https?:\/\//i.test(env.N8N_API)) return env.N8N_API.replace(/\/+$/, '');
  return 'https://app.yzihub.com/api/v1';
}

function webhookBase(env) {
  return apiBase(env).replace(/\/api\/v1$/i, '');
}

function buildPayload({ id, phone, audioMessage }) {
  return {
    event: 'messages.upsert',
    instance: 'Jurema Brokers',
    data: {
      key: {
        id,
        fromMe: false,
        remoteJid: `${phone}@s.whatsapp.net`,
      },
      pushName: 'Teste Audio Codex',
      messageType: 'audioMessage',
      message: {
        audioMessage,
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      source: 'codex-audio-test',
    },
  };
}

async function postCase(url, testCase) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCase.payload),
  });

  const text = await response.text();
  return {
    name: testCase.name,
    status: response.status,
    body: text.slice(0, 1000),
  };
}

async function main() {
  const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
  const wavFile = process.argv[2] || 'D:\\tmp\\jurema-audio-test.wav';
  const wavBase64 = fs.readFileSync(wavFile).toString('base64');
  const url = `${webhookBase(env)}/webhook/ju`;
  const phoneBase = `5511997${String(Date.now()).slice(-6)}`;

  const cases = [
    {
      name: 'audio-whatsapp-normal-base64',
      payload: buildPayload({
        id: `codex-normal-${Date.now()}`,
        phone: `${phoneBase}01`,
        audioMessage: {
          mimetype: 'audio/wav',
          seconds: 4,
          base64: wavBase64,
        },
      }),
    },
    {
      name: 'audio-whatsapp-ptt-base64',
      payload: buildPayload({
        id: `codex-ptt-${Date.now()}`,
        phone: `${phoneBase}02`,
        audioMessage: {
          mimetype: 'audio/wav',
          seconds: 4,
          ptt: true,
          base64: wavBase64,
        },
      }),
    },
    {
      name: 'audio-base64-top-level',
      payload: buildPayload({
        id: `codex-top-base64-${Date.now()}`,
        phone: `${phoneBase}03`,
        audioMessage: {
          mimetype: 'audio/wav',
          seconds: 4,
        },
      }),
    },
    {
      name: 'audio-url-public-wav',
      payload: buildPayload({
        id: `codex-url-${Date.now()}`,
        phone: `${phoneBase}04`,
        audioMessage: {
          mimetype: 'audio/wav',
          seconds: 1,
          url: 'https://raw.githubusercontent.com/Jakobovski/free-spoken-digit-dataset/master/recordings/0_jackson_0.wav',
        },
      }),
    },
  ];

  cases[2].payload.data.message.base64 = wavBase64;

  console.log(`POST ${url}`);
  for (const testCase of cases) {
    const result = await postCase(url, testCase);
    console.log(JSON.stringify(result));
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
