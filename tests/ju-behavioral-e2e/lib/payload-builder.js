function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function phoneForScenario(index, runId) {
  const suffix = String(Math.abs(hashCode(`${runId}-${index}`))).slice(0, 8).padStart(8, "0");
  return `55839${suffix.slice(0, 8)}`;
}

function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return hash;
}

function buildWebhookPayload({ scenario, turn, turnIndex, scenarioIndex, runId, tenantId }) {
  const phone = phoneForScenario(scenarioIndex, runId);
  const messageId = `ju-behavioral-${runId}-${scenario.id}-${turnIndex + 1}`;
  const query = {
    ...(scenario.leadOrigin || {}),
    tenant_id: tenantId,
    test_run_id: runId,
    qa_audit: true,
  };

  return {
    event: "ju.behavioral.message",
    instance: "Jurema Brokers - Curl Behavioral Audit",
    tenant_id: tenantId,
    test_run_id: runId,
    audit: {
      suite: "ju_behavioral_e2e",
      run_id: runId,
      test_run_id: runId,
      tenant_id: tenantId,
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      turn_index: turnIndex,
      transport: "curl",
      provider_sdk: "none",
      browser_automation: false,
      evolution_client: false,
    },
    query,
    data: {
      key: {
        id: messageId,
        fromMe: false,
        remoteJid: `${onlyDigits(phone)}@s.whatsapp.net`,
      },
      pushName: scenario.personaName || `Lead ${scenario.name}`,
      messageType: "conversation",
      message: {
        conversation: turn.user,
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      source: `curl-behavioral-audit:${scenario.sourceChannel}`,
      contextInfo: {
        sourceChannel: scenario.sourceChannel,
        persona: scenario.persona,
        emotionalContext: scenario.emotionalContext,
        tenant_id: tenantId,
        test_run_id: runId,
        qa_audit: true,
        utm_source: query.utm_source,
        utm_medium: query.utm_medium,
        utm_campaign: query.utm_campaign,
      },
    },
  };
}

function curlCommand({ endpoint, payloadPath, webhookSecret }) {
  const header = webhookSecret ? `-H "x-webhook-secret: ${String(webhookSecret).replace(/"/g, '\\"')}"` : "";
  return [
    "curl -sS -X POST",
    quote(endpoint),
    '-H "Content-Type: application/json"',
    header,
    `--data-binary @${quote(payloadPath)}`,
  ].join(" ");
}

function quote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:\\-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

module.exports = { buildWebhookPayload, curlCommand };
