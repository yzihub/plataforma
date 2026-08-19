import Image from "next/image";
import type { Property } from "@/types/properties";

// Re-export for backward compatibility with existing imports
export type { Property } from "@/types/properties";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const FINALIDADE_CONFIG: Record<string, { label: string; cls: string }> = {
  Venda:     { label: "VENDA",     cls: "bg-emerald-500/80 text-white" },
  Aluguel:   { label: "ALUGUEL",   cls: "bg-sky-500/80 text-white" },
  Temporada: { label: "TEMPORADA", cls: "bg-purple-500/80 text-white" },
};

function RoomStrip({ tags, area }: { tags: string[] | null; area: number | null }) {
  const parse = (suffix: string) => {
    const t = tags?.find(t => t.endsWith(suffix));
    return t ? parseInt(t) : null;
  };
  const quartos = parse("Q");
  const suites  = parse("S");
  const vagas   = parse("V");

  const items = [
    quartos != null && { icon: "🛏", value: quartos, label: "qts" },
    suites  != null && suites > 0 && { icon: "🚿", value: suites,  label: "sts" },
    vagas   != null && { icon: "🚗", value: vagas,   label: "vgs" },
    area    != null && { icon: "📐", value: area,    label: "m²"  },
  ].filter(Boolean) as { icon: string; value: number; label: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
      {items.map(({ icon, value, label }) => (
        <span key={label} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{value}</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── PropertyCard ─────────────────────────────────────────────────────────────

export default function PropertyCard({ property, onClick }: { property: Property; onClick?: (p: Property) => void }) {
  const finalidade = property.purpose ? FINALIDADE_CONFIG[property.purpose] : null;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 dark:bg-white/[0.03] cursor-pointer"
      onClick={() => onClick?.(property)}
    >
      {/* Foto h-44 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {property.photo_url ? (
          <Image
            src={property.photo_url}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-300 dark:text-gray-700">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
            <span className="text-[10px]">Sem imagem</span>
          </div>
        )}

        {/* Finalidade pill top-right */}
        {finalidade && (
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm ${finalidade.cls}`}>
            {finalidade.label}
          </span>
        )}

        {/* Tipo imóvel bottom-left */}
        {property.property_type && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {property.property_type}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-gray-800 dark:text-white/90">
            {property.external_id ?? "Referência não informada"}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{property.title}</p>
          {property.neighborhood && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
              {property.neighborhood}
            </p>
          )}
        </div>

        <RoomStrip tags={property.tags} area={property.area_sqm} />

        <div className="mt-auto flex items-end justify-between">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {property.price > 0 ? formatPrice(property.price) : "Sob consulta"}
          </p>
          {property.link && (
            <a
              href={property.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
            >
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Site
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
