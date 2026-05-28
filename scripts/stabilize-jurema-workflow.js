const fs = require('fs');
const path = require('path');

const inputPath = path.join('n8n', 'production', 'workflow-jurema-main.final-hardened.json');
const outputPath = path.join('n8n', 'production', 'workflow-jurema-main.production-stabilized.json');

const removedNodeNames = new Set([
  'Salvar Midias - imagens1',
  'Salvar Midias - video1',
  'prepara para Base_dados1',
  'prepara para Base1',
  'HTTP Request',
]);

const expressionChanges = [];
const hardcodedChanges = [];

function quoteNodeName(name) {
  return "'" + String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function normalizeExpressionString(value) {
  if (typeof value !== 'string') return value;
  let next = value;

  next = next.replace(/\$\(\s*(['"])([^'"]+)\1\s*\)\.first\(\)\.json/g, (_m, _q, nodeName) => {
    const replacement = `$items(${quoteNodeName(nodeName)})[0].json`;
    expressionChanges.push({ from: `$(${quoteNodeName(nodeName)}).first().json`, to: replacement });
    return replacement;
  });

  next = next.replace(/\$\(\s*(['"])([^'"]+)\1\s*\)\.item\.json/g, (_m, _q, nodeName) => {
    const replacement = `$items(${quoteNodeName(nodeName)})[0].json`;
    expressionChanges.push({ from: `$(${quoteNodeName(nodeName)}).item.json`, to: replacement });
    return replacement;
  });

  next = next.replace(/\$\(\s*(['"])([^'"]+)\1\s*\)\.last\(\)\.json/g, (_m, _q, nodeName) => {
    const replacement = `$items(${quoteNodeName(nodeName)})[0].json`;
    expressionChanges.push({ from: `$(${quoteNodeName(nodeName)}).last().json`, to: replacement });
    return replacement;
  });

  next = next.replace(
    /function nodeJson\(name\) \{\n  try \{ return \$\(name\)\.item\.json \|\| \$\(name\)\.first\(\)\.json \|\| \{\}; \} catch \(error\) \{ return \{\}; \}\n\}/g,
    "function nodeJson(name) {\n  try { return $items(name)[0]?.json || {}; } catch (error) { return {}; }\n}"
  );

  next = next.replace(
    /function optionalNodeJson\(name\) \{\n  try \{\n    return \$\(name\)\.first\(\)\.json \|\| \{\};\n  \} catch \(error\) \{\n    return \{\};\n  \}\n\}/g,
    "function optionalNodeJson(name) {\n  try {\n    return $items(name)[0]?.json || {};\n  } catch (error) {\n    return {};\n  }\n}"
  );

  next = next.replace(/\$items\('ArrayResposta'\)\[0\]\.json/g, () => {
    expressionChanges.push({
      from: "$items('ArrayResposta')[0].json",
      to: "$items('ArrayResposta1')[0].json",
    });
    return "$items('ArrayResposta1')[0].json";
  });

  if (next === 'TREINAMENTO DA IA - PAM') return 'TREINAMENTO DA IA - YZI OS';
  if (next === 'Redis PAM') return 'Redis YZI OS';

  next = next.replace(
    /const apiKey = 'eyJ[a-zA-Z0-9._-]+';/g,
    () => {
      hardcodedChanges.push('Supabase service_role JWT em Code node -> $env.SUPABASE_SERVICE_ROLE_KEY / $env.JUREMA_SUPABASE_SERVICE_ROLE_KEY');
      return "const apiKey = $env.SUPABASE_SERVICE_ROLE_KEY || $env.JUREMA_SUPABASE_SERVICE_ROLE_KEY;\nif (!apiKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurada no ambiente n8n.');";
    }
  );

  return next;
}

function walk(value) {
  if (typeof value === 'string') return normalizeExpressionString(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = walk(child);
    return out;
  }
  return value;
}

function replaceAssignment(assignments, name, value) {
  if (!assignments) return;
  for (const assignment of assignments) {
    if (assignment.name === name) assignment.value = value;
  }
}

function removeAssignment(assignments, name) {
  if (!assignments) return assignments;
  return assignments.filter((assignment) => assignment.name !== name);
}

const workflow = walk(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
const originalNodes = workflow.nodes || [];

workflow.name = 'Ju - n8n Supabase v1.1 production-stabilized';

workflow.nodes = originalNodes
  .filter((node) => !removedNodeNames.has(node.name))
  .map((node) => {
    if (node.name === 'Montar Dados da Imagem1' || node.name === 'Montar Dados do video1') {
      const assignments = node.parameters?.assignments?.assignments;
      if (assignments) {
        node.parameters.assignments.assignments = removeAssignment(assignments, 'id_airtable');
        replaceAssignment(
          node.parameters.assignments.assignments,
          'apikey',
          '={{ $env.SUPABASE_STORAGE_SERVICE_ROLE_KEY || $env.SUPABASE_SERVICE_ROLE_KEY }}'
        );
        hardcodedChanges.push(`${node.name}.apikey -> $env.SUPABASE_STORAGE_SERVICE_ROLE_KEY / $env.SUPABASE_SERVICE_ROLE_KEY`);
      }
    }

    if (node.name === 'dados do banco') {
      const assignments = node.parameters?.assignments?.assignments || [];
      replaceAssignment(assignments, 'SUPABASE_ANON_KEY', '={{ $env.SUPABASE_ANON_KEY }}');
      replaceAssignment(assignments, 'SUPABASE_SERVICE_ROLE_KEY', '={{ $env.SUPABASE_SERVICE_ROLE_KEY }}');
      replaceAssignment(assignments, 'URL_SUPABASE', "={{ $env.SUPABASE_URL || 'https://dwmbklfkrtumfaxrbxio.supabase.co' }}");
      replaceAssignment(assignments, 'EVOLUTION_API_URL', "={{ $env.EVOLUTION_API_URL || 'https://evo.yzihub.com' }}");
      replaceAssignment(assignments, 'EVOLUTION_API_KEY', '={{ $env.EVOLUTION_API_KEY }}');
      hardcodedChanges.push('dados do banco.SUPABASE_ANON_KEY -> $env.SUPABASE_ANON_KEY');
      hardcodedChanges.push('dados do banco.SUPABASE_SERVICE_ROLE_KEY -> $env.SUPABASE_SERVICE_ROLE_KEY');
      hardcodedChanges.push('dados do banco.URL_SUPABASE -> $env.SUPABASE_URL com fallback de URL publica do projeto');
      hardcodedChanges.push('dados do banco.EVOLUTION_API_URL -> $env.EVOLUTION_API_URL com fallback de URL publica');
      hardcodedChanges.push('dados do banco.EVOLUTION_API_KEY -> $env.EVOLUTION_API_KEY');
    }

    if (node.name === 'Upload Imagem no imgbb1') {
      const params = node.parameters?.queryParameters?.parameters || [];
      for (const parameter of params) {
        if (parameter.name === 'key') {
          parameter.value = '={{ $env.IMGBB_API_KEY }}';
          hardcodedChanges.push('Upload Imagem no imgbb1.key -> $env.IMGBB_API_KEY');
        }
      }
    }

    if (node.name === 'Upload Video no Supabase1') {
      node.parameters.url =
        "={{ ($env.SUPABASE_STORAGE_URL || 'https://picoieyewgquuwylffxe.supabase.co') + '/storage/v1/object/video-bucket/' + $items('Montar Dados do video1')[0].json['Nome do Cliente'] + '.mp4' }}";
    }

    if (node.name === 'Salvar Outbound Supabase' && node.parameters?.jsCode) {
      node.parameters.jsCode = node.parameters.jsCode.replace(
        /const apiKey =\n  db\.SUPABASE_SECRET_KEY \|\|\n  db\.SUPABASE_SERVICE_ROLE_KEY \|\|\n  db\.SUPABASE_ANON_KEY \|\|\n  'eyJ[a-zA-Z0-9._-]+';/,
        "const apiKey =\n  db.SUPABASE_SECRET_KEY ||\n  db.SUPABASE_SERVICE_ROLE_KEY ||\n  $env.SUPABASE_SERVICE_ROLE_KEY ||\n  db.SUPABASE_ANON_KEY ||\n  $env.SUPABASE_ANON_KEY;"
      );
      hardcodedChanges.push('Salvar Outbound Supabase service_role fallback -> $env.SUPABASE_SERVICE_ROLE_KEY / $env.SUPABASE_ANON_KEY');
    }

    return node;
  });

const rewires = new Map([
  ['prepara para Base_dados1', 'Redis9'],
  ['prepara para Base1', 'Redis8'],
  ['Salvar Midias - imagens1', 'Redis9'],
  ['Salvar Midias - video1', 'Redis8'],
]);

const newConnections = {};
for (const [source, groups] of Object.entries(workflow.connections || {})) {
  if (removedNodeNames.has(source)) continue;

  const mappedGroups = {};
  for (const [connectionType, outputs] of Object.entries(groups)) {
    mappedGroups[connectionType] = outputs.map((output) =>
      output
        .map((connection) => {
          const target = rewires.get(connection.node) || connection.node;
          if (removedNodeNames.has(target)) return null;
          return { ...connection, node: target };
        })
        .filter(Boolean)
    );
  }

  newConnections[source] = mappedGroups;
}
workflow.connections = newConnections;

const nodeNames = new Set(workflow.nodes.map((node) => node.name));
for (const [source, groups] of Object.entries(workflow.connections || {})) {
  if (!nodeNames.has(source)) delete workflow.connections[source];
  for (const outputs of Object.values(groups)) {
    for (const output of outputs) {
      for (let i = output.length - 1; i >= 0; i -= 1) {
        if (!nodeNames.has(output[i].node)) output.splice(i, 1);
      }
    }
  }
}

fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2) + '\n');

const report = {
  outputPath,
  originalNodeCount: originalNodes.length,
  newNodeCount: workflow.nodes.length,
  removedNodes: [...removedNodeNames],
  expressionChangesCount: expressionChanges.length,
  expressionChanges,
  hardcodedChanges: [...new Set(hardcodedChanges)],
};

fs.writeFileSync(
  path.join('n8n', 'production', 'workflow-jurema-main.production-stabilized.report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

console.log(JSON.stringify(report, null, 2));
