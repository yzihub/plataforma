import client from "prom-client";
import pino from "pino";
import type { BehavioralCalibration, CostAuditSnapshot, PilotRolloutDecision, RuntimeStageTrace, RuntimeTraceStage } from "./types";
import type { TrafficRouteDecision } from "./types";
import type { ShadowComparison } from "./types";

export const logger = pino({
  name: "jurema-cognitive-runtime",
  level: process.env.LOG_LEVEL || "info",
});

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: "ju_runtime_" });

export const turnDuration = new client.Histogram({
  name: "ju_runtime_turn_duration_ms",
  help: "Cognitive turn duration in milliseconds",
  buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
  labelNames: ["mode", "ok"],
});

export const stageDuration = new client.Histogram({
  name: "ju_runtime_stage_duration_ms",
  help: "Runtime stage duration in milliseconds",
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  labelNames: ["stage", "ok"],
});

export const contextSize = new client.Gauge({
  name: "ju_runtime_context_chars",
  help: "Rendered cognitive context size in characters",
});

export const tokenUsage = new client.Counter({
  name: "ju_runtime_tokens_total",
  help: "OpenAI token usage",
  labelNames: ["kind"],
});

export const governanceViolations = new client.Counter({
  name: "ju_runtime_governance_violations_total",
  help: "Governance violations detected on the response draft (audit-only, never sent to the customer)",
  labelNames: ["code"],
});

export const estimatedCost = new client.Counter({
  name: "ju_runtime_estimated_cost_usd_total",
  help: "Estimated OpenAI cost in USD",
  labelNames: ["funnel_stage"],
});

export const contextTruncations = new client.Counter({
  name: "ju_runtime_context_truncations_total",
  help: "Context hard-limit truncations",
});

export const toolLatency = new client.Histogram({
  name: "ju_runtime_tool_latency_ms",
  help: "Tool latency in milliseconds",
  buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  labelNames: ["tool", "ok"],
});

export const shadowComparisons = new client.Counter({
  name: "ju_runtime_shadow_comparisons_total",
  help: "Shadow comparisons by severity",
  labelNames: ["severity"],
});

export const shadowDivergences = new client.Counter({
  name: "ju_runtime_shadow_divergences_total",
  help: "Shadow divergences by code and severity",
  labelNames: ["code", "severity"],
});

export const shadowScore = new client.Gauge({
  name: "ju_runtime_shadow_behavioral_score",
  help: "Latest shadow behavioral score",
});

export const shadowReadiness = new client.Gauge({
  name: "ju_runtime_shadow_cutover_ready",
  help: "Latest cutover readiness, 1 ready and 0 not ready",
});

export const calibrationConsultativeScore = new client.Gauge({
  name: "ju_runtime_calibration_consultative_score",
  help: "Latest consultative parity score",
});

export const calibrationSdrRegressions = new client.Counter({
  name: "ju_runtime_calibration_sdr_regressions_total",
  help: "Detected SDR regressions in calibration",
  labelNames: ["severity"],
});

export const calibrationToolTiming = new client.Counter({
  name: "ju_runtime_calibration_tool_timing_total",
  help: "Tool timing calibration outcomes",
  labelNames: ["status"],
});

export const cutoverResponses = new client.Counter({
  name: "ju_runtime_cutover_responses_total",
  help: "Cutover routing decisions by responder and reason",
  labelNames: ["responder", "reason"],
});

export const cutoverFallbacks = new client.Counter({
  name: "ju_runtime_cutover_fallbacks_total",
  help: "Cutover fallback reasons",
  labelNames: ["reason"],
});

export const cutoverKernelConfidence = new client.Gauge({
  name: "ju_runtime_cutover_kernel_confidence",
  help: "Latest kernel confidence score",
});

export const pilotResponses = new client.Counter({
  name: "ju_runtime_pilot_responses_total",
  help: "Pilot rollout decisions by responder, stage and reason",
  labelNames: ["responder", "stage", "reason"],
});

export const pilotFallbacks = new client.Counter({
  name: "ju_runtime_pilot_fallbacks_total",
  help: "Pilot fallback reasons",
  labelNames: ["reason"],
});

