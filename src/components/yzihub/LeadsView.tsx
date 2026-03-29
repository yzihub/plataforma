"use client";
import { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "@/components/ui/table";
import { GridIcon, ListIcon, PlusIcon, UserCircleIcon } from "@/icons";

type Lead = {
  id: string;
  nome: string;
  status_atendimento: string | null;
  origem_lead: string | null;
  criado_em_supabase: string | null;
  numero_whatsapp: string | null;
  foto_cliente_url: string | null;
  tenant_id: string | null;
};

type View = "grid" | "kanban" | "gallery";

type BadgeColor = "success" | "info" | "warning" | "primary" | "light" | "error";

function statusColor(s: string | null): BadgeColor {
  switch (s?.toLowerCase()) {
    case "qualificado": return "success";
    case "novo":        return "info";
    case "agendado":    return "warning";
    case "fechado":     return "primary";
    default:            return "light";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Grid View ────────────────────────────────────────────────────────────────
function GridView({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {["Nome", "Status", "Origem", "Data", "WhatsApp"].map((h) => (
                <TableCell key={h} isHeader className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {leads.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 px-4 text-center text-sm text-gray-400">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((l) => (
                <TableRow key={l.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors">
                  <TableCell className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {l.nome ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge size="sm" color={statusColor(l.status_atendimento)}>
                      {l.status_atendimento ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {l.origem_lead ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(l.criado_em_supabase)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm text-emerald-600 dark:text-emerald-400">
                    {l.numero_whatsapp ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Kanban View ───────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { key: "novo",        label: "Novo",        stripe: "bg-blue-500",    color: "text-blue-600 dark:text-blue-400",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  { key: "qualificado", label: "Qualificado", stripe: "bg-emerald-500", color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  { key: "agendado",    label: "Agendado",    stripe: "bg-yellow-500",  color: "text-yellow-600 dark:text-yellow-400",  badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400" },
  { key: "fechado",     label: "Fechado",     stripe: "bg-gray-400",    color: "text-gray-600 dark:text-gray-400",    badge: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
];

function KanbanView({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KANBAN_COLS.map((col) => {
        const items = leads.filter(
          (l) => (l.status_atendimento ?? "novo").toLowerCase() === col.key
        );
        return (
          <div key={col.key} className="flex flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            {/* Colored header stripe */}
            <div className={`${col.stripe} h-1 w-full`} />
            <div className="flex items-center justify-between px-4 pb-1">
              <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.badge}`}>
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 px-3 pb-4">
              {items.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">Sem leads</p>
              ) : (
                items.map((l) => (
                  <div key={l.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{l.nome}</p>
                    {l.origem_lead && (
                      <p className="mt-1 text-xs text-gray-400">{l.origem_lead}</p>
                    )}
                    {l.numero_whatsapp && (
                      <p className="mt-1 text-xs text-emerald-500">{l.numero_whatsapp}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Gallery View ──────────────────────────────────────────────────────────────
function GalleryView({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {leads.length === 0 ? (
        <p className="col-span-full py-8 text-center text-sm text-gray-400">Nenhum lead encontrado.</p>
      ) : (
        leads.map((l) => (
          <div key={l.id} className="cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] hover:border-emerald-500 hover:shadow-md transition-all">
            {/* Fixed aspect-ratio image area */}
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {l.foto_cliente_url ? (
                <img src={l.foto_cliente_url} alt={l.nome} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserCircleIcon className="size-14 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{l.nome}</p>
              <div className="mt-1">
                <Badge size="sm" color={statusColor(l.status_atendimento)}>
                  {l.status_atendimento ?? "—"}
                </Badge>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LeadsView({ leads }: { leads: Lead[] }) {
  const [view, setView] = useState<View>("grid");

  const switcher: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "grid",    label: "Grid",    icon: <GridIcon className="size-4" /> },
    { key: "kanban",  label: "Kanban",  icon: <ListIcon className="size-4" /> },
    { key: "gallery", label: "Gallery", icon: <UserCircleIcon className="size-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Leads</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} encontrados
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
            {switcher.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === key
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* New Lead Button */}
          <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 transition-colors">
            <PlusIcon className="size-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Views */}
      {view === "grid"    && <GridView    leads={leads} />}
      {view === "kanban"  && <KanbanView  leads={leads} />}
      {view === "gallery" && <GalleryView leads={leads} />}
    </div>
  );
}
