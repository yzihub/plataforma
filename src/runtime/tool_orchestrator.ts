import type { CanonicalKernelDecision, CanonicalTool } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { RuntimeConfig } from "./types";
import type { ToolCallRequest, ToolCallResult } from "./types";
import { toolLatency } from "./observability";

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function toolPayload(tool: CanonicalTool, base: Record<string, unknown>, input: Record<string, unknown>): Record<string, unknown> {
  if (tool === "consultar_imoveis") {
    return {
      tenant_id: base.tenant_id,
      phone: base.phone ?? base.telefoneCompleto,
      bairro: input.bairro ?? base.bairro ?? base.location_preference,
      tipo_imovel: input.tipo_imovel ?? base.tipo_imovel ?? base.property_type,
      quartos: input.quartos ?? base.quartos ?? base.bedrooms,
      valor_max: input.valor_max ?? base.valor_max ?? base.budget_max,
    };
  }
  if (tool === "atualizar_qualificacao") {
    return { ...base, ...input };
  }
  if (tool === "setar_lead_quente") {
    return {
      tenant_id: base.tenant_id,
      phone: base.phone ?? base.telefoneCompleto,
      lead_id: base.lead_id,
      deal_id: base.deal_id,
      motivo: input.motivo ?? "visit_or_coffee_acceptance",
      localizacao_visita: input.localizacao_visita ?? "",
      observacao: input.observacao ?? "",
    };
  }
  return { ...base, ...input };
}

function boundString(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 25))}[truncated_by_runtime]`;
}

function boundToolOutput(value: unknown, config: RuntimeConfig): unknown {
  if (typeof value === "string") return boundString(value, config.limits.max_metadata_chars);
  if (Array.isArray(value)) return value.slice(0, config.limits.max_retrieval_chunks).map((item) => boundToolOutput(item, config));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const bounded: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (["cards", "imoveis", "properties", "items", "results", "chunks"].includes(key) && Array.isArray(item)) {
      bounded[key] = item.slice(0, config.limits.max_retrieval_chunks).map((entry) => boundToolOutput(entry, config));
      bounded[`${key}_truncated_by_runtime`] = item.length > config.limits.max_retrieval_chunks;
      continue;
    }
    if (key.toLowerCase().includes("doctrine") && Array.isArray(item)) {
      bounded[key] = item.slice(0, config.limits.max_doctrine_retrieval).map((entry) => boundToolOutput(entry, config));
      bounded[`${key}_truncated_by_runtime`] = item.length > config.limits.max_doctrine_retrieval;
      continue;
    }
    bounded[key] = boundToolOutput(item, config);
  }
  const serialized = JSON.stringify(bounded);
  if (serialized.length <= config.limits.max_metadata_chars) return bounded;
  return {
    runtime_truncated: true,
    original_chars: serialized.length,
    preview: boundString(serialized, config.limits.max_metadata_chars),
  };
}

export class ToolOrchestrator {
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly config: RuntimeConfig,
    fetchImpl?: FetchLike,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async execute(
    request: ToolCallRequest,
    decision: CanonicalKernelDecision,
    basePayload: Record<string, unknown>,
  ): Promise<ToolCallResult> {
    const started = Date.now();
    const tool = request.tool;
    try {
      if (!decision.allowed_tools.includes(tool)) {
        throw new Error(`Tool ${tool} is not allowed for ${decision.next_best_action}`);
      }
      const url = clean(this.config.toolWebhookUrls[tool]);
      if (!url) {
        throw new Error(`Tool webhook URL missing for ${tool}`);
      }
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.n8nApiKey ? { "X-N8N-API-KEY": this.config.n8nApiKey } : {}),
        },
        body: JSON.stringify(toolPayload(tool, basePayload, request.input)),
      });
      const text = await response.text();
      const output = text ? boundToolOutput(JSON.parse(text), this.config) : null;
      if (!response.ok) throw new Error(`Tool ${tool} HTTP ${response.status}: ${text.slice(0, 500)}`);
      const latency = Date.now() - started;
      toolLatency.labels(tool, "true").observe(latency);
      return { tool, ok: true, latency_ms: latency, output };
    } catch (error) {
      const latency = Date.now() - started;
      toolLatency.labels(tool, "false").observe(latency);
      return {
        tool,
        ok: false,
        latency_ms: latency,
        output: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
