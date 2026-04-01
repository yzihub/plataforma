"use client";

import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionLog, LogChannel } from "@/lib/control/types";

// ─── Types ─────────────────────────────────────────────────────────────────

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const CHANNEL_BADGE: Record<LogChannel, { color: BadgeColor; label: string }> = {
  web:       { color: "primary", label: "Web" },
  whatsapp:  { color: "success", label: "WhatsApp" },
  n8n:       { color: "warning", label: "n8n" },
  system:    { color: "light",   label: "Sistema" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ActionLogTableProps {
  logs: ActionLog[];
  tenants: { id: string; name: string }[];
}

export default function ActionLogTable({ logs }: ActionLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-gray-400">Nenhum log de ação registrado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Logs de Ação
        </h3>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {["Tenant", "Lead", "Ação", "Canal", "Resumo", "Data"].map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-left"
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50 dark:divide-gray-800">
            {logs.map((log) => {
              const ch = CHANNEL_BADGE[log.channel] ?? { color: "light" as BadgeColor, label: log.channel };
              return (
                <TableRow key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell className="py-3 px-5 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {log.tenant_name}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-sm text-gray-500 dark:text-gray-400">
                    {log.lead_name ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-sm text-gray-700 dark:text-gray-200 font-mono text-xs">
                    {log.action}
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge size="sm" color={ch.color}>{ch.label}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {log.summary ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
