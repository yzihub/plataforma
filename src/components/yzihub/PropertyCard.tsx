import Image from "next/image";
import type { Property } from "@/types/properties";

// Re-export for backward compatibility with existing imports
export type { Property } from "@/types/properties";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available: { label: "Disponível",  bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  reserved:  { label: "Reservado",   bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400"   },
  sold:      { label: "Vendido",     bg: "bg-gray-500/10",    text: "text-gray-400",    dot: "bg-gray-400"    },
} as const;

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ─── PropertyCard ─────────────────────────────────────────────────────────────

export default function PropertyCard({ property, onClick }: { property: Property; onClick?: (p: Property) => void }) {
  const cfg = STATUS_CONFIG[property.status];

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03]${onClick ? " cursor-pointer" : ""}`}
      onClick={() => onClick?.(property)}
    >
      {/* Photo */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {property.photo_url ? (
          <Image
            src={property.photo_url}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="size-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${cfg.bg} ${cfg.text}`}>
          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>

        {/* Property type badge */}
        {property.property_type && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {property.property_type}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            {property.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
            {property.location}
          </p>
        </div>

        {/* Price + Area */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatPrice(property.price)}
            </p>
            {property.area_sqm != null && (
              <p className="text-xs text-gray-400">{property.area_sqm} m²</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {property.tags && property.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {property.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        {property.link ? (
          <a
            href={property.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500 px-4 py-2 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500 hover:text-white"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            VER NO SITE
          </a>
        ) : (
          <div className="mt-auto h-9 rounded-xl border border-gray-100 dark:border-gray-800" />
        )}
      </div>
    </div>
  );
}
