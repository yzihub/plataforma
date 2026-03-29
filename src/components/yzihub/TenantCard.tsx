"use client"

import React from "react"
import Badge from "@/components/ui/badge/Badge"
import { ControlTenant, ControlProject, ProjectType, ProjectStatus } from "@/lib/control/types"

interface TenantCardProps {
  tenant: ControlTenant
  onActivate: (tenant: ControlTenant) => void
}

const AVATAR_COLORS = [
  "bg-brand-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-orange-500",
]

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return AVATAR_COLORS[code % 7]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}mi`
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`
  return `R$ ${value}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const PROJECT_TYPE_STYLES: Record<ProjectType, string> = {
  crm: "bg-brand-50 text-brand-600",
  sdr: "bg-violet-50 text-violet-600",
  radar: "bg-sky-50 text-sky-600",
  social: "bg-orange-50 text-orange-600",
  ia_onboarding: "bg-emerald-50 text-emerald-600",
}

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  crm: "CRM",
  sdr: "SDR",
  radar: "Radar",
  social: "Social",
  ia_onboarding: "IA Onboarding",
}

function StatusDot({ status }: { status: ProjectStatus }) {
  if (status === "active") {
    return <span className="w-1.5 h-1.5 rounded-full bg-success-500 inline-block" />
  }
  if (status === "provisioning") {
    return <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse inline-block" />
  }
  if (status === "error") {
    return <span className="w-1.5 h-1.5 rounded-full bg-error-500 inline-block" />
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
}

function RobotIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block"
    >
      <rect x="2" y="4" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="4" y="6" width="1.5" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="6.5" y="6" width="1.5" height="1.5" rx="0.5" fill="currentColor" />
      <line x1="6" y1="4" x2="6" y2="2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="6" cy="1.5" r="0.75" fill="currentColor" />
      <line x1="2" y1="8" x2="0.5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="10" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function ProjectChips({ projects }: { projects: ControlProject[] }) {
  const agents = projects
    .filter((p) => p.agent_name)
    .map((p) => p.agent_name)
    .filter((v, i, arr) => arr.indexOf(v) === i)

  return (
    <div className="flex flex-wrap gap-1.5">
      {projects.map((project) => (
        <span
          key={project.id}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-theme-xs font-medium ${PROJECT_TYPE_STYLES[project.type]}`}
        >
          <StatusDot status={project.status} />
          {PROJECT_TYPE_LABELS[project.type]}
        </span>
      ))}
      {agents.map((agentName) => (
        <span
          key={agentName}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-theme-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          <RobotIcon />
          {agentName}
        </span>
      ))}
    </div>
  )
}

export default function TenantCard({ tenant, onActivate }: TenantCardProps) {
  const avatarColor = getAvatarColor(tenant.name)
  const initials = getInitials(tenant.name)

  const planBadgeColor = tenant.plan === "starter" ? "light" : tenant.plan === "growth" ? "primary" : "dark"
  const statusBadgeColor =
    tenant.status === "active" ? "success" : tenant.status === "inactive" ? "warning" : "error"

  const conversionColor =
    tenant.stats.conversion_rate === 0
      ? "text-error-500"
      : tenant.stats.conversion_rate < 20
      ? "text-warning-500"
      : "text-success-500"

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-800 transition-all w-full">
      {/* Header */}
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${avatarColor}`}
          >
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-white/90 leading-tight">
              {tenant.name}
            </p>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">@{tenant.slug}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="solid" color={planBadgeColor} size="sm">
            {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
          </Badge>
          <Badge variant="light" color={statusBadgeColor} size="sm">
            {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-1">Leads Ativos</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white/90">
            {tenant.stats.active_leads}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-1">Valor Pipeline</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white/90">
            {formatValue(tenant.stats.pipeline_value)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-1">Conversão</p>
          <p className={`text-lg font-bold ${conversionColor}`}>
            {tenant.stats.conversion_rate.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-1">Ganhos</p>
          <p className="text-lg font-bold text-success-500">
            {tenant.stats.won_leads} leads
          </p>
        </div>
      </div>

      {/* Modules */}
      {tenant.projects.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-theme-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Módulos
          </p>
          <ProjectChips projects={tenant.projects} />
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-800 mt-2 flex items-center justify-between">
        <span className="text-theme-xs text-gray-400">
          Cliente desde {formatDate(tenant.created_at)}
        </span>
        <button
          onClick={() => onActivate(tenant)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition"
        >
          <span className="text-sm leading-none">+</span>
          ATIVAR PROJETO
        </button>
      </div>
    </div>
  )
}