export const pilotReadinessScore = new client.Gauge({
  name: "ju_runtime_pilot_readiness_score",
  help: "Latest pilot readiness score",
});

export const pilotLatency = new client.Histogram({
  name: "ju_runtime_pilot_latency_ms",
  help: "Pilot total response latency in milliseconds",
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 8000, 10000, 15000],
  labelNames: ["authorized"],
});

registry.registerMetric(turnDuration);
registry.registerMetric(stageDuration);
registry.registerMetric(contextSize);
registry.registerMetric(tokenUsage);
registry.registerMetric(estimatedCost);
registry.registerMetric(contextTruncations);
registry.registerMetric(toolLatency);
registry.registerMetric(shadowComparisons);
registry.registerMetric(shadowDivergences);
registry.registerMetric(shadowScore);
registry.registerMetric(shadowReadiness);
registry.registerMetric(calibrationConsultativeScore);
registry.registerMetric(calibrationSdrRegressions);
registry.registerMetric(calibrationToolTiming);
registry.registerMetric(cutoverResponses);
registry.registerMetric(cutoverFallbacks);
registry.registerMetric(cutoverKernelConfidence);
registry.registerMetric(pilotResponses);
registry.registerMetric(pilotFallbacks);
registry.registerMetric(pilotReadinessScore);
registry.registerMetric(pilotLatency);

const shadowWindow: ShadowComparison[] = [];
const calibrationWindow: BehavioralCalibration[] = [];
const pilotWindow: PilotRolloutDecision[] = [];
const costWindow: CostAuditSnapshot[] = [];
const SHADOW_WINDOW_MAX = 500;

export function recordShadowComparison(comparison: ShadowComparison): void {
  shadowWindow.push(comparison);
  if (shadowWindow.length > SHADOW_WINDOW_MAX) shadowWindow.shift();
  shadowComparisons.labels(comparison.severity).inc();
  shadowScore.set(comparison.score.overall);
  shadowReadiness.set(comparison.readiness.ready_for_cutover ? 1 : 0);
  for (const divergence of comparison.divergences) {
    shadowDivergences.labels(divergence.code, divergence.severity).inc();
  }
}

export function recordBehavioralCalibration(calibration: BehavioralCalibration): void {
  calibrationWindow.push(calibration);
  if (calibrationWindow.length > SHADOW_WINDOW_MAX) calibrationWindow.shift();
  calibrationConsultativeScore.set(calibration.consultative_parity_score.overall);
  calibrationToolTiming.labels(calibration.tool_timing.status).inc();
  if (calibration.sdr_regression.detected) {
    calibrationSdrRegressions.labels(calibration.sdr_regression.severity).inc();
  }
}

export function recordTrafficDecision(decision: TrafficRouteDecision): void {
  cutoverResponses.labels(decision.responder, decision.reason).inc();
  cutoverKernelConfidence.set(decision.guardian.confidence.overall);
  for (const reason of decision.fallback_reasons) {
    cutoverFallbacks.labels(reason).inc();
  }
}

export function recordPilotDecision(decision: PilotRolloutDecision): void {
  pilotWindow.push(decision);
  if (pilotWindow.length > SHADOW_WINDOW_MAX) pilotWindow.shift();
  pilotResponses.labels(decision.responder, String(decision.stage), decision.reason).inc();
  pilotReadinessScore.set(decision.readiness_score);
  pilotLatency.labels(String(decision.authorized_to_send)).observe(decision.latency_guards.total_ms);
  for (const reason of decision.fallback_reasons) {
    pilotFallbacks.labels(reason).inc();
  }
}

export function recordCostAudit(snapshot: CostAuditSnapshot): void {
  costWindow.push(snapshot);
  if (costWindow.length > SHADOW_WINDOW_MAX) costWindow.shift();
  estimatedCost.labels(snapshot.funnel_stage).inc(snapshot.cost.total_usd);
  if (snapshot.context_truncated) contextTruncations.inc();
}

