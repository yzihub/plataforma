const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainFile = path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');

const presentationNodeName = 'Presentation Governance v2 - Native Preview Safe';
const presentationNode = {
  parameters: {
    jsCode: String.raw`function clean(value) {
  return String(value ?? '').trim();
}

function validPropertyUrl(value) {
  const url = clean(value);

  if (!/^https?:\/\/\S+$/i.test(url)) {
    return false;
  }

  if (
    !/juremabksimoveis\.com\.br\/imoveis\//i.test(url)
  ) {
    return false;
  }

  if (
    /localhost|127\.0\.0\.1|\s/i.test(url)
  ) {
    return false;
  }

  return true;
}

function stripLegacyPropertyDump(text) {

  const lines = clean(text)
    .split(/\r?\n/)
    .map(v => clean(v));

  const cleaned = [];

  for (const line of lines) {

    if (!line) continue;

    const normalized = line
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    // remove template SDR legado
    if (
      normalized.includes(
        'separei esta opcao pra voce'
      )
    ) {
      continue;
    }

    // remove linhas SEO dump MUITO específicas
    if (
      /^(apartamento|casa|flat|cobertura|terreno|sala)\s+para\s+(venda|aluguel)\s+(no|na|em)\s+/i
        .test(line)
    ) {
      continue;
    }

    // remove linha técnica imobiliária
    if (
      /(m²|m2|quartos?|su[ií]tes?|vagas?|r\$)/i
        .test(line)
      &&
      !validPropertyUrl(line)
    ) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function preserveContextAndUrl(text) {

  const lines = clean(text)
    .split('\n')
    .map(v => clean(v))
    .filter(Boolean);

  const blocks = [];

  let buffer = [];

  function isUrl(value) {
    return /^https?:\/\//i.test(value);
  }

  for (const line of lines) {

    buffer.push(line);

    if (isUrl(line)) {

      blocks.push(
        buffer.join('\n')
      );

      buffer = [];
    }
  }

  if (buffer.length) {
    blocks.push(
      buffer.join('\n')
    );
  }

  return blocks.join('\n\n');
}

const original =
  clean($json.output);

const sanitized =
  stripLegacyPropertyDump(
    original
  );

const output =
  preserveContextAndUrl(
    sanitized
  );

return [
  {
    json: {
      ...$json,

      output,

      presentation_governed: true,

      presentation_policy:
        'native_preview_safe_v2'
    }
  }
];`,
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [13200, 1568],
  id: 'presentation-governance-native-preview-safe-v2',
  name: presentationNodeName,
};

const presentationSystemBlock = String.raw`

# PRESENTATION GOVERNANCE
Quando consultar_imoveis retornar cards, a Ju deve escrever a mensagem humana curta com português natural e acentuado. A Presentation Governance v2 apenas sanitiza, valida URLs, remove dumps legados e preserva contexto humano.
Nao criar copy, nao contextualizar, nao recriar pacing, nao substituir output da Ju por URLs e nao serializar titulo, bairro, tipologia, praia, SEO, descricao, resumo, ranking, tabela, JSON ou copy de imovel.
Se houver URL de imovel, o preview nativo do WhatsApp ja renderiza imagem, titulo, localizacao, branding e descricao. Preserve a linguagem criada pela Ju e use URL pura isolada.
Nunca exponha success, total_received, filters_used, metadata ou media.
`;

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
upsertNode(workflow, presentationNode);

const agent = workflow.nodes.find((node) => node.name === 'Atendente1');
if (!agent) throw new Error('Atendente1 not found');
agent.parameters = agent.parameters || {};
agent.parameters.options = agent.parameters.options || {};
const currentSystem = String(agent.parameters.options.systemMessage || '');
agent.parameters.options.systemMessage = currentSystem.includes('PRESENTATION GOVERNANCE')
  ? currentSystem.replace(
      /\n\n#?\s*PRESENTATION GOVERNANCE\n[\s\S]*?(?=\n\n#?\s*SAIDA|\n\nSAIDA|$)/,
      presentationSystemBlock,
    )
  : currentSystem + presentationSystemBlock;

const tool = workflow.nodes.find((node) => node.name === 'consultar_imoveis');
if (!tool) throw new Error('consultar_imoveis not found');
tool.parameters = tool.parameters || {};
tool.parameters.description = [
  'Fonte unica de verdade para informacoes tecnicas, valores, disponibilidade, cards e URLs institucionais de imoveis.',
  'Use sempre que o lead citar codigo JP, bairro, tipologia, quartos, valor ou pedir opcoes.',
  'Use tambem em pedidos de reenvio, link com erro ou referencia ao ultimo imovel enviado.',
  'Retorna cards[] com URL valida; a Ju deve escrever a contextualizacao humana curta e usar URL pura isolada.',
  'A Presentation Governance v2 nao cria copy e nao substitui output da Ju: apenas sanitiza, valida URLs, remove dumps e bloqueia serializacao de titulo, bairro, tipologia, praia, SEO, resumo ou descricao do imovel.',
  'Quando houver preview nativo, nao repetir informacoes visuais ou semanticas que o WhatsApp ja renderiza.',
].join(' ');

connect(workflow, 'Atendente1', presentationNodeName);
connect(workflow, presentationNodeName, 'Conversational Style Governance');
connect(workflow, 'Conversational Style Governance', 'Salvar Outbound Supabase');
connect(workflow, 'Salvar Outbound Supabase', 'ArrayResposta');

const arrayResposta = workflow.nodes.find((node) => node.name === 'ArrayResposta');
if (!arrayResposta) throw new Error('ArrayResposta not found');
arrayResposta.parameters = arrayResposta.parameters || {};
arrayResposta.parameters.assignments = {
  assignments: [
    {
      id: '3f92debc-c2c0-4831-a1e3-29ccf2a8bb51',
      name: 'resposta',
      value: `={{
(() => {
  const output =
    ($json.output || '').trim();

  if (!output) return [];

  const lines = output
    .split('\\n')
    .map(v => v.trim())
    .filter(Boolean);

  const blocks = [];

  let current = [];
  let hasUrl = false;

  function isUrl(text) {
    return /^https?:\\/\\//i.test(text);
  }

  function startsNewPropertyContext(text) {

    const normalized = text
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase();

    return [
      'essa outra',
      'ja essa',
      'já essa',
      'tambem encontrei',
      'também encontrei',
      'tem outra',
      'tem uma segunda',
      'outra opcao',
      'outra opção',
      'mais uma opcao',
      'mais uma opção'
    ].some(pattern =>
      normalized.startsWith(pattern)
    );
  }

  for (const line of lines) {

    // fecha bloco APENAS
    // quando claramente inicia
    // outro imóvel/contexto
    if (
      hasUrl &&
      startsNewPropertyContext(line)
    ) {

      blocks.push(
        current.join('\\n')
      );

      current = [];
      hasUrl = false;
    }

    current.push(line);

    if (isUrl(line)) {
      hasUrl = true;
    }
  }

  if (current.length) {

    blocks.push(
      current.join('\\n')
    );
  }

  return blocks;

})()
}}`,
      type: 'array',
    },
  ],
};
arrayResposta.parameters.options = {};

for (const node of workflow.nodes) {
  if (node.credentials?.openAiApi) {
    node.credentials.openAiApi = {
      id: 'W7viCvKb9IkuKdvf',
      name: 'OpenAi JUREMA',
    };
  }
}

writeWorkflow(mainFile, workflow);
console.log(`patched ${path.relative(root, mainFile)}`);
