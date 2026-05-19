const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  path.join(root, 'n8n', 'production', 'workflow-jurema-main.final-hardened.json'),
];

const audioFileNameExpression = '={{ $json.path || "audio.ogg" }}';
const audioMimeTypeExpression = '={{ $json.mimetype || "audio/ogg" }}';

function patchWorkflow(workflow, label) {
  if (!workflow || !Array.isArray(workflow.nodes)) return [];

  const changes = [];
  const convert = workflow.nodes.find((node) => node.name === 'Convert to audio1');
  if (convert) {
    convert.parameters = convert.parameters || {};
    convert.parameters.operation = 'toBinary';
    convert.parameters.sourceProperty = 'data';

    if (convert.parameters.binaryPropertyName !== 'audio') {
      convert.parameters.binaryPropertyName = 'audio';
      changes.push(`${label}: Convert to audio1 now writes binary.audio`);
    }

    convert.parameters.options = convert.parameters.options || {};
    if (convert.parameters.options.fileName !== audioFileNameExpression) {
      convert.parameters.options.fileName = audioFileNameExpression;
      changes.push(`${label}: Convert to audio1 preserves audio fileName from json.path`);
    }

    if (convert.parameters.options.mimeType !== audioMimeTypeExpression) {
      convert.parameters.options.mimeType = audioMimeTypeExpression;
      changes.push(`${label}: Convert to audio1 preserves audio mimeType from json.mimetype`);
    }
  }

  const openAi = workflow.nodes.find((node) => node.name === 'OpenAI1');
  if (openAi) {
    openAi.parameters = openAi.parameters || {};
    openAi.parameters.resource = 'audio';
    openAi.parameters.operation = 'transcribe';
    openAi.parameters.options = openAi.parameters.options || {};

    if (openAi.parameters.binaryPropertyName !== 'audio') {
      openAi.parameters.binaryPropertyName = 'audio';
      changes.push(`${label}: OpenAI1 now reads binary.audio`);
    }

    if (openAi.parameters.inputDataFieldName !== 'audio') {
      openAi.parameters.inputDataFieldName = 'audio';
      changes.push(`${label}: OpenAI1 input field pinned to audio`);
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
