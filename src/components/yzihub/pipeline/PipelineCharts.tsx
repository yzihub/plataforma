"use client";

import type { Lead, PipelineStage } from "@/lib/crm/types";

interface Broker {
  id: string;
  name: string;
}

interface PipelineChartsProps {
  leads: Lead[];
  stages: PipelineStage[];
  brokers: Broker[];
}

const SOURCES = ["WhatsApp", "Instagram", "Indicação", "Site", "Google Ads", "LinkedIn", "Zap Imóveis", "Outros"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PipelineCharts({ leads, stages, brokers }: PipelineChartsProps) {
  const totalLeads = leads.length || 1;

  // Funil: count per stage (ordered, no lost)
  const funnelStages = stages
    .filter((s) => !s.is_lost)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      ...s,
      count: leads.filter((l) => l.stage_id === s.id).length,
    }));
  const maxFunnel = Math.max(...funnelStages.map((s) => s.count), 1);

  // Origens
  const sourceCounts = SOURCES.map((src) => {
    const count =
      src === "Outros"
        ? leads.filter((l) => !l.source || !SOURCES.slice(0, -1).includes(l.source)).length
        : leads.filter((l) => l.source === src).length;
    return { label: src, count };
  }).filter((s) => s.count > 0);
  const maxSource = Math.max(...sourceCounts.map((s) => s.count), 1);

  // Performance por corretor
  const brokerStats = brokers.map((broker) => {
    const brokerLeads = leads.filter((l) => l.assigned_to === broker.id);
    const won = brokerLeads.filter((l) => l.status === "won").length;
    const convRate = brokerLeads.length > 0 ? Math.round((won / brokerLeads.length) * 100) : 0;
    return {
      ...broker,
      total: brokerLeads.length,
      won,
      convRate,
    };
  }).filter((b) => b.total > 0);

  // Also include leads assigned to names not in brokers list (like "luana", "nina" from mock)
  const knownBrokerIds = new Set(brokers.map((b) => b.id));
  const unknownAssigned = [...new Set(leads.map((l) => l.assigned_to).filter((a): a is string => !!a && !knownBrokerIds.has(a)))];
  const unknownStats = unknownAssigned.map((id) => {
    const brokerLeads = leads.filter((l) => l.assigned_to === id);
    const won = brokerLeads.filter((l) => l.status === "won").length;
    const convRate = brokerLeads.length > 0 ? Math.round((won / brokerLeads.length) * 100) : 0;
    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      total: brokerLeads.length,
      won,
      convRate,
    };
  });

  const allBrokerStats = [...brokerStats, ...unknownStats];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Funil de leads */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Funil de Leads</h3>
        <div className="flex flex-col gap-2.5">
          {funnelStages.map((stage) => {
            const width = Math.round((stage.count / maxFunnel) * 100);
            return (
              <div key={stage.id}>
                <div className="flex justify-between text-xs text-gray-500 dark:text-white/40 mb-1">
                  <span className="truncate">{stage.name}</span>
                  <span className="font-medium text-gray-700 dark:text-white/70 ml-2">{stage.count}</span>
                </div>
                <div className="h-5 rounded bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${width}%`,
                      backgroundColor: stage.color || "#6366f1",
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {funnelStages.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">Sem dados</p>
          )}
        </div>
      </div>

      {/* Origem dos leads */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Origem dos Leads</h3>
        <div className="flex flex-col gap-3">
          {sourceCounts.map((src) => {
            const width = Math.round((src.count / maxSource) * 100);
            return (
              <div key={src.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-white/60">{src.label}</span>
                  <span className="font-medium text-gray-700 dark:text-white/70">{src.count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
          {sourceCounts.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">Sem dados</p>
          )}
        </div>
      </div>

      {/* Performance por corretor */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Performance por Corretor</h3>
        <div className="flex flex-col gap-3">
          {allBrokerStats.map((broker) => (
            <div key={broker.id} className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  {getInitials(broker.name)}
                </span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-medium text-gray-700 dark:text-white/80 truncate">{broker.name}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 ml-2 shrink-0">
                    {broker.total} leads
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success-500 transition-all"
                    style={{ width: `${broker.convRate}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{broker.convRate}% conversão</p>
              </div>
            </div>
          ))}
          {allBrokerStats.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">Sem corretores ativos</p>
          )}
        </div>
      </div>
    </div>
  );
}
