"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import Badge from "@/components/ui/badge/Badge";
// DIAGNOSTIC TEST — direct imports (bypass barrel)
import ArrowUpIcon from "@/icons/arrow-up.svg";
import GroupIcon from "@/icons/group.svg";
import BoltIcon from "@/icons/bolt.svg";
import ChatIcon from "@/icons/chat.svg";
import BoxIcon from "@/icons/box.svg";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardStats = {
  total_leads: number;
  leads_quentes: number;
  conversas_abertas: number;
  imoveis_disponiveis: number;
  mensagens_recentes: number;
  corretores_ativos: number;
  leads_por_dia: Array<{ date: string; count: number }>;
  leads_por_origem: Array<{ source: string; count: number }>;
  status_pipeline: Array<{ status: string; count: number }>;
};

// ─── Chart helpers ────────────────────────────────────────────────────────────

const statusColors = ["#465FFF", "#F79009", "#17B26A", "#9B8AFB", "#F04438"];

function formatDateLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}`;
}

function EmptyChartState() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-800 dark:text-gray-600">
      Sem dados no período
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  loading,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] md:p-8">
      <div className="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl dark:bg-gray-800">
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <h4 className="mt-2 text-3xl font-bold text-gray-800 dark:text-white/90">
          {loading ? (
            <span className="inline-block w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            value
          )}
        </h4>
        {sub && (
          <div className="flex items-center gap-2 mt-3">
            <Badge color="success">
              <ArrowUpIcon />
              {sub}
            </Badge>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              últimas 24h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function LeadsPorDiaChart({ data }: { data: DashboardStats["leads_por_dia"] }) {
  const categories = data.map((item) => formatDateLabel(item.date));
  const seriesData = data.map((item) => item.count);
  const hasData = seriesData.some((count) => count > 0);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 280,
      toolbar: { show: false },
      background: "transparent",
    },
    colors: ["#465FFF"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0.0 },
    },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: "11px", colors: "#9CA3AF" },
        hideOverlappingLabels: true,
      },
      tickAmount: 10,
    },
    yaxis: {
      labels: { style: { fontSize: "12px", colors: ["#9CA3AF"] } },
    },
    grid: { borderColor: "#1F2937", strokeDashArray: 4 },
    tooltip: { theme: "dark", x: { show: true } },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Leads por Dia
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Últimos 30 dias</p>
      </div>
      <div className="max-w-full overflow-x-auto">
        {hasData ? (
          <ReactApexChart
            options={options}
            series={[{ name: "Leads", data: seriesData }]}
            type="area"
            height={280}
          />
        ) : (
          <EmptyChartState />
        )}
      </div>
    </div>
  );
}

function LeadsPorOrigemChart({ data }: { data: DashboardStats["leads_por_origem"] }) {
  const categories = data.map((item) => item.source);
  const seriesData = data.map((item) => item.count);
  const hasData = seriesData.some((count) => count > 0);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 280,
      toolbar: { show: false },
      background: "transparent",
    },
    colors: ["#465FFF"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "13px", colors: "#9CA3AF" } },
    },
    yaxis: {
      labels: { style: { fontSize: "12px", colors: ["#9CA3AF"] } },
    },
    grid: { borderColor: "#1F2937", strokeDashArray: 4 },
    tooltip: { theme: "dark", y: { formatter: (v) => `${v} leads` } },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Leads por Origem
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Distribuição por canal de entrada
        </p>
      </div>
      {hasData ? (
        <ReactApexChart
          options={options}
          series={[{ name: "Leads", data: seriesData }]}
          type="bar"
          height={280}
        />
      ) : (
        <EmptyChartState />
      )}
    </div>
  );
}

function StatusDistribuicaoChart({ data }: { data: DashboardStats["status_pipeline"] }) {
  const labels = data.map((item) => item.status);
  const seriesData = data.map((item) => item.count);
  const hasData = seriesData.some((count) => count > 0);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      background: "transparent",
    },
    colors: statusColors,
    labels,
    legend: {
      position: "bottom",
      fontFamily: "Outfit, sans-serif",
      labels: { colors: "#9CA3AF" },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontFamily: "Outfit, sans-serif" },
      formatter: (val: number) => `${val.toFixed(0)}%`,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              fontSize: "14px",
              color: "#9CA3AF",
              formatter: () => `${seriesData.reduce((a, b) => a + b, 0)}`,
            },
          },
        },
      },
    },
    tooltip: { theme: "dark", y: { formatter: (v) => `${v} leads` } },
    stroke: { width: 2, colors: ["#111928"] },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Status do Pipeline
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Distribuição atual por etapa
        </p>
      </div>
      {hasData ? (
        <ReactApexChart
          options={options}
          series={seriesData}
          type="donut"
          height={300}
        />
      ) : (
        <EmptyChartState />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CockpitDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data: DashboardStats) => setStats(data))
      .catch((err) => console.error("[Dashboard] stats error:", err))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total de Leads",
      value: stats?.total_leads ?? 0,
      icon: <GroupIcon className="text-gray-800 size-7 dark:text-white/90" />,
    },
    {
      label: "Leads Quentes",
      value: stats?.leads_quentes ?? 0,
      icon: <BoltIcon className="text-gray-800 size-7 dark:text-white/90" />,
    },
    {
      label: "Conversas Abertas",
      value: stats?.conversas_abertas ?? 0,
      sub: stats ? `${stats.mensagens_recentes} msgs` : undefined,
      icon: <ChatIcon className="text-gray-800 size-7 dark:text-white/90" />,
    },
    {
      label: "Imóveis Disponíveis",
      value: stats?.imoveis_disponiveis ?? 0,
      icon: <BoxIcon className="text-gray-800 size-7 dark:text-white/90" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visão geral do seu negócio • tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {cards.map((c) => (
          <StatCard key={c.label} loading={loading} {...c} />
        ))}
      </div>

      <LeadsPorDiaChart data={stats?.leads_por_dia ?? []} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
        <LeadsPorOrigemChart data={stats?.leads_por_origem ?? []} />
        <StatusDistribuicaoChart data={stats?.status_pipeline ?? []} />
      </div>
    </div>
  );
}
