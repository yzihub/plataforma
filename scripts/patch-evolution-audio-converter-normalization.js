const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainFile = path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');

const normalizeAudioPayloadCode = String.raw`function clean(value) {
  return String(value ?? '').trim();
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
}

function normalizeBaseUrl(value) {
  return clean(value).replace(/\/+$/, '');
}

function stripDataUrl(value) {
  const raw = clean(value);
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  return match ? { mimeType: match[1], base64: match[2] } : { mimeType: '', base64: raw };
}

function looksLikeBase64(value) {
  const raw = clean(value).replace(/\s+/g, '');
  return raw.length >= 80 && raw.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(raw);
}

function isOggBase64(value) {
  if (!looksLikeBase64(value)) return false;
  const buffer = Buffer.from(clean(value).replace(/\s+/g, ''), 'base64');
  return buffer.length >= 16 && buffer.subarray(0, 4).toString('ascii') === 'OggS';
}

function buildWebhookMessage(webhookData) {
  return {
    key: webhookData.key,
    pushName: webhookData.pushName,
    message: webhookData.message,
    messageType: webhookData.messageType || 'audioMessage',
    messageTimestamp: webhookData.messageTimestamp,
    source: webhookData.source,
  };
}

function formBody(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    .join('&');
}

async function fetchEvolutionDecryptedMedia({ baseUrl, apiKey, instance, message }) {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: baseUrl + '/chat/getBase64FromMediaMessage/' + encodeURIComponent(instance),
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

  const base64 = firstText(response?.base64, response?.data?.base64, response?.media?.base64);
  if (!looksLikeBase64(base64)) {
    throw new Error('Evolution media decrypt returned no valid base64: ' + JSON.stringify(response).slice(0, 500));
  }

  return {
    base64: base64.replace(/\s+/g, ''),
    mimetype: firstText(response?.mimetype, response?.mimeType, response?.data?.mimetype),
    source: 'evolution_getBase64FromMediaMessage',
  };
}

async function convertAudioToOgg({ converterUrl, apiKey, base64, language }) {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: converterUrl + '/process-audio',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody({
      base64,
      format: 'ogg',
      transcribe: 'false',
      language: language || 'pt',
    }),
    json: true,
    timeout: 60000,
  });

  const converted = firstText(response?.audio, response?.data?.audio, response?.base64);
  if (!looksLikeBase64(converted)) {
    throw new Error('Audio converter returned no valid audio base64: ' + JSON.stringify(response).slice(0, 500));
  }

  const buffer = Buffer.from(converted.replace(/\s+/g, ''), 'base64');
  if (buffer.length < 16 || buffer.subarray(0, 4).toString('ascii') !== 'OggS') {
    throw new Error('Audio converter output is not a valid OGG file');
  }

  return {
    base64: converted.replace(/\s+/g, ''),
    duration: response?.duration ?? null,
    format: response?.format || 'ogg',
  };
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
    audioSource: 'audio_converter_failed',
    data: '',
    mimetype: 'audio/ogg',
    path: 'audio.ogg',
    audioText: '[audio recebido, mas a midia nao estava disponivel para transcricao]',
    media_warning: 'audio_converter_normalization_failed',
    audio_normalization_policy: 'evolution_audio_converter_process_audio_v1',
  };

  try {
    const inline = firstText(message.base64, audio.base64, source.base64, source.data);
    const inlineParsed = stripDataUrl(inline);

    let decrypted;
    if (looksLikeBase64(inlineParsed.base64)) {
      decrypted = {
        base64: inlineParsed.base64.replace(/\s+/g, ''),
        mimetype: firstText(inlineParsed.mimeType, audio.mimetype, audio.mimeType, 'audio/ogg'),
        source: 'webhook_base64',
      };
    } else {
      const evolutionBaseUrl = normalizeBaseUrl(firstText(
        body.server_url,
        source.EVOLUTION_API_URL,
        source.evolution_api_url,
        $vars.EVOLUTION_API_URL,
        $vars.SERVER_URL,
        'https://evo.yzihub.com'
      ));
      const evolutionApiKey = firstText(
        body.apikey,
        source.EVOLUTION_API_KEY,
        source.evolution_api_key,
        $vars.EVOLUTION_API_KEY,
        $vars.AUTHENTICATION_API_KEY
      );
      const instance = firstText(source.EVOLUTION_INSTANCE, source.instance, body.instance, data.instance, 'Jurema Brokers');

      if (!audio.url && !audio.mediaKey) {
        throw new Error('audioMessage sem url/mediaKey para decrypt de midia WhatsApp');
      }
      if (!evolutionBaseUrl || !evolutionApiKey || !instance) {
        throw new Error('Evolution decrypt is missing baseUrl, apiKey or instance');
      }

      decrypted = await fetchEvolutionDecryptedMedia.call(this, {
        baseUrl: evolutionBaseUrl,
        apiKey: evolutionApiKey,
        instance,
        message: buildWebhookMessage(data),
      });
    }

    let converted;
    let converterEndpoint = 'direct_decrypted_ogg';

    if (isOggBase64(decrypted.base64)) {
      converted = {
        base64: decrypted.base64,
        duration: null,
        format: 'ogg',
      };
    } else {
      const converterUrl = normalizeBaseUrl(firstText(
        source.EVOLUTION_AUDIO_CONVERTER_URL,
        source.AUDIO_CONVERTER_URL,
        $vars.EVOLUTION_AUDIO_CONVERTER_URL,
        $vars.AUDIO_CONVERTER_URL,
        'http://evolution-audio-converter:4040'
      ));
      const converterApiKey = firstText(
        source.EVOLUTION_AUDIO_CONVERTER_API_KEY,
        source.AUDIO_CONVERTER_API_KEY,
        $vars.EVOLUTION_AUDIO_CONVERTER_API_KEY,
        $vars.AUDIO_CONVERTER_API_KEY,
        $vars.AUDIO_CONVERTER_KEY,
        body.apikey,
        source.EVOLUTION_API_KEY,
        $vars.EVOLUTION_API_KEY,
        $vars.AUTHENTICATION_API_KEY
      );

      if (!converterUrl || !converterApiKey) {
        throw new Error('Evolution Audio Converter missing URL or API key');
      }

      converted = await convertAudioToOgg.call(this, {
        converterUrl,
        apiKey: converterApiKey,
        base64: decrypted.base64,
        language: 'pt',
      });
      converterEndpoint = '/process-audio';
    }

    output.push({
      json: {
        ...source,
        audioValid: true,
        audioSource: decrypted.source,
        audio_converter_endpoint: converterEndpoint,
        audio_normalization_policy: 'evolution_audio_converter_process_audio_v1',
        audio_media_url: audio.url || source.audioUrl || null,
        audio_media_key_present: Boolean(audio.mediaKey),
        audio_media_size: Buffer.from(converted.base64, 'base64').length,
        audio_duration: converted.duration,
        audio: converted.base64,
        data: converted.base64,
        format: 'ogg',
        mimetype: 'audio/ogg',
        path: 'audio.ogg',
        media_warning: null,
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

const persistAudioTranscriptCode = String.raw`function clean(value) {
  return String(value ?? '').trim();
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
}

