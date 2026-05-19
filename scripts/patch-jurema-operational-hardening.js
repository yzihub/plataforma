const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainPath = path.join(root, 'n8n', 'archive', 'snapshots', 'workflow-cj4V6DW0Qy6el0PM.snapshot.json');
const cardsPath = path.join(root, 'n8n', 'archive', 'snapshots', 'workflow-0udn6N4YelE6F2Ws.snapshot.json');
const mainOut = path.join(root, 'n8n', 'archive', 'pre-runtime', 'workflow-cj4V6DW0Qy6el0PM.hardened.json');
const cardsOut = path.join(root, 'n8n', 'archive', 'pre-runtime', 'workflow-0udn6N4YelE6F2Ws.hardened.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
}

function upsertNode(workflow, node) {
  const index = workflow.nodes.findIndex((n) => n.name === node.name);
  if (index >= 0) workflow.nodes[index] = { ...workflow.nodes[index], ...node };
  else workflow.nodes.push(node);
}

function connect(workflow, from, outputs) {
  workflow.connections[from] = { main: outputs };
}

const normalizeAudioCode = `async function requestBinary(url) {
  const attempts = [
    { method: 'GET', url, encoding: 'arraybuffer', returnFullResponse: true },
    { method: 'GET', url, responseFormat: 'arraybuffer', returnFullResponse: true },
    { method: 'GET', url, json: false, returnFullResponse: true },
  ];

  let lastError;
  for (const options of attempts) {
    try {
      const response = await this.helpers.httpRequest(options);
      const body = response?.body ?? response;
      const headers = response?.headers ?? {};
      const buffer = Buffer.isBuffer(body)
        ? body
        : body instanceof ArrayBuffer
          ? Buffer.from(body)
          : ArrayBuffer.isView(body)
            ? Buffer.from(body.buffer)
            : typeof body === 'string'
              ? Buffer.from(body, 'binary')
              : null;

      if (buffer && buffer.length > 0) {
        return { buffer, headers };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('download de audio falhou');
}

function clean(value) {
  return String(value ?? '').trim();
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
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

function looksLikeUrl(value) {
  return /^https?:\\/\\//i.test(clean(value));
}

function extensionFor(mimeType) {
  const mime = clean(mimeType).toLowerCase();
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg';
  return 'ogg';
}

const items = $input.all();
const output = [];

for (const item of items) {
  const source = item.json || {};
  const webhook = $('Webhook1').first().json || {};
  const data = webhook.body?.data || {};
  const message = data.message || {};
  const audio = message.audioMessage || message.pttMessage || {};

  const inline = firstText(
    message.base64,
    audio.base64,
    audio.media,
    audio.file,
    data.base64,
    source.base64,
    source.data
  );

  const remoteUrl = firstText(
    source.audioUrl,
    audio.url,
    audio.mediaUrl,
    audio.fileUrl,
    audio.downloadUrl,
    message.mediaUrl,
    data.mediaUrl,
    data.url
  );

  const fallback = {
    ...source,
    audioValid: false,
    audioSource: inline ? 'base64_invalid' : (remoteUrl ? 'url_invalid' : 'missing'),
    data: '',
    mimetype: firstText(audio.mimetype, audio.mimeType, 'application/ogg'),
    path: 'audio.ogg',
    audioText: '[audio recebido, mas a midia nao estava disponivel para transcricao]',
    media_warning: 'audio_payload_invalid_or_missing',
  };

  try {
    const inlineParsed = stripDataUrl(inline);
    if (looksLikeBase64(inlineParsed.base64)) {
      const mimeType = firstText(inlineParsed.mimeType, audio.mimetype, audio.mimeType, 'application/ogg');
      output.push({
        json: {
          ...source,
          audioValid: true,
          audioSource: 'base64',
          data: inlineParsed.base64.replace(/\\s+/g, ''),
          mimetype: mimeType,
          path: \`audio.\${extensionFor(mimeType)}\`,
          media_warning: null,
        },
      });
      continue;
    }

    if (looksLikeUrl(remoteUrl)) {
      const downloaded = await requestBinary.call(this, remoteUrl);
      const contentType = firstText(
        downloaded.headers['content-type'],
        downloaded.headers['Content-Type'],
        audio.mimetype,
        audio.mimeType,
        'application/ogg'
      ).split(';')[0];

      output.push({
        json: {
          ...source,
          audioValid: true,
          audioSource: 'url',
          audioUrl: remoteUrl,
          data: downloaded.buffer.toString('base64'),
          mimetype: contentType,
          path: \`audio.\${extensionFor(contentType)}\`,
          media_warning: null,
        },
      });
      continue;
    }

    output.push({ json: fallback });
  } catch (error) {
    output.push({
      json: {
        ...fallback,
        media_warning: 'audio_download_or_normalization_failed',
        media_error: error?.message || String(error),
      },
    });
  }
}

return output;`;

