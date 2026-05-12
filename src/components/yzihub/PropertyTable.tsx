"use client";

import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Property } from "@/types/properties";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const STATUS_BADGE: Record<string, { color: BadgeColor; label: string }> = {
  available: { color: "success", label: "Disponível" },
  reserved:  { color: "warning", label: "Reservado" },
  sold:      { color: "dark",    label: "Vendido" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg
      className="size-8 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.75L12 3l9 6.75V21H3V9.75z"
      />
    </svg>
  );
}

// ─── PropertyTable ────────────────────────────────────────────────────────────

interface PropertyTableProps {
  properties: Property[];
  onSelect?: (p: Property) => void;
}

export default function PropertyTable({ properties, onSelect }: PropertyTableProps) {
  const headers = ["Imóvel", "Bairro", "Tipo", "Preço", "Status"];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {headers.map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="px-5 py-3 text-xs font-medium text-left text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-50 dark:divide-gray-800">
            {properties.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 px-5 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                    <svg
                      className="size-12"
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
                    <p className="text-sm">Nenhum imóvel encontrado</p>
                  </div>
                </td>
              </tr>
            ) : (
              properties.map((property) => {
                const badge =
                  STATUS_BADGE[property.status] ?? { color: "light" as BadgeColor, label: property.status };

                return (
                  <tr
                    key={property.id}
                    onClick={() => onSelect?.(property)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Imóvel: thumbnail + título + location */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {property.photo_url ? (
                          <img
                            src={property.photo_url}
                            alt={property.title}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <HomeIcon />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90 line-clamp-1">
                            {property.title}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {property.location}
                          </p>
                          {property.external_id && (
                            <p className="text-[10px] text-gray-400/70 font-mono mt-0.5">
                              {property.external_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Bairro */}
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400">
                      {property.neighborhood ?? property.location}
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400">
                      {property.property_type ?? "—"}
                    </td>

                    {/* Preço */}
                    <td className="py-3.5 px-5 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {formatPrice(property.price)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <Badge size="sm" color={badge.color}>
                        {badge.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
