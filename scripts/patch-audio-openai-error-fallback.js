const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json'),
];

const audioFallbackExpression =
  '={{ $json.audioText || $json.text || $json.error?.message || "[audio recebido, mas a transcricao falhou temporariamente]" }}';

function patchWorkflow(workflow, label) {
  if (!workflow || !Array.isArray(workflow.nodes)) return [];

  const changes = [];
  const openAi = workflow.nodes.find((node) => node.name === 'OpenAI1');
  if (openAi) {
    if (openAi.onError !== 'continueRegularOutput') {
      openAi.onError = 'continueRegularOutput';
      changes.push(`${label}: OpenAI1 continues regular output on provider errors`);
    }

    if (openAi.alwaysOutputData !== true) {
      openAi.alwaysOutputData = true;
      changes.push(`${label}: OpenAI1 always outputs data`);
    }
  }

  const audioMemory = workflow.nodes.find((node) => node.name === 'Audio Memory1');
  if (audioMemory) {
    audioMemory.parameters = audioMemory.parameters || {};
    if (audioMemory.parameters.messageData !== audioFallbackExpression) {
      audioMemory.parameters.messageData = audioFallbackExpression;
      changes.push(`${label}: Audio Memory1 has transcription failure fallback text`);
    }
  }

  return changes;
}

for (const file of files) {
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
  const changes = [
    ...patchWorkflow(workflow, 'root'),
    ...patchWorkflow(workflow.activeVersion, 'activeVersion'),
  ];

  fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(path.relative(root, file));
  console.log(changes.length ? changes.join('\n') : 'no changes');
}
