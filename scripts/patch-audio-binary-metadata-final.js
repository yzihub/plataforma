const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json'),
];

function normalizeCode() {
  return `function clean(value) {
  return String(value ?? '').trim();
}

function normalizeAudioMime(value) {
  const mime = clean(value).toLowerCase().split(';')[0];

  if (mime.includes('mpeg') || mime.includes('mp3')) return 'audio/mpeg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'audio/mp4';
  if (mime.includes('webm')) return 'audio/webm';
  if (mime.includes('wav') || mime.includes('wave')) return 'audio/wav';
  if (mime.includes('flac')) return 'audio/flac';
  if (mime.includes('ogg') || mime.includes('oga') || mime.includes('opus') || mime.includes('ptt')) return 'audio/ogg';
  if (!mime || mime.includes('octet-stream') || mime.includes('binary')) return 'audio/ogg';

  return 'audio/ogg';
}

function extensionFor(mimeType, fileName) {
  const name = clean(fileName).toLowerCase();
  const existing = name.match(/\\.([a-z0-9]+)$/)?.[1] || '';
  const allowed = new Set(['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']);
  if (allowed.has(existing)) return existing;

  const mime = normalizeAudioMime(mimeType);
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('flac')) return 'flac';
  return 'ogg';
}

return $input.all().map((item) => {
  const binary = item.binary || {};
  const audio = binary.audio || {};

  const mimeType = normalizeAudioMime(audio.mimeType || item.json?.mimetype);
  const ext = extensionFor(mimeType, audio.fileName || item.json?.path);
  const baseName = clean(audio.fileName || item.json?.path || 'audio')
    .replace(/\\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'audio';

  return {
    json: {
      ...item.json,
      audio_binary_normalized: true,
      audio_binary_mimeType: mimeType,
      audio_binary_fileName: \`\${baseName}.\${ext}\`,
      audio_binary_extension: ext,
    },
    binary: {
      ...binary,
      audio: {
        ...audio,
        mimeType,
        fileName: \`\${baseName}.\${ext}\`,
        fileExtension: ext,
      },
    },
  };
});`;
}

function patchWorkflow(file) {
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));

  const normalizePayload = workflow.nodes.find((node) => node.name === 'Normalize Audio Payload');
  if (!normalizePayload) throw new Error(`Normalize Audio Payload not found in ${file}`);
  normalizePayload.parameters.jsCode = normalizePayload.parameters.jsCode
    .replaceAll("'application/ogg'", "'audio/ogg'")
    .replaceAll('"application/ogg"', '"audio/ogg"');

  const convert = workflow.nodes.find((node) => node.name === 'Convert to audio1');
  if (!convert) throw new Error(`Convert to audio1 not found in ${file}`);
  convert.parameters.options.mimeType = '={{ $json.mimetype || "audio/ogg" }}';

  let metadata = workflow.nodes.find((node) => node.name === 'Normalize Audio Binary Metadata');
  if (!metadata) {
    metadata = {
      parameters: { jsCode: normalizeCode() },
      id: 'normalize-audio-binary-metadata-jurema',
      name: 'Normalize Audio Binary Metadata',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [7920, 2176],
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
    };
    workflow.nodes.push(metadata);
  } else {
    metadata.parameters.jsCode = normalizeCode();
  }

  const openAi = workflow.nodes.find((node) => node.name === 'OpenAI1');
  if (!openAi) throw new Error(`OpenAI1 not found in ${file}`);
  openAi.position = [8144, 2176];
  openAi.parameters.binaryPropertyName = 'audio';

  workflow.connections['Convert to audio1'] = {
    main: [[{ node: 'Normalize Audio Binary Metadata', type: 'main', index: 0 }]],
  };
  workflow.connections['Normalize Audio Binary Metadata'] = {
    main: [[{ node: 'OpenAI1', type: 'main', index: 0 }]],
  };

  fs.writeFileSync(file, JSON.stringify(workflow, null, 2));
  console.log(`Patched ${path.relative(root, file)}`);
}

for (const file of files) patchWorkflow(file);