export function costDashboardSnapshot(): Record<string, unknown> {
  const total = costWindow.length;
  const dailyCost = costWindow.reduce((sum, item) => sum + item.cost.total_usd, 0);
  const leads = new Set(costWindow.map((item) => item.lead_id).filter(Boolean)).size;
  const conversations = new Set(costWindow.map((item) => item.conversation_id).filter(Boolean)).size;
  const avg = (selector: (item: CostAuditSnapshot) => number) =>
    total ? costWindow.reduce((sum, item) => sum + selector(item), 0) / total : 0;
  return {
    window: "in_memory_latest_500",
    daily_cost_usd: Math.round(dailyCost * 1_000_000) / 1_000_000,
    average_cost_per_lead_usd: leads ? Math.round((dailyCost / leads) * 1_000_000) / 1_000_000 : 0,
    average_cost_per_conversation_usd: conversations ? Math.round((dailyCost / conversations) * 1_000_000) / 1_000_000 : 0,
    average_turn_cost_usd: Math.round(avg((item) => item.cost.total_usd) * 1_000_000) / 1_000_000,
    retrieval_overhead_tokens_avg: Math.round(avg((item) => item.tokens.retrieval)),
    context_size_avg_chars: Math.round(avg((item) => item.context_chars)),
    estimated_monthly_burn_usd: Math.round(dailyCost * 30 * 1_000_000) / 1_000_000,
    top_expensive_conversations: [...costWindow]
      .sort((a, b) => b.cost.total_usd - a.cost.total_usd)
      .slice(0, 10)
      .map((item) => ({
        conversation_id: item.conversation_id,
        lead_id: item.lead_id,
        cost_usd: item.cost.total_usd,
        total_tokens: item.tokens.total,
      })),
    spikes: costWindow
      .filter((item) => item.tokens.total > 12000 || item.context_truncated)
      .slice(-25),
  };
}

export function pilotDashboardSnapshot(): Record<string, unknown> {
  const total = pilotWindow.length;
  const kernel = pilotWindow.filter((item) => item.authorized_to_send).length;
  const fallback = pilotWindow.filter((item) => !item.authorized_to_send).length;
  const guardian = pilotWindow.filter((item) => item.reason === "live_validation_failed").length;
  const sdr = pilotWindow.filter((item) => item.live_validation.violations.includes("sdr_behavior")).length;
  const governance = pilotWindow.filter((item) =>
    item.live_validation.violations.some((code) => code.includes("governance") || code.includes("inventory") || code.includes("qualification")),
  ).length;
  const avgReadiness = total ? pilotWindow.reduce((sum, item) => sum + item.readiness_score, 0) / total : 0;
  const fallbackRate = total ? fallback / total : 0;
  const fallbackSpike = total >= 10 && pilotWindow.slice(-10).filter((item) => !item.authorized_to_send).length >= 5;
  const toolSpike = total >= 10 && pilotWindow.slice(-10).filter((item) => item.fallback_reasons.includes("tool_failure")).length >= 3;
  const timeoutSpike = total >= 10 && pilotWindow.slice(-10).filter((item) => item.fallback_reasons.includes("latency_guard")).length >= 3;
  return {
    window: "in_memory_latest_500",
    total_decisions: total,
    rollout_percent: total ? Math.round((kernel / total) * 10000) / 100 : 0,
    active_conversations: kernel,
    fallback_rate: Math.round(fallbackRate * 10000) / 100,
    guardian_rejections: guardian,
    sdr_regressions: sdr,
    governance_violations: governance,
    readiness_score: Math.round(avgReadiness * 100) / 100,
    readiness_trend: pilotWindow.map((item) => item.readiness_score).slice(-50),
    alerts: {
      fallback_spike: fallbackSpike,
      sdr_regression: sdr > 0,
      governance_drift: governance > 0,
      tool_failure_spike: toolSpike,
      timeout_increase: timeoutSpike,
    },
  };
}

