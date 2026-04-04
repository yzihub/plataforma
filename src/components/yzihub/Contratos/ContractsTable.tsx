"use client";

import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CONTRACT_STATUS_CONFIG, CONTRACT_TYPE_LABELS } from "@/types/contracts";
import type { Contract } from "@/types/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarBg(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ContractsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <Table>
        <TableHeader className="border-b border-gray-100 dark:border-gray-800">
          <TableRow>
            {["Cliente", "Imovel", "Corretor", "VGV", "Status", "Atualizado", "Acoes"].map((h) => (
              <TableCell key={h} isHeader className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="border-b border-gray-100 dark:border-gray-800">
              {Array.from({ length: 7 }).map((__, j) => (
                <TableCell key={j} className="px-4 py-4">
                  <div className="h-4 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: j === 0 ? "140px" : j === 3 ? "80px" : "100px" }} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function ContractsEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <div className="text-5xl mb-4">📋</div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-white/90 mb-1">
        {hasFilters ? "Nenhum contrato encontrado" : "Nenhum contrato ainda"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs">
        {hasFilters
          ? "Tente ajustar os filtros ou a busca para encontrar contratos."
          : "Crie o primeiro contrato clicando em '+ Novo Contrato'."}
      </p>
    </div>
  );
}

// ─── Action Dropdown ──────────────────────────────────────────────────────────

function ActionMenu({
  contract,
  onView,
  onCancel,
}: {
  contract: Contract;
  onView: (c: Contract) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="group relative inline-block">
      <button className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400 transition-colors">
        <span>•••</span>
      </button>
      {/* Dropdown */}
      <div className="absolute right-0 top-full z-50 mt-1 w-44 origin-top-right scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <button
          onClick={() => onView(contract)}
          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-t-xl transition-colors"
        >
          Ver detalhes
        </button>
        <button
          onClick={() => onView(contract)}
          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
        >
          Editar
        </button>
        {contract.status !== "cancelado" && (
          <button
            onClick={() => onCancel(contract.id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-b-xl transition-colors"
          >
            Cancelar contrato
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Table Component ─────────────────────────────────────────────────────

interface ContractsTableProps {
  contracts: Contract[];
  onRowClick: (contract: Contract) => void;
  onCancelContract?: (id: string) => void;
}

export default function ContractsTable({
  contracts,
  onRowClick,
  onCancelContract,
}: ContractsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <Table>
        <TableHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <TableRow>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Cliente
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Imovel
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Corretor
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              VGV
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Status
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
              Atualizado
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
              Acoes
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {contracts.map((contract) => {
            const statusCfg = CONTRACT_STATUS_CONFIG[contract.status];

            return (
              <TableRow
                key={contract.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                onClick={() => onRowClick(contract)}
              >
                {/* Cliente */}
                <TableCell className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg(contract.id)}`}
                    >
                      {getInitials(contract.lead_name)}
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-white/90 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {contract.lead_name}
                    </span>
                  </div>
                </TableCell>

                {/* Imovel */}
                <TableCell className="px-4 py-3.5">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {contract.project_name ?? "—"}
                  </span>
                </TableCell>

                {/* Corretor */}
                <TableCell className="px-4 py-3.5">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {contract.corretor_name ?? "—"}
                  </span>
                </TableCell>

                {/* VGV */}
                <TableCell className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatCurrency(contract.value)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="px-4 py-3.5">
                  <Badge size="sm" color={statusCfg.color}>
                    {statusCfg.label}
                  </Badge>
                </TableCell>

                {/* Atualizado */}
                <TableCell className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-xs text-gray-400">
                    {formatDate(contract.updated_at)}
                  </span>
                </TableCell>

                {/* Acoes */}
                <TableCell className="px-4 py-3.5 text-right">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      contract={contract}
                      onView={onRowClick}
                      onCancel={onCancelContract ?? (() => {})}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
