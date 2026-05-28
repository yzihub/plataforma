const FORBIDDEN_PATTERNS = [
  { id: "permission_posso_te_mostrar", weight: 10, pattern: /\bposso te mostrar\b/i },
  { id: "permission_posso_enviar", weight: 8, pattern: /\bposso (te )?enviar\b/i },
  { id: "permission_deseja_visualizar", weight: 10, pattern: /\bdeseja visualizar\b/i },
  { id: "permission_quer_que_eu_mostre", weight: 8, pattern: /\bquer que eu mostre\b/i },
  { id: "gpt_structure", weight: 7, pattern: /\bclaro[,!]?\s*(vamos la|posso ajudar|entendi sua solicitacao)\b/i },
  { id: "corporate_tone", weight: 6, pattern: /\b(prezado|atendimento|solicitacao|conforme informado|estaremos encaminhando)\b/i },
  { id: "catalog_dump", weight: 10, pattern: /(?:\n|^)\s*(?:[-*]|\d+[.)])\s+.*(?:R\$|quartos|m2|bairro)/i },
  { id: "markdown_dump", weight: 6, pattern: /(\*\*|```|^#{1,6}\s|\|.+\|)/m },
  { id: "excessive_emoji", weight: 5, pattern: /(?:[\u{1F300}-\u{1FAFF}].*){3,}/u },
  { id: "hype_language", weight: 5, pattern: /\b(top|sensacional|incrivel|imperdivel|oportunidade unica|ape)\b/i },
  { id: "financial_promise", weight: 10, pattern: /\b(garantid[ao]|retorno garantido|valorizacao garantida|aprovacao garantida|ocupacao garantida)\b/i },
  { id: "runtime_leak", weight: 8, pattern: /\b(n8n|supabase|redis|vector|retrieval|ferramenta|tool|prompt|xml|gpt)\b/i },
];

const POSITIVE_PATTERNS = [
  { id: "direct_property_presentation", weight: 8, pattern: /\b(encontrei|separei|achei|tenho uma opcao|ficou alinhad[ao])\b/i },
  { id: "emotional_alignment", weight: 6, pattern: /\b(faz sentido|entendo|rotina|tranquilidade|seguranca|conforto|momento|criterio)\b/i },
  { id: "consultative_tradeoff", weight: 6, pattern: /\b(pesa|equilibr|tradeoff|diferenca|perfil|liquidez|rotina|valorizacao)\b/i },
  { id: "no_pressure", weight: 4, pattern: /\b(com calma|sem pressa|no seu tempo|organizar melhor)\b/i },
  { id: "property_context", weight: 6, pattern: /\b(alinhad[ao] com|combina com|pelo que voce|com o que voces|faz sentido para)\b/i },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractResponseText(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    return findLikelyText(parsed) || text;
  } catch {
    return text;
  }
}

function findLikelyText(value, depth = 0) {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findLikelyText(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const keys = ["output", "text", "response", "message", "mensagem", "reply", "answer", "content"];
  for (const key of keys) {
    const found = findLikelyText(value[key], depth + 1);
    if (found) return found;
  }
  return "";
}

function extractUrls(text) {
  return Array.from(String(text || "").matchAll(/https?:\/\/[^\s)>\]]+/g), (match) =>
    match[0].replace(/[.,;!?]+$/, ""),
  );
}

function scoreTurn({ scenario, turn, responseText, httpStatus, latencyMs }) {
  const normalized = normalizeText(responseText);
  const violations = [];
  const positives = [];
  let score = 100;

  if (httpStatus < 200 || httpStatus >= 300) {
    violations.push({ id: "http_non_2xx", severity: "critical", detail: `HTTP ${httpStatus}`, weight: 30 });
    score -= 30;
  }

  if (!normalized) {
    violations.push({ id: "empty_response", severity: "critical", detail: "No textual response detected", weight: 30 });
    score -= 30;
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(responseText)) {
      violations.push({ id: rule.id, severity: rule.weight >= 10 ? "critical" : "warning", weight: rule.weight });
      score -= rule.weight;
    }
  }

  for (const antiPattern of scenario.antiPatterns || []) {
    if (normalized.includes(normalizeText(antiPattern))) {
      violations.push({ id: `scenario_antipattern:${antiPattern}`, severity: "warning", weight: 5 });
      score -= 5;
    }
  }

  const questionCount = (responseText.match(/\?/g) || []).length;
  if (questionCount > 1) {
    violations.push({ id: "excessive_questions", severity: "warning", detail: `${questionCount} questions`, weight: 6 });
    score -= 6;
  }

  const lineCount = responseText.split(/\r?\n/).filter((line) => line.trim()).length;
  if (lineCount > 8) {
    violations.push({ id: "too_many_lines", severity: "warning", detail: `${lineCount} non-empty lines`, weight: 5 });
    score -= 5;
  }

  const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 170) {
    violations.push({ id: "long_dump", severity: "warning", detail: `${wordCount} words`, weight: 8 });
    score -= 8;
  }

  if (turn.expects?.tool && !hasPropertyPresentationSignal(responseText)) {
    violations.push({
      id: "missing_direct_property_presentation_signal",
      severity: "critical",
      detail: "Turn expected direct property presentation or tool-backed recommendation.",
      weight: 12,
    });
    score -= 12;
  }

  if (turn.expects?.tool && /\b(posso|quer|deseja)\b/i.test(responseText) && !hasPropertyPresentationSignal(responseText)) {
    violations.push({
      id: "asked_permission_instead_of_presenting",
      severity: "critical",
      weight: 12,
    });
    score -= 12;
  }

  const urls = extractUrls(responseText);
  for (const url of urls) {
    if (/juremabksimoveis\.com\.br\/imoveis\//i.test(url)) {
      positives.push({ id: "property_url_present", weight: 4 });
    }
    if (/\s/.test(url) || /[<>{}]/.test(url)) {
      violations.push({ id: "malformed_url", severity: "critical", detail: url, weight: 12 });
      score -= 12;
    }
  }

  if (latencyMs > 20000) {
    violations.push({ id: "latency_high", severity: "warning", detail: `${latencyMs}ms`, weight: 4 });
    score -= 4;
  }

  for (const rule of POSITIVE_PATTERNS) {
    if (rule.pattern.test(responseText)) {
      positives.push({ id: rule.id, weight: rule.weight });
      score += Math.min(rule.weight, 4);
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    violations,
    positives: dedupePositives(positives),
    response_metrics: {
      word_count: wordCount,
      line_count: lineCount,
      question_count: questionCount,
      url_count: urls.length,
      latency_ms: latencyMs,
    },
  };
}

function hasPropertyPresentationSignal(text) {
  return /\b(encontrei|separei|achei|tenho uma opcao|ficou alinhad[ao]|essa opcao|uma opcao)\b/i.test(text) || extractUrls(text).length > 0;
}

function dedupePositives(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function scoreScenario({ scenario, turns }) {
  const scores = turns.map((turn) => turn.behavior.score);
  const avg = scores.length ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length) : 0;
  const violations = turns.flatMap((turn) =>
    turn.behavior.violations.map((violation) => ({ ...violation, turn_index: turn.turn_index })),
  );
  return {
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    score: avg,
    pass: avg >= 82 && !violations.some((item) => item.severity === "critical"),
    violations,
    positives: turns.flatMap((turn) => turn.behavior.positives),
  };
}

module.exports = { extractResponseText, scoreTurn, scoreScenario, extractUrls };
