import { describe, expect, it } from "vitest";
import { buildCanonicalKernelDecision } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { ToolOrchestrator } from "@/runtime/tool_orchestrator";
import type { RuntimeConfig } from "@/runtime/types";
import { canonicalParityFixtures } from "../ju-cognitive-kernel/canonical-fixtures";

function config(url: string): RuntimeConfig {
  return {
    databaseUrl: "postgres://local/test",
    redisUrl: "redis://localhost:6379",
    openaiApiKey: "test",
    openaiModel: "gpt-4.1",
    simpleMode: true,
    n8nBaseUrl: "https://n8n.local",
    runtimeMode: "shadow",
    lockTtlMs: 45000,
    port: 3333,
    featureFlags: {
      shadow_only: true,
      internal_only: false,
      pilot_group: false,
      pilot_stage: 0,
      percentage_rollout: 0,
      force_n8n: false,
      force_kernel: false,
      emergency_fallback: false,
      pilot_tenants: [],
      pilot_phones: [],
      pilot_leads: [],
      blocked_tenants: [],
      blocked_phones: [],
      blocked_leads: [],
      rollout_frozen: false,
      followup_only: false,
      inbound_only: false,
      max_orchestration_latency_ms: 8000,
      max_tool_latency_ms: 2500,
      max_total_latency_ms: 10000,
      readiness_level: 0,
    },
    limits: {
      max_recent_messages: 20,
      max_summary_chars: 2400,
      max_retrieval_chunks: 6,
      max_doctrine_retrieval: 2,
      max_metadata_chars: 4000,
      max_context_chars: 24000,
      max_orchestration_passes: 2,
    },
    cost: {
      input_usd_per_1m_tokens: 2,
      output_usd_per_1m_tokens: 8,
    },
    behavioralQa: {
      phone: "5583999990002",
      tenant_id: "11111111-1111-1111-1111-111111111111",
    },
    toolWebhookUrls: {
      consultar_imoveis: url,
    },
  };
}

describe("ToolOrchestrator", () => {
  it("executes consultar_imoveis only when allowed and maps compact payload", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const orchestrator = new ToolOrchestrator(config("https://n8n.local/webhook/consultar"), async (url, init) => {
      calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
      return new Response(JSON.stringify({ cards: [{ url: "https://juremabksimoveis.com.br/imoveis/1842/" }] }), { status: 200 });
    });
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const result = await orchestrator.execute(
      { tool: "consultar_imoveis", input: { bairro: "Bessa" } },
      decision,
      { tenant_id: "tenant", phone: "5583999999999", tipo_imovel: "apartamento", valor_max: 750000 },
    );

    expect(result.ok).toBe(true);
    expect(calls[0]).toMatchObject({
      url: "https://n8n.local/webhook/consultar",
      body: {
        tenant_id: "tenant",
        phone: "5583999999999",
        bairro: "Bessa",
        tipo_imovel: "apartamento",
        valor_max: 750000,
      },
    });
  });

  it("blocks orphan tool execution outside runtime governance", async () => {
    const orchestrator = new ToolOrchestrator(config("https://n8n.local/webhook/consultar"), async () => {
      throw new Error("should not call network");
    });
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_frio);
    const result = await orchestrator.execute({ tool: "consultar_imoveis", input: {} }, decision, {});

    expect(result.ok).toBe(false);
    expect(result.error).toContain("not allowed");
  });

  it("bounds retrieval output deterministically before returning tool results", async () => {
    const orchestrator = new ToolOrchestrator(config("https://n8n.local/webhook/consultar"), async () => {
      return new Response(JSON.stringify({
        cards: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, description: "x".repeat(50) })),
      }), { status: 200 });
    });
    const decision = buildCanonicalKernelDecision(canonicalParityFixtures.lead_quente);
    const result = await orchestrator.execute({ tool: "consultar_imoveis", input: {} }, decision, {});

    expect(result.ok).toBe(true);
    expect((result.output as { cards: unknown[] }).cards).toHaveLength(6);
    expect((result.output as { cards_truncated_by_runtime: boolean }).cards_truncated_by_runtime).toBe(true);
  });
});
