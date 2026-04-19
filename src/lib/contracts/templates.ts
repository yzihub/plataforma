// ─── Contract Template Helpers ────────────────────────────────────────────────

import { CONTRACT_TEMPLATES, type ContractTemplate } from "@/types/contract-templates";

/**
 * Busca um template pelo id. Retorna null se não encontrado.
 */
export function getTemplate(id: string): ContractTemplate | null {
  return CONTRACT_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Substitui todos os placeholders {{key}} no body pelo valor correspondente em vars.
 * Se a variável não existir em vars, mantém o placeholder original.
 */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

/**
 * Formata um número como moeda BRL sem símbolo — ex: "1.500.000,00"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata uma data ISO como "DD/MM/AAAA"
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}
