const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainFile = path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');

const styleNodeName = 'Conversational Style Governance';
const styleNode = {
  parameters: {
    jsCode: String.raw`function clean(value) {
  return String(value ?? '').trim();
}

function norm(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function validUrl(value) {
  const text = clean(value);
  return /^https?:\/\/\S+$/i.test(text);
}

function stripMarkdown(value) {
  return clean(value)
    .replace(/\`\`\`[\s\S]*?\`\`\`/g, '')
    .replace(/\`([^\`]+)\`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/[ \t]*👉[ \t]*/g, '')
    .replace(/[ \t]{2,}/g, ' ');
}

function humanJoin(parts) {
  const items = parts.map(clean).filter(Boolean);
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return items.join(' e ');
  return items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1];
}

function collapseListBlocks(value) {
  const lines = stripMarkdown(value).split(/\r?\n/);
  const out = [];
  let pendingIntro = '';
  let bullets = [];

  function flush() {
    if (!bullets.length) {
      if (pendingIntro) out.push(pendingIntro);
      pendingIntro = '';
      return;
    }

    const joined = humanJoin(bullets);
    if (pendingIntro) {
      const separator = /[:?]$/.test(pendingIntro) ? ' ' : '. ';
      out.push(pendingIntro.replace(/[?]$/, ':') + separator + joined + '.');
    } else {
      out.push(joined + '.');
    }
    pendingIntro = '';
    bullets = [];
  }

  for (const rawLine of lines) {
    const line = clean(rawLine);
    if (!line) {
      if (pendingIntro && !bullets.length) continue;
      flush();
      if (out[out.length - 1] !== '') out.push('');
      continue;
    }

    if (validUrl(line)) {
      flush();
      out.push(line);
      continue;
    }

    const bullet = line.match(/^(?:[-*•]+|\d+[.)]|[a-z][.)])\s+(.+)$/i);
    if (bullet) {
      bullets.push(bullet[1].replace(/[.;]+$/, ''));
      continue;
    }

    if (bullets.length) flush();
    if (line.endsWith(':') && !pendingIntro) {
      pendingIntro = line;
      continue;
    }

    if (pendingIntro) flush();
    out.push(line);
  }

  flush();
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removeArtificialOpeners(value) {
  return clean(value)
    .replace(/^(claro|com certeza|perfeito|ótimo|otimo|legal)[!.]?\s+/i, '')
    .replace(/^entendi[!.]?\s+entendi[!.]?\s+/i, 'Entendi. ');
}

function contextText() {
  const parts = [
    $json._context,
    $json.mensagemCliente,
    $json.deal?.property_type,
    $json.deal?.location_preference,
    $json.deal?.intent,
    $json.lead?.metadata?.tipo_imovel,
    $json.lead?.metadata?.bairro_interesse,
    ($json.recent_messages || []).map((m) => m.content).join(' '),
  ];
  return norm(parts.filter(Boolean).join(' '));
}

function redundantPropertyTypeQuestion(sentence, ctx) {
  const text = norm(sentence);
  const asksType = /voce procura|esta procurando|busca|quer/.test(text) && /apartamento|apto|casa|tipo de imovel|tipologia/.test(text);
  if (!asksType) return false;
  return /\bcasa\b|\bapartamento\b|\bapto\b|\bflat\b|\bterreno\b|\bsala\b/.test(ctx);
}

function blockedQuestion(sentence) {
  const blocked = Array.isArray($json.blocked_questions) ? $json.blocked_questions.map(norm).filter(Boolean) : [];
  if (!blocked.length || !sentence.includes('?')) return false;
  const text = norm(sentence);
  return blocked.some((question) => question && (text.includes(question) || question.includes(text.replace(/\?$/, ''))));
}

function removeRedundantQuestions(value) {
  const ctx = contextText();
  const chunks = clean(value).match(/[^.!?\n]+[.!?]?|\n+/g) || [value];
  return chunks
    .filter((chunk) => {
      const sentence = clean(chunk);
      if (!sentence || /^\n+$/.test(chunk)) return true;
      if (redundantPropertyTypeQuestion(sentence, ctx)) return false;
      if (blockedQuestion(sentence)) return false;
      return true;
    })
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function softenChatbotPhrases(value) {
  return clean(value)
    .replace(/\bpara que eu possa\b/gi, 'pra eu')
    .replace(/\bgostaria de saber\b/gi, 'me conta')
    .replace(/\bpor favor[, ]*/gi, '')
    .replace(/\bsegue(m)? (abaixo )?(as )?(opcoes|opções|informacoes|informações)\b/gi, 'separei')
    .replace(/\bqual opção\b/gi, 'qual delas')
    .replace(/\bqual opcao\b/gi, 'qual delas');
  // accent-stripping replaces removed (P0-H): preserve native PT-BR orthography
}

function normalizeWhitespace(value) {
  const text = clean(value)
    .split(/\n/)
    .map((line) => clean(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([.!?]){2,}/g, '$1')
    .replace(/^separei:\s*/i, 'Separei ')
    .trim();
  return text.charAt(0).toLowerCase() === text.charAt(0)
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : text;
}

function govern(value) {
  let text = clean(value);
  if (!text) return '';
  text = stripMarkdown(text);
  text = collapseListBlocks(text);
  text = removeArtificialOpeners(text);
  text = removeRedundantQuestions(text);
  text = softenChatbotPhrases(text);
  text = normalizeWhitespace(text);
  return text;
}

const output = govern($json.output);

return [{
  json: {
    ...$json,
    output,
    conversational_style_governed: true,
  },
}];`,
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [13416, 1744],
  id: 'conversational-style-governance-jurema-v1',
  name: styleNodeName,
};

function readWorkflow(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeWorkflow(file, workflow) {
  fs.writeFileSync(file, JSON.stringify(workflow, null, 2) + '\n');
}

function upsertNode(workflow, node) {
  const index = workflow.nodes.findIndex((current) => current.name === node.name);
  if (index >= 0) workflow.nodes[index] = { ...workflow.nodes[index], ...node };
  else workflow.nodes.push(node);
}

function connect(workflow, from, to) {
  workflow.connections[from] = {
    main: [[{ node: to, type: 'main', index: 0 }]],
  };
}

const workflow = readWorkflow(mainFile);
upsertNode(workflow, styleNode);

const agent = workflow.nodes.find((node) => node.name === 'Atendente1');
if (!agent) throw new Error('Atendente1 not found');
agent.parameters = agent.parameters || {};
agent.parameters.options = agent.parameters.options || {};

connect(workflow, 'Atendente1', 'Presentation Governance');
connect(workflow, 'Presentation Governance', styleNodeName);
connect(workflow, styleNodeName, 'Salvar Outbound Supabase');
connect(workflow, 'Salvar Outbound Supabase', 'ArrayResposta');

writeWorkflow(mainFile, workflow);
console.log(`patched ${path.relative(root, mainFile)}`);
