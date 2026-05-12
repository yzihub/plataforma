const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseBRLMoney(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") return 0;

  const cleaned = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBRLMoney(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return BRL_FORMATTER.format(normalized);
}

export function normalizeContractFinancialMetadata(
  metadata: Record<string, unknown> | null | undefined,
  value: number,
) {
  const base = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : {};

  return {
    ...base,
    valor_total: formatBRLMoney(value),
  };
}

