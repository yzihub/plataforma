"use client"

import { useState, useEffect } from "react"
import Badge from "@/components/ui/badge/Badge"
import { Job, JobStatus } from "@/lib/control/types"

interface JobQueueFeedProps {
  initialJobs: Job[]
  tenantFilter?: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `há ${days}dia${days > 1 ? "s" : ""}`
  if (hours > 0) return `há ${hours}h`
  return `há ${mins}min`
}

function ActionIcon({ action }: { action: string }) {
  if (action === "qualify") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-brand-500 shrink-0">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 9l1.5 1.5L17 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (action === "send_proposal") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-violet-500 shrink-0">
        <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 7l7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (action === "schedule") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-amber-500 shrink-0">
        <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="12" r="1" fill="currentColor" />
      </svg>
    )
  }
  if (action === "close") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-500 shrink-0">
        <path d="M4 10.5l4.5 4.5 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (action === "ai_takeover") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-rose-500 shrink-0">
        <rect x="3" y="6" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7.5" cy="11" r="1" fill="currentColor" />
        <circle cx="12.5" cy="11" r="1" fill="currentColor" />
        <path d="M7 6V4.5a3 3 0 016 0V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (action === "factory_activate") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-sky-500 shrink-0">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5.05 5.05l1.06 1.06M13.89 13.89l1.06 1.06M5.05 14.95l1.06-1.06M13.89 6.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-400 shrink-0">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function StatusBadge({ status }: { status: JobStatus }) {
  if (status === "pending") return <Badge variant="light" color="warning" size="sm">Aguardando</Badge>
  if (status === "processing") return (
    <span className="inline-flex animate-pulse">
      <Badge variant="light" color="primary" size="sm">Executando</Badge>
    </span>
  )
  if (status === "done") return <Badge variant="light" color="success" size="sm">Concluído</Badge>
  return <Badge variant="light" color="error" size="sm">Falhou</Badge>
}

export default function JobQueueFeed({ initialJobs, tenantFilter }: JobQueueFeedProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => {
        const updated = [...prev]
        const processingIdx = updated.findIndex(j => j.status === "processing")
        const pendingIdx = updated.findIndex(j => j.status === "pending")
        if (processingIdx !== -1) {
          updated[processingIdx] = { ...updated[processingIdx], status: "done", finished_at: new Date().toISOString() }
        } else if (pendingIdx !== -1) {
          updated[pendingIdx] = { ...updated[pendingIdx], status: "processing", started_at: new Date().toISOString() }
        }
        return updated
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const displayed = tenantFilter ? jobs.filter(j => j.tenant_id === tenantFilter) : jobs
  const pendingCount = displayed.filter(j => j.status === "pending").length

  function refreshJobs() {
    setJobs([...initialJobs])
  }

  function toggleError(id: string) {
    setExpandedErrors(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-800 dark:text-white/90">
            Fila de Jobs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse inline-block" />
            <span className="text-theme-xs text-success-500">ao vivo</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="light" color="warning" size="sm">
              {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <button
            onClick={refreshJobs}
            title="Atualizar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8A5.5 5.5 0 112.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2.5 2.5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Job list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 13h12M10 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-theme-sm">Nenhum job na fila</span>
          </div>
        ) : (
          displayed.map(job => (
            <div key={job.id}>
              <div className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                <ActionIcon action={job.action} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-theme-sm text-gray-800 dark:text-white/90">
                      {job.tenant_name}
                    </span>
                    <span className="text-theme-xs text-gray-400">·</span>
                    <span className="text-theme-xs text-gray-500 dark:text-gray-400 capitalize">
                      {job.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {job.lead_name && (
                      <>
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {job.lead_name}
                        </span>
                        <span className="text-theme-xs text-gray-300 dark:text-gray-600">·</span>
                      </>
                    )}
                    <span className="text-theme-xs text-gray-400">
                      {timeAgo(job.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={job.status} />
                  {job.status === "failed" && job.error && (
                    <button
                      onClick={() => toggleError(job.id)}
                      className="text-theme-xs text-error-500 hover:underline"
                    >
                      {expandedErrors.has(job.id) ? "ocultar erro" : "ver erro"}
                    </button>
                  )}
                </div>
              </div>
              {job.status === "failed" && job.error && expandedErrors.has(job.id) && (
                <div className="px-5 pb-3">
                  <p className="text-theme-xs text-error-500 bg-error-50 dark:bg-error-500/10 rounded-lg px-3 py-2 break-words">
                    {job.error}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
