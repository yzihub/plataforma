"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import Badge from "@/components/ui/badge/Badge";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  GroupIcon,
  DollarLineIcon,
  PieChartIcon,
  CheckCircleIcon,
} from "@/icons";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Mock data (substituir por queries Supabase) ─────────────────────────────

const stats = [
  {
    label: "Total de Leads",
    value: "248",
    change: "+12,5%",
    up: true,
    icon: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
    sparkline: [12, 18, 14, 22, 19, 25, 28, 24, 30, 27, 34, 32],
    color: "#465FFF",
  },
  {
    label: "Leads Convertidos",
    value: "61",
    change: "+8,2%",
    up: true,
    icon: <CheckCircleIcon className="text-gray-800 size-6 dark:text-white/90" />,
    sparkline: [4, 6, 5, 8, 7, 9, 10, 8, 11, 10, 13, 12],
    color: "#17B26A",
  },
  {
    label: "Valor no Pipeline",
    value: "R$ 184.500",
    change: "+21,3%",
    up: true,
    icon: <DollarLineIcon className="text-gray-800 size-6 dark:text-white/90" />,
    sparkline: [8000, 12000, 10000, 15000, 13000, 18000, 20000, 17000, 22000, 19000, 25000, 23000],
    color: "#F79009",
  },
  {
    label: "Taxa de Conversão",
    value: "24,6%",
    change: "-1,8%",
    up: false,
    icon: <PieChartIcon className="text-gray-800 size-6 dark:text-white/90" />,
    sparkline: [28, 26, 29, 25, 27, 24, 26, 23, 25, 24, 25, 24],
    color: "#F04438",
  },
];

const last30Days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return `${d.getDate()}/${d.getMonth() + 1}`;
});

const leadsPerDayData = [
  2, 4, 3, 5, 6, 4, 7, 8, 5, 9, 7, 10, 8, 11, 9, 12, 10, 8, 13, 11, 14, 12,
  10, 15, 13, 16, 12, 14, 17, 15,
];

const origemData = [62, 48, 38, 100];
const origemCategorias = ["Instagram", "Site", "Indicação", "WhatsApp"];

const statusData = [40, 55, 70, 45, 38];
const statusLabels = ["Novo", "Contato", "Qualificado", "Proposta", "Fechado"];
const statusColors = ["#465FFF", "#F79009", "#17B26A", "#9B8AFB", "#F04438"];

// ─── Sparkline ────────────────────────────────────────────────────────────────

function sparklineOptions(color: string): ApexOptions {
  return {
    chart: {
      type: "line",
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    stroke: { curve: "smooth", width: 2 },
    colors: [color],
    tooltip: { enabled: false },
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  change,
  up,
  icon,
  sparkline,
  color,
}: (typeof stats)[0]) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          {icon}
        </div>
        <div className="w-20 h-10">
          <ReactApexChart
            options={sparklineOptions(color)}
            series={[{ data: sparkline }]}
            type="line"
            height={40}
            width={80}
          />
        </div>
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {value}
          </h4>
        </div>
        <Badge color={up ? "success" : "error"}>
          {up ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {change}
        </Badge>
      </div>
    </div>
  );
}

// ─── Line Chart — Leads por dia ───────────────────────────────────────────────

function LeadsPorDiaChart() {
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
      categories: last30Days,
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
        <ReactApexChart
          options={options}
          series={[{ name: "Leads", data: leadsPerDayData }]}
          type="area"
          height={280}
        />
      </div>
    </div>
  );
}

// ─── Bar Chart — Leads por origem ────────────────────────────────────────────

function LeadsPorOrigemChart() {
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
      categories: origemCategorias,
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
      <ReactApexChart
        options={options}
        series={[{ name: "Leads", data: origemData }]}
        type="bar"
        height={280}
      />
    </div>
  );
}

// ─── Donut Chart — Status do pipeline ────────────────────────────────────────

function StatusDistribuicaoChart() {
  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      background: "transparent",
    },
    colors: statusColors,
    labels: statusLabels,
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
              formatter: () => `${statusData.reduce((a, b) => a + b, 0)}`,
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
      <ReactApexChart
        options={options}
        series={statusData}
        type="donut"
        height={300}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CockpitDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visão geral do seu negócio • últimos 30 dias
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Line Chart — largura total */}
      <LeadsPorDiaChart />

      {/* Bar + Donut — lado a lado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
        <LeadsPorOrigemChart />
        <StatusDistribuicaoChart />
      </div>
    </div>
  );
}
