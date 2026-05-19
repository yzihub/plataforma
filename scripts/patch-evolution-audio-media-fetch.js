const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json'),
];

const normalizeAudioPayloadCode = `function clean(value) {
  return String(value ?? '').trim();
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
}

function normalizeBaseUrl(value) {
  return clean(value).replace(/\\/+$/, '');
}

function normalizeMime(value) {
  const mime = clean(value).toLowerCase().split(';')[0];
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'audio/mpeg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'audio/mp4';
  if (mime.includes('webm')) return 'audio/webm';
  if (mime.includes('wav') || mime.includes('wave')) return 'audio/wav';
  if (mime.includes('flac')) return 'audio/flac';
  if (mime.includes('ogg') || mime.includes('oga') || mime.includes('opus') || mime.includes('ptt')) return 'audio/ogg';
  return 'audio/ogg';
}

function extensionFor(mimeType, fileName) {
  const existing = clean(fileName).toLowerCase().match(/\\.([a-z0-9]+)$/)?.[1] || '';
  const allowed = new Set(['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'opus', 'wav', 'webm']);
  if (allowed.has(existing)) return existing === 'opus' ? 'ogg' : existing;

  const mime = normalizeMime(mimeType);
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('flac')) return 'flac';
  return 'ogg';
}

function safeFileName(value, mimeType, fallbackId) {
  const ext = extensionFor(mimeType, value);
  const base = clean(value || fallbackId || 'audio')
    .replace(/\\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'audio';
  return \`\${base}.\${ext}\`;
}

function stripDataUrl(value) {
  const raw = clean(value);
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  return match ? { mimeType: match[1], base64: match[2] } : { mimeType: '', base64: raw };
}

function looksLikeBase64(value) {
  const raw = clean(value).replace(/\\s+/g, '');
  return raw.length >= 80 && raw.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(raw);
}

function buildWebhookMessage(webhookData) {
  return {
    key: webhookData.key,
    pushName: webhookData.pushName,
    message: webhookData.message,
    messageType: webhookData.messageType,
    messageTimestamp: webhookData.messageTimestamp,
    source: webhookData.source,
  };
}

async function fetchEvolutionMedia({ baseUrl, apiKey, instance, message }) {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: \`\${baseUrl}/chat/getBase64FromMediaMessage/\${encodeURIComponent(instance)}\`,
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
    },
    body: {
      message,
      convertToMp4: false,
    },
    json: true,
    timeout: 30000,
  });

  if (!response?.base64) {
    throw new Error(\`Evolution media endpoint returned no base64: \${JSON.stringify(response).slice(0, 500)}\`);
  }

  return response;
}

const items = $input.all();
const output = [];

for (const item of items) {
  const source = item.json || {};
  const webhook = $('Webhook1').first().json || {};
  const body = webhook.body || {};
  const data = body.data || {};
  const message = data.message || {};
  const audio = message.audioMessage || message.pttMessage || {};
  const messageId = data.key?.id || source.external_message_id || 'audio';

  const fallbackJson = {
    ...source,
    audioValid: false,
    audioSource: 'evolution_media_failed',
    data: '',
    mimetype: normalizeMime(audio.mimetype || audio.mimeType),
    path: safeFileName(audio.fileName, audio.mimetype || audio.mimeType, messageId),
    audioText: '[audio recebido, mas a midia nao estava disponivel para transcricao]',
    media_warning: 'audio_media_fetch_failed',
  };

  try {
    const inline = firstText(
      message.base64,
      audio.base64,
      source.base64,
      source.data
    );

    let media;
    if (looksLikeBase64(stripDataUrl(inline).base64)) {
      const parsed = stripDataUrl(inline);
      media = {
        base64: parsed.base64.replace(/\\s+/g, ''),
        mimetype: firstText(parsed.mimeType, audio.mimetype, audio.mimeType, 'audio/ogg'),
        fileName: audio.fileName,
        mediaType: 'audioMessage',
        source: 'webhook_base64',
      };
    } else {
      const baseUrl = normalizeBaseUrl(firstText(
        body.server_url,
        source.EVOLUTION_API_URL,
        source.evolution_api_url,
        $vars.EVOLUTION_API_URL,
        $vars.SERVER_URL,
        'https://evo.yzihub.com'
      ));
      const apiKey = firstText(
        body.apikey,
        source.EVOLUTION_API_KEY,
        source.evolution_api_key,
        $vars.EVOLUTION_API_KEY,
        $vars.AUTHENTICATION_API_KEY
      );
      const instance = firstText(
        source.EVOLUTION_INSTANCE,
        source.instance,
        body.instance,
        data.instance,
        'Jurema Brokers'
      );

      if (!baseUrl || !apiKey || !instance) {
        throw new Error('Evolution media fetch is missing baseUrl, apiKey or instance');
      }

      media = await fetchEvolutionMedia.call(this, {
        baseUrl,
        apiKey,
        instance,
        message: buildWebhookMessage(data),
      });
      media.source = 'evolution_getBase64FromMediaMessage';
    }

    const mimeType = normalizeMime(firstText(media.mimetype, audio.mimetype, audio.mimeType, 'audio/ogg'));
    const fileName = safeFileName(firstText(media.fileName, audio.fileName), mimeType, messageId);
    const buffer = Buffer.from(media.base64.replace(/\\s+/g, ''), 'base64');

    if (!buffer.length) {
      throw new Error('Evolution media base64 decoded to an empty buffer');
    }

    const binaryAudio = await this.helpers.prepareBinaryData(buffer, fileName, mimeType);

    output.push({
      json: {
        ...source,
        audioValid: true,
        audioSource: media.source,
        audio_media_endpoint: media.source === 'evolution_getBase64FromMediaMessage'
          ? '/chat/getBase64FromMediaMessage/{instance}'
          : 'webhook.base64',
        audio_media_type: media.mediaType || 'audioMessage',
        audio_media_size: buffer.length,
        data: '',
        mimetype: mimeType,
        path: fileName,
        media_warning: null,
      },
      binary: {
        ...(item.binary || {}),
        audio: binaryAudio,
      },
    });
  } catch (error) {
    output.push({
      json: {
        ...fallbackJson,
        media_error: error?.message || String(error),
      },
      binary: item.binary,
    });
  }
}

return output;`;

