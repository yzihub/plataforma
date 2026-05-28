import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import Redis from "ioredis";
import OpenAI from "openai";
import { z } from "zod";
import { assertRuntimeConfig, loadRuntimeConfig } from "./config";
import { executeCognitiveTurn } from "./cognitive_turn";
import { LlmRuntime } from "./llm_runtime";
import { ToolOrchestrator } from "./tool_orchestrator";
import {
  calibrationMetricsSnapshot,
  costDashboardSnapshot,
  logger,
  metricsText,
  pilotDashboardSnapshot,
  recordCostAudit,
  recordPilotDecision,
  recordTrafficDecision,
  shadowMetricsSnapshot,
} from "./observability";
import {
  loadShadowCalibrationDashboard,
  loadShadowDashboard,
  loadShadowDecisionDivergenceDashboard,
} from "./shadow_storage";
import { decideTrafficRoute, idempotencyKey } from "./traffic_router";
import { isDuplicateInbound, loadConversationOwner, persistCutoverAudit } from "./cutover_storage";
import { normalizeTurnInput } from "./cognitive_turn";
import { executeShadowDecision } from "./shadow_decision";
import { evaluatePilotRollout } from "./pilot_rollout";
import { loadPilotDashboard, loadPilotOverrides, persistPilotOverride, persistPilotSample } from "./pilot_storage";
import { buildCostAuditSnapshot, loadCostDashboard, persistCostAudit } from "./cost_audit";
import {
  behavioralQaScenarios,
  loadLatestBehavioralQaRun,
  resetBehavioralQaSandbox,
  runBehavioralQa,
} from "./behavioral_qa_runner";
import {
  loadRuntimeQaConversation,
  loadRuntimeQaTrace,
  loadRuntimeReadiness,
  persistEdgeCaseQueue,
} from "./operations_storage";
import { extractWebhookFingerprint, reserveInboundMessage, validateWebhookSecret } from "./webhook_security";
import type { RuntimeConfig } from "./types";

const turnBodySchema = z.record(z.string(), z.unknown());
const pilotOverrideSchema = z.object({
  action: z.enum(["move_to_n8n", "move_to_kernel", "freeze_rollout", "pause_tenant", "block_lead"]),
  reason: z.string().optional().nullable(),
  tenant_id: z.string().uuid().optional().nullable(),
  conversation_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  phone: z.string().optional().nullable(),
  operator_id: z.string().optional().nullable(),
  active: z.boolean().optional(),
});
const behavioralQaRunSchema = z.object({
  reset: z.boolean().optional(),
  scenario_ids: z.array(z.string()).optional(),
  write_report: z.boolean().optional(),
});