export function shadowMetricsSnapshot(): Record<string, unknown> {
  const total = shadowWindow.length;
  const critical = shadowWindow.filter((item) => item.severity === "CRITICAL").length;
  const highOrCritical = shadowWindow.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length;
  const sdr = shadowWindow.filter((item) => item.output_analysis.candidate_sdr_behavior).length;
  const toolMismatch = shadowWindow.filter((item) => item.readiness.tool_parity_stable === false).length;
  const governance = shadowWindow.filter((item) => item.readiness.governance_stable === false).length;
  const avgScore = total ? shadowWindow.reduce((sum, item) => sum + item.score.overall, 0) / total : 0;
  return {
    window: "in_memory_latest_500",
    total,
    parity_percent: Math.round(avgScore * 100) / 100,
    divergence_rate: total ? highOrCritical / total : 0,
    critical_failures: critical,
    sdr_regressions: sdr,
    tool_mismatches: toolMismatch,
    governance_violations: governance,
    readiness: {
      ready_for_cutover: total > 0 && avgScore > 95 && critical === 0 && sdr === 0 && toolMismatch === 0 && governance === 0,
      parity_threshold_met: avgScore > 95,
      zero_critical_divergences: critical === 0,
      zero_sdr_regressions: sdr === 0,
      governance_stable: governance === 0,
      tool_parity_stable: toolMismatch === 0,
    },
  };
}

export function calibrationMetricsSnapshot(): Record<string, unknown> {
  const total = calibrationWindow.length;
  const avg = (selector: (item: BehavioralCalibration) => number) =>
    total ? calibrationWindow.reduce((sum, item) => sum + selector(item), 0) / total : 0;
  const sdr = calibrationWindow.filter((item) => item.sdr_regression.detected).length;
  const criticalSdr = calibrationWindow.filter((item) => item.sdr_regression.severity === "CRITICAL").length;
  const governanceViolations = calibrationWindow.filter((item) => !item.governance_parity_audit.stable).length;
  const toolTimingFailures = calibrationWindow.filter((item) => !item.tool_timing.stable).length;
  const ppdFailures = calibrationWindow.filter((item) => !item.property_presentation_due_audit.stable).length;
  const readinessScore = avg((item) => item.readiness_gates.readiness_score);
  return {
    window: "in_memory_latest_500",
    total,
    parity: Math.round(avg((item) => item.readiness_gates.readiness_score) * 100) / 100,
    consultative_score: Math.round(avg((item) => item.consultative_parity_score.overall) * 100) / 100,
    sdr_regressions: sdr,
    critical_sdr_regressions: criticalSdr,
    governance_violations: governanceViolations,
    tool_timing_failures: toolTimingFailures,
    property_presentation_due_failures: ppdFailures,
    readiness_score: Math.round(readinessScore * 100) / 100,
    readiness: {
      ready_for_cutover: total > 0 && readinessScore > 97 && criticalSdr === 0 && governanceViolations === 0 && toolTimingFailures === 0 && ppdFailures === 0,
      parity_gt_97: readinessScore > 97,
      zero_critical_sdr_regressions: criticalSdr === 0,
      zero_critical_governance_violations: governanceViolations === 0,
      tool_timing_stable: toolTimingFailures === 0,
      property_presentation_due_stable: ppdFailures === 0,
      consultative_score_stable: avg((item) => item.consultative_parity_score.overall) > 97,
    },
    trends: {
      parity_over_time: calibrationWindow.map((item) => item.readiness_gates.readiness_score).slice(-50),
      governance_stability: calibrationWindow.map((item) => item.governance_parity_audit.stable ? 1 : 0).slice(-50),
      sdr_regression_trend: calibrationWindow.map((item) => item.sdr_regression.detected ? 1 : 0).slice(-50),
      tool_timing_trend: calibrationWindow.map((item) => item.tool_timing.stable ? 1 : 0).slice(-50),
      consultative_score_trend: calibrationWindow.map((item) => item.consultative_parity_score.overall).slice(-50),
    },
  };
}

export async function metricsText(): Promise<string> {
  return registry.metrics();
}

export async function traceStage<T>(
  traces: RuntimeStageTrace[],
  stage: RuntimeTraceStage,
  fn: () => Promise<T> | T,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  try {
    const value = await fn();
    const duration = Date.now() - started;
    traces.push({ stage, started_at: startedAt, duration_ms: duration, ok: true, metadata });
    stageDuration.labels(stage, "true").observe(duration);
    return value;
  } catch (error) {
    const duration = Date.now() - started;
    traces.push({
      stage,
      started_at: startedAt,
      duration_ms: duration,
      ok: false,
      metadata: { ...metadata, error: error instanceof Error ? error.message : String(error) },
    });
    stageDuration.labels(stage, "false").observe(duration);
    throw error;
  }
}
