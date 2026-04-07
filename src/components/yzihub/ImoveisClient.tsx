"use client";

import { useState, useMemo, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/types/properties";
import PropertyCard from "@/components/yzihub/PropertyCard";
import PropertyDrawer from "@/components/yzihub/PropertyDrawer";
import PropertyKanban from "@/components/yzihub/PropertyKanban";
import PropertyTable from "@/components/yzihub/PropertyTable";

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

function KanbanIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="13" rx="1" />
      <rect x="17" y="3" width="5" height="16" rx="1" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImoveisClient() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterNeighborhood, setFilterNeighborhood] = useState("all");
  const [filterPubStatus, setFilterPubStatus] = useState("all");
  const [filterMaxPrice, setFilterMaxPrice] = useState("all");
  const [view, setView] = useState<"table" | "grid" | "kanban">("table");

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
      const supabase = createClient(); // instanciado aqui, não no render
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (!error && data) {
        setProperties(data as Property[]);
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
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
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
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
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              view === "grid"
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-500 hover:text-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <GridIcon />
            <span className="hidden sm:inline">Grade</span>
          </button>
          <button
            onClick={() => setView("kanban")}
            title="Visualização em Kanban por bairro"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              view === "kanban"
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-500 hover:text-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <KanbanIcon />
            <span className="hidden sm:inline">Kanban</span>
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

      {/* Kanban view */}
      {view === "kanban" && (
        <PropertyKanban properties={filtered} />
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
