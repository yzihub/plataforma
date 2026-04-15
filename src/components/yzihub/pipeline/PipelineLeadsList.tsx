"use client";

import { useState } from "react";
import type { Lead } from "@/lib/crm/types";

interface Broker {
  id: string;
  name: string;
}

interface PipelineLeadsListProps {
  leads: Lead[];
  brokers: Broker[];
  onAssignBroker: (leadId: string) => void;
  onReassignBroker: (leadId: string) => void;
}

type TabFilter = "all" | "no_broker" | "stalled" | "hot";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FINAL_STATUSES = ["won", "lost"];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  contacted: { label: "Contato", className: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  qualified: { label: "Agendado", className: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  meeting: { label: "Visita", className: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  proposal: { label: "Proposta", className: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  negotiation: { label: "Contrato", className: "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  won: { label: "Fechado", className: "bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400" },
  lost: { label: "Perdido", className: "bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getBrokerName(assignedTo: string | null, brokers: Broker[]): string | null {
  if (!assignedTo) return null;
  const b = brokers.find((b) => b.id === assignedTo);
  return b ? b.name : assignedTo.charAt(0).toUpperCase() + assignedTo.slice(1);
}

export default function PipelineLeadsList({
  leads,
  brokers,
  onAssignBroker,
  onReassignBroker,
}: PipelineLeadsListProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const now = Date.now();

  const filteredLeads = leads.filter((l) => {
    if (activeTab === "no_broker") return !l.assigned_to && !FINAL_STATUSES.includes(l.status);
    if (activeTab === "stalled") {
      if (FINAL_STATUSES.includes(l.status)) return false;
      if (!l.last_action_at) return true;
      return now - new Date(l.last_action_at).getTime() > THREE_DAYS_MS;
    }
    if (activeTab === "hot") return (l.score ?? 0) >= 80 && ["new", "contacted", "qualified"].includes(l.status);
    return true;
  });

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: leads.length },
    {
      key: "no_broker",
      label: "Sem corretor",
      count: leads.filter((l) => !l.assigned_to && !FINAL_STATUSES.includes(l.status)).length,
    },
    {
      key: "stalled",
      label: "Parados",
      count: leads.filter((l) => {
        if (FINAL_STATUSES.includes(l.status)) return false;
        if (!l.last_action_at) return true;
        return now - new Date(l.last_action_at).getTime() > THREE_DAYS_MS;
      }).length,
    },
    {
      key: "hot",
      label: "Quentes",
      count: leads.filter((l) => (l.score ?? 0) >= 80 && ["new", "contacted", "qualified"].includes(l.status)).length,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] overflow-hidden">
      {/* Header with Tabs */}
      <div className="px-5 pt-5 pb-0 border-b border-gray-100 dark:border-white/[0.05]">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Leads Operacionais</h3>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-brand-500 text-white"
                  : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/50"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lead rows */}
      <div>
        {filteredLeads.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400 dark:text-white/30">
            Nenhum lead nesta categoria
          </div>
        )}
        {filteredLeads.map((lead, idx) => {
          const stalledDays = daysSince(lead.last_action_at);
          const isStalled = !FINAL_STATUSES.includes(lead.status) && (stalledDays === null || stalledDays > 3);
          const brokerName = getBrokerName(lead.assigned_to, brokers);
          const badge = STATUS_BADGE[lead.status] ?? { label: lead.status, className: "bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/50" };

          return (
            <div
              key={lead.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                idx < filteredLeads.length - 1 ? "border-b border-gray-100 dark:border-white/[0.05]" : ""
              } hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors`}
            >
              {/* Avatar do corretor */}
              <div className="shrink-0">
                {brokerName ? (
                  <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {getInitials(brokerName)}
                    </span>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] border-2 border-dashed border-gray-300 dark:border-white/[0.12] flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-400 dark:text-white/30">?</span>
                  </div>
                )}
              </div>

              {/* Lead info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{lead.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                  {(lead.score ?? 0) >= 80 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400">
                      Quente
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-white/40">
                  {lead.phone && <span>{lead.phone}</span>}
                  {lead.source && (
                    <>
                      <span>·</span>
                      <span>{lead.source}</span>
                    </>
                  )}
                  {isStalled && !FINAL_STATUSES.includes(lead.status) && (
                    <>
                      <span>·</span>
                      <span className="text-error-500 dark:text-error-400 font-medium">
                        Parado há {stalledDays ?? "?"} dias
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Button group */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!lead.assigned_to ? (
                  <button
                    onClick={() => onAssignBroker(lead.id)}
                    title="Enviar para corretor"
                    className="flex items-center gap-1 rounded-lg bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-[11px] text-white font-medium transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Enviar p/ corretor
                  </button>
                ) : (
                  <button
                    onClick={() => onReassignBroker(lead.id)}
                    title="Alterar corretor"
                    className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.08] px-2.5 py-1 text-[11px] text-gray-700 dark:text-white/70 font-medium transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Alterar corretor
                  </button>
                )}
                <button
                  title="Ver detalhes"
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.08] text-gray-500 dark:text-white/40 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
