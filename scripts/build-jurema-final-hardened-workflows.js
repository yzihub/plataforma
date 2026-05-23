const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainIn = path.join(root, 'n8n', 'archive', 'pre-runtime', 'workflow-cj4V6DW0Qy6el0PM.hardened.json');
const cardsIn = path.join(root, 'n8n', 'archive', 'pre-runtime', 'workflow-0udn6N4YelE6F2Ws.hardened.json');
const mainOut = path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');
const cardsOut = path.join(root, 'n8n', 'production', 'workflow-jurema-consultar-imoveis.final-hardened.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

function node(workflow, name) {
  const found = workflow.nodes.find((n) => n.name === name);
  if (!found) throw new Error(`Node not found: ${name}`);
  return found;
}

function upsertSetAssignment(setNode, assignment) {
  const assignments = setNode.parameters.assignments.assignments;
  const current = assignments.find((item) => item.name === assignment.name);
  if (current) Object.assign(current, assignment);
  else assignments.push(assignment);
}

const env = readEnv(path.join(root, '.env.local'));
const main = readJson(mainIn);
const db = node(main, 'dados do banco');

upsertSetAssignment(db, {
  id: 'evolution-api-url-final-hardening',
  name: 'EVOLUTION_API_URL',
  value: env.EVOLUTION_API_URL || '={{ $vars.EVOLUTION_API_URL || $vars.SERVER_URL || "" }}',
  type: 'string',
});
upsertSetAssignment(db, {
  id: 'evolution-api-key-final-hardening',
  name: 'EVOLUTION_API_KEY',
  value: env.EVOLUTION_API_KEY || '={{ $vars.EVOLUTION_API_KEY || $vars.AUTHENTICATION_API_KEY || "" }}',
  type: 'string',
});
upsertSetAssignment(db, {
  id: 'evolution-instance-final-hardening',
  name: 'EVOLUTION_INSTANCE',
  value: '={{ $("Normaliza Webhook1").item.json.instance || $("Webhook1").item.json.body.instance || "Jurema Brokers" }}',
  type: 'string',
});

const codeNode = node(main, 'Code in JavaScript');
let code = codeNode.parameters.jsCode;

const helperAnchor = `async function getFirst(args) {`;
const avatarHelpers = `function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeMetadata(base, extra) {
  return { ...(isPlainObject(base) ? base : {}), ...(isPlainObject(extra) ? extra : {}) };
}

function validHttpUrl(value) {
  const raw = String(value ?? '').trim();
  if (!/^https?:\\/\\//i.test(raw)) return '';
  if (/\\s|localhost|127\\.0\\.0\\.1/i.test(raw)) return '';
  return raw;
}

function pickProfilePictureUrl(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return validHttpUrl(payload);
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const url = pickProfilePictureUrl(item);
      if (url) return url;
    }
    return '';
  }
  if (typeof payload !== 'object') return '';

  const candidates = [
    payload.profilePictureUrl,
    payload.profilePicture,
    payload.pictureUrl,
    payload.picture,
    payload.url,
    payload.data?.profilePictureUrl,
    payload.data?.profilePicture,
    payload.data?.pictureUrl,
    payload.data?.picture,
    payload.data?.url,
  ];

  for (const candidate of candidates) {
    const url = pickProfilePictureUrl(candidate);
    if (url) return url;
  }

  return '';
}

async function fetchLeadAvatar({ evolutionBaseUrl, evolutionApiKey, evolutionInstance, telefone }) {
  const base = String(evolutionBaseUrl || '').replace(/\\/+$/, '');
  const instance = String(evolutionInstance || '').trim();
  const number = String(telefone || '').replace(/\\D/g, '');

  if (!base || !evolutionApiKey || !instance || !number) {
    return {
      url: '',
      status: 'not_configured',
      warning: 'evolution_profile_picture_not_configured',
    };
  }

  try {
    const response = await n8nHttpRequest.call(this, {
      method: 'POST',
      url: \`\${base}/chat/fetchProfilePictureUrl/\${encodeURIComponent(instance)}\`,
      headers: {
        apikey: evolutionApiKey,
        'Content-Type': 'application/json',
      },
      body: { number },
      json: true,
      timeout: 8000,
    });

    const url = pickProfilePictureUrl(response);
    if (!url) {
      return {
        url: '',
        status: 'not_available',
        warning: 'lead_profile_picture_empty',
      };
    }

    return {
      url,
      status: 'ok',
      warning: null,
    };
  } catch (error) {
    return {
      url: '',
      status: 'error',
      warning: 'lead_profile_picture_fetch_failed',
      error: error?.message || String(error),
    };
  }
}

`;

if (!code.includes('fetchLeadAvatar({')) {
  code = code.replace(helperAnchor, `${avatarHelpers}${helperAnchor}`);
}

const apiKeyBlock = `  const apiKey =
    input.SUPABASE_SECRET_KEY ||
    input.SUPABASE_SERVICE_ROLE_KEY ||
    input.SUPABASE_ANON_KEY ||
    '';

  if (!apiKey) throw new Error('Chave Supabase ausente no node dados do banco.');
  if (!telefone) throw new Error('Telefone não normalizado; não é possível criar lead/conversa.');
`;

const avatarBlock = `  const apiKey =
    input.SUPABASE_SECRET_KEY ||
    input.SUPABASE_SERVICE_ROLE_KEY ||
    input.SUPABASE_ANON_KEY ||
    '';

  const evolutionBaseUrl =
    input.EVOLUTION_API_URL ||
    input.SERVER_URL ||
    '';

  const evolutionApiKey =
    input.EVOLUTION_API_KEY ||
    input.AUTHENTICATION_API_KEY ||
    '';

  const evolutionInstance =
    input.EVOLUTION_INSTANCE ||
    rawPayload.instance ||
    instance ||
    'Jurema Brokers';

  if (!apiKey) throw new Error('Chave Supabase ausente no node dados do banco.');
  if (!telefone) throw new Error('Telefone não normalizado; não é possível criar lead/conversa.');

  const avatarResult = await fetchLeadAvatar.call(this, {
    evolutionBaseUrl,
    evolutionApiKey,
    evolutionInstance,
    telefone,
  });

  const avatarMetadata = {
    lead_avatar_url: avatarResult.url || null,
    lead_avatar_status: avatarResult.status,
    lead_avatar_warning: avatarResult.warning || null,
    lead_avatar_checked_at: new Date().toISOString(),
  };
  if (avatarResult.error) avatarMetadata.lead_avatar_error = avatarResult.error;
`;

code = code.replace(apiKeyBlock, avatarBlock);

code = code.replace(
  `        metadata: {
          origem: origemLead,
          primeira_mensagem: mensagem,
        },`,
  `        metadata: mergeMetadata({
          origem: origemLead,
          primeira_mensagem: mensagem,
        }, avatarMetadata),`
);

code = code.replace(
  `    const patch = {
      phone_normalized: lead.phone_normalized || telefone,
      source: lead.source || 'whatsapp',
      updated_at: new Date().toISOString(),
    };
    if ((!lead.name || lead.name === 'Lead') && nome) patch.name = nome;`,
  `    const patch = {
      phone_normalized: lead.phone_normalized || telefone,
      source: lead.source || 'whatsapp',
      metadata: mergeMetadata(lead.metadata, avatarMetadata),
      updated_at: new Date().toISOString(),
    };
    if ((!lead.name || lead.name === 'Lead') && nome) patch.name = nome;`
);

code = code.replace(
  `        metadata: {
          instance,
          origem: origemLead,
        },`,
  `        metadata: mergeMetadata({
          instance,
          origem: origemLead,
        }, avatarMetadata),`
);

code = code.replace(
  `        updated_at: new Date().toISOString(),
      },`,
  `        metadata: mergeMetadata(conversation.metadata, avatarMetadata),
        updated_at: new Date().toISOString(),
      },`
);

code = code.replace(
  `        metadata: {
          origem: origemLead,
        },`,
  `        metadata: mergeMetadata({
          origem: origemLead,
        }, avatarMetadata),`
);

code = code.replace(
  `      external_message_id: externalMessageId,
      _context: context,`,
  `      external_message_id: externalMessageId,
      lead_avatar_url: avatarResult.url || lead.metadata?.lead_avatar_url || null,
      lead_avatar_status: avatarResult.status,
      lead_avatar_warning: avatarResult.warning || null,
      _context: context,`
);

code = code.replace(
  `        ai_paused: conversation.ai_paused === true,`,
  `        ai_paused: conversation.ai_paused === true,
        lead_avatar_status: avatarResult.status,
        lead_avatar_warning: avatarResult.warning || null,`
);

codeNode.parameters.jsCode = code;
fs.writeFileSync(mainOut, JSON.stringify(main, null, 2));

const cards = readJson(cardsIn);
node(cards, 'Consultar Imoveis Supabase').parameters.jsCode = `const rows = items.map(i => i.json);

const input = $("Quando chamada pela Ju").first().json;

const FALLBACK_IMAGE = "https://app.juremabksimoveis.com.br/images/jurema/logo-white-official.png";
const FALLBACK_URL = "https://juremabksimoveis.com.br/imoveis/";

function clean(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return clean(v)
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase();
}

function titleCase(value) {
  return clean(value)
    .toLowerCase()
    .split(/\\s+/)
    .map((word) => {
      if (["de", "da", "do", "das", "dos", "em", "no", "na", "e"].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\\bJp\\b/g, "JP");
}

function number(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\\d,.-]/g, "").replace(/\\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function money(v) {
  const n = number(v);
  if (!n) return "valor sob consulta";
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

function bedroomsLabel(value) {
  const quartos = clean(value);
  if (!quartos) return "";
  return \`\${quartos} quarto\${quartos === "1" ? "" : "s"}\`;
}

function premiumTitle(i, tipo) {
  const bairro = titleCase(i.bairro);
  const titulo = titleCase(firstText(i.titulo_comercial, i.titulo_seo));
  const ref = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);

  if (bairro && tipo) return \`\${titleCase(tipo)} em \${bairro}\`;
  if (titulo) return titulo;
  if (ref) return \`Imovel selecionado - \${ref}\`;
  return "Imovel selecionado pela Jurema";
}

function premiumDescription(i, tipo) {
  const parts = [
    titleCase(i.bairro),
    bedroomsLabel(i.quartos),
    i.metragem ? \`\${i.metragem} m2\` : "",
    money(i.valor),
  ].filter(Boolean);

  const base = parts.join(" | ");
  const ref = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);
  const refText = ref ? \` Ref. \${ref}.\` : "";

  if (base) return \`\${base}.\${refText} Opcao selecionada para avaliarmos juntos.\`;
  return \`Opcao selecionada pela Jurema Brokers para avaliarmos juntos.\${refText}\`;
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

const cards = filtrados.slice(0, 6).map(i => {
  const tipo = inferTipo(i);
  const image = imageFrom(i.imagem_card) || imageFrom(i.foto_principal) || imageFrom(i.metadata?.imagem_card) || imageFrom(i.metadata?.foto_principal);
  const url = validUrl(i.link_do_imovel) || validUrl(i.link_sanitizado) || validUrl(i.metadata?.link_do_imovel);
  const referencia = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);
  const card = {
    title: premiumTitle(i, tipo),
    description: premiumDescription(i, tipo),
    image: image || FALLBACK_IMAGE,
    url: url || FALLBACK_URL,
    bairro: clean(i.bairro) || null,
    price: number(i.valor),
    media: {
      image_valid: Boolean(image),
      image_fallback: !image,
      url_valid: Boolean(url),
      url_fallback: !url,
    },
    preview: {
      title: premiumTitle(i, tipo),
      description: premiumDescription(i, tipo),
      image: image || FALLBACK_IMAGE,
    },
    metadata: {
      id: i.id,
      referencia: referencia || null,
      codigo_ref: firstText(i.metadata?.codigo_do_imovel, i.id_imovel) || null,
      tipo,
    },
  };

  return {
    ...card,
    presentation_policy: "visual_card_primary_no_text_dump_v1",
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
      fallback_message: cards.length ? null : "Nao encontrei uma opcao aderente com esses filtros. Posso ajustar bairro, valor ou tipologia e buscar melhor.",
    },
  },
];`;

fs.writeFileSync(cardsOut, JSON.stringify(cards, null, 2));
require('./patch-ju-lightweight-hotpath');
require('./patch-ju-tool-revalidation-policy');
require('./patch-ju-presentation-governance');
require('./patch-ju-conversational-style-governance');
require('./patch-ju-operational-state-persistence');
require('./patch-jurema-property-operational-ranking');
require('./patch-evolution-audio-converter-normalization');

console.log(`Wrote ${path.relative(root, mainOut)}`);
console.log(`Wrote ${path.relative(root, cardsOut)}`);
