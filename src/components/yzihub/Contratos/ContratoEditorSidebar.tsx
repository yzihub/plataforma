"use client";

// ─── ContratoEditorSidebar ────────────────────────────────────────────────────

import { useRef, useState, useEffect, useCallback } from "react";
import type { Lead } from "@/lib/crm/types";

interface TemplateOption {
  id: string;
  label: string;
  type: string;
}

interface PropertyData {
  id: string;
  id_imovel?: string | null;
  referencia_unica?: string | null;
  titulo_comercial: string;
  bairro: string | null;
  tipo_de_imovel?: string | null;
  valor: number;
  descricao_imovel?: string | null;
  descricao?: string | null;
  descricao_contrato?: string | null;
  descricao_juridica?: string | null;
  descricao_registral?: string | null;
  endereco?: string | null;
  area?: number | string | null;
  metragem?: number | string | null;
  matricula?: string | null;
  cartorio?: string | null;
  medidas?: string | null;
  metadata?: Record<string, string | number | null | undefined> | null;
}

interface BrokerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface ContratoEditorSidebarProps {
  templates: TemplateOption[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onUploadDocx: (file: File) => Promise<void>;
  uploadLoading: boolean;
  lead: Lead | null;
  property: PropertyData | null;
  broker: BrokerData | null;
  onSelectLead?: (lead: Lead | null) => void;
  onSelectProperty?: (property: PropertyData | null) => void;
  onSelectBroker?: (broker: BrokerData | null) => void;
  canalEmail: boolean;
  canalWhatsapp: boolean;
  onChangeCanalEmail: (v: boolean) => void;
  onChangeCanalWhatsapp: (v: boolean) => void;
}

type TemplateSource = "interno" | "upload";

const labelCls = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";
const readonlyCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-[#2A3856] dark:bg-[#17233A] dark:text-slate-400 cursor-not-allowed select-none";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-[#2A3856] dark:bg-[#17233A] dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20 dark:focus:bg-[#1A2740] transition-colors";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── SearchSelect genérico ────────────────────────────────────────────────────

interface SearchSelectProps<T extends { id: string }> {
  label: string;
  value: T | null;
  fetchUrl: string;
  getLabel: (item: T) => string;
  getSublabel?: (item: T) => string | null;
  getSearchText?: (item: T) => string;
  getContext?: (item: T) => string | null;
  extractItems: (data: unknown) => T[];
  onSelect: (item: T | null) => void;
}

function SearchSelect<T extends { id: string }>({
  label,
  value,
  fetchUrl,
  getLabel,
  getSublabel,
  getSearchText,
  getContext,
  extractItems,
  onSelect,
}: SearchSelectProps<T>) {
  const [query, setQuery]       = useState("");
  const [items, setItems]       = useState<T[]>([]);
  const [open, setOpen]         = useState(false);
  const [fetched, setFetched]   = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);

  // Sincronizar query com o valor externo
  useEffect(() => {
    setQuery(value ? getLabel(value) : "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside fecha dropdown
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const doFetch = useCallback(async () => {
    if (fetched) return;
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) return;
      const data = await res.json();
      setItems(extractItems(data));
      setFetched(true);
    } catch {
      // silencioso
    }
  }, [fetchUrl, fetched, extractItems]);

  function handleFocus() {
    doFetch();
    setOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (!open) setOpen(true);
    doFetch();
  }

  function handleSelectItem(item: T) {
    onSelect(item);
    setQuery(getLabel(item));
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(null);
    setQuery("");
    setOpen(false);
  }

  const filtered = query.trim()
    ? items.filter((item) =>
        (getSearchText?.(item) ?? [getLabel(item), getSublabel?.(item)].filter(Boolean).join(" ")).toLowerCase().includes(query.toLowerCase())
      )
    : items;

  return (
    <div ref={containerRef} className="relative">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="text"
          className={inputCls + " pr-7"}
          placeholder={`Buscar ${label}...`}
          value={query}
          onFocus={handleFocus}
          onChange={handleChange}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
            title="Limpar selecao"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-[#2A3856] dark:bg-[#111C2F]">
          {filtered.slice(0, 8).map((item) => {
            const sublabel = getSublabel ? getSublabel(item) : null;
            const context = getContext ? getContext(item) : null;
            return (
              <li
                key={item.id}
                onMouseDown={() => handleSelectItem(item)}
                className="px-3 py-2 cursor-pointer hover:bg-brand-50 dark:hover:bg-[#17233A] transition-colors"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">{getLabel(item)}</span>
                {sublabel && (
                  <span className="block text-xs text-slate-400 mt-0.5">{sublabel}</span>
                )}
                {context && <span className="block text-[11px] text-slate-400 mt-0.5">{context}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Funções de extração estáveis (fora do componente para evitar re-criação)
function extractLeads(data: unknown): Lead[] {
  if (Array.isArray(data)) return data as Lead[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.data)) return d.data as Lead[];
  if (Array.isArray(d?.leads)) return d.leads as Lead[];
  return [];
}

function extractImoveis(data: unknown): PropertyData[] {
  if (Array.isArray(data)) return data as PropertyData[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.data)) return d.data as PropertyData[];
  if (Array.isArray(d?.imoveis)) return d.imoveis as PropertyData[];
  return [];
}

function extractBrokers(data: unknown): BrokerData[] {
  if (Array.isArray(data)) return data as BrokerData[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.data)) return d.data as BrokerData[];
  if (Array.isArray(d?.brokers)) return d.brokers as BrokerData[];
  if (Array.isArray(d?.corretores)) return d.corretores as BrokerData[];
  return [];
}

function propertyReference(property: PropertyData): string {
  const metadataReference = property.metadata?.referencia_unica;
  const metadataCode = property.metadata?.codigo_do_imovel;
  return property.referencia_unica
    ?? (typeof metadataReference === "string" ? metadataReference : null)
    ?? property.id_imovel
    ?? (typeof metadataCode === "string" ? metadataCode : null)
    ?? "Referência não informada";
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ContratoEditorSidebar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onUploadDocx,
  uploadLoading,
  lead,
  property,
  broker,
  onSelectLead,
  onSelectProperty,
  onSelectBroker,
  canalEmail,
  canalWhatsapp,
  onChangeCanalEmail,
  onChangeCanalWhatsapp,
}: ContratoEditorSidebarProps) {
  const [source, setSource] = useState<TemplateSource>("interno");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const valor = property?.valor ?? lead?.value ?? 0;
  const comissao = valor * 0.05;

  async function handleFile(file: File) {
    if (!file) return;
    await onUploadDocx(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col bg-white dark:bg-[#0F172A]">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-3 dark:border-[#263653]">
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Configuracoes
        </span>
      </div>

      {/* Conteúdo */}
      <div className="space-y-6 px-5 py-6">

        {/* Bloco: Origem do Template */}
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
            Origem do Template
          </p>

          {/* Tabs */}
          <div className="flex rounded-xl border border-slate-200 dark:border-[#2A3856] mb-4">
            {(["interno", "upload"] as TemplateSource[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSource(tab)}
                className={[
                  "flex-1 py-1.5 text-xs font-medium transition-colors",
                  source === tab
                    ? "bg-brand-500 text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#17233A]",
                ].join(" ")}
              >
                {tab === "interno" ? "Modelo Oficial" : "Upload .docx"}
              </button>
            ))}
          </div>

          {/* Tab: Interno */}
          {source === "interno" && (
            <div>
              <label className={labelCls}>
                Modelo de Contrato <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => onSelectTemplate(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Este modelo será preenchido no Google Docs e exportado em PDF no momento do envio.
              </p>
            </div>
          )}

          {/* Tab: Upload */}
          {source === "upload" && (
            <div>
              <label className={labelCls}>Arquivo .doc / .docx</label>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
                  dragOver
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-slate-300 dark:border-[#2A3856] hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-[#17233A]",
                ].join(" ")}
              >
                {uploadLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500 dark:border-[#33415F]" />
                ) : (
                  <>
                    <svg className="mb-2 h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                      Arraste ou clique para selecionar
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      .doc ou .docx
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                O texto do arquivo sera extraido como template. Voce pode adicionar{" "}
                <code className="font-mono bg-slate-100 dark:bg-[#17233A] px-1 rounded">
                  {"{{vars}}"}
                </code>{" "}
                no editor apos o upload.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-[#263653]" />

        {/* Bloco: Canais de Envio */}
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
            Canais de Envio <span className="text-red-400">*</span>
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={canalEmail}
                onChange={(e) => onChangeCanalEmail(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-white text-brand-500 focus:ring-brand-500/20 dark:border-[#2A3856] dark:bg-[#17233A]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">E-mail</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={canalWhatsapp}
                onChange={(e) => onChangeCanalWhatsapp(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-white text-brand-500 focus:ring-brand-500/20 dark:border-[#2A3856] dark:bg-[#17233A]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">WhatsApp</span>
            </label>
            {!canalEmail && !canalWhatsapp && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                Selecione ao menos um canal para enviar o contrato.
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-[#263653]" />

        {/* Bloco: Dados pré-preenchidos */}
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
            Dados pre-preenchidos
          </p>
          <div className="space-y-3">

            {/* Lead */}
            {onSelectLead ? (
              <SearchSelect<Lead>
                label="Comprador / Locatario"
                value={lead}
                fetchUrl="/api/leads"
                getLabel={(l) => l.name}
                extractItems={extractLeads}
                onSelect={onSelectLead}
              />
            ) : (
              <div>
                <label className={labelCls}>Comprador / Locatario</label>
                {lead ? (
                  <div className={readonlyCls}>{lead.name}</div>
                ) : (
                  <div className={readonlyCls}><span className="text-red-400">Lead nao vinculado</span></div>
                )}
              </div>
            )}

            {/* Imóvel */}
            {onSelectProperty ? (
              <SearchSelect<PropertyData>
                label="Imovel"
                value={property}
                fetchUrl="/api/imoveis?status_publicacao=Publicado"
                getLabel={propertyReference}
                getSublabel={(p) => p.titulo_comercial}
                getSearchText={(p) => [propertyReference(p), p.id_imovel, p.metadata?.codigo_do_imovel, p.titulo_comercial, p.bairro].filter(Boolean).join(" ")}
                getContext={(p) => [p.bairro, p.tipo_de_imovel, formatBRL(p.valor)].filter(Boolean).join(" · ")}
                extractItems={extractImoveis}
                onSelect={onSelectProperty}
              />
            ) : (
              <div>
                <label className={labelCls}>Imovel</label>
                {property ? (
                  <div className={readonlyCls}>
                    {propertyReference(property)}
                    <span className="block text-xs text-slate-400 mt-0.5">{property.titulo_comercial}</span>
                    {property.bairro ? (
                      <span className="block text-xs text-slate-400 mt-0.5">{property.bairro}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className={readonlyCls}><span className="text-red-400">Imovel nao vinculado</span></div>
                )}
              </div>
            )}

            {/* Corretor */}
            {onSelectBroker ? (
              <SearchSelect<BrokerData>
                label="Corretor Responsavel"
                value={broker}
                fetchUrl="/api/corretores"
                getLabel={(b) => b.name}
                getSublabel={(b) => b.email}
                extractItems={extractBrokers}
                onSelect={onSelectBroker}
              />
            ) : (
              <div>
                <label className={labelCls}>Corretor Responsavel</label>
                {broker ? (
                  <div className={readonlyCls}>{broker.name}</div>
                ) : (
                  <div className={readonlyCls}><span className="text-red-400">Corretor nao vinculado</span></div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Valor</label>
              <div className={readonlyCls}>
                {valor > 0 ? formatBRL(valor) : <span className="text-red-400">Valor nao definido</span>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Comissao (5% auto)</label>
              <div className={readonlyCls}>{valor > 0 ? formatBRL(comissao) : "—"}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
