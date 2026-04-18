"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

// ─── Form state type ──────────────────────────────────────────────────────────

interface FormState {
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
}

function propertyToForm(p: Property): FormState {
  return {
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
  };
}

// ─── Shared field class ───────────────────────────────────────────────────────

const fieldCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500";

const labelCls = "block text-xs font-medium text-gray-400 mb-1";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PropertyDrawerProps {
  property: Property | null;
  onClose: () => void;
  onSaved?: (updated: Property) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyDrawer({
  property,
  onClose,
  onSaved,
}: PropertyDrawerProps) {
  const isOpen = property !== null;

  const [form, setForm] = useState<FormState>(
    property ? propertyToForm(property) : ({} as FormState)
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Reset form whenever a new property is opened
  useEffect(() => {
    if (property) {
      setForm(propertyToForm(property));
      setSaveError(false);
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

    const supabase = createClient();
    const { error } = await supabase
      .from("properties")
      .update({
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
      })
      .eq("id", property.id);

    setSaving(false);

    if (!error) {
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
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90 truncate">
                  {property.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {property.location}
                </p>
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

            {/* ── Detail view ── */}
            <div className="shrink-0 border-b border-gray-100 dark:border-gray-800">
              {/* Hero photo */}
              {property.photo_url && (
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={property.photo_url}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="512px"
                  />
                </div>
              )}

              <div className="p-5 space-y-3">
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

                {/* Price */}
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {property.price > 0
                    ? property.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                    : "Sob consulta"}
                </p>

                {/* Specs strip */}
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

                {/* Neighborhood */}
                {property.neighborhood && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
                      <circle cx="12" cy="11" r="3" />
                    </svg>
                    {property.neighborhood}
                  </p>
                )}

                {/* Description */}
                {property.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4">
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
              </div>
            </div>

            {/* ── Scrollable form content ── */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Editar Imóvel</p>

                {/* ── Classificação ── */}
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
