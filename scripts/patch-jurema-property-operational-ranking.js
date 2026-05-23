const fs = require('fs');
const path = require('path');

const workflowPath = path.join(
  process.cwd(),
  'n8n',
  'production',
  'workflow-jurema-consultar-imoveis.final-hardened.json',
);

const jsCode = String.raw`const rows = items.map(i => i.json);

const input = $("Quando chamada pela Ju").first().json;

const FALLBACK_IMAGE = "https://app.juremabksimoveis.com.br/images/jurema/logo-white-official.png";
const FALLBACK_URL = "https://juremabksimoveis.com.br/imoveis/";
const BEACH_BAIRROS = ["cabo branco", "tambau", "manaira", "bessa", "jardim oceania", "intermares", "ponta de campina", "poco"];

function clean(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return clean(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function titleCase(value) {
  return clean(value)
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (["de", "da", "do", "das", "dos", "em", "no", "na", "e"].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\bJp\b/g, "JP");
}

function number(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
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
  if (!/^https?:\/\//i.test(url)) return "";
  if (/localhost|127\.0\.0\.1|\s/i.test(url)) return "";
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

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function operationalFeatures(i) {
  const text = norm([
    i.descricao_imovel,
    i.titulo_comercial,
    i.titulo_seo,
    i.tipo_de_imovel,
    i.bairro,
  ].filter(Boolean).join(" "));
  const bairro = norm(i.bairro);
  const tipo = norm(inferTipo(i));
  const quartos = number(i.quartos) || 0;
  const vagas = number(i.vagas) || 0;
  const valor = number(i.valor) || 0;

  const tags = [];
  const lifestyle = [];
  let luxury_score = 0;
  let family_score = 0;
  let beach_score = 0;
  let investment_score = 0;

  if (hasAny(text, ["alto padrao", "alto-padrao", "premium", "sofisticado", "luxo", "finissimo", "requinte"])) {
    luxury_score += 2;
    addUnique(tags, "alto_padrao");
  }
  if (hasAny(text, ["vista mar", "vista para o mar", "frente mar", "beira mar", "pe na areia"])) {
    beach_score += 3;
    luxury_score += 1;
    addUnique(tags, "vista_mar");
  }
  if (hasAny(text, ["varanda gourmet", "espaco gourmet", "area gourmet", "gourmet"])) {
    luxury_score += 1;
    family_score += 1;
    addUnique(tags, "gourmet");
  }
  if (hasAny(text, ["coworking", "home office", "sala de estudos"])) {
    investment_score += 1;
    addUnique(lifestyle, "remote_work");
  }
  if (hasAny(text, ["praia", "orla", "100m da praia", "100 metros da praia", "a poucos metros do mar", "proximo ao mar"])) {
    beach_score += 2;
    addUnique(lifestyle, "praia");
  }
  if (BEACH_BAIRROS.includes(bairro)) {
    beach_score += 1;
    addUnique(lifestyle, "praia");
  }
  if (hasAny(text, ["pet friendly", "aceita pet", "pet"])) {
    family_score += 1;
    addUnique(tags, "pet");
  }
  if (hasAny(text, ["lazer completo", "piscina", "academia", "playground", "brinquedoteca", "quadra", "salao de festas"])) {
    family_score += 2;
    addUnique(tags, "lazer");
  }
  if (hasAny(text, ["escola", "colegio", "familia", "familiar", "seguranca", "condominio fechado"])) {
    family_score += 2;
    addUnique(lifestyle, "familia");
  }
  if (quartos >= 3) family_score += 2;
  if (tipo === "casa") family_score += 1;
  if (vagas >= 2) luxury_score += 1;
  if (hasAny(text, ["investimento", "rentabilidade", "valorizacao", "airbnb", "temporada", "locacao", "compacto"])) {
    investment_score += 2;
    addUnique(lifestyle, "investimento");
  }
  if (valor >= 1200000) luxury_score += 1;

  return {
    tags,
    lifestyle,
    luxury_score,
    family_score,
    beach_score,
    investment_score,
  };
}

function leadProfile() {
  const text = norm([
    input.objetivo,
    input.intencao,
    input.finalidade,
    input.bairro,
    input.tipo_imovel,
    input.observacoes,
  ].filter(Boolean).join(" "));
  const quartos = number(input.quartos) || 0;
  const valorMax = number(input.valor_max) || 0;
  const bairro = norm(input.bairro);

  return {
    wants_family: quartos >= 3 || hasAny(text, ["familia", "filhos", "casa", "lazer", "seguranca"]),
    wants_beach: hasAny(text, ["praia", "mar", "vista", "orla", "cabo branco", "tambau", "manaira", "bessa", "intermares"]) || BEACH_BAIRROS.includes(bairro),
    wants_luxury: valorMax >= 1000000 || hasAny(text, ["alto padrao", "luxo", "premium", "gourmet", "vista mar"]),
    wants_investment: hasAny(text, ["investir", "investimento", "rentabilidade", "airbnb", "temporada", "locacao"]),
  };
}

function operationalSummary(i, tipo, features) {
  const descriptors = [];
  if (features.tags.includes("alto_padrao")) descriptors.push("alto padrao");
  if (features.tags.includes("vista_mar")) descriptors.push("com vista mar");
  if (features.tags.includes("gourmet")) descriptors.push("com area gourmet");
  if (features.tags.includes("lazer")) descriptors.push("com lazer");
  if (features.lifestyle.includes("praia")) descriptors.push("perto da praia");
  if (features.lifestyle.includes("familia")) descriptors.push("bom para familia");
  if (features.lifestyle.includes("investimento")) descriptors.push("com perfil de investimento");

  const base = [
    titleCase(tipo),
    descriptors.join(", "),
    titleCase(i.bairro) ? "em " + titleCase(i.bairro) : "",
    i.quartos ? "com " + i.quartos + " quarto" + (String(i.quartos) === "1" ? "" : "s") : "",
  ].filter(Boolean).join(" ");

  return base || "Imovel selecionado por aderencia operacional ao perfil do lead.";
}

function rankProperty(i, features, profile) {
  const reasons = [];
  let score = 0;
  const bairroBusca = norm(input.bairro);
  const tipoBusca = norm(input.tipo_imovel);
  const quartosBusca = clean(input.quartos);
  const valorMax = number(input.valor_max);
  const valor = number(i.valor);
  const tipo = norm(inferTipo(i));

  if (bairroBusca && norm(i.bairro).includes(bairroBusca)) {
    score += 8;
    reasons.push("bairro");
  }
  if (tipoBusca && tipo.includes(tipoBusca)) {
    score += 5;
    reasons.push("tipologia");
  }
  if (quartosBusca && clean(i.quartos) === quartosBusca) {
    score += 4;
    reasons.push("quartos");
  }
  if (valorMax !== null && valor !== null && valor <= valorMax) {
    score += 3;
    reasons.push("valor");
  }
  if (profile.wants_family && features.family_score > 0) {
    score += features.family_score * 2;
    reasons.push("perfil_familiar");
  }
  if (profile.wants_beach && features.beach_score > 0) {
    score += features.beach_score * 2;
    reasons.push("praia_vista");
  }
  if (profile.wants_luxury && features.luxury_score > 0) {
    score += features.luxury_score * 2;
    reasons.push("alto_padrao");
  }
  if (profile.wants_investment && features.investment_score > 0) {
    score += features.investment_score * 2;
    reasons.push("investimento");
  }

  score += Math.min(4, features.family_score + features.beach_score + features.luxury_score + features.investment_score);

  return { score, reasons };
}

function bedroomsLabel(value) {
  const quartos = clean(value);
  if (!quartos) return "";
  return quartos + " quarto" + (quartos === "1" ? "" : "s");
}

function premiumTitle(i, tipo) {
  const bairro = titleCase(i.bairro);
  const titulo = titleCase(firstText(i.titulo_comercial, i.titulo_seo));
  const ref = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);

  if (bairro && tipo) return titleCase(tipo) + " em " + bairro;
  if (titulo) return titulo;
  if (ref) return "Imovel selecionado - " + ref;
  return "Imovel selecionado pela Jurema";
}

function premiumDescription(i, tipo, summary) {
  const parts = [
    titleCase(i.bairro),
    bedroomsLabel(i.quartos),
    i.metragem ? i.metragem + " m2" : "",
    money(i.valor),
  ].filter(Boolean);

  const base = parts.join(" | ");
  const ref = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);
  const refText = ref ? " Ref. " + ref + "." : "";

  if (base) return base + "." + refText + " " + summary;
  return summary + "." + refText;
}

const tenantId = clean(input.tenant_id);
const codigoRef = clean(input.codigo_ref);
const bairroBusca = norm(input.bairro);
const tipoBusca = norm(input.tipo_imovel);
const quartosBusca = clean(input.quartos);
const valorMax = number(input.valor_max);
const profile = leadProfile();

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

const ranked = filtrados.map((i) => {
  const tipo = inferTipo(i);
  const features = operationalFeatures(i);
  const ranking = rankProperty(i, features, profile);
  const summary = operationalSummary(i, tipo, features);
  return { item: i, tipo, features, ranking, summary };
}).sort((a, b) => {
  if (b.ranking.score !== a.ranking.score) return b.ranking.score - a.ranking.score;
  return (number(a.item.valor) ?? Infinity) - (number(b.item.valor) ?? Infinity);
});

const cards = ranked.slice(0, 3).map(({ item: i, tipo, features, ranking, summary }) => {
  const image = imageFrom(i.imagem_card) || imageFrom(i.foto_principal) || imageFrom(i.metadata?.imagem_card) || imageFrom(i.metadata?.foto_principal);
  const url = validUrl(i.link_do_imovel) || validUrl(i.link_sanitizado) || validUrl(i.metadata?.link_do_imovel);
  const referencia = firstText(i.referencia_unica, i.metadata?.referencia_unica, i.metadata?.codigo_do_imovel, i.id_imovel);
  const card = {
    id: i.id || i.id_imovel || referencia || null,
    title: premiumTitle(i, tipo),
    description: premiumDescription(i, tipo, summary),
    image: image || FALLBACK_IMAGE,
    url: url || FALLBACK_URL,
    bairro: clean(i.bairro) || null,
    cidade: clean(i.cidade) || clean(i.city) || "Joao Pessoa",
    price: number(i.valor),
    quartos: number(i.quartos),
    banheiros: number(i.banheiros),
    vagas: number(i.vagas),
    operational_features: features,
    operational_summary: summary,
    rank_score: ranking.score,
    rank_reasons: ranking.reasons.slice(0, 4),
    media: {
      image_valid: Boolean(image),
      image_fallback: !image,
      url_valid: Boolean(url),
      url_fallback: !url,
    },
    preview: {
      title: premiumTitle(i, tipo),
      description: summary,
      image: image || FALLBACK_IMAGE,
    },
    metadata: {
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
      total_ranked: ranked.length,
      total: cards.length,
      payload_policy: "ju_minimal_operational_cards_v1",
      filters_used: {
        tenant_id: tenantId,
        codigo_ref: codigoRef || null,
        bairro: clean(input.bairro) || null,
        tipo_imovel: clean(input.tipo_imovel) || null,
        quartos: quartosBusca || null,
        valor_max: valorMax,
      },
      ranking_profile: profile,
      cards,
      warning: cards.length ? null : "nenhum_imovel_encontrado_para_os_filtros",
      fallback_message: cards.length ? null : "Nao encontrei uma opcao aderente com esses filtros. Posso ajustar bairro, valor ou tipologia e buscar melhor.",
    },
  },
];`;

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

function patchNodes(nodes) {
  if (!Array.isArray(nodes)) return;

  const codeNode = nodes.find((node) => node.name === 'Consultar Imoveis Supabase');
  if (!codeNode) throw new Error('Consultar Imoveis Supabase not found');
  codeNode.parameters = codeNode.parameters || {};
  codeNode.parameters.jsCode = jsCode;

  const supabaseNode = nodes.find((node) => node.name === 'Get many rows');
  if (!supabaseNode) throw new Error('Get many rows not found');
  supabaseNode.parameters = supabaseNode.parameters || {};
  supabaseNode.parameters.filters = {
    conditions: [
      {
        keyName: 'tenant_id',
        condition: 'eq',
        keyValue: '={{ $json.tenant_id }}',
      },
    ],
  };
}

patchNodes(workflow.nodes);
patchNodes(workflow.activeVersion?.nodes);

fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`);
console.log('patched consultar_imoveis operational parser/ranking payload');
