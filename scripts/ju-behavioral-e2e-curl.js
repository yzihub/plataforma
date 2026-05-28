const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { SCENARIOS } = require("../tests/ju-behavioral-e2e/scenarios/ju-behavioral-scenarios");
const { buildWebhookPayload, curlCommand } = require("../tests/ju-behavioral-e2e/lib/payload-builder");
const { extractResponseText, scoreTurn, scoreScenario } = require("../tests/ju-behavioral-e2e/lib/behavioral-engine");

const ROOT = process.cwd();
const DEFAULT_ENDPOINT = "https://runtime.yzihub.com/cognitive/turn";
const OUT_ROOT = path.join(ROOT, "tests", "ju-behavioral-e2e", "reports");
const CURL_ROOT = path.join(ROOT, "tests", "ju-behavioral-e2e", "curl");
const BASELINE_ROOT = path.join(ROOT, "tests", "ju-behavioral-e2e", "baselines");
const LEAD_OPERATIONAL_CONTEXT_TABLE = "lead_operational_context";
const AI_CONVERSATION_AUDITS_TABLE = "ai_conversation_audits";

function parseArgs(argv) {
  const args = {
    endpoint: process.env.JU_BEHAVIORAL_ENDPOINT || DEFAULT_ENDPOINT,
    scenario: null,
    dryRun: false,
    updateBaseline: false,
    compareBaseline: false,
    delayMs: Number(process.env.JU_BEHAVIORAL_DELAY_MS || 900),
    processingTimeoutMs: Number(process.env.JU_BEHAVIORAL_PROCESSING_TIMEOUT_MS || 90000),
    pollMs: Number(process.env.JU_BEHAVIORAL_POLL_MS || 3000),
    tenantId: process.env.JU_BEHAVIORAL_QA_TENANT_ID || "",
    webhookSecret:
      process.env.JUREMA_TOOL_WEBHOOK_SECRET ||
      process.env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
      process.env.EVOLUTION_WEBHOOK_SECRET ||
      "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--endpoint") args.endpoint = argv[++index];
    else if (item === "--scenario") args.scenario = argv[++index];
    else if (item === "--tenant-id") args.tenantId = argv[++index];
    else if (item === "--dry-run") args.dryRun = true;
    else if (item === "--update-baseline") args.updateBaseline = true;
    else if (item === "--compare-baseline") args.compareBaseline = true;
    else if (item === "--delay-ms") args.delayMs = Number(argv[++index]);
    else if (item === "--processing-timeout-ms") args.processingTimeoutMs = Number(argv[++index]);
    else if (item === "--poll-ms") args.pollMs = Number(argv[++index]);
  }
  return args;
}

function ensureDirs(...dirs) {
  for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireQaTenant(args) {
  if (args.dryRun) return;
  if (!args.tenantId) {
    throw new Error("JU_BEHAVIORAL_QA_TENANT_ID or --tenant-id is required. Live audit must use an isolated QA tenant.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.tenantId)) {
    throw new Error(`Invalid QA tenant UUID: ${args.tenantId}`);
  }
}

function runCurl(endpoint, payloadFile, webhookSecret) {
  const startedAt = Date.now();
  const result = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      endpoint,
      "-H",
      "Content-Type: application/json",
      ...(webhookSecret ? ["-H", `x-webhook-secret: ${webhookSecret}`] : []),
      "--data-binary",
      `@${payloadFile}`,
      "-w",
      "\n__JU_HTTP_STATUS__:%{http_code}\n",
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 },
  );
  const latencyMs = Date.now() - startedAt;
  const combined = `${result.stdout || ""}${result.stderr ? `\n${result.stderr}` : ""}`;
  const statusMatch = combined.match(/__JU_HTTP_STATUS__:(\d{3})/);
  const body = combined.replace(/\n?__JU_HTTP_STATUS__:\d{3}\s*$/, "").trim();
  return {
    ok: result.status === 0,
    exit_code: result.status,
    http_status: statusMatch ? Number(statusMatch[1]) : 0,
    latency_ms: latencyMs,
    raw_body: body,
    stderr: result.stderr || "",
  };
}

function sleep(ms) {
  if (!ms) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(ms));
}

