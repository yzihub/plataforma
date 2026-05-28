const fs = require('fs');

const workflowPath = process.argv[2] || 'n8n/production/workflow-jurema-main.production-stabilized.json';
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const text = fs.readFileSync(workflowPath, 'utf8');

const names = new Set(workflow.nodes.map((node) => node.name));
const badConnections = [];
const selfConnections = [];

for (const [source, groups] of Object.entries(workflow.connections || {})) {
  if (!names.has(source)) badConnections.push(`missing source ${source}`);
  for (const [type, outputs] of Object.entries(groups)) {
    outputs.forEach((output, outputIndex) => {
      output.forEach((connection) => {
        if (!names.has(connection.node)) {
          badConnections.push(`${source}.${type}[${outputIndex}] -> missing ${connection.node}`);
        }
        if (source === connection.node) selfConnections.push(source);
      });
    });
  }
}

const itemRefs = new Set();
for (const match of text.matchAll(/\$items\('([^']+)'\)/g)) itemRefs.add(match[1]);

const validation = {
  jsonParse: true,
  nodes: workflow.nodes.length,
  connections: Object.keys(workflow.connections || {}).length,
  badConnections,
  selfConnections,
  airtableNodes: workflow.nodes
    .filter((node) => /airtable/i.test(node.type || '') || /airtable/i.test(node.name || ''))
    .map((node) => node.name),
  forbidden: {
    dollarNode: (text.match(/\$\(/g) || []).length,
    first: (text.match(/\.first\(\)/g) || []).length,
    last: (text.match(/\.last\(\)/g) || []).length,
    item: (text.match(/\.item\b/g) || []).length,
  },
  missingItemRefs: [...itemRefs].filter((ref) => !names.has(ref)),
  hardcodedSecrets: {
    jwtLike: (text.match(/eyJ[a-zA-Z0-9._-]+/g) || []).length,
    imgbbKey: (text.match(/37d90e36d95514241543d9957577535a/g) || []).length,
    evolutionKey: (text.match(/931f3b1067b4b89e83c8d6c46620861a/g) || []).length,
    bearerLiteral: (text.match(/Bearer [A-Za-z0-9._-]+/g) || []).length,
  },
};

console.log(JSON.stringify(validation, null, 2));

const hasFailures =
  validation.badConnections.length ||
  validation.selfConnections.length ||
  validation.airtableNodes.length ||
  validation.forbidden.dollarNode ||
  validation.forbidden.first ||
  validation.forbidden.last ||
  validation.forbidden.item ||
  validation.missingItemRefs.length ||
  validation.hardcodedSecrets.jwtLike ||
  validation.hardcodedSecrets.imgbbKey ||
  validation.hardcodedSecrets.evolutionKey ||
  validation.hardcodedSecrets.bearerLiteral;

process.exit(hasFailures ? 1 : 0);
