"use client";

import type { Lead } from "@/lib/crm/types";

type AlertType = "no_broker" | "stalled" | "hot_no_followup";

interface PipelineAlertsProps {
  leads: Lead[];
  onAlertClick?: (type: AlertType) => void;
}

const FINAL_STATUSES = ["won", "lost"];
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function PipelineAlerts({ leads, onAlertClick }: PipelineAlertsProps) {
  const now = Date.now();

  const noBroker = leads.filter((l) => !l.assigned_to && !FINAL_STATUSES.includes(l.status));

  const stalled = leads.filter((l) => {
    if (FINAL_STATUSES.includes(l.status)) return false;
    if (!l.last_action_at) return true;
    return now - new Date(l.last_action_at).getTime() > THREE_DAYS_MS;
  });

  const hotNoFollowup = leads.filter(
    (l) => (l.score ?? 0) >= 80 && ["new", "contacted", "qualified"].includes(l.status)
  );

  const alerts = [
    {
      type: "no_broker" as AlertType,
      label: "Sem corretor",
      description: "Leads aguardando atribuição",
      count: noBroker.length,
      color: "text-warning-500",
      bgColor: "bg-warning-50 dark:bg-warning-500/10",
      borderColor: "border-warning-200 dark:border-warning-500/20",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      type: "stalled" as AlertType,
      label: "Leads parados",
      description: "Sem ação há mais de 3 dias",
      count: stalled.length,
      color: "text-error-500",
      bgColor: "bg-error-50 dark:bg-error-500/10",
      borderColor: "border-error-200 dark:border-error-500/20",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      type: "hot_no_followup" as AlertType,
      label: "Leads quentes",
      description: "Score alto sem follow-up",
      count: hotNoFollowup.length,
      color: "text-success-500",
      bgColor: "bg-success-50 dark:bg-success-500/10",
      borderColor: "border-success-200 dark:border-success-500/20",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {alerts.map((alert) => (
        <div
          key={alert.type}
          className={`rounded-2xl border ${alert.borderColor} ${alert.bgColor} p-5 flex items-start gap-4`}
        >
          <div className={`${alert.color} mt-0.5 shrink-0`}>{alert.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-800 dark:text-white/90 leading-none mb-1">
              {alert.count}
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-white/80">{alert.label}</p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{alert.description}</p>
          </div>
          {onAlertClick && (
            <button
              onClick={() => onAlertClick(alert.type)}
              className={`text-xs ${alert.color} hover:underline font-medium shrink-0 mt-1`}
            >
              Ver
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
