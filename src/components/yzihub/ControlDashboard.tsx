"use client";

import { useState } from "react";
import { ControlDashboardData, ControlTenant } from "@/lib/control/types";
import TenantCard from "@/components/yzihub/TenantCard";
import ActivateProjectModal from "@/components/yzihub/ActivateProjectModal";
import JobQueueFeed from "@/components/yzihub/JobQueueFeed";
import ActionLogTable from "@/components/yzihub/ActionLogTable";
import Badge from "@/components/ui/badge/Badge";

// ─── Inline Icons ─────────────────────────────────────────────────────────────

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand-500">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 21V9h6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-success-500">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-violet-500">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 19c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 13c2.21 0 4 1.79 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-amber-500">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-warning-500">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-error-500">
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "default" | "success" | "warning" | "error";
}

function MetricCard({ icon, label, value, accent = "default" }: MetricCardProps) {
  const valueColor =
    accent === "error" && value > 0
      ? "text-error-600 dark:text-error-400"
      : accent === "warning" && value > 0
      ? "text-warning-600 dark:text-warning-400"
      : accent === "success"
      ? "text-success-600 dark:text-success-400"
      : "text-gray-900 dark:text-white";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

// ─── Job Stats Mini Card ──────────────────────────────────────────────────────

function JobStatsCard({ data }: { data: ControlDashboardData }) {
  const jobs = data.recent_jobs;
  const counts = {
    done: jobs.filter((j) => j.status === "done").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    pending: jobs.filter((j) => j.status === "pending").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Status dos Jobs</h3>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5">Últimos {jobs.length} jobs</p>
      </div>
      <div className="px-5 py-4 flex flex-wrap gap-2">
        <Badge variant="light" color="success" size="sm">{counts.done} concluídos</Badge>
        <Badge variant="light" color="primary" size="sm">{counts.processing} executando</Badge>
        <Badge variant="light" color="warning" size="sm">{counts.pending} pendentes</Badge>
        <Badge variant="light" color="error" size="sm">{counts.failed} falhas</Badge>
      </div>
      {failedJobs.length > 0 && (
        <div className="px-5 pb-4 flex flex-col gap-2">
          <p className="text-theme-xs font-medium text-error-600 dark:text-error-400 uppercase tracking-wide">
            Falhas recentes
          </p>
          {failedJobs.slice(0, 3).map((j) => (
            <div key={j.id} className="rounded-lg bg-error-50 dark:bg-error-900/20 px-3 py-2">
              <p className="text-theme-xs font-medium text-error-700 dark:text-error-400">
                {j.tenant_name} — {j.action.replace(/_/g, " ")}
              </p>
              {j.error && (
                <p className="text-theme-xs text-error-500 dark:text-error-500 mt-0.5 truncate">
                  {j.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface ControlDashboardProps {
  data: ControlDashboardData;
}

export default function ControlDashboard({ data }: ControlDashboardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<ControlTenant | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function handleActivate(tenant: ControlTenant) {
    setSelectedTenant(tenant);
    setModalOpen(true);
  }

  function handleActivateNew() {
    setSelectedTenant(null);
    setModalOpen(true);
  }

  function handleModalSuccess({ tenant_name, modules }: { tenant_name: string; modules: string[] }) {
    setToast({
      message: `Projeto "${tenant_name}" ativado com ${modules.length} módulo(s)!`,
      type: "success",
    });
    setTimeout(() => setToast(null), 4000);
  }

  const { global_stats } = data;

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-theme-sm transition-all ${
            toast.type === "success" ? "bg-success-500" : "bg-error-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">YZI CONTROL</h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400 mt-1">
            Painel Admin Global — visão completa da plataforma
          </p>
        </div>
        <button
          onClick={handleActivateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition shadow-theme-xs"
        >
          <PlusIcon />
          ATIVAR NOVO PROJETO
        </button>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={<BuildingIcon />} label="Tenants" value={global_stats.total_tenants} />
        <MetricCard icon={<CheckCircleIcon />} label="Ativos" value={global_stats.active_tenants} accent="success" />
        <MetricCard icon={<UsersIcon />} label="Leads Total" value={global_stats.total_leads} />
        <MetricCard icon={<ActivityIcon />} label="Jobs Hoje" value={global_stats.total_jobs_today} />
        <MetricCard icon={<ClockIcon />} label="Pendentes" value={global_stats.jobs_pending} accent="warning" />
        <MetricCard icon={<AlertIcon />} label="Falhas" value={global_stats.jobs_failed} accent="error" />
      </div>

      {/* Tenant Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Clientes</h2>
          <Badge variant="light" color="primary" size="sm">
            {data.tenants.length} tenant{data.tenants.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.tenants.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} onActivate={handleActivate} />
          ))}
        </div>
      </div>

      {/* Jobs + Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JobQueueFeed initialJobs={data.recent_jobs} />
        <JobStatsCard data={data} />
      </div>

      {/* Action Logs */}
      <ActionLogTable
        logs={data.recent_logs}
        tenants={data.tenants.map((t) => ({ id: t.id, name: t.name }))}
      />

      {/* Activate Modal */}
      <ActivateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tenant={selectedTenant}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