function patchWorkflow(workflow, label) {
  if (!workflow || !Array.isArray(workflow.nodes)) return [];

  const changes = [];
  const normalize = workflow.nodes.find((node) => node.name === 'Normalize Audio Payload');
  if (normalize) {
    normalize.parameters = normalize.parameters || {};
    normalize.parameters.jsCode = normalizeAudioPayloadCode;
    normalize.onError = 'continueRegularOutput';
    normalize.alwaysOutputData = true;
    changes.push(`${label}: Normalize Audio Payload now fetches/decrypts media via Evolution API`);
  }

  if (workflow.connections?.['Audio Media Valid?']) {
    workflow.connections['Audio Media Valid?'] = {
      main: [
        [{ node: 'Normalize Audio Binary Metadata', type: 'main', index: 0 }],
        [{ node: 'Audio Memory1', type: 'main', index: 0 }],
      ],
    };
    changes.push(`${label}: Audio Media Valid? bypasses Convert to audio1 for fetched binary.audio`);
  }

  if (workflow.connections?.['Convert to audio1']) {
    workflow.connections['Convert to audio1'] = {
      main: [[{ node: 'Normalize Audio Binary Metadata', type: 'main', index: 0 }]],
    };
  }

  return changes;
}

for (const file of files) {
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
  const changes = [
    ...patchWorkflow(workflow, 'root'),
    ...patchWorkflow(workflow.activeVersion, 'activeVersion'),
  ];

  fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(path.relative(root, file));
  console.log(changes.length ? changes.join('\n') : 'no changes');
}
