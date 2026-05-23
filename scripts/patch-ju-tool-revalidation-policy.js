const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainFile = path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');

const revalidationBlock = [
  '',
  'TOOL REVALIDATION',
  'Se o cliente pedir reenvio, disser que o link falhou, pedir detalhes do imovel anterior ou fizer referencia ao ultimo imovel enviado, chame consultar_imoveis novamente antes de responder. Nunca reconstrua URL, slug ou link por memoria textual. A unica fonte de verdade para imoveis e URLs e consultar_imoveis.',
].join('\n');

function readWorkflow(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeWorkflow(file, workflow) {
  fs.writeFileSync(file, JSON.stringify(workflow, null, 2) + '\n');
}

const workflow = readWorkflow(mainFile);

const agent = workflow.nodes.find((node) => node.name === 'Atendente1');
if (!agent) throw new Error('Atendente1 not found');
agent.parameters = agent.parameters || {};
agent.parameters.options = agent.parameters.options || {};
const systemMessage = String(agent.parameters.options.systemMessage || '');
if (!systemMessage.includes('TOOL REVALIDATION')) {
  agent.parameters.options.systemMessage = systemMessage.replace(/\n\nSAIDA\n/, `${revalidationBlock}\n\nSAIDA\n`);
}

const tool = workflow.nodes.find((node) => node.name === 'consultar_imoveis');
if (!tool) throw new Error('consultar_imoveis not found');
tool.parameters = tool.parameters || {};
tool.parameters.description = [
  'Fonte unica de verdade para imoveis, disponibilidade, cards e URLs.',
  'Use quando o lead citar codigo JP, bairro, tipologia, quartos, valor, pedir opcoes ou pedir detalhes de imovel.',
  'Use obrigatoriamente quando o cliente pedir reenvio, disser que o link falhou, pedir novamente o imovel, perguntar qual era aquele imovel ou referenciar o ultimo imovel enviado.',
  'Nunca deixe o modelo reconstruir URL, inferir slug, reutilizar link textual antigo ou responder de memoria; a URL final deve ser exatamente a retornada por esta tool.',
].join(' ');

writeWorkflow(mainFile, workflow);
console.log(`patched ${path.relative(root, mainFile)}`);
