import type { CanonicalTool } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { CutoverFeatureFlags, PilotStage, ReadinessLevel, RuntimeConfig, RuntimeHardLimits, RuntimeMode } from "./types";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function mode(value: unknown): RuntimeMode {
  const runtimeMode = clean(value).toLowerCase();
  if (runtimeMode === "active") return "active";
  if (runtimeMode === "behavioral_qa") return "behavioral_qa";
  return "shadow";
}

function toolUrl(name: CanonicalTool): string | undefined {
  const key = `JUREMA_TOOL_${name.toUpperCase()}_URL`;
  return clean(process.env[key]) || undefined;
}

function webhookSecret(): string {
  return clean(
    process.env.JUREMA_TOOL_WEBHOOK_SECRET ||
      process.env.RUNTIME_COGNITIVE_WEBHOOK_SECRET ||
      process.env.EVOLUTION_WEBHOOK_SECRET ||
      process.env.N8N_API_KEY ||
      process.env.N8N_API,
  );
}

function boolEnv(name: string, fallback = false): boolean {
  const value = clean(process.env[name]).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function listEnv(name: string): string[] {
  return clean(process.env[name])
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readinessLevel(value: unknown): ReadinessLevel {
  const level = Number(value);
  if ([0, 1, 2, 3, 4, 5].includes(level)) return level as ReadinessLevel;
  return 0;
}

function pilotStage(value: unknown): PilotStage {
  const stage = Number(value);
  if ([0, 1, 2, 3, 4].includes(stage)) return stage as PilotStage;
  return 0;
}

function featureFlags(overrides?: Partial<CutoverFeatureFlags>): CutoverFeatureFlags {
  return {
    shadow_only: overrides?.shadow_only ?? boolEnv("JUREMA_CUTOVER_SHADOW_ONLY", true),
    internal_only: overrides?.internal_only ?? boolEnv("JUREMA_CUTOVER_INTERNAL_ONLY", false),
    pilot_group: overrides?.pilot_group ?? boolEnv("JUREMA_CUTOVER_PILOT_GROUP", false),
    pilot_stage: overrides?.pilot_stage ?? pilotStage(process.env.JUREMA_PILOT_STAGE),
    percentage_rollout: overrides?.percentage_rollout ?? Number(process.env.JUREMA_CUTOVER_PERCENTAGE || 0),
    force_n8n: overrides?.force_n8n ?? boolEnv("JUREMA_CUTOVER_FORCE_N8N", false),
    force_kernel: overrides?.force_kernel ?? boolEnv("JUREMA_CUTOVER_FORCE_KERNEL", false),
    emergency_fallback: overrides?.emergency_fallback ?? boolEnv("JUREMA_CUTOVER_EMERGENCY_FALLBACK", false),
    pilot_tenants: overrides?.pilot_tenants ?? listEnv("JUREMA_CUTOVER_PILOT_TENANTS"),
    pilot_phones: overrides?.pilot_phones ?? listEnv("JUREMA_CUTOVER_PILOT_PHONES"),
    pilot_leads: overrides?.pilot_leads ?? listEnv("JUREMA_CUTOVER_PILOT_LEADS"),
    blocked_tenants: overrides?.blocked_tenants ?? listEnv("JUREMA_PILOT_BLOCKED_TENANTS"),
    blocked_phones: overrides?.blocked_phones ?? listEnv("JUREMA_PILOT_BLOCKED_PHONES"),
    blocked_leads: overrides?.blocked_leads ?? listEnv("JUREMA_PILOT_BLOCKED_LEADS"),
    rollout_frozen: overrides?.rollout_frozen ?? boolEnv("JUREMA_PILOT_ROLLOUT_FROZEN", false),
    followup_only: overrides?.followup_only ?? boolEnv("JUREMA_CUTOVER_FOLLOWUP_ONLY", false),
    inbound_only: overrides?.inbound_only ?? boolEnv("JUREMA_CUTOVER_INBOUND_ONLY", false),
    max_orchestration_latency_ms: overrides?.max_orchestration_latency_ms ?? Number(process.env.JUREMA_PILOT_MAX_ORCHESTRATION_MS || 8000),
    max_tool_latency_ms: overrides?.max_tool_latency_ms ?? Number(process.env.JUREMA_PILOT_MAX_TOOL_MS || 2500),
    max_total_latency_ms: overrides?.max_total_latency_ms ?? Number(process.env.JUREMA_PILOT_MAX_TOTAL_MS || 10000),
    readiness_level: overrides?.readiness_level ?? readinessLevel(process.env.JUREMA_CUTOVER_READINESS_LEVEL),
  };
}

function hardLimits(overrides?: Partial<RuntimeHardLimits>): RuntimeHardLimits {
  return {
    max_recent_messages: overrides?.max_recent_messages ?? intEnv("JUREMA_MAX_RECENT_MESSAGES", 20),
    max_summary_chars: overrides?.max_summary_chars ?? intEnv("JUREMA_MAX_SUMMARY_CHARS", 2400),
    max_retrieval_chunks: overrides?.max_retrieval_chunks ?? intEnv("JUREMA_MAX_RETRIEVAL_CHUNKS", 6),
    max_doctrine_retrieval: overrides?.max_doctrine_retrieval ?? intEnv("JUREMA_MAX_DOCTRINE_RETRIEVAL", 2),
    max_metadata_chars: overrides?.max_metadata_chars ?? intEnv("JUREMA_MAX_METADATA_CHARS", 4000),
    max_context_chars: overrides?.max_context_chars ?? intEnv("JUREMA_MAX_CONTEXT_CHARS", 24000),
    max_orchestration_passes: overrides?.max_orchestration_passes ?? intEnv("JUREMA_MAX_ORCHESTRATION_PASSES", 2),
  };
}

export function loadRuntimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    databaseUrl: overrides.databaseUrl ?? clean(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL),
    redisUrl: overrides.redisUrl ?? clean(process.env.REDIS_URL),
    openaiApiKey: overrides.openaiApiKey ?? clean(process.env.OPENAI_API_KEY),
    openaiModel: overrides.openaiModel ?? (clean(process.env.JUREMA_OPENAI_MODEL) || "gpt-4.1"),
    simpleMode: overrides.simpleMode ?? boolEnv("JUREMA_SIMPLE_MODE", true),
    n8nBaseUrl: overrides.n8nBaseUrl ?? clean(process.env.N8N_BASE_URL),
    n8nApiKey: overrides.n8nApiKey ?? webhookSecret(),
    runtimeMode: overrides.runtimeMode ?? mode(process.env.JUREMA_RUNTIME_MODE || process.env.JU_RUNTIME_MODE),
    lockTtlMs: overrides.lockTtlMs ?? Number(process.env.JUREMA_RUNTIME_LOCK_TTL_MS || 45000),
    port: overrides.port ?? Number(process.env.JUREMA_RUNTIME_PORT || 3333),
    featureFlags: featureFlags(overrides.featureFlags),
    limits: hardLimits(overrides.limits),
    cost: {
      input_usd_per_1m_tokens: overrides.cost?.input_usd_per_1m_tokens ?? numberEnv("JUREMA_OPENAI_INPUT_USD_PER_1M_TOKENS", 2),
      output_usd_per_1m_tokens: overrides.cost?.output_usd_per_1m_tokens ?? numberEnv("JUREMA_OPENAI_OUTPUT_USD_PER_1M_TOKENS", 8),
    },
    behavioralQa: {
      phone: overrides.behavioralQa?.phone ?? clean(process.env.JU_BEHAVIORAL_QA_PHONE || "5583999990002"),
      tenant_id: overrides.behavioralQa?.tenant_id ?? clean(process.env.JU_BEHAVIORAL_QA_TENANT_ID),
    },
    toolWebhookUrls: {
      consultar_imoveis: overrides.toolWebhookUrls?.consultar_imoveis ?? toolUrl("consultar_imoveis"),
      atualizar_qualificacao: overrides.toolWebhookUrls?.atualizar_qualificacao ?? toolUrl("atualizar_qualificacao"),
      setar_lead_quente: overrides.toolWebhookUrls?.setar_lead_quente ?? toolUrl("setar_lead_quente"),
      conhecimento_estrategico_luana1: overrides.toolWebhookUrls?.conhecimento_estrategico_luana1 ?? toolUrl("conhecimento_estrategico_luana1"),
    },
  };
}

export function assertRuntimeConfig(config: RuntimeConfig): void {
  const missing: string[] = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL or SUPABASE_DB_URL");
  if (!config.redisUrl) missing.push("REDIS_URL");
  if (!config.openaiApiKey) missing.push("OPENAI_API_KEY");
  if (missing.length) {
    throw new Error(`Runtime config missing: ${missing.join(", ")}`);
  }
}