async function sleepAsync(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeSelect(label, promiseFactory, optional = false) {
  const { data, error } = await promiseFactory();
  if (error) {
    if (optional) return { data: [], error };
    throw new Error(`${label}: ${error.message}`);
  }
  return { data: data || [], error: null };
}

function messageText(row) {
  return String(row?.content || row?.message || row?.text || row?.body || row?.response || "").trim();
}

function isOutbound(row) {
  const direction = String(row?.direction || "").toLowerCase();
  const sender = String(row?.sender_type || row?.role || row?.from || "").toLowerCase();
  return direction === "outbound" || sender === "assistant" || sender === "ai" || sender === "ju";
}

function latestOutbound(messages) {
  return [...messages].reverse().find((row) => isOutbound(row) && messageText(row));
}

async function loadPersistenceSnapshot({ supabase, tenantId, phone, runId, conversationId }) {
  const { data: leads } = await safeSelect("leads", () =>
    supabase
      .from("leads")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1),
  );
  const lead = leads[0] || null;

  let conversations = [];
  if (lead?.id) {
    const result = await safeSelect("conversations", () =>
      supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(5),
    );
    conversations = result.data;
  }

  const conversation = conversationId
    ? conversations.find((item) => item.id === conversationId) || conversations[0] || null
    : conversations[0] || null;

  let messages = [];
  if (conversation?.id) {
    const result = await safeSelect("conversation_messages", () =>
      supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(100),
      true,
    );
    messages = result.data;
    if (!messages.length) {
      const fallback = await safeSelect("messages", () =>
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
          .limit(100),
        true,
      );
      messages = fallback.data;
    }
  }

  const leadOperationalContext = conversation?.id
    ? (await safeSelect(LEAD_OPERATIONAL_CONTEXT_TABLE, () =>
        supabase
          .from(LEAD_OPERATIONAL_CONTEXT_TABLE)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(10),
        true,
      )).data
    : [];

  const runtimeTraces = conversation?.id
    ? (await safeSelect("ju_runtime_traces", () =>
        supabase
          .from("ju_runtime_traces")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(10),
        true,
      )).data
    : [];

  const rawAiAudits = (await safeSelect(AI_CONVERSATION_AUDITS_TABLE, () =>
    supabase
      .from(AI_CONVERSATION_AUDITS_TABLE)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    true,
  )).data;

  const aiAudits = rawAiAudits.filter((row) => {
    const text = JSON.stringify(row);
    return text.includes(runId) || (conversation?.id && text.includes(conversation.id)) || (lead?.id && text.includes(lead.id));
  });

  const runtimeToolCalls = runtimeTraces.flatMap((trace) => {
    const snapshot = trace.tool_snapshot || trace.tool_trace || {};
    if (Array.isArray(snapshot.tool_calls)) return snapshot.tool_calls;
    if (Array.isArray(snapshot.calls)) return snapshot.calls;
    return Object.keys(snapshot).length ? [snapshot] : [];
  });
  const auditToolCalls = aiAudits.flatMap((audit) => {
    const usedTools = audit.used_tools || {};
    if (Array.isArray(usedTools)) return usedTools;
    if (!usedTools || typeof usedTools !== "object") return [];
    const required = Array.isArray(usedTools.required_tools) ? usedTools.required_tools : [];
    const materialized = required.map((tool) => ({
      name: String(tool),
      input: { source: "ai_conversation_audits.required_tools" },
      output: usedTools,
      urls: usedTools.property_urls || [],
    }));
    if (Object.keys(usedTools).length && !materialized.length) {
      materialized.push({
        name: "ai_conversation_audit_used_tools",
        input: { source: "ai_conversation_audits.used_tools" },
        output: usedTools,
        urls: usedTools.property_urls || [],
      });
    }
    return materialized;
  });
  const toolCalls = [...runtimeToolCalls, ...auditToolCalls];

  return {
    lead,
    conversations,
    conversation,
    messages,
    lead_operational_context: leadOperationalContext,
    runtime_traces: runtimeTraces,
    ai_conversation_audits: aiAudits,
    tool_calls: toolCalls,
    generated_context: {
      lead_operational_context: leadOperationalContext[0] || null,
      runtime_trace: runtimeTraces[0] || null,
    },
  };
}