export function buildRuntimeServer(config: RuntimeConfig = loadRuntimeConfig()) {
  assertRuntimeConfig(config);
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
    genReqId: (request) =>
      String(
        request.headers["x-request-id"] ||
          request.headers["x-correlation-id"] ||
          request.headers["cf-ray"] ||
          randomUUID(),
      ),
  });
  const pool = new Pool({ connectionString: config.databaseUrl });
  const redis = new Redis(config.redisUrl, { lazyConnect: true });
  const tools = new ToolOrchestrator(config);
  const llm = new LlmRuntime(
    new OpenAI({ apiKey: config.openaiApiKey }),
    config.openaiModel,
    tools,
    config.limits.max_orchestration_passes,
  );

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    (request as { startTime?: number }).startTime = Date.now();
    request.log.info(
      {
        request_id: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      "runtime_request_started",
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    const started = (request as { startTime?: number }).startTime ?? Date.now();
    request.log.info(
      {
        request_id: request.id,
        method: request.method,
        url: request.url,
        status_code: reply.statusCode,
        duration_ms: Date.now() - started,
      },
      "runtime_request_completed",
    );
  });

  app.get("/health", async () => {
    const checks = {
      postgres: false,
      redis: false,
      mode: config.runtimeMode,
      openai_configured: Boolean(config.openaiApiKey),
      guardian_active: true,
    };
    try {
      await pool.query("select 1");
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }
    return { ok: checks.postgres && checks.redis, checks };
  });

  app.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return metricsText();
  });

  app.get("/shadow/metrics", async () => {
    try {
      const persisted = await loadShadowDashboard(pool);
      return {
        ok: true,
        source: "postgres",
        ...persisted,
      };
    } catch (error) {
      return {
        ok: true,
        source: "memory",
        warning: error instanceof Error ? error.message : String(error),
        ...shadowMetricsSnapshot(),
      };
    }
  });

  app.get("/shadow/calibration", async () => {
    try {
      const persisted = await loadShadowCalibrationDashboard(pool);
      return {
        ok: true,
        source: "postgres",
        ...persisted,
      };
    } catch (error) {
      return {
        ok: true,
        source: "memory",
        warning: error instanceof Error ? error.message : String(error),
        ...calibrationMetricsSnapshot(),
      };
    }
  });

  app.get("/shadow/divergence", async () => {
    try {
      return {
        ok: true,
        source: "postgres",
        ...await loadShadowDecisionDivergenceDashboard(pool),
      };
    } catch (error) {
      return {
        ok: false,
        source: "postgres",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  app.post("/cognitive/decide", async (request, reply) => {
    const parsed = turnBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { ok: false, error: parsed.error.flatten() };
    }
    try {
      const secretValidation = validateWebhookSecret(request.headers);
      if (!secretValidation.ok) {
        reply.code(401);
        request.log.warn(
          { request_id: request.id, reason: secretValidation.reason },
          "runtime_shadow_decision_rejected",
        );
        return { ok: false, error: secretValidation.reason ?? "unauthorized" };
      }
      return await executeShadowDecision({
        raw: parsed.data,
        pool,
        config: {
          ...config,
          runtimeMode: "shadow",
        },
        requestId: request.id,
      });
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        readonly: true,
        side_effects: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  app.post("/cognitive/turn", async (request, reply) => {
    const parsed = turnBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { ok: false, error: parsed.error.flatten() };
    }
    try {
      const secretValidation = validateWebhookSecret(request.headers);
      if (!secretValidation.ok) {
        reply.code(401);
        request.log.warn(
          { request_id: request.id, reason: secretValidation.reason },
          "runtime_webhook_rejected",
        );
        return { ok: false, error: secretValidation.reason ?? "unauthorized" };
      }
      const fingerprint = extractWebhookFingerprint(parsed.data);
      if (!fingerprint.message_id) {
        reply.code(400);
        return { ok: false, error: "message_id is required" };
      }
      if (redis.status === "wait") await redis.connect();
      const reserved = await reserveInboundMessage(redis, fingerprint.message_id);
      if (!reserved) {
        request.log.info(
          {
            request_id: request.id,
            message_id: fingerprint.message_id,
            conversation_id: fingerprint.conversation_id || null,
          },
          "runtime_webhook_duplicate_dropped",
        );
        return {
          ok: true,
          duplicate: true,
          message_id: fingerprint.message_id,
          conversation_id: fingerprint.conversation_id || null,
        };
      }
      const result = await executeCognitiveTurn({
        raw: { ...parsed.data, dry_run: true },
        pool,
        redis,
        llm,
        config,
      });
      const normalized = normalizeTurnInput(parsed.data);
      const idKey = idempotencyKey(normalized);
      const duplicate = await isDuplicateInbound(pool, idKey);
      const previousOwner = normalized.conversation_id
        ? await loadConversationOwner(pool, normalized.conversation_id)
        : null;
      const route = decideTrafficRoute({
        input: normalized,
        result,
        flags: config.featureFlags,
        previousOwner,
        duplicate,
      });
      const overrides = await loadPilotOverrides(pool, normalized);
      const pilot = evaluatePilotRollout({
        input: normalized,
        result,
        route,
        flags: config.featureFlags,
        previousOwner,
        overrides,
      });
      recordTrafficDecision(route);
      recordPilotDecision(pilot);
      const cost = buildCostAuditSnapshot(normalized, result, config);
      recordCostAudit(cost);
      await persistCostAudit(pool, cost);
      await persistCutoverAudit(pool, normalized, result, route, pilot);
      await persistPilotSample(pool, normalized, pilot);
      await persistEdgeCaseQueue(pool, normalized, result, pilot);
      return {
        ...result,
        cutover: route,
        pilot,
        cost,
        webhook: {
          request_id: request.id,
          message_id: fingerprint.message_id,
          duplicate: false,
        },
        response_to_send: pilot.response_to_send,
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  app.post("/runtime/simulate", async (request, reply) => {
    const parsed = turnBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { ok: false, error: parsed.error.flatten() };
    }
    try {
      if (redis.status === "wait") await redis.connect();
      const result = await executeCognitiveTurn({
        raw: { ...parsed.data, dry_run: true },
        pool,
        redis,
        llm,
        config: {
          ...config,
          runtimeMode: "shadow",
        },
      });
      const normalized = normalizeTurnInput(parsed.data);
      const cost = buildCostAuditSnapshot(normalized, result, config);
      recordCostAudit(cost);
      await persistCostAudit(pool, cost);
      return {
        ok: true,
        simulation_first: true,
        sends_whatsapp: false,
        result,
        cost,
      };
    } catch (error) {
      reply.code(500);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  app.post("/cutover/decision", async (request, reply) => {
    const parsed = turnBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { ok: false, error: parsed.error.flatten() };
    }
    try {
      if (redis.status === "wait") await redis.connect();
      const result = await executeCognitiveTurn({
        raw: { ...parsed.data, dry_run: true },
        pool,
        redis,
        llm,
        config,
      });
      const normalized = normalizeTurnInput(parsed.data);
      const duplicate = await isDuplicateInbound(pool, idempotencyKey(normalized));
      const previousOwner = normalized.conversation_id
        ? await loadConversationOwner(pool, normalized.conversation_id)
        : null;
      const route = decideTrafficRoute({
        input: normalized,
        result,
        flags: config.featureFlags,
        previousOwner,
        duplicate,
      });
      const overrides = await loadPilotOverrides(pool, normalized);
      const pilot = evaluatePilotRollout({
        input: normalized,
        result,
        route,
        flags: config.featureFlags,
        previousOwner,
        overrides,
      });
      recordTrafficDecision(route);
      recordPilotDecision(pilot);
      return {
        ok: true,
        route,
        pilot,
        would_have_replied: result.shadow?.calibration?.would_have_replied ?? {
          output: result.llm.output,
          tool_calls: result.llm.tool_calls.map((call) => call.tool),
        },
      };
    } catch (error) {
      reply.code(500);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  app.get("/cutover/readiness", async () => {
    const shadow = shadowMetricsSnapshot();
    const calibration = calibrationMetricsSnapshot();
    return {
      ok: true,
      flags: config.featureFlags,
      levels: {
        0: "shadow only",
        1: "internal testing",
        2: "1% production",
        3: "10% production",
        4: "50% production",
        5: "full production",
      },
      readiness: {
        ready_for_cutover:
          Boolean((calibration.readiness as Record<string, unknown>)?.ready_for_cutover) &&
          config.featureFlags.emergency_fallback === false,
        shadow,
        calibration,
      },
    };
  });

  app.get("/runtime/costs", async () => {
    try {
      return {
        ok: true,
        source: "postgres",
        model: config.openaiModel,
        pricing: config.cost,
        ...await loadCostDashboard(pool),
      };
    } catch (error) {
      return {
        ok: true,
        source: "memory",
        warning: error instanceof Error ? error.message : String(error),
        model: config.openaiModel,
        pricing: config.cost,
        ...costDashboardSnapshot(),
      };
    }
  });

  app.get("/runtime/readiness", async () => {
    const checklist = {
      redis_healthy: false,
      supabase_healthy: false,
      openai_configured: Boolean(config.openaiApiKey),
      locks_configured: config.lockTtlMs > 0,
      guardian_active: true,
      fallback_active: !config.featureFlags.force_kernel && !config.featureFlags.emergency_fallback,
      shadow_logs_active: true,
      audit_logs_active: true,
      simple_mode: config.simpleMode,
      architecture_frozen: true,
      simulator_available: true,
    };
    try {
      await pool.query("select 1");
      checklist.supabase_healthy = true;
    } catch {
      checklist.supabase_healthy = false;
    }
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.ping();
      checklist.redis_healthy = true;
    } catch {
      checklist.redis_healthy = false;
    }
    const shadow = shadowMetricsSnapshot();
    const calibration = calibrationMetricsSnapshot();
    const runtime = await loadRuntimeReadiness(pool).catch(() => ({}));
    const costs = await loadCostDashboard(pool).catch(() => costDashboardSnapshot());
    return {
      ok: true,
      mode: config.runtimeMode,
      model: config.openaiModel,
      limits: config.limits,
      checklist,
      parity: (shadow.readiness as Record<string, unknown>)?.parity_threshold_met ?? null,
      governance_stability: (calibration.readiness as Record<string, unknown>)?.zero_critical_governance_violations ?? null,
      latency: pilotDashboardSnapshot(),
      token_cost: costs,
      divergence_score: shadow,
      cutover_readiness: runtime,
    };
  });

  app.get("/runtime/qa/conversation/:conversationId", async (request, reply) => {
    const conversationId = (request.params as { conversationId?: string }).conversationId;
    if (!conversationId) {
      reply.code(400);
      return { ok: false, error: "conversationId is required" };
    }
    return {
      ok: true,
      ...await loadRuntimeQaConversation(pool, conversationId),
    };
  });

  app.get("/runtime/qa/trace/:traceId", async (request, reply) => {
    const traceId = (request.params as { traceId?: string }).traceId;
    if (!traceId) {
      reply.code(400);
      return { ok: false, error: "traceId is required" };
    }
    const trace = await loadRuntimeQaTrace(pool, traceId);
    if (!trace) {
      reply.code(404);
      return { ok: false, error: "trace not found" };
    }
    return { ok: true, trace };
  });

  app.get("/behavioral-qa/scenarios", async () => {
    return {
      ok: true,
      simulation_first: true,
      sends_whatsapp: false,
      phone: config.behavioralQa.phone,
      tenant_id: config.behavioralQa.tenant_id,
      scenarios: behavioralQaScenarios(),
    };
  });

  app.post("/behavioral-qa/reset", async () => {
    try {
      if (redis.status === "wait") await redis.connect();
      await resetBehavioralQaSandbox(pool, redis, config);
      return {
        ok: true,
        sandbox_reset: true,
        phone: config.behavioralQa.phone,
        tenant_id: config.behavioralQa.tenant_id,
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  app.post("/behavioral-qa/run", async (request, reply) => {
    const parsed = behavioralQaRunSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { ok: false, error: parsed.error.flatten() };
    }
    try {
      if (redis.status === "wait") await redis.connect();
      const all = behavioralQaScenarios();
      const selected = parsed.data.scenario_ids?.length
        ? all.filter((scenario) => parsed.data.scenario_ids?.includes(scenario.id))
        : all;
      const report = await runBehavioralQa({
        pool,
        redis,
        llm,
        config,
        reset: parsed.data.reset ?? true,
        scenarios: selected,
        writeReport: parsed.data.write_report ?? true,
      });
      return {
        ok: true,
        simulation_first: true,
        sends_whatsapp: false,
        report,
      };
    } catch (error) {
      reply.code(500);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  app.get("/behavioral-qa/report", async () => {
    const report = await loadLatestBehavioralQaRun(pool);
    return {
      ok: true,
      source: report ? "postgres" : "not_run",
      report,
    };
  });

  app.get("/pilot/dashboard", async () => {
    try {
      const persisted = await loadPilotDashboard(pool);
      return {
        ok: true,
        source: "postgres",
        flags: config.featureFlags,
        ...persisted,
      };
    } catch (error) {
      return {
        ok: true,
        source: "memory",
        warning: error instanceof Error ? error.message : String(error),
        flags: config.featureFlags,
        ...pilotDashboardSnapshot(),
      };
    }
  });

  app.post("/pilot/override", async (request, reply) => {
    const parsed = pilotOverrideSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { ok: false, error: parsed.error.flatten() };
    }
    try {
      await persistPilotOverride(pool, parsed.data);
      return { ok: true, override: parsed.data };
    } catch (error) {
      reply.code(500);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  app.addHook("onClose", async () => {
    await pool.end();
    redis.disconnect();
  });

  return app;
}
