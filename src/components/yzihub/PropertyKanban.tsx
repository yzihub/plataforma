"use client";

import Image from "next/image";
import type { Property, PropertyKanbanStage } from "@/types/properties";
import { KANBAN_NEIGHBORHOODS } from "@/types/properties";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const STATUS_CONFIG = {
  available: { label: "Disponível", dot: "bg-emerald-400", text: "text-emerald-400" },
  reserved:  { label: "Reservado",  dot: "bg-amber-400",   text: "text-amber-400"   },
  sold:      { label: "Vendido",    dot: "bg-gray-400",    text: "text-gray-400"    },
} as const;

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ property }: { property: Property }) {
  const cfg = STATUS_CONFIG[property.status] ?? STATUS_CONFIG.available;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Thumbnail */}
      <div className="relative h-20 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {property.photo_url ? (
          <Image
            src={property.photo_url}
            alt={property.title}
            fill
            className="object-cover"
            sizes="280px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="line-clamp-1 text-xs font-semibold text-gray-800 dark:text-white/90">
        {property.title}
      </p>

      {/* Price */}
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        {formatPrice(property.price)}
      </p>

      {/* Footer: type + status */}
      <div className="flex items-center justify-between gap-2">
        {property.property_type ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {property.property_type}
          </span>
        ) : (
          <span />
        )}

        <span className={`flex items-center gap-1 text-[10px] font-medium ${cfg.text}`}>
          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  name,
  properties,
}: {
  name: PropertyKanbanStage;
  properties: Property[];
}) {
  return (
    <div className="flex min-w-[280px] flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
        <span className="text-sm font-semibold text-gray-700 dark:text-white/80">{name}</span>
        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
          {properties.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {properties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400 dark:border-gray-700">
            Sem imóveis
          </div>
        ) : (
          properties.map((p) => <KanbanCard key={p.id} property={p} />)
        )}
      </div>
    </div>
  );
}

// ─── PropertyKanban ───────────────────────────────────────────────────────────

interface PropertyKanbanProps {
  properties: Property[];
}

export default function PropertyKanban({ properties }: PropertyKanbanProps) {
  // Group properties by neighborhood
  const grouped = properties.reduce<Record<string, Property[]>>((acc, p) => {
    const stage: PropertyKanbanStage =
      p.neighborhood && (KANBAN_NEIGHBORHOODS as readonly string[]).includes(p.neighborhood)
        ? (p.neighborhood as PropertyKanbanStage)
        : "Outros";

    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(p);
    return acc;
  }, {});

  // Determine columns: fixed neighborhood order + dynamic "Outros"
  const allColumns: PropertyKanbanStage[] = [
    ...KANBAN_NEIGHBORHOODS,
    "Outros",
  ];

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: `${allColumns.length * 296}px` }}>
        {allColumns.map((col) => (
          <KanbanColumn
            key={col}
            name={col}
            properties={grouped[col] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