const cardsCode = `const rows = items.map(i => i.json);

const input = $("Quando chamada pela Ju").first().json;

const FALLBACK_IMAGE = "https://app.juremabksimoveis.com.br/images/jurema/logo-white-official.png";

function clean(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return clean(v)
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase();
}

function number(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\\d,.-]/g, "").replace(/\\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function money(v) {
  const n = number(v);
  if (!n) return "Valor sob consulta";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || "";
}

function validUrl(value) {
  const url = clean(value);
  if (!/^https?:\\/\\//i.test(url)) return "";
  if (/localhost|127\\.0\\.0\\.1|\\s/i.test(url)) return "";
  return url;
}

function imageFrom(value) {
  if (typeof value === "string") return validUrl(value);
  if (value && typeof value === "object") return validUrl(value.url || value.source_url || value.guid?.rendered);
  return "";
}

function inferTipo(i) {
  const text = norm([
    i.tipo_de_imovel,
    i.titulo_comercial,
    i.titulo_seo,
    i.link_do_imovel,
    i.descricao_imovel,
  ].filter(Boolean).join(" "));

  if (text.includes("apartamento") || text.includes("apto")) return "apartamento";
  if (text.includes("casa")) return "casa";
  if (text.includes("flat")) return "flat";
  if (text.includes("terreno")) return "terreno";
  if (text.includes("sala")) return "sala";
  return clean(i.tipo_de_imovel) || "imovel";
}

function shortDescription(i, tipo) {
  const parts = [
    i.bairro ? \`Bairro: \${clean(i.bairro)}\` : null,
    tipo ? \`Tipo: \${tipo}\` : null,
    i.quartos ? \`\${i.quartos} quarto\${String(i.quartos) === "1" ? "" : "s"}\` : null,
    i.metragem ? \`\${i.metragem} m2\` : null,
    money(i.valor),
  ].filter(Boolean);

  const ref = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);
  if (ref) parts.push(\`Ref. \${ref}\`);

  return parts.join(" | ");
}

const tenantId = clean(input.tenant_id);
const codigoRef = clean(input.codigo_ref);
const bairroBusca = norm(input.bairro);
const tipoBusca = norm(input.tipo_imovel);
const quartosBusca = clean(input.quartos);
const valorMax = number(input.valor_max);

const filtrados = rows.filter(i => {
  if (tenantId && i.tenant_id !== tenantId) return false;

  if (i.status_publicacao && i.status_publicacao !== "Publicado") return false;
  if (i.status_operacional && i.status_operacional !== "disponivel") return false;

  if (codigoRef) {
    const refs = [
      i.referencia_unica,
      i.metadata?.referencia_unica,
      i.metadata?.codigo_do_imovel,
      i.id_imovel,
      i.external_id,
    ].map(clean);

    if (!refs.includes(codigoRef)) return false;
  }

  if (bairroBusca && !norm(i.bairro).includes(bairroBusca)) return false;

  if (tipoBusca) {
    const tipoInferido = inferTipo(i);
    if (!tipoInferido || !norm(tipoInferido).includes(tipoBusca)) return false;
  }

  if (quartosBusca && clean(i.quartos) !== quartosBusca) return false;

  if (valorMax !== null) {
    const valor = number(i.valor);
    if (valor === null || valor > valorMax) return false;
  }

  return true;
});

filtrados.sort((a, b) => (number(a.valor) ?? Infinity) - (number(b.valor) ?? Infinity));

const cards = filtrados.slice(0, 10).map(i => {
  const tipo = inferTipo(i);
  const image = imageFrom(i.imagem_card) || imageFrom(i.foto_principal) || imageFrom(i.metadata?.imagem_card) || imageFrom(i.metadata?.foto_principal);
  const url = validUrl(i.link_do_imovel) || validUrl(i.link_sanitizado) || validUrl(i.metadata?.link_do_imovel);
  const referencia = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);

  return {
    title: firstText(i.titulo_comercial, i.titulo_seo, referencia ? \`Imovel \${referencia}\` : "Imovel disponivel"),
    description: shortDescription(i, tipo),
    image: image || FALLBACK_IMAGE,
    url: url || "https://juremabksimoveis.com.br/imoveis/",
    bairro: clean(i.bairro) || null,
    price: number(i.valor),
    media: {
      image_valid: Boolean(image),
      image_fallback: !image,
      url_valid: Boolean(url),
    },
    metadata: {
      id: i.id,
      referencia: referencia || null,
      codigo_ref: firstText(i.metadata?.codigo_do_imovel, i.id_imovel) || null,
      tipo,
    },
  };
});

return [
  {
    json: {
      success: true,
      tool: "consultar_imoveis",
      total_received: rows.length,
      total_filtered: filtrados.length,
      total: cards.length,
      filters_used: {
        tenant_id: tenantId,
        codigo_ref: codigoRef || null,
        bairro: clean(input.bairro) || null,
        tipo_imovel: clean(input.tipo_imovel) || null,
        quartos: quartosBusca || null,
        valor_max: valorMax,
      },
      cards,
      warning: cards.length ? null : "nenhum_imovel_encontrado_para_os_filtros",
    },
  },
];`;