function validatePersistence(snapshot) {
  const missing = [];
  if (!snapshot.lead) missing.push("leads");
  if (!snapshot.conversation) missing.push("conversations");
  if (!snapshot.messages.length) missing.push("messages");
  if (!snapshot.lead_operational_context.length) missing.push(LEAD_OPERATIONAL_CONTEXT_TABLE);
  if (!snapshot.ai_conversation_audits.length) missing.push("ai_conversation_audits");
  return missing;
}

async function waitForProcessing({ supabase, tenantId, phone, runId, conversationId, timeoutMs, pollMs }) {
  const deadline = Date.now() + timeoutMs;
  let snapshot = null;
  let missing = [];

  while (Date.now() < deadline) {
    snapshot = await loadPersistenceSnapshot({ supabase, tenantId, phone, runId, conversationId });
    missing = validatePersistence(snapshot);
    if (!missing.length) return { snapshot, missing };
    await sleepAsync(pollMs);
  }

  return { snapshot, missing };
}

async function persistAuditRunStart({ supabase, runId, endpoint, tenantId, startedAt, dryRun }) {
  const { error } = await supabase.from("ju_behavioral_audit_runs").upsert(
    {
      run_id: runId,
      endpoint,
      started_at: startedAt,
      dry_run: dryRun,
      metadata: {
        tenant_id: tenantId,
        test_run_id: runId,
        validity_contract: "valid_only_when_real_api_and_real_database_persistence_are_confirmed",
      },
    },
    { onConflict: "run_id" },
  );
  if (error) throw new Error(`ju_behavioral_audit_runs: ${error.message}`);
}

async function persistAuditScenario({ supabase, runId, scenario, summary }) {
  const safeSummary = summary || {
    score: null,
    pass: null,
    violations: [],
  };
  const { error } = await supabase.from("ju_behavioral_audit_scenarios").upsert(
    {
      run_id: runId,
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      persona: scenario.persona,
      emotional_context: scenario.emotionalContext,
      source_channel: scenario.sourceChannel,
      lead_origin: scenario.leadOrigin || {},
      expected_behavior: scenario.expectedBehavior,
      anti_patterns: scenario.antiPatterns,
      validation_checklist: scenario.validationChecklist,
      scoring_rubric: scenario.scoringRubric,
      score: safeSummary.score,
      passed: safeSummary.pass,
      critical_violations: safeSummary.violations.filter((violation) => violation.severity === "critical").length,
      warning_violations: safeSummary.violations.filter((violation) => violation.severity !== "critical").length,
    },
    { onConflict: "run_id,scenario_id" },
  );
  if (error) throw new Error(`ju_behavioral_audit_scenarios: ${error.message}`);
}

async function persistAuditTurn({ supabase, runId, scenario, turn, turnIndex, payload, curlResult, responseText, behavior, snapshot }) {
  const { error } = await supabase.from("ju_behavioral_audit_turns").upsert(
    {
      run_id: runId,
      scenario_id: scenario.id,
      turn_index: turnIndex,
      input_payload: payload,
      generated_context: snapshot.generated_context,
      user_message: turn.user,
      expected_stage: turn.expects?.stage || null,
      expected_tool_required: Boolean(turn.expects?.tool),
      expected_retrieval_required: Boolean(turn.expects?.retrieval),
      raw_response: {
        http_status: curlResult.http_status,
        body: curlResult.raw_body,
        persistence: {
          lead_id: snapshot.lead?.id || null,
          conversation_id: snapshot.conversation?.id || null,
          message_count: snapshot.messages.length,
          lead_operational_context_count: snapshot.lead_operational_context.length,
          ai_audit_count: snapshot.ai_conversation_audits.length,
        },
      },
      ai_final_response: responseText,
      http_status: curlResult.http_status,
      latency_ms: curlResult.latency_ms,
      behavioral_score: behavior.score,
      violations: behavior.violations,
      positives: behavior.positives,
      memory_state: {
        lead: snapshot.lead,
        conversation: snapshot.conversation,
        latest_runtime_trace: snapshot.runtime_traces[0] || null,
        latest_ai_audit: snapshot.ai_conversation_audits[0] || null,
      },
    },
    { onConflict: "run_id,scenario_id,turn_index" },
  );
  if (error) throw new Error(`ju_behavioral_audit_turns: ${error.message}`);

  for (const [index, toolCall] of snapshot.tool_calls.entries()) {
    const urls = Array.isArray(toolCall.urls) ? toolCall.urls : [];
    const { error: toolError } = await supabase.from("ju_behavioral_audit_tool_calls").insert({
      run_id: runId,
      scenario_id: scenario.id,
      turn_index: turnIndex,
      tool_name: String(toolCall.name || toolCall.tool || toolCall.id || `runtime_tool_snapshot_${index + 1}`),
      tool_input: toolCall.input || toolCall.args || toolCall,
      tool_output: toolCall.output || toolCall.result || {},
      ranking_summary: toolCall.ranking_summary || {},
      card_payloads: toolCall.card_payloads || [],
      url_count: urls.length,
      valid_url_count: urls.length,
      hallucinated_url_count: 0,
      latency_ms: toolCall.latency_ms || null,
    });
    if (toolError) throw new Error(`ju_behavioral_audit_tool_calls: ${toolError.message}`);
  }
}

