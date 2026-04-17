"use client";

import { useState, useMemo, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/types/properties";
import PropertyCard from "@/components/yzihub/PropertyCard";
import PropertyDrawer from "@/components/yzihub/PropertyDrawer";
import PropertyTable from "@/components/yzihub/PropertyTable";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ─── Imoveis table row type ───────────────────────────────────────────────────

interface ImoveisRow {
  id: string;
  tenant_id: string;
  titulo_comercial: string | null;
  bairro: string | null;
  valor: number | null;
  quartos: number | null;
  suites: number | null;
  vagas: number | null;
  metragem: number | null;
  tipo_de_imovel: string | null;
  finalidade: string | null;
  foto_principal: { url?: string } | string | null;
  link_do_imovel: string | null;
  status_publicacao: string | null;
  descricao_imovel: string | null;
  created_at: string | null;
}

function mapImoveisToProperty(row: ImoveisRow): Property {
  // Extrair URL da foto_principal (pode ser JSON object ou string)
  let photoUrl: string | null = null;
  if (row.foto_principal) {
    if (typeof row.foto_principal === "string") {
      try {
        const parsed = JSON.parse(row.foto_principal);
        photoUrl = parsed?.url ?? null;
      } catch {
        photoUrl = row.foto_principal; // pode ser URL direta
      }
    } else if (typeof row.foto_principal === "object" && row.foto_principal !== null) {
      photoUrl = (row.foto_principal as { url?: string }).url ?? null;
    }
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.titulo_comercial ?? "Sem titulo",
    photo_url: photoUrl,
    price: row.valor ?? 0,
    location: row.bairro ?? "Localizacao nao informada",
    area_sqm: row.metragem ?? null,
    status: "available" as const,
    link: row.link_do_imovel ?? null,
    notes: row.descricao_imovel ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.created_at ?? new Date().toISOString(),
    property_type: row.tipo_de_imovel ?? null,
    construction_status: null,
    publication_status: row.status_publicacao ?? null,
    tags: [
      row.quartos != null ? `${row.quartos}Q` : null,
      row.suites != null && row.suites > 0 ? `${row.suites}S` : null,
      row.vagas != null ? `${row.vagas}V` : null,
    ].filter((t): t is string => t !== null),
    neighborhood: row.bairro ?? null,
    purpose: row.finalidade ?? null,
    external_id: null,
    source: null,
    description: row.descricao_imovel ?? null,
    images: null,
    features: null,
    score: null,
    priority: null,
    kanban_stage: null,
  };
}

// ─── View toggle icons ────────────────────────────────────────────────────────

function TableIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, accent = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "green" | "amber" | "brand" | "sky";
}) {
  const accentCls = {
    default: "bg-gray-100 dark:bg-gray-800",
    green:   "bg-emerald-50 dark:bg-emerald-900/20",
    amber:   "bg-amber-50 dark:bg-amber-900/20",
    brand:   "bg-brand-50 dark:bg-brand-900/20",
    sky:     "bg-sky-50 dark:bg-sky-900/20",
  }[accent];
  const valueCls = {
    default: "text-gray-900 dark:text-white",
    green:   "text-emerald-600 dark:text-emerald-400",
    amber:   "text-amber-600 dark:text-amber-400",
    brand:   "text-brand-600 dark:text-brand-400",
    sky:     "text-sky-600 dark:text-sky-400",
  }[accent];

  return (
    <div className={`rounded-2xl border border-gray-200 p-4 dark:border-gray-800 ${accentCls}`}>
      <p className={`text-xl font-bold leading-none ${valueCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>}
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImoveisClient() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterNeighborhood, setFilterNeighborhood] = useState("all");
  const [filterPubStatus, setFilterPubStatus] = useState("all");
  const [filterMaxPrice, setFilterMaxPrice] = useState("all");
  const [view, setView] = useState<"table" | "grid">("table");

  // ── Fetch properties from Supabase filtered by tenant ──────────────────────

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProperties() {
      setLoading(true);
      setFetchError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("imoveis")
        .select(
          "id, tenant_id, titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, tipo_de_imovel, finalidade, foto_principal, link_do_imovel, status_publicacao, descricao_imovel, created_at"
        )
        .eq("tenant_id", tenant!.id)
        .eq("status_publicacao", "Publicado")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[ImoveisClient] erro ao buscar imóveis:", error.message, error.details ?? "");
        setFetchError(error.message);
      } else if (data) {
        setProperties((data as ImoveisRow[]).map(mapImoveisToProperty));
      }
      setLoading(false);
    }

    fetchProperties();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, tenantLoading]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const propertyTypes = useMemo(
    () =>
      Array.from(
        new Set(properties.map((p) => p.property_type).filter((t): t is string => t != null))
      ),
    [properties]
  );

  const neighborhoods = useMemo(
    () =>
      Array.from(
        new Set(properties.map((p) => p.neighborhood).filter((n): n is string => n != null))
      ),
    [properties]
  );

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (filterType !== "all" && p.property_type !== filterType) return false;
      if (filterNeighborhood !== "all" && p.neighborhood !== filterNeighborhood) return false;
      if (filterPubStatus !== "all" && p.publication_status !== filterPubStatus) return false;
      if (filterMaxPrice !== "all" && p.price > Number(filterMaxPrice)) return false;
      return true;
    });
  }, [properties, filterType, filterNeighborhood, filterPubStatus, filterMaxPrice]);

  const metrics = useMemo(() => {
    const total = properties.length;
    const ticketMedio = total > 0
      ? properties.reduce((s, p) => s + p.price, 0) / total
      : 0;
    const paraVenda   = properties.filter(p => p.purpose === "Venda").length;
    const paraAluguel = properties.filter(p => p.purpose === "Aluguel").length;
    const semFoto     = properties.filter(p => !p.photo_url).length;

    const bairroCount = properties.reduce<Record<string, number>>((acc, p) => {
      const b = p.neighborhood ?? "Sem bairro";
      acc[b] = (acc[b] ?? 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(bairroCount).sort((a, b) => b[1] - a[1]);
    const topBairro  = sorted[0]?.[0] ?? "—";
    const topBairroN = sorted[0]?.[1] ?? 0;

    return { total, ticketMedio, paraVenda, paraAluguel, semFoto, topBairro, topBairroN };
  }, [properties]);

  // ── Select class ────────────────────────────────────────────────────────────

  const selectClass =
    "w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 focus:outline-none focus:border-brand-500";

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading || tenantLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 dark:border-red-500/20 dark:bg-red-500/5">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">Erro ao carregar imóveis</p>
        <p className="mt-1 text-xs text-red-400 dark:text-red-500">{fetchError}</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Metrics strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total de Imóveis" value={metrics.total} />
        <MetricCard label="Valor Médio"       value={formatBRL(metrics.ticketMedio)} accent="brand" />
        <MetricCard label="Para Venda"        value={metrics.paraVenda}   accent="green" />
        <MetricCard label="Para Aluguel"      value={metrics.paraAluguel} accent="sky" />
        <MetricCard label="Top Bairro"        value={metrics.topBairro}   sub={`${metrics.topBairroN} imóveis`} />
        <MetricCard label="Sem Foto"          value={metrics.semFoto}     accent={metrics.semFoto > 0 ? "amber" : "default"} />
      </div>

      {/* Filter bar + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tipo */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectClass}
        >
          <option value="all">Todos os Tipos</option>
          {propertyTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Bairro */}
        <select
          value={filterNeighborhood}
          onChange={(e) => setFilterNeighborhood(e.target.value)}
          className={selectClass}
        >
          <option value="all">Todos os Bairros</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {/* Publicação */}
        <select
          value={filterPubStatus}
          onChange={(e) => setFilterPubStatus(e.target.value)}
          className={selectClass}
        >
          <option value="all">Toda Publicação</option>
          <option value="published">Publicado</option>
          <option value="draft">Rascunho</option>
          <option value="archived">Arquivado</option>
        </select>

        {/* Preço máximo */}
        <select
          value={filterMaxPrice}
          onChange={(e) => setFilterMaxPrice(e.target.value)}
          className={selectClass}
        >
          <option value="all">Qualquer Preço</option>
          <option value="500000">Até R$ 500 mil</option>
          <option value="1000000">Até R$ 1 milhão</option>
          <option value="2000000">Até R$ 2 milhões</option>
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            onClick={() => setView("table")}
            title="Visualização em tabela"
            className={`flex items-center justify-center gap-2 px-3 h-9 text-sm transition-colors ${
              view === "table"
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-500 hover:text-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <TableIcon />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            onClick={() => setView("grid")}
            title="Visualização em grade"
            className={`flex items-center justify-center gap-2 px-3 h-9 text-sm transition-colors ${
              view === "grid"
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-500 hover:text-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <GridIcon />
            <span className="hidden sm:inline">Grade</span>
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filtered.length} de {properties.length} imóveis
      </p>

      {/* Table view */}
      {view === "table" && (
        <PropertyTable
          properties={filtered}
          onSelect={(p) => setSelectedProperty(p)}
        />
      )}

      {/* Grid view */}
      {view === "grid" && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-white/[0.03]">
              <svg
                className="size-12 text-gray-200 dark:text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9.75L12 3l9 6.75V21H3V9.75z"
                />
              </svg>
              <p className="mt-3 text-sm text-gray-400">Nenhum imóvel encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={(p) => setSelectedProperty(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onSaved={(updated) => {
          setProperties((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
          setSelectedProperty(null);
        }}
      />
    </div>
  );
}
