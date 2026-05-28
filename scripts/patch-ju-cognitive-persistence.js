const fs = require('fs');
const path = require('path');

const workflowPath = path.join(process.cwd(), 'n8n', 'production', 'workflow-jurema-main.final-hardened.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const node = workflow.nodes.find((item) => item.name === 'Salvar Outbound Supabase');
if (!node) throw new Error('Node Salvar Outbound Supabase not found');

const code = String(node.parameters.jsCode || '');
if (code.includes('const rawPayload = state.raw_payload || {};')) {
  node.parameters.jsCode = code.replace(
    'const rawPayload = state.raw_payload || {};',
    'const rawPayload = state.raw_payload || conversation.raw_payload || {};'
  );
  fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log('Patched Salvar Outbound Supabase raw_payload source');
  process.exit(0);
}

if (code.includes('persistCognitiveOperationalState')) {
  let next = code;

  if (!next.includes('resolveBehavioralAuditRunUuid')) {
    next = next.replace(
      "async function persistCognitiveOperationalState({ baseUrl, apiKey, state, agentOutput }) {",
      `async function resolveBehavioralAuditRunUuid({ baseUrl, apiKey, semanticRunId }) {
  if (!semanticRunId) return null;

  const rows = await supabaseRequest.call(this, {
    baseUrl,
    apiKey,
    method: 'GET',
    path: '/rest/v1/ju_behavioral_audit_runs',
    qs: {
      select: 'id,run_id',
      run_id: \`eq.\${semanticRunId}\`,
      limit: 1,
    },
  });

  const row = Array.isArray(rows) ? rows[0] : rows;
  return row?.id || null;
}

async function persistCognitiveOperationalState({ baseUrl, apiKey, state, agentOutput }) {`
    );
  }

  if (!next.includes('const semanticTestRunId =')) {
    next = next.replace(
      "  const contextInfo = rawPayload.data?.contextInfo || {};\n  const now = new Date().toISOString();",
      "  const contextInfo = rawPayload.data?.contextInfo || {};\n  const semanticTestRunId = audit.run_id || audit.test_run_id || rawPayload.test_run_id || query.test_run_id || contextInfo.test_run_id || null;\n  const now = new Date().toISOString();"
    );
  }

  next = next.replace(
    /test_run_id: audit\.test_run_id \|\| audit\.run_id \|\| query\.test_run_id \|\| contextInfo\.test_run_id \|\| null/g,
    'test_run_id: semanticTestRunId'
  );

  if (!next.includes('const auditRunUuid = await resolveBehavioralAuditRunUuid.call(this')) {
    next = next.replace(
      "  const contextPersistence = await patchOrPostByConversation.call(this, {",
      "  const auditRunUuid = await resolveBehavioralAuditRunUuid.call(this, {\n    baseUrl,\n    apiKey,\n    semanticRunId: semanticTestRunId,\n  });\n\n  if (semanticTestRunId && !auditRunUuid && (audit.suite === 'ju_behavioral_e2e' || rawPayload.qa_audit || query.qa_audit || contextInfo.qa_audit)) {\n    throw new Error(`Behavioral audit run UUID not found for run_id ${semanticTestRunId}`);\n  }\n\n  const contextPersistence = await patchOrPostByConversation.call(this, {"
    );
  }

  if (!next.includes('test_run_id: auditRunUuid,')) {
    next = next.replace(
      "      tenant_id: tenantId,\n      scenario: audit.scenario_id || audit.scenario_name || null,",
      "      tenant_id: tenantId,\n      test_run_id: auditRunUuid,\n      scenario: audit.scenario_id || audit.scenario_name || null,"
    );
  }

  if (!next.includes('test_run_uuid: auditRunUuid')) {
    next = next.replace(
      "        test_run_id: semanticTestRunId,\n        run_id: audit.run_id || null,",
      "        test_run_id: semanticTestRunId,\n        test_run_uuid: auditRunUuid,\n        run_id: audit.run_id || null,"
    );
  }

  if (next === code) {
    console.log('Salvar Outbound Supabase already has cognitive persistence and audit run UUID compatibility');
    process.exit(0);
  }

  node.parameters.jsCode = next;
  fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log('Patched Salvar Outbound Supabase with audit run UUID compatibility');
  process.exit(0);
}

const marker = "if (agentOutput) {\n  await supabaseRequest.call(this, {";
if (!code.includes(marker)) {
  throw new Error('Expected Salvar Outbound Supabase insertion marker not found');
}

const helpers = `
function normalizeForAudit(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase();
}

function splitRegions(value) {
  return String(value ?? '')
    .split(/[,;/]|\\be\\b/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function intOrNull(value) {
  const number = Number(String(value ?? '').match(/\\d+/)?.[0] || NaN);
  return Number.isFinite(number) ? number : null;
}

function moneyOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).replace(/r\\$/gi, '').replace(/\\s/g, '').replace(/\\./g, '').replace(',', '.');
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function truthySignal(text, patterns) {
  const normalized = normalizeForAudit(text);
  return patterns.some((pattern) => normalized.includes(pattern));
}

function extractPropertyUrls(text) {
  return Array.from(String(text || '').matchAll(/https?:\\/\\/[^\\s)>\\]]+/g), (match) =>
    match[0].replace(/[.,;!?]+$/, '')
  );
}

function behavioralSignals({ state, agentOutput }) {
  const current = state.mensagemCliente || state.mensagem || '';
  const combined = [current, agentOutput, state._context || ''].join(' ');
  const urls = extractPropertyUrls(agentOutput);
  return {
    has_property_url: urls.some((url) => /juremabksimoveis\\.com\\.br\\/imoveis\\//i.test(url)),
    property_urls: urls,
    asked_permission: /\\b(posso te mostrar|posso enviar|deseja visualizar|quer que eu mostre)\\b/i.test(agentOutput),
    runtime_leak: /\\b(n8n|supabase|redis|vector|retrieval|ferramenta|tool|prompt|xml|gpt)\\b/i.test(agentOutput),
    question_count: (agentOutput.match(/\\?/g) || []).length,
    word_count: agentOutput.trim().split(/\\s+/).filter(Boolean).length,
    beach_interest: truthySignal(combined, ['praia', 'mar', 'orla', 'beira mar']),
    financing_signal: truthySignal(combined, ['financiamento', 'financiar', 'parcela']),
    fgts_signal: truthySignal(combined, ['fgts']),
    credit_letter_signal: truthySignal(combined, ['carta de credito', 'carta contemplada']),
  };
}

async function patchOrPostByConversation({ baseUrl, apiKey, table, conversationId, body }) {
  const existing = await supabaseRequest.call(this, {
    baseUrl,
    apiKey,
    method: 'GET',
    path: \`/rest/v1/\${table}\`,
    qs: {
      select: 'id',
      conversation_id: \`eq.\${conversationId}\`,
      limit: 1,
    },
  });

  const row = Array.isArray(existing) ? existing[0] : existing;
  if (row?.id) {
    await supabaseRequest.call(this, {
      baseUrl,
      apiKey,
      method: 'PATCH',
      path: \`/rest/v1/\${table}\`,
      qs: { id: \`eq.\${row.id}\` },
      body,
      prefer: 'return=minimal',
    });
    return 'patched';
  }

  await supabaseRequest.call(this, {
    baseUrl,
    apiKey,
    method: 'POST',
    path: \`/rest/v1/\${table}\`,
    body,
    prefer: 'return=minimal',
  });
  return 'inserted';
}

async function resolveBehavioralAuditRunUuid({ baseUrl, apiKey, semanticRunId }) {
  if (!semanticRunId) return null;

  const rows = await supabaseRequest.call(this, {
    baseUrl,
    apiKey,
    method: 'GET',
    path: '/rest/v1/ju_behavioral_audit_runs',
    qs: {
      select: 'id,run_id',
      run_id: \`eq.\${semanticRunId}\`,
      limit: 1,
    },
  });

  const row = Array.isArray(rows) ? rows[0] : rows;
  return row?.id || null;
}

async function persistCognitiveOperationalState({ baseUrl, apiKey, state, agentOutput }) {
  const lead = state.lead || {};
  const deal = state.deal || {};
  const conversation = state.conversation || {};
  const rawPayload = state.raw_payload || {};
  const audit = rawPayload.audit || {};
  const query = rawPayload.query || {};
  const contextInfo = rawPayload.data?.contextInfo || {};
  const semanticTestRunId = audit.run_id || audit.test_run_id || rawPayload.test_run_id || query.test_run_id || contextInfo.test_run_id || null;
  const now = new Date().toISOString();
  const signals = behavioralSignals({ state, agentOutput });
  const tenantId = state.tenant_id || lead.tenant_id || conversation.tenant_id;
  const conversationId = conversation.id || state.conversation_id;
  const leadId = lead.id || state.lead_id || null;
  const dealMeta = deal.metadata || {};
  const extracted = dealMeta.last_extracted || {};

  if (!tenantId || !conversationId) {
    return { persisted: false, reason: 'missing_tenant_or_conversation' };
  }

  const contextBody = {
    tenant_id: tenantId,
    conversation_id: conversationId,
    lead_id: leadId,
    lead_name: lead.name || state.nome_cliente || null,
    funnel_stage: deal.deal_stage || lead.status || state._status_slug || 'new',
    decision_style: extracted.decision_maker || deal.decision_maker || null,
    objective: extracted.intent || deal.intent || deal.purpose || null,
    preferred_regions: splitRegions(extracted.location || deal.location_preference || lead.metadata?.bairro_interesse),
    rejected_regions: splitRegions(lead.metadata?.rejected_regions || dealMeta.rejected_regions),
    property_type: extracted.property_type || deal.property_type || null,
    bedrooms: intOrNull(extracted.bedrooms || deal.bedrooms),
    budget_min: moneyOrNull(deal.budget_min),
    budget_max: moneyOrNull(extracted.budget_max || deal.budget_max),
    beach_interest: signals.beach_interest,
    financing_signal: signals.financing_signal,
    fgts_signal: signals.fgts_signal,
    credit_letter_signal: signals.credit_letter_signal,
    favorite_property: signals.property_urls[0] || lead.metadata?.imovel_ref || null,
    visit_interest_score: /visita|visitar|agenda|quinta|sexta|sabado|sábado/i.test([state.mensagemCliente, agentOutput].join(' ')) ? 80 : 0,
    followup_enabled: true,
    last_behavioral_update: now,
    metadata: {
      source: 'n8n:Salvar Outbound Supabase',
      test_run_id: semanticTestRunId,
      scenario_id: audit.scenario_id || null,
      scenario_name: audit.scenario_name || null,
      source_channel: contextInfo.sourceChannel || query.utm_source || state.source || null,
      current_message: state.mensagemCliente || state.mensagem || '',
      final_response: agentOutput,
      context: state._context || null,
      runtime: {
        runtime_state: state.runtime_state || null,
        objective_state: state.objective_state || null,
        next_action: state.next_action || null,
        retrieval_policy: state.retrieval_policy || null,
        required_tools: state.required_tools || [],
        blocked_questions: state.blocked_questions || [],
        loop_risk: state.loop_risk || null,
      },
      behavioral_signals: signals,
      updated_at: now,
    },
    updated_at: now,
  };

  const auditRunUuid = await resolveBehavioralAuditRunUuid.call(this, {
    baseUrl,
    apiKey,
    semanticRunId: semanticTestRunId,
  });

  if (semanticTestRunId && !auditRunUuid && (audit.suite === 'ju_behavioral_e2e' || rawPayload.qa_audit || query.qa_audit || contextInfo.qa_audit)) {
    throw new Error(\`Behavioral audit run UUID not found for run_id \${semanticTestRunId}\`);
  }

  const contextPersistence = await patchOrPostByConversation.call(this, {
    baseUrl,
    apiKey,
    table: 'lead_operational_context',
    conversationId,
    body: contextBody,
  });

  await supabaseRequest.call(this, {
    baseUrl,
    apiKey,
    method: 'POST',
    path: '/rest/v1/ai_conversation_audits',
    body: {
      tenant_id: tenantId,
      test_run_id: auditRunUuid,
      scenario: audit.scenario_id || audit.scenario_name || null,
      source_channel: contextInfo.sourceChannel || query.utm_source || state.source || null,
      lead_id: leadId,
      conversation_id: conversationId,
      inbound_message: state.mensagemCliente || state.mensagem || '',
      ai_response: agentOutput,
      used_tools: {
        required_tools: state.required_tools || [],
        tool_revalidation_required: state.tool_revalidation_required || false,
        presentation_governed: $json.presentation_governed || false,
        conversational_style_governed: $json.conversational_style_governed || false,
        property_urls: signals.property_urls,
      },
      retrieval_used: Boolean(state.retrieval_policy && state.retrieval_policy !== 'disabled'),
      score_comportamental: signals.runtime_leak || signals.asked_permission ? 70 : 90,
      score_consultivo: signals.question_count > 1 ? 75 : 90,
      score_naturalidade: signals.word_count > 170 ? 75 : 90,
      violacoes: [
        signals.asked_permission ? { id: 'permission_asking_detected', severity: 'warning' } : null,
        signals.runtime_leak ? { id: 'runtime_leak_detected', severity: 'critical' } : null,
      ].filter(Boolean),
      pontos_positivos: [
        signals.has_property_url ? { id: 'property_url_present' } : null,
        signals.beach_interest ? { id: 'beach_context_detected' } : null,
        signals.financing_signal ? { id: 'financing_context_detected' } : null,
      ].filter(Boolean),
      contexto: {
        generated_context: state._context || null,
        lead,
        deal,
        conversation,
        recent_messages: state.recent_messages || [],
        runtime: contextBody.metadata.runtime,
      },
      metadata: {
        source: 'n8n:Salvar Outbound Supabase',
        test_run_id: semanticTestRunId,
        test_run_uuid: auditRunUuid,
        run_id: audit.run_id || null,
        turn_index: audit.turn_index ?? null,
        scenario_id: audit.scenario_id || null,
        behavioral_signals: signals,
        lead_operational_context_persistence: contextPersistence,
        created_at: now,
      },
    },
    prefer: 'return=minimal',
  });

  return {
    persisted: true,
    lead_operational_context: contextPersistence,
    ai_conversation_audits: 'inserted',
  };
}
`;

const invocation = `
let cognitivePersistence = { persisted: false, reason: 'empty_output' };
if (agentOutput) {
  cognitivePersistence = await persistCognitiveOperationalState.call(this, {
    baseUrl,
    apiKey,
    state,
    agentOutput,
  });
}
`;

let next = code.replace(marker, `${helpers}\n${invocation}\n${marker}`);
next = next.replace(
  "saved_outbound: Boolean(agentOutput),\n    conversation_id: conversationId,",
  "saved_outbound: Boolean(agentOutput),\n    cognitive_persistence: cognitivePersistence,\n    conversation_id: conversationId,"
);

node.parameters.jsCode = next;
fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`);
console.log('Patched Salvar Outbound Supabase with cognitive persistence');
