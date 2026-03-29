"use client"

import { useState } from "react"
import Badge from "@/components/ui/badge/Badge"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { ActionLog, LogChannel } from "@/lib/control/types"

interface ActionLogTableProps {
  logs: ActionLog[]
  tenants: { id: string; name: string }[]
}

const PAGE_SIZE = 10

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `há ${days}dia${days > 1 ? "s" : ""}`
  if (hours > 0) return `há ${hours}h`
  return `há ${mins}min`
}

type ActionBadgeColor = "primary" | "info" | "warning" | "success" | "error" | "light"

function actionColor(action: string): ActionBadgeColor {
  const map: Record<string, ActionBadgeColor> = {
    qualify: "primary",
    send_proposal: "info",
    schedule: "warning",
    close: "success",
    ai_takeover: "error",
  }
  return map[action] ?? "light"
}

function ChannelIcon({ channel }: { channel: LogChannel }) {
  if (channel === "web") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
        <ellipse cx="7" cy="7" rx="2.5" ry="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  if (channel === "whatsapp") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        <path d="M2 12l.9-2.7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8.5c.7.7 1.5 1 2.5 1s2-.5 2-1.2c0-.6-.5-.9-1.5-1.1L7 7c-.9-.2-1.5-.6-1.5-1.2C5.5 5 6.2 4.5 7 4.5c.8 0 1.5.3 2 .8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  if (channel === "n8n") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        <path d="M7 1.5L12 5v4l-5 3.5L2 9V5l5-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M7 5v4M5 6.5l2-1.5 2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  // system
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <rect x="1.5" y="1.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 12.5h5M7 9.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

const channelLabel: Record<LogChannel, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  n8n: "n8n",
  system: "Sistema",
}

export default function ActionLogTable({ logs, tenants }: ActionLogTableProps) {
  const [selectedTenant, setSelectedTenant] = useState<string>("all")
  const [page, setPage] = useState(0)

  const filtered = logs.filter(l => selectedTenant === "all" || l.tenant_id === selectedTenant)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const rangeStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length)

  function handleTenantChange(value: string) {
    setSelectedTenant(value)
    setPage(0)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Action Logs
          </h3>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Auditoria global de ações
          </p>
        </div>
        <select
          value={selectedTenant}
          onChange={e => handleTenantChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="all">Todos os tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b border-gray-100 dark:border-gray-800">
              <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Ação
              </TableCell>
              <TableCell isHeader className="py-3 px-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Tenant
              </TableCell>
              <TableCell isHeader className="py-3 px-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Lead
              </TableCell>
              <TableCell isHeader className="py-3 px-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Canal
              </TableCell>
              <TableCell isHeader className="py-3 px-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Resumo
              </TableCell>
              <TableCell isHeader className="py-3 px-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Hora
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paged.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 px-5 text-center text-theme-sm text-gray-400" isHeader={false}>
                  <span className="col-span-6">Nenhum log encontrado</span>
                </TableCell>
              </TableRow>
            ) : (
              paged.map(log => (
                <TableRow
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                >
                  <TableCell className="py-3 px-5">
                    <Badge variant="light" color={actionColor(log.action)} size="sm">
                      <span className="capitalize">{log.action.replace(/_/g, " ")}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                      {log.tenant_name}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                      {log.lead_name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                      <ChannelIcon channel={log.channel} />
                      {channelLabel[log.channel]}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4 max-w-48">
                    <span className="text-theme-xs text-gray-600 dark:text-gray-400 truncate block max-w-48">
                      {log.summary ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="text-theme-xs text-gray-400 whitespace-nowrap">
                      {timeAgo(log.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          {filtered.length === 0 ? "0 resultados" : `${rangeStart}–${rangeEnd} de ${filtered.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-theme-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 transition"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-theme-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 transition"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  )
}
