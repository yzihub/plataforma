"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/crm/types";
import {
  getDescricaoImovelContrato,
  getImovelContratoPlaceholders,
  getMissingRequiredLegalFields,
  renderTemplate,
  type ImovelContratoData,
} from "@/lib/contracts/templates";
import {
  getJuremaContractTemplate,
  getJuremaContractTemplateOptions,
  type JuremaContractTemplateKey,
} from "@/lib/jurema/contract-templates";
import { formatBRLMoney, parseBRLMoney } from "@/lib/contracts/money";
import ContratoEditorSidebar from "./ContratoEditorSidebar";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface TemplateOption {
  id: JuremaContractTemplateKey;
  label: string;
  type: string;
  templateFileId: string;
  placeholders: string[];
  body: string;
}

interface PropertyData extends ImovelContratoData {
  id: string;
  id_imovel?: string | null;
  referencia_unica?: string | null;
  titulo_comercial: string;
  bairro: string | null;
  valor: number;
  descricao_imovel?: string | null;
  descricao?: string | null;
  descricao_juridica?: string | null;
  metadata?: Record<string, string | number | null | undefined> | null;
}

interface BrokerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ContratoEditorProps {
  contractId: string | null;
  leadId: string | null;
  propertyId: string | null;
  brokerId: string | null;
}

type ContractSeed = {
  id: string;
  lead_id: string | null;
  imovel_id: string | null;
  project_id?: string | null;
  broker_id: string | null;
  lead_name: string | null;
  project_name: string | null;
  corretor_name: string | null;
  value: number | null;
  type?: string | null;
  conteudo?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ContractMetadataData = {
  vendedor_qualificacao: string;
  comprador_qualificacao: string;
  vendedor_nome: string;
  comprador_nome: string;
  imovel_descricao_juridica: string;
  imovel_caracteristicas: string;
  imovel_matricula: string;
  imovel_cartorio: string;
  bens_inclusos: string;
  observacoes_especificas: string;
  valor_total: string;
  valor_total_extenso: string;
  forma_pagamento: string;
  meio_pagamento: string;
  dados_bancarios_vendedor: string;
  condicao_entrega_chaves: string;
  comissao_descricao: string;
  multa_rescisoria: string;
  cidade: string;
  foro: string;
  data_contrato: string;
  testemunha_1_nome: string;
  testemunha_2_nome: string;
};

const OFFICIAL_CONTRACT_FIELDS = [
  "vendedor_qualificacao",
  "comprador_qualificacao",
  "vendedor_nome",
  "comprador_nome",
  "imovel_descricao_juridica",
  "imovel_caracteristicas",
  "imovel_matricula",
  "imovel_cartorio",
  "bens_inclusos",
  "observacoes_especificas",
  "valor_total",
  "valor_total_extenso",
  "forma_pagamento",
  "meio_pagamento",
  "dados_bancarios_vendedor",
  "condicao_entrega_chaves",
  "comissao_descricao",
  "multa_rescisoria",
  "cidade",
  "foro",
  "data_contrato",
  "testemunha_1_nome",
  "testemunha_2_nome",
] as const satisfies readonly (keyof ContractMetadataData)[];

const EMPTY_CONTRACT_METADATA: ContractMetadataData = {
  vendedor_qualificacao: "",
  comprador_qualificacao: "",
  vendedor_nome: "",
  comprador_nome: "",
  imovel_descricao_juridica: "",
  imovel_caracteristicas: "",
  imovel_matricula: "",
  imovel_cartorio: "",
  bens_inclusos: "",
  observacoes_especificas: "",
  valor_total: "",
  valor_total_extenso: "",
  forma_pagamento: "",
  meio_pagamento: "",
  dados_bancarios_vendedor: "",
  condicao_entrega_chaves: "",
  comissao_descricao: "",
  multa_rescisoria: "",
  cidade: "",
  foro: "",
  data_contrato: "",
  testemunha_1_nome: "",
  testemunha_2_nome: "",
};

function extractCorretores(data: unknown): BrokerData[] {
  if (Array.isArray(data)) return data as BrokerData[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.data)) return d.data as BrokerData[];
  if (Array.isArray(d?.brokers)) return d.brokers as BrokerData[];
  if (Array.isArray(d?.corretores)) return d.corretores as BrokerData[];
  return [];
}

// ─── Variáveis disponíveis para substituição no template ──────────────────────

function uuidOrNull(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildDraftTitle(leadName: string | null) {
  return leadName ? `Rascunho - ${leadName}` : "Rascunho de contrato";
}

function textFromMetadata(metadata: Record<string, unknown> | null | undefined, key: keyof ContractMetadataData) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getContractMetadataFromRecord(metadata: Record<string, unknown> | null | undefined): ContractMetadataData {
  return OFFICIAL_CONTRACT_FIELDS.reduce<ContractMetadataData>(
    (acc, key) => ({ ...acc, [key]: textFromMetadata(metadata, key) }),
    { ...EMPTY_CONTRACT_METADATA },
  );
}

function hasContractMetadataSnapshot(metadata: Record<string, unknown> | null | undefined) {
  return !!metadata && OFFICIAL_CONTRACT_FIELDS.some((key) => Object.prototype.hasOwnProperty.call(metadata, key));
}

function buildContractMetadataSnapshot(data: ContractMetadataData) {
  return Object.fromEntries(
    OFFICIAL_CONTRACT_FIELDS.map((key) => [key, data[key].trim()])
  );
}

function metadataText(metadata: Record<string, string | number | null | undefined> | null | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value : "";
}

function getTemplateType(templateKey: string | null): TemplateOption["type"] {
  if (templateKey === "locacao_residencial") return "locacao";
  if (templateKey === "honorarios_corretagem") return "servico";
  return "venda";
}

function isOfficialTemplateFileId(value: string | null | undefined) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,}$/.test(value) && !value.startsWith("ID_");
}

function getMissingRequiredPlaceholders(body: string, placeholders: string[]) {
  return placeholders.filter((placeholder) => !body.includes(`{{${placeholder}}}`));
}

