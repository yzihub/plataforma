// ─── Contract Template Helpers ────────────────────────────────────────────────

import { CONTRACT_TEMPLATES, type ContractTemplate } from "@/types/contract-templates";

type MetadataValue = string | number | null | undefined;

export interface ImovelContratoData {
  titulo_comercial?: string | null;
  bairro?: string | null;
  descricao?: string | null;
  descricao_imovel?: string | null;
  descricao_juridica?: string | null;
  metadata?: Record<string, MetadataValue> | null;
}

export const IMOVEL_CONTRATO_PLACEHOLDER_MAP = {
  endereco_completo: "imovel_endereco",
  descricao_juridica: "imovel_descricao_juridica",
  matricula: "imovel_matricula",
  cartorio: "imovel_cartorio",
  area_privativa: "imovel_area_privativa",
  area_construida: "imovel_area_construida",
  area_terreno: "imovel_area_terreno",
  medidas_confrontacoes: "imovel_medidas_confrontacoes",
  inscricao_municipal: "imovel_inscricao_municipal",
  observacoes_contratuais: "imovel_observacoes_contratuais",
} as const;

function firstText(...values: MetadataValue[]): string | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getLegalDescription(imovel: ImovelContratoData | null | undefined): string | null {
  if (!imovel) return null;

  return firstText(
    imovel.metadata?.descricao_juridica,
    imovel.descricao_juridica,
    imovel.descricao,
    imovel.descricao_imovel,
  );
}

function composePropertyDescription(imovel: ImovelContratoData): string | null {
  const endereco = firstText(imovel.metadata?.endereco_completo);
  const areaPrivativa = firstText(imovel.metadata?.area_privativa);
  const areaConstruida = firstText(imovel.metadata?.area_construida);
  const areaTerreno = firstText(imovel.metadata?.area_terreno);
  const medidas = firstText(imovel.metadata?.medidas_confrontacoes);
  const matricula = firstText(imovel.metadata?.matricula);
  const cartorio = firstText(imovel.metadata?.cartorio);
  const inscricaoMunicipal = firstText(imovel.metadata?.inscricao_municipal);
  const observacoes = firstText(imovel.metadata?.observacoes_contratuais);
  const parts: string[] = [];

  if (endereco) parts.push(`Localizado em ${endereco}`);
  if (areaPrivativa) parts.push(`area privativa de ${areaPrivativa}`);
  if (areaConstruida) parts.push(`area construida de ${areaConstruida}`);
  if (areaTerreno) parts.push(`area do terreno de ${areaTerreno}`);
  if (medidas) parts.push(`medidas e confrontacoes: ${medidas}`);
  if (matricula) parts.push(`matricula ${matricula}`);
  if (cartorio) parts.push(`cartorio ${cartorio}`);
  if (inscricaoMunicipal) parts.push(`inscricao municipal/cadastro PMJP ${inscricaoMunicipal}`);
  if (observacoes) parts.push(observacoes);

  return parts.length > 0 ? `${parts.join(", ")}.` : null;
}

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
  return body
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
    .replace(/\s+\(\s*\)/g, "")
    .replace(/\s+([,.])/g, "$1");
}

export function hasDescricaoJuridicaImovelContrato(imovel: ImovelContratoData | null | undefined): boolean {
  return !!imovel && (getLegalDescription(imovel) !== null || composePropertyDescription(imovel) !== null);
}

export function getDescricaoImovelContrato(imovel: ImovelContratoData | null | undefined): string {
  if (!imovel) return "{{imovel}}";

  return (
    getLegalDescription(imovel) ??
    composePropertyDescription(imovel) ??
    firstText(imovel.titulo_comercial) ??
    "{{imovel}}"
  );
}

export function getImovelContratoPlaceholders(
  imovel: ImovelContratoData | null | undefined,
): Record<string, string> {
  const metadata = imovel?.metadata ?? {};
  const descricaoJuridica = getDescricaoImovelContrato(imovel);

  return {
    imovel: descricaoJuridica,
    imovel_nome: firstText(imovel?.titulo_comercial) ?? "",
    imovel_endereco: firstText(metadata.endereco_completo) ?? "",
    imovel_descricao_juridica: descricaoJuridica === "{{imovel}}" ? "" : descricaoJuridica,
    imovel_matricula: firstText(metadata.matricula) ?? "",
    imovel_cartorio: firstText(metadata.cartorio) ?? "",
    imovel_area_privativa: firstText(metadata.area_privativa) ?? "",
    imovel_area_construida: firstText(metadata.area_construida) ?? "",
    imovel_area_terreno: firstText(metadata.area_terreno) ?? "",
    imovel_medidas_confrontacoes: firstText(metadata.medidas_confrontacoes) ?? "",
    imovel_inscricao_municipal: firstText(metadata.inscricao_municipal) ?? "",
    imovel_observacoes_contratuais: firstText(metadata.observacoes_contratuais) ?? "",
  };
}

export function getMissingRequiredLegalFields(imovel: ImovelContratoData | null | undefined): string[] {
  const metadata = imovel?.metadata ?? {};
  const missing: string[] = [];

  if (!firstText(metadata.descricao_juridica, imovel?.descricao_juridica, imovel?.descricao, imovel?.descricao_imovel)) {
    missing.push("Descricao juridica");
  }
  if (!firstText(metadata.matricula)) missing.push("matricula");
  if (!firstText(metadata.cartorio)) missing.push("cartorio");

  return missing;
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