function normalizeBaseUrl(value) {
  return clean(value).replace(/\/+$/, '');
}

async function httpRequest(options) {
  if (this.helpers?.httpRequest) return await this.helpers.httpRequest(options);
  if (this.helpers?.request) return await this.helpers.request(options);
  throw new Error('HTTP helper indisponivel para persistir transcript de audio');
}

async function patchInboundTranscript({ baseUrl, apiKey, conversationId, externalMessageId, transcript }) {
  if (!baseUrl || !apiKey || !conversationId || !externalMessageId || !transcript) return null;

  return await httpRequest.call(this, {
    method: 'PATCH',
    url: normalizeBaseUrl(baseUrl) + '/rest/v1/conversation_messages',
    qs: {
      conversation_id: 'eq.' + conversationId,
      external_message_id: 'eq.' + externalMessageId,
      direction: 'eq.inbound',
    },
    headers: {
      apikey: apiKey,
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: {
      content: transcript,
      message_type: 'audio',
    },
    json: true,
    timeout: 30000,
  });
}

const items = $input.all();
const output = [];

for (const item of items) {
  const source = item.json || {};
  const base = $('Code in JavaScript').first().json || {};
  const config = $('dados do banco').first().json || {};
  const transcript = firstText(
    source.text,
    source.transcription,
    source.transcript,
    source.audioText
  );
  const fallbackAudioText = '[audio recebido, mas a transcricao falhou temporariamente]';
  const inboundText = transcript || fallbackAudioText;

  const enriched = {
    ...base,
    ...source,
    audioText: inboundText,
    transcript,
    mensagemCliente: inboundText,
    normalized_inbound_message: inboundText,
    messageType: 'audio',
    audio_operational_policy: 'audio_as_normal_inbound_message_v1',
    audio_transcript_persisted: false,
  };

  if (!transcript) {
    output.push({
      json: {
        ...enriched,
        audio_transcript_warning: 'empty_transcript',
      },
      binary: item.binary,
    });
    continue;
  }

  try {
    await patchInboundTranscript.call(this, {
      baseUrl: firstText(config.URL_SUPABASE, base.URL_SUPABASE, $vars.SUPABASE_URL),
      apiKey: firstText(config.SUPABASE_SERVICE_ROLE_KEY, base.SUPABASE_SERVICE_ROLE_KEY, $vars.SUPABASE_SERVICE_ROLE_KEY),
      conversationId: base.conversation?.id || base.conversation_id,
      externalMessageId: base.external_message_id,
      transcript,
    });

    output.push({
      json: {
        ...enriched,
        audio_transcript_persisted: true,
      },
      binary: item.binary,
    });
  } catch (error) {
    output.push({
      json: {
        ...enriched,
        audio_transcript_persisted: false,
        audio_transcript_warning: error?.message || String(error),
      },
      binary: item.binary,
    });
  }
}

return output;`;

function readWorkflow(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeWorkflow(file, workflow) {
  fs.writeFileSync(file, JSON.stringify(workflow, null, 2) + '\n');
}

function patchWorkflow(workflow, label) {
  if (!workflow || !Array.isArray(workflow.nodes)) return [];
  const changes = [];

  const normalize = workflow.nodes.find((node) => node.name === 'Normalize Audio Payload');
  if (!normalize) {
    if (label === 'root') throw new Error(`${label}: Normalize Audio Payload not found`);
    return changes;
  }
  normalize.parameters = normalize.parameters || {};
  normalize.parameters.jsCode = normalizeAudioPayloadCode;
  normalize.onError = 'continueRegularOutput';
  normalize.alwaysOutputData = true;
  changes.push(`${label}: Normalize Audio Payload now decrypts via Evolution and converts through Evolution Audio Converter`);

  const convert = workflow.nodes.find((node) => node.name === 'Convert to audio1');
  if (!convert) throw new Error(`${label}: Convert to audio1 not found`);
  convert.parameters = convert.parameters || {};
  convert.parameters.operation = 'toBinary';
  convert.parameters.sourceProperty = 'data';
  convert.parameters.binaryPropertyName = 'data';
  convert.parameters.options = {
    fileName: 'audio.ogg',
    mimeType: 'audio/ogg',
  };
  changes.push(`${label}: Convert to audio1 now emits binary.data as audio/ogg`);

  const openAi = workflow.nodes.find((node) => node.name === 'OpenAI1');
  if (!openAi) throw new Error(`${label}: OpenAI1 not found`);
  openAi.parameters = openAi.parameters || {};
  openAi.parameters.binaryPropertyName = 'data';
  openAi.parameters.inputDataFieldName = 'data';
  openAi.onError = 'continueRegularOutput';
  openAi.alwaysOutputData = true;
  changes.push(`${label}: OpenAI1 transcribes binary.data only`);

  let persist = workflow.nodes.find((node) => node.name === 'Persist Audio Transcript');
  if (!persist) {
    persist = {
      parameters: {},
      id: 'persist-audio-transcript-jurema',
      name: 'Persist Audio Transcript',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [8160, 2176],
      onError: 'continueRegularOutput',
      alwaysOutputData: true,
    };
    workflow.nodes.push(persist);
  }
  persist.parameters = persist.parameters || {};
  persist.parameters.jsCode = persistAudioTranscriptCode;
  persist.onError = 'continueRegularOutput';
  persist.alwaysOutputData = true;
  changes.push(`${label}: Persist Audio Transcript updates inbound Supabase content and injects transcript as mensagemCliente`);

  const buildContext = workflow.nodes.find((node) => node.name === 'Build Context1');
  if (buildContext?.parameters?.jsCode) {
    let code = String(buildContext.parameters.jsCode);
    if (!code.includes('shouldRebuildContextForAudio')) {
      code = code.replace(
        "const existingContext = input._context || base._context || '';",
        "const existingContext = input._context || base._context || '';\nconst shouldRebuildContextForAudio = Boolean(input.normalized_inbound_message || input.audioText || input.transcript);"
      );
      code = code.replace(
        '_context: (existingContext || compactContext()) + governance,',
        '_context: (shouldRebuildContextForAudio ? compactContext() : (existingContext || compactContext())) + governance,'
      );
      buildContext.parameters.jsCode = code;
      changes.push(`${label}: Build Context1 rebuilds lightweight context after audio transcript normalization`);
    }
  }

  if (workflow.connections?.['Audio Media Valid?']) {
    workflow.connections['Audio Media Valid?'] = {
      main: [
        [{ node: 'Convert to audio1', type: 'main', index: 0 }],
        [{ node: 'Audio Memory1', type: 'main', index: 0 }],
      ],
    };
  }

  const valid = workflow.nodes.find((node) => node.name === 'Audio Media Valid?');
  if (valid) {
    valid.parameters = valid.parameters || {};
    valid.parameters.conditions = {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2,
      },
      conditions: [
        {
          id: 'audio-valid-condition',
          leftValue: '={{ $json.audioValid === true && !!$json.data }}',
          rightValue: true,
          operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true,
          },
        },
      ],
      combinator: 'and',
    };
    valid.parameters.options = {};
    changes.push(`${label}: Audio Media Valid? now requires strict audioValid true and non-empty data`);
  }
  workflow.connections = workflow.connections || {};
  workflow.connections.OpenAI1 = {
    main: [
      [{ node: 'Persist Audio Transcript', type: 'main', index: 0 }],
    ],
  };
  workflow.connections['Persist Audio Transcript'] = {
    main: [
      [{ node: 'Audio Memory1', type: 'main', index: 0 }],
    ],
  };

  return changes;
}

const workflow = readWorkflow(mainFile);
const changes = [
  ...patchWorkflow(workflow, 'root'),
  ...patchWorkflow(workflow.activeVersion, 'activeVersion'),
];

writeWorkflow(mainFile, workflow);
console.log(`patched ${path.relative(root, mainFile)}`);
console.log(changes.join('\n'));