async function persistAuditRunFinish({ supabase, runId, finishedAt, summary, regression }) {
  const scores = summary.scenarios.map((scenario) => scenario.score);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const passed = summary.scenarios.every((scenario) => scenario.pass) && !(regression.regressions || []).length;
  const { error } = await supabase
    .from("ju_behavioral_audit_runs")
    .update({
      finished_at: finishedAt,
      average_score: average,
      passed,
      regression_detected: Boolean((regression.regressions || []).length),
      metadata: {
        ...summary,
        validity_contract: "valid_only_when_real_api_and_real_database_persistence_are_confirmed",
      },
    })
    .eq("run_id", runId);
  if (error) throw new Error(`ju_behavioral_audit_runs finish: ${error.message}`);
}

function renderMarkdownReport({ runId, endpoint, startedAt, finishedAt, scenarioResults, dryRun, tenantId }) {
  const allTurns = scenarioResults.flatMap((item) => item.turns);
  const passCount = scenarioResults.filter((item) => item.summary.pass).length;
  const avgScore = scenarioResults.length
    ? Math.round(scenarioResults.reduce((sum, item) => sum + item.summary.score, 0) / scenarioResults.length)
    : 0;
  const criticals = scenarioResults.flatMap((item) =>
    item.summary.violations
      .filter((violation) => violation.severity === "critical")
      .map((violation) => `${item.scenario.name} turn ${violation.turn_index + 1}: ${violation.id}`),
  );

  return [
    "# Ju Behavioral E2E Audit Report",
    "",
    `- Run ID: ${runId}`,
    `- Test run ID: ${runId}`,
    `- Tenant ID: ${tenantId || "dry-run"}`,
    `- Endpoint: ${endpoint}`,
    `- Mode: ${dryRun ? "dry-run collection generation" : "live API plus real database validation"}`,
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Scenarios: ${scenarioResults.length}`,
    `- Turns: ${allTurns.length}`,
    `- Passing scenarios: ${passCount}/${scenarioResults.length}`,
    `- Average behavioral score: ${avgScore}`,
    "",
    "## Scenario Results",
    "",
    ...scenarioResults.map((item) => [
      `### ${item.scenario.name}`,
      "",
      `- Score: ${item.summary.score}`,
      `- Pass: ${item.summary.pass ? "yes" : "no"}`,
      `- Persona: ${item.scenario.persona}`,
      `- Emotional context: ${item.scenario.emotionalContext}`,
      `- Source channel: ${item.scenario.sourceChannel}`,
      `- Critical violations: ${item.summary.violations.filter((violation) => violation.severity === "critical").length}`,
      `- Warning violations: ${item.summary.violations.filter((violation) => violation.severity !== "critical").length}`,
      "",
      "Turns:",
      ...item.turns.map((turn) => `- Turn ${turn.turn_index + 1}: HTTP ${turn.http_status}, score ${turn.behavior.score}, latency ${turn.latency_ms}ms, messages ${turn.persistence?.messages ?? 0}, audits ${turn.persistence?.ai_conversation_audits ?? 0}`),
      "",
    ].join("\n")),
    "## Critical Violations",
    "",
    criticals.length ? criticals.map((item) => `- ${item}`).join("\n") : "- None.",
    "",
  ].join("\n");
}

