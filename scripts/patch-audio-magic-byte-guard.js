const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json'),
];

const normalizeCode = `function clean(value) {
  return String(value ?? '').trim();
}

function detectAudioContainer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return { compatible: false, ext: 'ogg', mimeType: 'audio/ogg', reason: 'empty_or_unreadable_audio_binary' };
  }

  const ascii4 = buffer.subarray(0, 4).toString('ascii');
  const ascii12 = buffer.subarray(0, 12).toString('ascii');

  if (ascii4 === 'OggS') return { compatible: true, ext: 'ogg', mimeType: 'audio/ogg', reason: null };
  if (ascii4 === 'fLaC') return { compatible: true, ext: 'flac', mimeType: 'audio/flac', reason: null };
  if (ascii4 === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') {
    return { compatible: true, ext: 'wav', mimeType: 'audio/wav', reason: null };
  }
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
    return { compatible: true, ext: 'mp3', mimeType: 'audio/mpeg', reason: null };
  }
  if (ascii12.includes('ftyp')) return { compatible: true, ext: 'm4a', mimeType: 'audio/mp4', reason: null };
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { compatible: true, ext: 'webm', mimeType: 'audio/webm', reason: null };
  }

  return {
    compatible: false,
    ext: 'ogg',
    mimeType: 'audio/ogg',
    reason: 'unsupported_audio_container_magic_bytes',
    magic: buffer.subarray(0, 12).toString('hex'),
  };
}

return await Promise.all($input.all().map(async (item, index) => {
  const binary = item.binary || {};
  const audio = binary.audio || {};

  let detection;
  try {
    const buffer = await this.helpers.getBinaryDataBuffer(index, 'audio');
    detection = detectAudioContainer(buffer);
  } catch (error) {
    detection = {
      compatible: false,
      ext: 'ogg',
      mimeType: 'audio/ogg',
      reason: 'audio_binary_read_failed',
      error: error?.message || String(error),
    };
  }

  const baseName = clean(audio.fileName || item.json?.path || 'audio')
    .replace(/\\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'audio';

  const fileName = \`\${baseName}.\${detection.ext}\`;

  return {
    json: {
      ...item.json,
      audio_binary_normalized: true,
      audio_binary_openai_compatible: detection.compatible,
      audio_binary_mimeType: detection.mimeType,
      audio_binary_fileName: fileName,
      audio_binary_extension: detection.ext,
      audio_binary_warning: detection.reason,
      audio_binary_magic: detection.magic,
      audio_binary_error: detection.error,
      audioText: detection.compatible
        ? item.json?.audioText
        : '[audio recebido, mas o formato interno nao e compativel para transcricao automatica]',
      media_warning: detection.compatible
        ? item.json?.media_warning ?? null
        : detection.reason || 'unsupported_audio_container',
    },
    binary: {
      ...binary,
      audio: {
        ...audio,
        mimeType: detection.mimeType,
        fileName,
        fileExtension: detection.ext,
      },
    },
  };
}));`;

function patch(file) {
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
  const metadata = workflow.nodes.find((node) => node.name === 'Normalize Audio Binary Metadata');
  if (!metadata) throw new Error(`Normalize Audio Binary Metadata not found in ${file}`);
  metadata.parameters.jsCode = normalizeCode;
  metadata.onError = 'continueRegularOutput';
  metadata.alwaysOutputData = true;

  let guard = workflow.nodes.find((node) => node.name === 'Audio Binary OpenAI Compatible?');
  if (!guard) {
    guard = {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
            version: 2,
          },
          conditions: [
            {
              id: 'audio-openai-compatible-condition',
              leftValue: '={{ $json.audio_binary_openai_compatible }}',
              rightValue: true,
              operator: {
                type: 'boolean',
                operation: 'true',
                singleValue: true,
              },
            },
          ],
          combinator: 'and',
        },
        options: {},
      },
      id: 'audio-binary-openai-compatible-jurema',
      name: 'Audio Binary OpenAI Compatible?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [8032, 2176],
      alwaysOutputData: true,
    };
    workflow.nodes.push(guard);
  }

  const openAi = workflow.nodes.find((node) => node.name === 'OpenAI1');
  if (!openAi) throw new Error(`OpenAI1 not found in ${file}`);
  openAi.position = [8256, 2112];

  const audioMemory = workflow.nodes.find((node) => node.name === 'Audio Memory1');
  if (audioMemory) audioMemory.position = [8256, 2240];

  workflow.connections['Normalize Audio Binary Metadata'] = {
    main: [[{ node: 'Audio Binary OpenAI Compatible?', type: 'main', index: 0 }]],
  };
  workflow.connections['Audio Binary OpenAI Compatible?'] = {
    main: [
      [{ node: 'OpenAI1', type: 'main', index: 0 }],
      [{ node: 'Audio Memory1', type: 'main', index: 0 }],
    ],
  };

  fs.writeFileSync(file, JSON.stringify(workflow, null, 2));
  console.log(`Patched ${path.relative(root, file)}`);
}

for (const file of files) patch(file);
