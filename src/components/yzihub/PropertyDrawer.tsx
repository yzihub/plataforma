"use client";

import { useEffect, useState } from "react";
import type { Property } from "@/types/properties";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  "Apartamento",
  "Casa",
  "Studio",
  "Cobertura",
  "Sala Comercial",
  "Terreno",
  "Galpão",
];

const PURPOSES = ["Venda", "Locação"];

const CONSTRUCTION_STATUSES = [
  "Pronto",
  "Em Construção",
  "Na Planta",
  "Reforma",
];

const PUBLICATION_STATUSES: { value: string; label: string }[] = [
  { value: "published", label: "Publicado" },
  { value: "draft", label: "Rascunho" },
  { value: "archived", label: "Arquivado" },
];

const ALL_TAGS = [
  "Alto Padrão",
  "Premium",
  "Piscina",
  "Churrasqueira",
  "Condomínio",
  "Vista Mar",
  "Novo",
  "Oportunidade",
  "Urgente",
  "VIP",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function parseBRL(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

function cleanMetadataValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ─── Form state type ──────────────────────────────────────────────────────────

interface FormState {
  captador_id: string;
  title: string;
  priceFormatted: string;
  neighborhood: string;
  location: string;
  area_sqm: string;
  notes: string;
  property_type: string;
  purpose: string;
  construction_status: string;
  publication_status: string;
  tags: string[];
  endereco_completo: string;
  descricao_juridica: string;
  matricula: string;
  cartorio: string;
  area_privativa: string;
  area_construida: string;
  area_terreno: string;
  medidas_confrontacoes: string;
  inscricao_municipal: string;
  observacoes_contratuais: string;
}

function propertyToForm(p: Property): FormState {
  const metadata = p.metadata ?? {};

  return {
    captador_id: p.captador_id ?? "",
    title: p.title,
    priceFormatted: p.price
      ? p.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        })
      : "",
    neighborhood: p.neighborhood ?? "",
    location: p.location,
    area_sqm: p.area_sqm != null ? String(p.area_sqm) : "",
    notes: p.notes ?? "",
    property_type: p.property_type ?? "",
    purpose: p.purpose ?? "",
    construction_status: p.construction_status ?? "",
    publication_status: p.publication_status ?? "",
    tags: p.tags ?? [],
    endereco_completo: typeof metadata.endereco_completo === "string" ? metadata.endereco_completo : "",
    descricao_juridica: typeof metadata.descricao_juridica === "string" ? metadata.descricao_juridica : "",
    matricula: typeof metadata.matricula === "string" ? metadata.matricula : "",
    cartorio: typeof metadata.cartorio === "string" ? metadata.cartorio : "",
    area_privativa: typeof metadata.area_privativa === "string" || typeof metadata.area_privativa === "number" ? String(metadata.area_privativa) : "",
    area_construida: typeof metadata.area_construida === "string" || typeof metadata.area_construida === "number" ? String(metadata.area_construida) : "",
    area_terreno: typeof metadata.area_terreno === "string" || typeof metadata.area_terreno === "number" ? String(metadata.area_terreno) : "",
    medidas_confrontacoes: typeof metadata.medidas_confrontacoes === "string" ? metadata.medidas_confrontacoes : "",
    inscricao_municipal: typeof metadata.inscricao_municipal === "string" ? metadata.inscricao_municipal : "",
    observacoes_contratuais: typeof metadata.observacoes_contratuais === "string" ? metadata.observacoes_contratuais : "",
  };
}

// ─── Shared field class ───────────────────────────────────────────────────────

const fieldCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500";

const labelCls = "block text-xs font-medium text-gray-400 mb-1";

const emptyForm: FormState = {
  captador_id: "",
  title: "",
  priceFormatted: "",
  neighborhood: "",
  location: "",
  area_sqm: "",
  notes: "",
  property_type: "",
  purpose: "",
  construction_status: "",
  publication_status: "",
  tags: [],
  endereco_completo: "",
  descricao_juridica: "",
  matricula: "",
  cartorio: "",
  area_privativa: "",
  area_construida: "",
  area_terreno: "",
  medidas_confrontacoes: "",
  inscricao_municipal: "",
  observacoes_contratuais: "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PropertyDrawerProps {
  property: Property | null;
  onClose: () => void;
  onSaved?: (updated: Property) => void;
}