function compareWithBaseline(summary) {
  const baselineFile = path.join(BASELINE_ROOT, "latest-summary.json");
  if (!fs.existsSync(baselineFile)) return { available: false, regressions: [] };
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  const regressions = [];
  for (const current of summary.scenarios) {
    const previous = baseline.scenarios.find((item) => item.scenario_id === current.scenario_id);
    if (!previous) continue;
    if (current.score < previous.score - 8) {
      regressions.push({ scenario_id: current.scenario_id, type: "score_drop", previous: previous.score, current: current.score });
    }
    if (current.critical_violations > previous.critical_violations) {
      regressions.push({
        scenario_id: current.scenario_id,
        type: "new_critical_violation",
        previous: previous.critical_violations,
        current: current.critical_violations,
      });
    }
  }
  return { available: true, regressions };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun && process.env.JU_BEHAVIORAL_ALLOW_DRY_RUN_FOR_MAINTENANCE !== "true") {
    throw new Error("Dry-run is disabled for Ju behavioral audits. Set JU_BEHAVIORAL_ALLOW_DRY_RUN_FOR_MAINTENANCE=true only for non-audit maintenance.");
  }
  requireQaTenant(args);

  const runId = `ju-live-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();
  const runDir = path.join(OUT_ROOT, runId);
  ensureDirs(OUT_ROOT, CURL_ROOT, BASELINE_ROOT, runDir);

  const selected = args.scenario ? SCENARIOS.filter((scenario) => scenario.id === args.scenario) : SCENARIOS;
  if (!selected.length) throw new Error(`No scenario matched: ${args.scenario}`);

  const supabase = args.dryRun ? null : createSupabaseClient();
  if (supabase) {
    await persistAuditRunStart({ supabase, runId, endpoint: args.endpoint, tenantId: args.tenantId, startedAt, dryRun: args.dryRun });
  }

  const scenarioResults = [];
  const curlLines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    `ENDPOINT="${args.endpoint}"`,
    'WEBHOOK_SECRET="${JUREMA_TOOL_WEBHOOK_SECRET:-${RUNTIME_COGNITIVE_WEBHOOK_SECRET:-${EVOLUTION_WEBHOOK_SECRET:-}}}"',
    "",
  ];

  for (const [scenarioIndex, scenario] of selected.entries()) {
    const scenarioDir = path.join(runDir, safeName(scenario.id));
    ensureDirs(scenarioDir);

    const turns = [];
    let conversationId = null;

    if (supabase) await persistAuditScenario({ supabase, runId, scenario, summary: null });

    for (const [turnIndex, turn] of scenario.turns.entries()) {
      const payload = buildWebhookPayload({ scenario, turn, turnIndex, scenarioIndex, runId, tenantId: args.tenantId });
      const payloadFile = path.join(scenarioDir, `payload_turn_${String(turnIndex + 1).padStart(2, "0")}.json`);
      writeJson(payloadFile, payload);
      curlLines.push(`# ${scenario.name} - turn ${turnIndex + 1}`);
      curlLines.push(
        curlCommand({
          endpoint: "$ENDPOINT",
          payloadPath: path.relative(ROOT, payloadFile).replace(/\\/g, "/"),
          webhookSecret: "$WEBHOOK_SECRET",
        }),
      );
      curlLines.push("");

      const curlResult = args.dryRun
        ? { ok: true, exit_code: 0, http_status: 0, latency_ms: 0, raw_body: "", stderr: "" }
        : runCurl(args.endpoint, payloadFile, args.webhookSecret);

      let snapshot = null;
      if (supabase) {
        const persistence = await waitForProcessing({
          supabase,
          tenantId: args.tenantId,
          phone: payload.data.key.remoteJid.replace(/@.*/, ""),
          runId,
          conversationId,
          timeoutMs: args.processingTimeoutMs,
          pollMs: args.pollMs,
        });
        snapshot = persistence.snapshot;
        if (persistence.missing.length) {
          throw new Error(
            `Invalid audit: database persistence not confirmed for ${scenario.id} turn ${turnIndex + 1}. Missing: ${persistence.missing.join(", ")}`,
          );
        }
        conversationId = snapshot.conversation?.id || conversationId;
      }

      const outbound = snapshot ? latestOutbound(snapshot.messages) : null;
      const responseText = messageText(outbound) || extractResponseText(curlResult.raw_body);
      const behavior = scoreTurn({
        scenario,
        turn,
        responseText,
        httpStatus: curlResult.http_status,
        latencyMs: curlResult.latency_ms,
      });

      const turnResult = {
        turn_index: turnIndex,
        input: turn.user,
        expects: turn.expects,
        payload_file: path.relative(ROOT, payloadFile),
        curl: curlCommand({
          endpoint: args.endpoint,
          payloadPath: path.relative(ROOT, payloadFile).replace(/\\/g, "/"),
          webhookSecret: args.webhookSecret,
        }),
        http_status: curlResult.http_status,
        latency_ms: curlResult.latency_ms,
        raw_body: curlResult.raw_body,
        response_text: responseText,
        persistence: snapshot
          ? {
              lead_id: snapshot.lead?.id || null,
              conversation_id: snapshot.conversation?.id || null,
              messages: snapshot.messages.length,
              lead_operational_context: snapshot.lead_operational_context.length,
              ai_conversation_audits: snapshot.ai_conversation_audits.length,
              tool_calls: snapshot.tool_calls.length,
            }
          : null,
        behavior,
      };

      turns.push(turnResult);
      writeJson(path.join(scenarioDir, `turn_${String(turnIndex + 1).padStart(2, "0")}.json`), turnResult);

      if (supabase) {
        await persistAuditTurn({ supabase, runId, scenario, turn, turnIndex, payload, curlResult, responseText, behavior, snapshot });
      }
      if (!args.dryRun && turnIndex < scenario.turns.length - 1) sleep(args.delayMs);
    }

    const summary = scoreScenario({ scenario, turns });
    const result = { scenario, turns, summary };
    scenarioResults.push(result);
    writeJson(path.join(scenarioDir, "summary.json"), summary);
    if (supabase) await persistAuditScenario({ supabase, runId, scenario, summary });
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    run_id: runId,
    test_run_id: runId,
    endpoint: args.endpoint,
    tenant_id: args.tenantId,
    dry_run: args.dryRun,
    started_at: startedAt,
    finished_at: finishedAt,
    scenarios: scenarioResults.map((item) => ({
      scenario_id: item.scenario.id,
      scenario_name: item.scenario.name,
      score: item.summary.score,
      pass: item.summary.pass,
      critical_violations: item.summary.violations.filter((violation) => violation.severity === "critical").length,
      warning_violations: item.summary.violations.filter((violation) => violation.severity !== "critical").length,
    })),
  };

  const regression = args.compareBaseline ? compareWithBaseline(summary) : { available: false, regressions: [] };
  summary.regression = regression;
  if (supabase) await persistAuditRunFinish({ supabase, runId, finishedAt, summary, regression });

  fs.writeFileSync(path.join(CURL_ROOT, "ju-behavioral-collection.sh"), `${curlLines.join("\n")}\n`);
  writeJson(path.join(runDir, "summary.json"), summary);
  fs.writeFileSync(
    path.join(runDir, "report.md"),
    renderMarkdownReport({ runId, endpoint: args.endpoint, startedAt, finishedAt, scenarioResults, dryRun: args.dryRun, tenantId: args.tenantId }),
  );

  if (args.updateBaseline && !args.dryRun) writeJson(path.join(BASELINE_ROOT, "latest-summary.json"), summary);

  const hasRegression = regression.regressions && regression.regressions.length > 0;
  const hasFailures = summary.scenarios.some((scenario) => !scenario.pass);
  console.log(JSON.stringify({
    ok: args.dryRun ? true : (!hasFailures && !hasRegression),
    dry_run: args.dryRun,
    run_id: runId,
    test_run_id: runId,
    tenant_id: args.tenantId,
    database_persistence_required: !args.dryRun,
    report: path.relative(ROOT, path.join(runDir, "report.md")),
    summary: path.relative(ROOT, path.join(runDir, "summary.json")),
    curl_collection: path.relative(ROOT, path.join(CURL_ROOT, "ju-behavioral-collection.sh")),
    scenarios: summary.scenarios.length,
    failures: args.dryRun ? null : summary.scenarios.filter((scenario) => !scenario.pass).length,
    regressions: regression.regressions || [],
  }, null, 2));

  if (!args.dryRun && (hasFailures || hasRegression)) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