function formatMissingPlaceholdersMessage(missingPlaceholders: string[]) {
  return `Este modelo perdeu campos obrigatórios: ${missingPlaceholders
    .map((placeholder) => `{{${placeholder}}}`)
    .join(", ")}. Revise antes de salvar ou enviar.`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const modalInputCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 shadow-theme-xs outline-none transition-colors placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-3 focus:ring-brand-500/10 dark:border-[#2A3856] dark:bg-[#17233A] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500/60 dark:focus:bg-[#1A2740] dark:focus:ring-brand-500/15";

function ContractField({
  label,
  fieldName,
  description,
  example,
  value,
  onChange,
  rows = 1,
  placeholder,
  textareaClassName = "",
}: {
  label: string;
  fieldName?: string;
  description?: string;
  example?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  textareaClassName?: string;
}) {
  const [exampleOpen, setExampleOpen] = useState(false);

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <label className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
          {description && (
            <span
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[10px] font-semibold text-slate-400 dark:border-[#2A3856] dark:text-slate-500"
              title={description}
              aria-label={description}
            >
              ?
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {example && (
            <button
              type="button"
              onClick={() => setExampleOpen((prev) => !prev)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-500 dark:text-slate-500 dark:hover:bg-white/[0.04] dark:hover:text-slate-300"
              aria-label={`Ver exemplo de ${label}`}
              title="Ver exemplo"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
          )}
          {fieldName && (
            <code className="hidden rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-[#17233A] dark:text-slate-500 sm:inline">
              {fieldName}
            </code>
          )}
        </div>
      </div>
      {rows > 1 ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={[modalInputCls, "h-auto min-h-[112px] resize-y leading-relaxed", textareaClassName].filter(Boolean).join(" ")} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={modalInputCls} />
      )}
      {example && exampleOpen && (
        <div className="absolute right-0 top-8 z-30 w-[min(360px,calc(100vw-48px))] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-[#2A3856] dark:bg-[#111C2F]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-medium text-slate-700 dark:text-slate-200">Exemplo</span>
            <button type="button" onClick={() => setExampleOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              Fechar
            </button>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-400">{example}</p>
        </div>
      )}
    </div>
  );
}

function CurrencyField({
  label,
  fieldName,
  description,
  value,
  onChange,
  preview,
}: {
  label: string;
  fieldName?: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  preview?: string;
}) {
  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <label className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
          {description && (
            <span
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[10px] font-semibold text-slate-400 dark:border-[#2A3856] dark:text-slate-500"
              title={description}
              aria-label={description}
            >
              ?
            </span>
          )}
        </div>
        {fieldName && (
          <code className="hidden rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-[#17233A] dark:text-slate-500 sm:inline">
            {fieldName}
          </code>
        )}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="R$ 0,00"
        className={modalInputCls}
      />
      {preview && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {preview}
        </p>
      )}
    </div>
  );
}

function ContractSection({
  title,
  desc,
  children,
  open = true,
  onToggle,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#263653] dark:bg-[#111C2F]">
      <div className="px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <div className="min-w-0">
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">{title}</h3>
            {desc && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>}
          </div>
          <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#17233A] dark:text-slate-400">
            {open ? "Aberto" : "Fechado"}
          </span>
        </button>
      </div>
      {open && <div className="border-t border-slate-100 p-5 dark:border-[#263653] sm:p-6">{children}</div>}
    </section>
  );
}

function ContractDataModal({
  isOpen,
  data,
  value,
  onChange,
  onValueChange,
  onSave,
  saveState,
  summaryItems,
  filledContractFields,
  totalContractFields,
  hasMissingRequiredLegalFields,
  alertMessage,
  showCloseButton = true,
  onClose,
}: {
  isOpen: boolean;
  data: ContractMetadataData;
  value: string;
  onChange: (value: ContractMetadataData) => void;
  onValueChange: (value: string) => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
  summaryItems: Array<{ label: string; value: string }>;
  filledContractFields: number;
  totalContractFields: number;
  hasMissingRequiredLegalFields: boolean;
  alertMessage: string | null;
  showCloseButton?: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  const setField = (field: keyof ContractMetadataData, value: string) => onChange({ ...data, [field]: value });
  const [activeSection, setActiveSection] = useState<"partes" | "imovel" | "negociacao" | "juridico">("partes");

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#263653] dark:bg-[#0F172A]">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-[#263653]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Dados contratuais</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Partes formais, dados juridicos do imovel e negociacao.</p>
          </div>
          <div className="flex items-center gap-2">
            {saveState === "saved" && <span className="text-sm text-emerald-600 dark:text-emerald-400">Salvo</span>}
            {saveState === "error" && <span className="text-sm text-red-500 dark:text-red-400">Erro ao salvar</span>}
            <button
              type="button"
              onClick={onSave}
              disabled={saveState === "saving"}
              className="inline-flex min-w-24 items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveState === "saving" ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Salvando...
                </>
              ) : "Salvar"}
            </button>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-[#2A3856] dark:text-slate-300 dark:hover:bg-[#17233A]"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 px-6 py-3 dark:border-[#263653]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-36 rounded-full bg-slate-100 dark:bg-[#17233A]">
              <div
                className="h-1.5 rounded-full bg-brand-500 transition-all"
                style={{ width: `${Math.round((filledContractFields / totalContractFields) * 100)}%` }}
              />
            </div>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {filledContractFields}/{totalContractFields} campos preenchidos
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium ${
              hasMissingRequiredLegalFields
                ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            }`}
          >
            {hasMissingRequiredLegalFields ? "Campos juridicos pendentes" : "Contrato juridico consistente"}
          </span>
          {alertMessage && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              {alertMessage}
            </span>
          )}
        </div>
      </div>

      <div className="w-full max-w-none bg-white px-4 py-6 dark:bg-[#0F172A] sm:px-6 lg:px-8">
        <div className="w-full max-w-none">
          <main className="w-full max-w-none space-y-6">
            <ContractSection
              title="Partes contratuais"
              desc="Qualificacao formal de quem assina o instrumento."
              open={activeSection === "partes"}
              onToggle={() => setActiveSection("partes")}
            >
              <div className="grid w-full items-start gap-6 grid-cols-1 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-[#263653] dark:bg-[#0F1A2D] sm:p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Promitente vendedor</p>
                  <div className="space-y-5">
                    <ContractField label="Nome do vendedor" fieldName="vendedor_nome" value={data.vendedor_nome} onChange={(v) => setField("vendedor_nome", v)} />
                    <ContractField
                      label="Qualificacao completa do vendedor"
                      fieldName="vendedor_qualificacao"
                      description="Preencha a qualificacao juridica completa do vendedor conforme documento oficial."
                      example="MARIA HELENA VICENTE FERREIRA, brasileira, casada, empresaria, portadora do RG no 555457 SSP/PB, inscrita no CPF sob o no 219.067.854-49, residente e domiciliada na Rua das Acacias, no 120, Jardim Oceania, Joao Pessoa/PB."
                      value={data.vendedor_qualificacao}
                      onChange={(v) => setField("vendedor_qualificacao", v)}
                      rows={6}
                      placeholder="Nome completo, nacionalidade, estado civil, profissao, RG, CPF e endereco completo."
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-[#263653] dark:bg-[#0F1A2D] sm:p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Promissario comprador</p>
                  <div className="space-y-5">
                    <ContractField label="Nome do comprador" fieldName="comprador_nome" value={data.comprador_nome} onChange={(v) => setField("comprador_nome", v)} />
                    <ContractField
                      label="Qualificacao completa do comprador"
                      fieldName="comprador_qualificacao"
                      description="Informe a qualificacao formal de quem assina como comprador ou promissario comprador."
                      example="JOAO CARLOS ALMEIDA, brasileiro, solteiro, engenheiro civil, portador do RG no 3214567 SSP/PB, inscrito no CPF sob o no 123.456.789-10, residente e domiciliado na Avenida Epitacio Pessoa, no 900, Tambau, Joao Pessoa/PB."
                      value={data.comprador_qualificacao}
                      onChange={(v) => setField("comprador_qualificacao", v)}
                      rows={6}
                      placeholder="Nome completo, nacionalidade, estado civil, profissao, RG, CPF e endereco completo."
                    />
                  </div>
                </div>
              </div>
            </ContractSection>
            <ContractSection
              title="Dados do imovel"
              desc="Dados registrais, caracteristicas e observacoes que compoem o objeto do contrato."
              open={activeSection === "imovel"}
              onToggle={() => setActiveSection("imovel")}
            >
              <div className="grid w-full items-start gap-6 grid-cols-1 xl:grid-cols-2">
                <div className="xl:col-span-2">
                  <ContractField
                    label="Descricao juridica do imovel"
                    fieldName="imovel_descricao_juridica"
                    description="Use a descricao registral ou uma descricao objetiva suficiente para individualizar o imovel no contrato."
                    example="Apartamento residencial no 501, situado no Edificio Solar do Atlantico, localizado na Avenida Cabo Branco, no 1500, Cabo Branco, Joao Pessoa/PB, com area privativa de 82,50 m2, composto por sala, varanda, tres quartos, cozinha, area de servico e duas vagas de garagem, conforme matricula no 12.345 do 1o Cartorio de Registro de Imoveis de Joao Pessoa/PB."
                    value={data.imovel_descricao_juridica}
                    onChange={(v) => setField("imovel_descricao_juridica", v)}
                    rows={5}
                  />
                </div>
                <ContractField label="Matricula" fieldName="imovel_matricula" value={data.imovel_matricula} onChange={(v) => setField("imovel_matricula", v)} />
                <ContractField label="Cartorio" fieldName="imovel_cartorio" value={data.imovel_cartorio} onChange={(v) => setField("imovel_cartorio", v)} />
                <ContractField
                  label="Caracteristicas relevantes"
                  fieldName="imovel_caracteristicas"
                  description="Liste caracteristicas que impactam a negociacao ou devem constar no contrato."
                  example="Imovel com tres quartos, sendo uma suite, sala para dois ambientes, varanda gourmet, cozinha planejada, area de servico, duas vagas cobertas e posicao nascente."
                  value={data.imovel_caracteristicas}
                  onChange={(v) => setField("imovel_caracteristicas", v)}
                  rows={3}
                />
                <ContractField
                  label="Bens inclusos"
                  fieldName="bens_inclusos"
                  description="Informe itens que acompanham o imovel na negociacao."
                  value={data.bens_inclusos}
                  onChange={(v) => setField("bens_inclusos", v)}
                  rows={3}
                />
                <div className="xl:col-span-2">
                  <ContractField
                    label="Observacoes especificas"
                    fieldName="observacoes_especificas"
                    description="Registre condicoes particulares que precisam aparecer no contrato e nao se encaixam nos demais campos."
                    example="O imovel sera entregue com moveis planejados da cozinha e dos quartos, aparelhos de ar-condicionado instalados e luminarias existentes, no estado em que se encontra na data da vistoria."
                    value={data.observacoes_especificas}
                    onChange={(v) => setField("observacoes_especificas", v)}
                    rows={3}
                  />
                </div>
              </div>
            </ContractSection>
            <ContractSection
              title="Negociacao"
              desc="Valores, pagamento, entrega das chaves, comissao e penalidades."
              open={activeSection === "negociacao"}
              onToggle={() => setActiveSection("negociacao")}
            >
              <div className="grid w-full items-start gap-6 grid-cols-1 xl:grid-cols-2">
                <CurrencyField
                  label="Valor total"
                  fieldName="valor_total"
                  description="Fonte oficial financeira do contrato. Este valor vai para contracts.value."
                  value={value}
                  onChange={(nextValue) => {
                    onValueChange(nextValue);
                    setField("valor_total", nextValue.trim() ? formatBRLMoney(parseBRLMoney(nextValue)) : "");
                  }}
                  preview={`Persistido em contracts.value: ${value ? formatBRLMoney(parseBRLMoney(value)) : "R$ 0,00"}`}
                />
                <ContractField label="Valor por extenso" fieldName="valor_total_extenso" value={data.valor_total_extenso} onChange={(v) => setField("valor_total_extenso", v)} />
                <div className="xl:col-span-2">
                  <ContractField
                    label="Forma de pagamento"
                    fieldName="forma_pagamento"
                    description="Descreva parcelas, sinal, financiamento, vencimentos e responsaveis por cada pagamento."
                    example="O preco sera pago da seguinte forma: sinal de R$ 50.000,00 no ato da assinatura deste instrumento, mediante transferencia bancaria ao vendedor, e saldo de R$ 450.000,00 por meio de financiamento bancario a ser contratado pelo comprador junto a instituicao financeira de sua escolha."
                    value={data.forma_pagamento}
                    onChange={(v) => setField("forma_pagamento", v)}
                    rows={4}
                  />
                </div>
                <ContractField
                  label="Meio de pagamento"
                  fieldName="meio_pagamento"
                  description="Indique o canal ou instrumento usado para pagamento."
                  example="Transferencia bancaria identificada, PIX para chave CPF do vendedor e financiamento imobiliario com liberacao direta ao vendedor."
                  value={data.meio_pagamento}
                  onChange={(v) => setField("meio_pagamento", v)}
                />
                <ContractField
                  label="Dados bancarios do vendedor"
                  fieldName="dados_bancarios_vendedor"
                  description="Informe os dados bancarios que devem constar para pagamento ao vendedor."
                  example="Banco do Brasil, agencia 1234-5, conta corrente 98765-4, titular MARIA HELENA VICENTE FERREIRA, CPF 219.067.854-49, PIX maria.helena@email.com."
                  value={data.dados_bancarios_vendedor}
                  onChange={(v) => setField("dados_bancarios_vendedor", v)}
                  rows={3}
                />
                <ContractField
                  label="Condicao de entrega das chaves"
                  fieldName="condicao_entrega_chaves"
                  description="Defina quando e sob quais condicoes o comprador recebera as chaves."
                  example="As chaves serao entregues ao comprador em ate 5 dias uteis apos a quitacao integral do preco e comprovacao da transferencia dos valores ao vendedor."
                  value={data.condicao_entrega_chaves}
                  onChange={(v) => setField("condicao_entrega_chaves", v)}
                />
                <ContractField
                  label="Multa rescisoria"
                  fieldName="multa_rescisoria"
                  description="Descreva a penalidade em caso de descumprimento ou rescisao imotivada."
                  example="Em caso de rescisao imotivada por qualquer das partes, incidira multa equivalente a 10% do valor total do contrato, sem prejuizo de perdas e danos comprovados."
                  value={data.multa_rescisoria}
                  onChange={(v) => setField("multa_rescisoria", v)}
                />
                <div className="xl:col-span-2">
                  <ContractField
                    label="Descricao da comissao"
                    fieldName="comissao_descricao"
                    description="Explique quem paga a comissao, valor ou percentual, prazo e forma de pagamento."
                    example="A comissao de corretagem sera de 5% sobre o valor total da venda, devida pelo vendedor a YZI IMOB, com pagamento no ato da assinatura da escritura definitiva ou na liberacao do financiamento, o que ocorrer primeiro."
                    value={data.comissao_descricao}
                    onChange={(v) => setField("comissao_descricao", v)}
                    rows={3}
                  />
                </div>
              </div>
            </ContractSection>
            <ContractSection
              title="Juridico e fechamento"
              desc="Foro, data e testemunhas para assinatura."
              open={activeSection === "juridico"}
              onToggle={() => setActiveSection("juridico")}
            >
              <div className="grid w-full items-start gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                <ContractField label="Cidade" fieldName="cidade" value={data.cidade} onChange={(v) => setField("cidade", v)} />
                <ContractField label="Foro" fieldName="foro" value={data.foro} onChange={(v) => setField("foro", v)} />
                <ContractField label="Data do contrato" fieldName="data_contrato" value={data.data_contrato} onChange={(v) => setField("data_contrato", v)} />
                <div className="sm:col-span-2 xl:col-span-3">
                  <div className="grid w-full items-start gap-6 grid-cols-1 xl:grid-cols-2">
                    <ContractField label="Testemunha 1" fieldName="testemunha_1_nome" value={data.testemunha_1_nome} onChange={(v) => setField("testemunha_1_nome", v)} />
                    <ContractField label="Testemunha 2" fieldName="testemunha_2_nome" value={data.testemunha_2_nome} onChange={(v) => setField("testemunha_2_nome", v)} />
                  </div>
                </div>
              </div>
            </ContractSection>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ContratoEditor({ contractId, leadId, propertyId, brokerId }: ContratoEditorProps) {
  const router = useRouter();
  const mountedRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // rawBody = template com {{vars}} visíveis — o que o usuário edita
  const [rawBody, setRawBody]                   = useState("");
  const [templates]                             = useState<TemplateOption[]>(
    () => getJuremaContractTemplateOptions().map((template) => ({
      id: template.key,
      label: template.label,
      type: getTemplateType(template.key),
      templateFileId: template.templateFileId,
      placeholders: template.placeholders,
      body: template.body,
    }))
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [selectedTemplateFileId, setSelectedTemplateFileId] = useState("");
  const [lead, setLead]                         = useState<Lead | null>(null);
  const [property, setProperty]                 = useState<PropertyData | null>(null);
  const [broker, setBroker]                     = useState<BrokerData | null>(null);
  const [contractMetadata, setContractMetadata] = useState<ContractMetadataData>(EMPTY_CONTRACT_METADATA);
  const [metadataSnapshotLoaded, setMetadataSnapshotLoaded] = useState(false);
  const [contractDataOpen, setContractDataOpen] = useState(false);
  const [contractValueInput, setContractValueInput] = useState("");
  const [contractValueTouched, setContractValueTouched] = useState(false);

  const [loading, setLoading]                   = useState(true);
  const [uploadLoading, setUploadLoading]       = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [successMessage, setSuccessMessage]     = useState<string | null>(null);
  const [saveState, setSaveState]               = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting]             = useState(false);
  const [draftId, setDraftId]                   = useState<string | null>(null);
  const [canalEmail, setCanalEmail]             = useState(true);
  const [canalWhatsapp, setCanalWhatsapp]       = useState(true);

  function handleContractValueChange(nextValue: string) {
    setContractValueTouched(true);
    if (!nextValue.trim()) {
      setContractValueInput("");
      setContractMetadata((prev) => ({ ...prev, valor_total: "" }));
      return;
    }

    const formatted = formatBRLMoney(parseBRLMoney(nextValue));
    setContractValueInput(formatted);
    setContractMetadata((prev) => ({ ...prev, valor_total: formatted }));
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const descricaoImovelContrato = useMemo(
    () => getDescricaoImovelContrato(property),
    [property]
  );
  const contractFinancialValue = useMemo(() => parseBRLMoney(contractValueInput), [contractValueInput]);
  const contractValueDisplay = useMemo(
    () => (contractFinancialValue > 0 ? formatBRLMoney(contractFinancialValue) : ""),
    [contractFinancialValue],
  );

  // Mapa de variáveis resolvidas — atualizado sempre que lead/property/broker mudar
  const vars: Record<string, string> = useMemo(() => {
    const value = contractFinancialValue > 0 ? contractFinancialValue : property?.valor ?? lead?.value ?? 0;
    const imovelPlaceholders = getImovelContratoPlaceholders(property);
    return {
      comprador:     lead?.name ?? "{{comprador}}",
      lead_nome:     lead?.name ?? "{{lead_nome}}",
      comprador_qualificacao: lead?.name ?? "",
      vendedor_qualificacao: "",
      imovel:        descricaoImovelContrato,
      corretor:      broker?.name ?? "{{corretor}}",
      corretor_nome: broker?.name ?? "{{corretor_nome}}",
      ...Object.fromEntries(Object.entries(contractMetadata).map(([key, value]) => [key, value.trim()])),
      ...imovelPlaceholders,
      valor:         formatBRLMoney(value),
      valor_total:   formatBRLMoney(value),
      comissao:      formatBRLMoney(value * 0.05),
      data:          new Date().toLocaleDateString("pt-BR"),
      data_contrato: new Date().toLocaleDateString("pt-BR"),
      valor_extenso: "",
      id_imovel:     property?.id ?? "{{id_imovel}}",
      bairro:        property?.bairro ?? "",
    };
  }, [lead, property, broker, descricaoImovelContrato, contractMetadata, contractFinancialValue]);

  const missingRequiredLegalFields = useMemo(
    () => getMissingRequiredLegalFields(property),
    [property]
  );
  const hasMissingRequiredLegalFields = missingRequiredLegalFields.length > 0;
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );
  const officialTemplateFileId = selectedTemplateFileId || selectedTemplate?.templateFileId || "";
  const hasOfficialTemplate = isOfficialTemplateFileId(officialTemplateFileId);
  const selectedTemplatePlaceholders = selectedTemplate?.placeholders ?? [];

  useEffect(() => {
    if (contractValueTouched) return;
    const sourceValue = property?.valor ?? lead?.value ?? 0;
    if (sourceValue > 0 && !contractValueInput) {
      setContractValueInput(formatBRLMoney(sourceValue));
    }
  }, [contractValueTouched, contractValueInput, property?.valor, lead?.value]);

  // renderedBody = rawBody com vars substituídas — usado no preview e no generate
  const renderedBody = useMemo(
    () => (rawBody ? renderTemplate(rawBody, vars) : ""),
    [rawBody, vars]
  );

  function buildConteudoFinal() {
    const contractBody = renderedBody;
    const body = rawBody;
    const html = "";
    const previewHtml = "";

    return [body, renderedBody, contractBody, html, previewHtml]
      .map((value) => value.trim())
      .find((value) => value.length > 0) ?? "";
  }

  // ── Carregar dados iniciais em paralelo ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      const tasks: Promise<void>[] = [];

      let resolvedLeadId = leadId;
      let resolvedPropertyId = propertyId;
      let resolvedBrokerId = brokerId;

      if (contractId) {
        try {
          const contract = await fetch(`/api/contracts/${contractId}`).then((r) => r.ok ? r.json() : null) as ContractSeed | null;
          if (contract?.id && !cancelled) {
            resolvedLeadId = contract.lead_id ?? resolvedLeadId;
            resolvedPropertyId = contract.imovel_id ?? contract.project_id ?? resolvedPropertyId;
            resolvedBrokerId = contract.broker_id ?? resolvedBrokerId;
            setContractMetadata(getContractMetadataFromRecord(contract.metadata));
            setMetadataSnapshotLoaded(hasContractMetadataSnapshot(contract.metadata));
            setDraftId(contract.id);
            const legacyMetadataValue = textFromMetadata(contract.metadata, "valor_total");
            const contractValue = contract.value ?? parseBRLMoney(legacyMetadataValue);
            setContractValueInput(contractValue > 0 ? formatBRLMoney(contractValue) : "");
            setContractValueTouched(false);

            if (contract.lead_name && !resolvedLeadId) {
              setLead({ id: "", name: contract.lead_name, value: contract.value ?? 0 } as Lead);
            }
            if ((contract.project_name || contract.value) && !resolvedPropertyId) {
              setProperty({
                id: "",
                titulo_comercial: contract.project_name ?? "Imovel vinculado",
                bairro: null,
                valor: contract.value ?? 0,
              });
            }
            if (contract.corretor_name && !resolvedBrokerId) {
              setBroker({ id: "", name: contract.corretor_name, email: null, phone: null });
            }
            if (contract.conteudo || contract.notes) {
              setRawBody(contract.conteudo ?? contract.notes ?? "");
            } else {
              const templateId =
                contract.type === "locacao" ? "locacao_residencial" :
                contract.type === "servico" ? "honorarios_corretagem" :
                "compra_venda_padrao";
              const template = getJuremaContractTemplate(templateId);
              setSelectedTemplateId(templateId);
              setSelectedTemplateName(template?.label ?? "");
              setSelectedTemplateFileId(template?.templateFileId ?? "");
              setRawBody(template?.body ?? "");
            }
          }
        } catch {
          // fallback silencioso para os parametros diretos
        }
      }

      if (resolvedLeadId) {
        tasks.push(
          fetch(`/api/leads/${resolvedLeadId}`)
            .then((r) => r.json())
            .then((d) => { if (!cancelled && d.id) setLead(d as Lead); })
            .catch(() => {})
        );
      }

      if (resolvedPropertyId) {
        tasks.push(
          fetch(`/api/imoveis/${resolvedPropertyId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (!cancelled && d?.id) setProperty(d as PropertyData); })
            .catch(() => {})
        );
      }

      if (resolvedBrokerId) {
        tasks.push(
          fetch(`/api/corretores`)
            .then((r) => r.json())
            .then((d) => {
              const list = extractCorretores(d);
              const found = list.find((c) => c.id === resolvedBrokerId);
              if (!cancelled && found) setBroker(found);
            })
            .catch(() => {})
        );
      }

      await Promise.all(tasks);
      if (!cancelled) setLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, [contractId, leadId, propertyId, brokerId]);

  useEffect(() => {
    if (metadataSnapshotLoaded) return;

    const metadata = property?.metadata ?? null;
    const value = contractFinancialValue > 0 ? contractFinancialValue : property?.valor ?? lead?.value ?? 0;
    const today = new Date().toLocaleDateString("pt-BR");
    const imovelPlaceholders = getImovelContratoPlaceholders(property);

    const defaults: Partial<ContractMetadataData> = {
      comprador_nome: lead?.name ?? "",
      imovel_descricao_juridica: imovelPlaceholders.imovel_descricao_juridica || descricaoImovelContrato,
      imovel_caracteristicas: metadataText(metadata, "caracteristicas") || metadataText(metadata, "observacoes_contratuais"),
      imovel_matricula: metadataText(metadata, "matricula"),
      imovel_cartorio: metadataText(metadata, "cartorio"),
      bens_inclusos: metadataText(metadata, "bens_inclusos"),
      observacoes_especificas: metadataText(metadata, "observacoes_especificas"),
      valor_total: value > 0 ? formatBRLMoney(value) : "",
      comissao_descricao: value > 0 ? `Honorarios de corretagem de ${formatBRLMoney(value * 0.05)}.` : "",
      cidade: metadataText(metadata, "cidade") || "Joao Pessoa/PB",
      foro: metadataText(metadata, "foro") || "Joao Pessoa/PB",
      data_contrato: today,
      vendedor_nome: metadataText(metadata, "vendedor_nome"),
      vendedor_qualificacao: metadataText(metadata, "vendedor_qualificacao"),
      comprador_qualificacao: "",
    };

    setContractMetadata((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(defaults) as [keyof ContractMetadataData, string][]) {
        if (!next[key] && value) next[key] = value;
      }
      return next;
    });
  }, [lead?.name, lead?.value, property, descricaoImovelContrato, metadataSnapshotLoaded, contractFinancialValue]);

  // ── Callbacks para seleção na sidebar ─────────────────────────────────────
  const handleSelectLead     = useCallback((l: Lead | null)         => setLead(l), []);
  const handleSelectProperty = useCallback((p: PropertyData | null) => setProperty(p), []);
  const handleSelectBroker   = useCallback((b: BrokerData | null)   => setBroker(b), []);

  // ── Carregar template interno (raw — sem substituição) ─────────────────────
  const handleSelectTemplate = useCallback((templateId: string) => {
    const template = getJuremaContractTemplate(templateId);
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(template?.label ?? "");
    setSelectedTemplateFileId(template?.templateFileId ?? "");
    setRawBody(template?.body ?? "");
    setError(null);
  }, []);

  // ── Upload de .docx → extrai texto via API ────────────────────────────────
  const handleUploadDocx = useCallback(async (file: File) => {
    setUploadLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/contracts/extract-docx", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao processar o arquivo."); return; }
      setRawBody(data.text ?? "");
      setSelectedTemplateId("");
      setSelectedTemplateName("");
      setSelectedTemplateFileId("");
    } catch {
      setError("Erro ao processar o arquivo.");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  // ── Salvar rascunho ────────────────────────────────────────────────────────
  async function handleSaveDraft(): Promise<string | null> {
    if (!lead || !property || !broker) {
      setError("Lead, imóvel e corretor são obrigatórios para salvar o rascunho.");
      return null;
    }
    const value = contractFinancialValue > 0 ? contractFinancialValue : property?.valor ?? lead?.value ?? 0;
    if (value <= 0) { setError("O imóvel ou lead precisa ter um valor definido."); return null; }

    setSubmitting(true);
    setSaveState("saving");
    setError(null);
    setSuccessMessage(null);

    try {
      const conteudo = buildConteudoFinal();
      const endpoint = "/api/contracts/draft";

      if (!conteudo && !hasOfficialTemplate) {
        setError("Selecione um template oficial com ID do Google Docs ou informe conteudo manual.");
        return null;
      }
      if (selectedTemplate) {
        const missingPlaceholders = getMissingRequiredPlaceholders(rawBody, selectedTemplatePlaceholders);
        if (missingPlaceholders.length > 0) {
          setError(formatMissingPlaceholdersMessage(missingPlaceholders));
          return null;
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[ContratoEditor] salvar rascunho", {
          "conteudo.length": conteudo.length,
          endpoint,
          contractId: contractId ?? null,
          template_key: selectedTemplateId || null,
          template_name: selectedTemplateName || selectedTemplate?.label || null,
          template_file_id: officialTemplateFileId || null,
          propertyId: property.id,
          titulo_comercial: property.titulo_comercial,
          descricao_juridica: property.metadata?.descricao_juridica,
          descricaoImovelContrato,
        });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId ?? draftId ?? null,
          template_key: selectedTemplateId || null,
          template_name: selectedTemplateName || selectedTemplate?.label || null,
          template_file_id: officialTemplateFileId || null,
          lead_id: uuidOrNull(lead?.id),
          imovel_id: uuidOrNull(property?.id),
          project_id: uuidOrNull(property?.id),
          broker_id: uuidOrNull(broker?.id),
          lead_name: lead?.name ?? null,
          project_name: property?.titulo_comercial ?? null,
          corretor_name: broker?.name ?? null,
          title: buildDraftTitle(lead?.name ?? null),
          type: selectedTemplate?.type ?? "venda",
          value,
          status: "draft",
          metadata: buildContractMetadataSnapshot({
            ...contractMetadata,
            valor_total: contractValueDisplay,
          }),
          notes: rawBody.trim() ? rawBody : null,
          conteudo: conteudo || null,
          renderedBody: conteudo || null,
          content: conteudo || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar rascunho."); setSaveState("error"); return null; }

      const createdId = data?.contract?.id ?? data?.data?.[0]?.id ?? data?.id ?? null;
      if (createdId) setDraftId(createdId);
      if (data?.contract?.metadata) {
        setContractMetadata(getContractMetadataFromRecord(data.contract.metadata));
      }
      setMetadataSnapshotLoaded(true);

      setSuccessMessage("Rascunho salvo com sucesso.");
      setSaveState("saved");
      setTimeout(() => setSuccessMessage(null), 3000);
      return createdId ?? contractId ?? draftId ?? null;
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setSaveState("error");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  // ── Gerar e enviar (usa o corpo renderizado) ───────────────────────────────
  async function handleSaveContractWorkspace() {
    setSaveState("saving");
    const savedId = await handleSaveDraft();
    if (!savedId) {
      setSaveState("error");
    }
  }

  async function handleGenerateAndSend() {
    if (!lead || !property || !broker) {
      setError("Lead, imóvel e corretor são obrigatórios.");
      return;
    }
    if (!rawBody.trim() && !hasOfficialTemplate) {
      setError("Selecione um template oficial com ID do Google Docs ou faca upload de um arquivo.");
      return;
    }
    if (!canalEmail && !canalWhatsapp) {
      setError("Selecione ao menos um canal de envio: e-mail ou WhatsApp.");
      return;
    }
    const value = contractFinancialValue > 0 ? contractFinancialValue : property?.valor ?? lead?.value ?? 0;
    if (value <= 0) { setError("O imóvel ou lead precisa ter um valor definido."); return; }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let targetContractId = draftId ?? contractId;
      const conteudo = buildConteudoFinal();

      if (!conteudo && !hasOfficialTemplate) {
        setError("Selecione um template oficial com ID do Google Docs ou informe conteudo manual.");
        return;
      }
      if (selectedTemplate) {
        const missingPlaceholders = getMissingRequiredPlaceholders(rawBody, selectedTemplatePlaceholders);
        if (missingPlaceholders.length > 0) {
          setError(formatMissingPlaceholdersMessage(missingPlaceholders));
          return;
        }
      }

      if (!targetContractId) {
        targetContractId = await handleSaveDraft();
      }

      if (!targetContractId) {
        setError("Salve o rascunho antes de enviar o contrato.");
        return;
      }

      const res = await fetch(`/api/contracts/${targetContractId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conteudo: conteudo || null,
          template_key: selectedTemplateId || null,
          template_name: selectedTemplateName || selectedTemplate?.label || null,
          template_file_id: officialTemplateFileId || null,
          placeholders: buildContractMetadataSnapshot({
            ...contractMetadata,
            valor_total: contractValueDisplay,
          }),
          canais: { whatsapp: canalWhatsapp, email: canalEmail },
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao enviar contrato."); return; }

      setSuccessMessage("Contrato enviado com sucesso. Redirecionando...");
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          router.push("/cockpit/contratos");
        }
      }, 1500);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGeneratePDF() {
    if (!draftId) { alert("Salve o rascunho primeiro para gerar o PDF."); return; }
    window.open(`/api/contracts/${draftId}/pdf`, "_blank");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Usar state (não URL params) para habilitar ações — mocks também são válidos para preview/rascunho
  const canSaveDraft = !!lead && !!property && !!broker && !submitting;
  const canGenerate  = canSaveDraft && (rawBody.trim().length > 0 || hasOfficialTemplate) && (canalEmail || canalWhatsapp);
  const filledContractFields = OFFICIAL_CONTRACT_FIELDS.filter((field) => contractMetadata[field].trim()).length;
  const totalContractFields = OFFICIAL_CONTRACT_FIELDS.length;
  const contractDataSummary = [
    { label: "Vendedor", value: contractMetadata.vendedor_nome || "Nao informado" },
    { label: "Comprador", value: contractMetadata.comprador_nome || lead?.name || "Nao informado" },
    { label: "Imovel", value: property?.titulo_comercial || "Nao informado" },
    { label: "Valor", value: contractValueDisplay || (property?.valor ? formatBRLMoney(property.valor) : "Nao informado") },
    { label: "Foro", value: contractMetadata.foro || "Nao informado" },
  ];

  return (
    <div className="flex flex-col border border-slate-200 bg-white dark:border-[#263653] dark:bg-[#0F172A]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white dark:border-[#263653] dark:bg-[#0F172A] shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Editor de Contrato
          </h1>
          {lead && <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-400">{lead.name}</p>}
        </div>

        <div className="flex items-center gap-2">
          {successMessage && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 mr-2">{successMessage}</span>
          )}
          {error && (
            <span className="text-sm text-red-500 dark:text-red-400 mr-2 max-w-xs truncate">{error}</span>
          )}
          {hasMissingRequiredLegalFields && (
            <span className="text-sm text-amber-600 dark:text-amber-400 mr-2 max-w-sm truncate">
              Descricao juridica/matricula/cartorio nao cadastrados. O contrato pode ficar incompleto.
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (mountedRef.current) router.back();
            }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-[#2A3856] dark:text-slate-300 dark:hover:bg-[#17233A]"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleGeneratePDF}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-[#2A3856] dark:text-slate-300 dark:hover:bg-[#17233A]"
          >
            Gerar PDF
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!canSaveDraft}
            className="rounded-xl border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Salvar Rascunho
          </button>

          <button
            type="button"
            onClick={handleGenerateAndSend}
            disabled={!canGenerate}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-95"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Enviando...
              </>
            ) : "Enviar contrato"}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500 dark:border-[#33415F]" />
            Carregando dados...
          </div>
        </div>
      )}

      {/* ── 3 colunas ── workspace expandido quando há template ativo */}
      {!loading && (
        <div
          className={[
            "grid grid-cols-1 divide-y divide-slate-200 dark:divide-[#263653] xl:divide-x xl:divide-y-0",
            selectedTemplateId
              ? "xl:grid-cols-[240px_minmax(0,1fr)_240px] 2xl:grid-cols-[260px_minmax(0,1fr)_260px]"
              : "xl:grid-cols-[300px_minmax(680px,1fr)_340px] 2xl:grid-cols-[320px_minmax(760px,1fr)_360px]",
          ].join(" ")}
        >

          {/* Coluna 1: Sidebar */}
          <ContratoEditorSidebar
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
            onUploadDocx={handleUploadDocx}
            uploadLoading={uploadLoading}
            lead={lead}
            property={property}
            broker={broker}
            onSelectLead={handleSelectLead}
            onSelectProperty={handleSelectProperty}
            onSelectBroker={handleSelectBroker}
            canalEmail={canalEmail}
            canalWhatsapp={canalWhatsapp}
            onChangeCanalEmail={setCanalEmail}
            onChangeCanalWhatsapp={setCanalWhatsapp}
          />

          {/* Coluna 2: Workspace jurídico */}
          <div className="flex flex-col bg-white dark:bg-[#0F172A]">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-[#263653] sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Workspace jurídico
                  </span>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedTemplateId ? (selectedTemplateName || selectedTemplate?.label || "Modelo oficial ativo") : "Selecione um modelo para ativar o workspace."}
                  </p>
                </div>
                {selectedTemplatePlaceholders.length > 0 && (
                  <details className="relative shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    <summary className="cursor-pointer list-none font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-slate-200">
                      Ver campos obrigatórios
                    </summary>
                    <div className="absolute right-0 top-7 z-20 w-72 border border-slate-200 bg-white p-3 shadow-lg dark:border-[#2A3856] dark:bg-[#111C2F]">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Preservar no texto
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplatePlaceholders.map((placeholder) => (
                          <code
                            key={placeholder}
                            className="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 dark:border-[#2A3856] dark:bg-[#17233A] dark:text-slate-300"
                          >
                            {`{{${placeholder}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>

            {!selectedTemplateId ? (
              <div className="flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-xl rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center dark:border-[#2A3856] dark:bg-[#111C2F]">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-[#2A3856] dark:bg-[#0F172A] dark:text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-7 w-7">
                      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                      <path d="M14 3v5h5" />
                      <path d="M8 13h8" />
                      <path d="M8 17h8" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Workspace jurídico aguardando modelo
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    Escolha um template oficial na coluna de contexto para ativar as seções contratuais, os campos jurídicos e o resumo operacional.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-[#2A3856] dark:bg-[#0F172A] dark:text-slate-400">
                      Partes contratuais
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-[#2A3856] dark:bg-[#0F172A] dark:text-slate-400">
                      Dados do imovel
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-[#2A3856] dark:bg-[#0F172A] dark:text-slate-400">
                      Negociacao
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-[#2A3856] dark:bg-[#0F172A] dark:text-slate-400">
                      Juridico
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 px-5 py-6 sm:px-7 lg:px-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#263653] dark:bg-[#111C2F]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Template ativo</p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                        {selectedTemplateName || selectedTemplate?.label || "Modelo oficial"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        O workspace abaixo é o ponto principal de edição jurídica.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-brand-500/10 px-3 py-1 font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                        {selectedTemplate?.type ?? "draft"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-500 shadow-sm dark:bg-[#0F172A] dark:text-slate-300">
                        {selectedTemplatePlaceholders.length} placeholders
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-500 shadow-sm dark:bg-[#0F172A] dark:text-slate-300">
                        {hasOfficialTemplate ? "Google Docs oficial" : "Template manual"}
                      </span>
                    </div>
                  </div>
                </div>

                <ContractDataModal
                  isOpen
                  data={contractMetadata}
                  value={contractValueInput}
                  onChange={setContractMetadata}
                  onValueChange={handleContractValueChange}
                  onSave={handleSaveContractWorkspace}
                  saveState={saveState}
                  summaryItems={contractDataSummary}
                  filledContractFields={filledContractFields}
                  totalContractFields={totalContractFields}
                  hasMissingRequiredLegalFields={hasMissingRequiredLegalFields}
                  alertMessage={error}
                  showCloseButton={false}
                  onClose={() => setContractDataOpen(false)}
                />

                <details className="rounded-2xl border border-slate-200 bg-white dark:border-[#263653] dark:bg-[#111C2F]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Conteúdo do modelo
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Texto bruto / edição técnica</span>
                  </summary>
                  <div className="border-t border-slate-100 dark:border-[#263653]">
                    <textarea
                      value={rawBody}
                      onChange={(e) => setRawBody(e.target.value)}
                      placeholder={
                        rawBody === ""
                          ? "Selecione um modelo oficial ou faça upload de um .docx.\n\nO app não usa templates fake nem tenta recriar a formatação DOCX."
                          : undefined
                      }
                      spellCheck={false}
                      rows={Math.max(16, rawBody.split(/\n/).length + 2)}
                      className="min-h-[320px] w-full resize-none bg-white p-6 font-mono text-sm leading-relaxed text-slate-700 focus:outline-none dark:bg-[#0F172A] dark:text-slate-200"
                    />
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Coluna 3: Resumo compacto */}
          <aside className="flex flex-col bg-white dark:bg-[#0F172A]">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-[#263653]">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Resumo do contrato
              </span>
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-[#263653] dark:bg-[#111C2F]">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTemplateName || selectedTemplate?.label || "Modelo nao selecionado"}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {hasOfficialTemplate ? "Google Docs oficial" : "Template manual/upload"}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 dark:border-[#263653] dark:bg-[#111C2F]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Preenchimento</p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {filledContractFields}/{totalContractFields}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#17233A]">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.round((filledContractFields / totalContractFields) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {contractDataSummary.map((item) => (
                  <div key={item.label} className="border-b border-slate-100 pb-2.5 last:border-b-0 dark:border-[#263653]">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-700 dark:text-slate-200">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      <ContractDataModal
        isOpen={contractDataOpen}
        data={contractMetadata}
        onChange={setContractMetadata}
        value={contractValueInput}
        onValueChange={handleContractValueChange}
        onSave={handleSaveContractWorkspace}
        saveState={saveState}
        summaryItems={contractDataSummary}
        filledContractFields={filledContractFields}
        totalContractFields={totalContractFields}
        hasMissingRequiredLegalFields={hasMissingRequiredLegalFields}
        alertMessage={error}
        onClose={() => setContractDataOpen(false)}
      />
    </div>
  );
}