interface BrokerOption {
  id: string;
  name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyDrawer({
  property,
  onClose,
  onSaved,
}: PropertyDrawerProps) {
  const isOpen = property !== null;

  const [form, setForm] = useState<FormState>(
    property ? propertyToForm(property) : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);

  // Reset form whenever a new property is opened
  useEffect(() => {
    if (property) {
      setForm(propertyToForm(property));
      setSaveError(false);
      void Promise.all([
        fetch(`/api/imoveis/${property.id}`).then((res) => res.ok ? res.json() : null),
        fetch("/api/corretores").then((res) => res.ok ? res.json() : null),
      ]).then(([detail, brokersResponse]) => {
        if (detail && typeof detail.captador_id === "string") {
          setForm((prev) => ({ ...prev, captador_id: detail.captador_id }));
        }
        const items = Array.isArray(brokersResponse?.data) ? brokersResponse.data : [];
        setBrokers(items.map((item: { id: string; name?: string; full_name?: string }) => ({
          id: item.id,
          name: item.name ?? item.full_name ?? item.id,
        })));
      }).catch(() => undefined);
    }
  }, [property]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePriceInput(e: React.FormEvent<HTMLInputElement>) {
    const raw = (e.target as HTMLInputElement).value;
    setField("priceFormatted", formatBRL(raw));
  }

  function toggleTag(tag: string) {
    setForm((prev) => {
      const has = prev.tags.includes(tag);
      return {
        ...prev,
        tags: has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
      };
    });
  }

  async function handleSave() {
    if (!property) return;

    setSaving(true);
    setSaveError(false);

    const parsedPrice = parseBRL(form.priceFormatted);
    const metadataPatch = {
      endereco_completo: cleanMetadataValue(form.endereco_completo),
      descricao_juridica: cleanMetadataValue(form.descricao_juridica),
      matricula: cleanMetadataValue(form.matricula),
      cartorio: cleanMetadataValue(form.cartorio),
      area_privativa: cleanMetadataValue(form.area_privativa),
      area_construida: cleanMetadataValue(form.area_construida),
      area_terreno: cleanMetadataValue(form.area_terreno),
      medidas_confrontacoes: cleanMetadataValue(form.medidas_confrontacoes),
      inscricao_municipal: cleanMetadataValue(form.inscricao_municipal),
      observacoes_contratuais: cleanMetadataValue(form.observacoes_contratuais),
    };
    const res = await fetch(`/api/imoveis/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo_comercial: form.title,
        valor: parsedPrice,
        bairro: form.neighborhood || null,
        metragem: form.area_sqm ? Number(form.area_sqm) : null,
        descricao_imovel: form.notes || null,
        tipo_de_imovel: form.property_type || null,
        finalidade: form.purpose || null,
        captador_id: form.captador_id || null,
        metadata: metadataPatch,
      }),
    });

    const data = await res.json().catch(() => null) as { imovel?: { metadata?: Record<string, unknown> | null }; error?: string } | null;
    const nextMetadata = data?.imovel?.metadata ?? property.metadata ?? {};

    setSaving(false);

    if (res.ok) {
      onSaved?.({
        ...property,
        title: form.title,
        price: parsedPrice,
        neighborhood: form.neighborhood || null,
        location: form.location,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        notes: form.notes || null,
        property_type: form.property_type || null,
        purpose: form.purpose || null,
        construction_status: form.construction_status || null,
        publication_status: form.publication_status || null,
        tags: form.tags.length > 0 ? form.tags : null,
        metadata: nextMetadata,
        captador_id: form.captador_id || null,
        captador: brokers.find((broker) => broker.id === form.captador_id) ?? null,
      });
      onClose();
    } else {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  }

  const availableTags = ALL_TAGS.filter((t) => !form.tags?.includes(t));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {property && (
          <>
            {/* ── Header ── */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 leading-snug">
                  {property.title}
                </h2>
                {property.neighborhood && (
                  <p className="text-sm text-gray-400 mt-0.5 truncate">{property.neighborhood}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Summary strip ── */}
            <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
              {/* Price */}
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {property.price > 0
                  ? property.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                  : "Sob consulta"}
              </p>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5">
                {property.purpose && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    property.purpose === "Venda"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : property.purpose === "Aluguel"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                  }`}>
                    {property.purpose.toUpperCase()}
                  </span>
                )}
                {property.property_type && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                    {property.property_type}
                  </span>
                )}
                {property.publication_status && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                    property.publication_status === "published" || property.publication_status === "Publicado"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {property.publication_status === "published" ? "Publicado" : property.publication_status}
                  </span>
                )}
              </div>

              {/* Specs grid */}
              {(() => {
                const parse = (suffix: string) => {
                  const t = property.tags?.find(t => t.endsWith(suffix));
                  return t ? parseInt(t) : null;
                };
                const quartos = parse("Q");
                const suites  = parse("S");
                const vagas   = parse("V");
                const items = [
                  quartos != null && { label: "Quartos", value: quartos },
                  suites  != null && suites > 0 && { label: "Suítes", value: suites },
                  vagas   != null && { label: "Vagas",   value: vagas   },
                  property.area_sqm != null && { label: "m²", value: property.area_sqm },
                ].filter(Boolean) as { label: string; value: number }[];

                if (items.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-3">
                    {items.map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2 min-w-[56px]">
                        <span className="text-base font-bold text-gray-800 dark:text-white">{value}</span>
                        <span className="text-[10px] text-gray-400">{label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400/40">
              <div className="space-y-4">
                {/* Description */}
                {property.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {property.description}
                  </p>
                )}

                {/* Links */}
                {property.link && (
                  <a
                    href={property.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Ver no site
                  </a>
                )}

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Editar Imóvel</p>

                {/* ── Classificação ── */}
                <div>
                  <label className={labelCls}>Captador</label>
                  <select
                    value={form.captador_id}
                    onChange={(e) => setField("captador_id", e.target.value)}
                    className={fieldCls}
                  >
                    <option value="">Selecionar corretor...</option>
                    {brokers.map((broker) => (
                      <option key={broker.id} value={broker.id}>{broker.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Tipo de Imóvel</label>
                  <select
                    value={form.property_type}
                    onChange={(e) => setField("property_type", e.target.value)}
                    className={fieldCls}
                  >
                    <option value="">Selecionar...</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Finalidade</label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setField("purpose", e.target.value)}
                    className={fieldCls}
                  >
                    <option value="">Selecionar...</option>
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Status da Obra</label>
                  <select
                    value={form.construction_status}
                    onChange={(e) =>
                      setField("construction_status", e.target.value)
                    }
                    className={fieldCls}
                  >
                    <option value="">Selecionar...</option>
                    {CONSTRUCTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Publicação</label>
                  <select
                    value={form.publication_status}
                    onChange={(e) =>
                      setField("publication_status", e.target.value)
                    }
                    className={fieldCls}
                  >
                    <option value="">Selecionar...</option>
                    {PUBLICATION_STATUSES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Dados ── */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                  <div>
                    <label className={labelCls}>Título</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Preço</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.priceFormatted}
                      onInput={handlePriceInput}
                      onChange={() => {
                        /* handled by onInput */
                      }}
                      className={fieldCls}
                      placeholder="R$ 0"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Bairro</label>
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={(e) =>
                        setField("neighborhood", e.target.value)
                      }
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Localização completa</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Área (m²)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.area_sqm}
                      onChange={(e) => setField("area_sqm", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Observações</label>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      className={`${fieldCls} resize-none`}
                    />
                  </div>
                </div>

                {/* Dados para contrato */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Dados para contrato
                  </p>

                  <div>
                    <label className={labelCls}>Endereço completo</label>
                    <input
                      type="text"
                      value={form.endereco_completo}
                      onChange={(e) => setField("endereco_completo", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Descrição jurídica do imóvel</label>
                    <textarea
                      rows={4}
                      value={form.descricao_juridica}
                      onChange={(e) => setField("descricao_juridica", e.target.value)}
                      className={`${fieldCls} resize-none`}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Matrícula</label>
                      <input
                        type="text"
                        value={form.matricula}
                        onChange={(e) => setField("matricula", e.target.value)}
                        className={fieldCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Cartório</label>
                      <input
                        type="text"
                        value={form.cartorio}
                        onChange={(e) => setField("cartorio", e.target.value)}
                        className={fieldCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>Área privativa</label>
                      <input
                        type="text"
                        value={form.area_privativa}
                        onChange={(e) => setField("area_privativa", e.target.value)}
                        className={fieldCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Área construída</label>
                      <input
                        type="text"
                        value={form.area_construida}
                        onChange={(e) => setField("area_construida", e.target.value)}
                        className={fieldCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Área do terreno</label>
                      <input
                        type="text"
                        value={form.area_terreno}
                        onChange={(e) => setField("area_terreno", e.target.value)}
                        className={fieldCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Medidas e confrontações</label>
                    <textarea
                      rows={3}
                      value={form.medidas_confrontacoes}
                      onChange={(e) => setField("medidas_confrontacoes", e.target.value)}
                      className={`${fieldCls} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Inscrição municipal / cadastro PMJP</label>
                    <input
                      type="text"
                      value={form.inscricao_municipal}
                      onChange={(e) => setField("inscricao_municipal", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Observações contratuais</label>
                    <textarea
                      rows={3}
                      value={form.observacoes_contratuais}
                      onChange={(e) => setField("observacoes_contratuais", e.target.value)}
                      className={`${fieldCls} resize-none`}
                    />
                  </div>
                </div>

                {/* ── Tags ── */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <label className={labelCls}>Tags</label>

                  {/* Selected tags */}
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 px-2.5 py-0.5 text-xs font-medium flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="hover:opacity-70 transition-opacity leading-none"
                            aria-label={`Remover tag ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Available tags to add */}
                  {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-500 hover:border-brand-400 hover:text-brand-500 dark:border-gray-700 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Save button ── */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  {saveError && (
                    <p className="text-xs text-red-500 mb-2 text-center">
                      Erro ao salvar. Tente novamente.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "SALVAR"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