const main = readJson(mainPath);

upsertNode(main, {
  parameters: { jsCode: normalizeAudioCode },
  id: 'normalize-audio-payload-jurema',
  name: 'Normalize Audio Payload',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [7376, 2240],
  alwaysOutputData: true,
  onError: 'continueRegularOutput',
});

upsertNode(main, {
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
          id: 'audio-valid-condition',
          leftValue: '={{ $json.audioValid }}',
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
  id: 'audio-media-valid-jurema',
  name: 'Audio Media Valid?',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [7584, 2240],
  alwaysOutputData: true,
});

const convertAudio = nodeByName(main, 'Convert to audio1');
convertAudio.position = [7808, 2176];
convertAudio.parameters = {
  operation: 'toBinary',
  sourceProperty: 'data',
  binaryPropertyName: 'audio',
  options: {
    fileName: '={{ $json.path || "audio.ogg" }}',
    mimeType: '={{ $json.mimetype || "application/ogg" }}',
  },
};

const openAi = nodeByName(main, 'OpenAI1');
openAi.position = [8032, 2176];
openAi.parameters = {
  ...openAi.parameters,
  binaryPropertyName: 'audio',
  inputDataFieldName: 'audio',
};

const audioMemory = nodeByName(main, 'Audio Memory1');
audioMemory.position = [8272, 2240];
audioMemory.parameters.messageData = '={{ $json.audioText || $json.text || "" }}';

connect(main, 'Switch7', [
  [{ node: 'Texto curto Memory1', type: 'main', index: 0 }],
  [{ node: 'Texto curto Memory1', type: 'main', index: 0 }],
  [{ node: 'Normalize Audio Payload', type: 'main', index: 0 }],
  [{ node: 'Montar Dados da Imagem1', type: 'main', index: 0 }],
  [{ node: 'Montar Dados do video1', type: 'main', index: 0 }],
  [{ node: 'Montar Dados do video1', type: 'main', index: 0 }],
]);
connect(main, 'Normalize Audio Payload', [[{ node: 'Audio Media Valid?', type: 'main', index: 0 }]]);
connect(main, 'Audio Media Valid?', [
  [{ node: 'Convert to audio1', type: 'main', index: 0 }],
  [{ node: 'Audio Memory1', type: 'main', index: 0 }],
]);
connect(main, 'Convert to audio1', [[{ node: 'OpenAI1', type: 'main', index: 0 }]]);
connect(main, 'OpenAI1', [[{ node: 'Audio Memory1', type: 'main', index: 0 }]]);

fs.writeFileSync(mainOut, JSON.stringify(main, null, 2));

const cards = readJson(cardsPath);
nodeByName(cards, 'Consultar Imoveis Supabase').parameters.jsCode = cardsCode;
fs.writeFileSync(cardsOut, JSON.stringify(cards, null, 2));

console.log(`Wrote ${path.relative(root, mainOut)}`);
console.log(`Wrote ${path.relative(root, cardsOut)}`);
