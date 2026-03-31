"use client";

import React, { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import type { ControlTenant, TenantPlan } from "@/lib/control/types";
import { createTenant, enqueueFactoryActivate } from "@/lib/control/tenant-actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function statusBadgeColor(status: string): "success" | "warning" | "error" | "light" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  if (status === "suspended") return "error";
  return "light";
}

function planBadgeColor(plan: TenantPlan): "light" | "primary" | "dark" {
  if (plan === "starter") return "light";
  if (plan === "growth") return "primary";
  return "dark"; // enterprise
}

const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

// ── Spinner ───────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg
    className="size-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ── Activate Button ───────────────────────────────────────────────────────────

function ActivateButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"idle" | "ok" | "err">("idle");

  function handleClick() {
    setFeedback("idle");
    startTransition(async () => {
      const result = await enqueueFactoryActivate(tenantId);
      setFeedback(result.success ? "ok" : "err");
      // Reset label after 2.5 s
      setTimeout(() => setFeedback("idle"), 2500);
    });
  }

  if (feedback === "ok") {
    return (
      <Button size="sm" variant="outline" disabled className="text-success-600 dark:text-success-400 border-success-300 dark:border-success-700">
        Enfileirado ✓
      </Button>
    );
  }

  if (feedback === "err") {
    return (
      <Button size="sm" variant="outline" disabled className="text-error-600 dark:text-error-400 border-error-300 dark:border-error-700">
        Erro — tente novamente
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      startIcon={isPending ? <Spinner /> : undefined}
    >
      {isPending ? "Ativando…" : "Ativar Projeto"}
    </Button>
  );
}

// ── New Tenant Form ───────────────────────────────────────────────────────────

type FormState = { name: string; slug: string; plan: TenantPlan };
const DEFAULT_FORM: FormState = { name: "", slug: "", plan: "starter" };

function NewTenantModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tenant: { name: string; slug: string; plan: TenantPlan }) => void;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, slug: e.target.value }));
  }

  function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((f) => ({ ...f, plan: e.target.value as TenantPlan }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTenant(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCreated(form);
      setForm(DEFAULT_FORM);
      onClose();
    });
  }

  function handleClose() {
    setForm(DEFAULT_FORM);
    setError(null);
    onClose();
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  const labelClass = "block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md mx-4 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
        Novo Tenant
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nome */}
        <div>
          <label className={labelClass}>Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={handleNameChange}
            placeholder="Ex: Acme Corp"
            required
            className={inputClass}
          />
        </div>

        {/* Slug */}
        <div>
          <label className={labelClass}>Slug *</label>
          <input
            type="text"
            value={form.slug}
            onChange={handleSlugChange}
            placeholder="acme-corp"
            required
            pattern="[a-z0-9-]+"
            title="Apenas letras minúsculas, números e hífens"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            Identificador único — apenas letras minúsculas, números e hífens.
          </p>
        </div>

        {/* Plano */}
        <div>
          <label className={labelClass}>Plano</label>
          <select
            value={form.plan}
            onChange={handlePlanChange}
            className={inputClass}
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2 text-sm text-error-600 dark:text-error-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Criando…" : "Criar Tenant"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Table Component ──────────────────────────────────────────────────────

type Props = {
  initialTenants: ControlTenant[];
};

export default function TenantsTable({ initialTenants }: Props) {
  const { isOpen, openModal, closeModal } = useModal();
  const [tenants, setTenants] = useState<ControlTenant[]>(initialTenants);

  function handleTenantCreated(t: { name: string; slug: string; plan: TenantPlan }) {
    // Optimistic update: add a skeleton row immediately
    const optimistic: ControlTenant = {
      id: `optimistic-${Date.now()}`,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: "active",
      projects: [],
      stats: {
        total_leads: 0,
        active_leads: 0,
        won_leads: 0,
        pipeline_value: 0,
        conversion_rate: 0,
      },
      created_at: new Date().toISOString(),
    };
    setTenants((prev) => [optimistic, ...prev]);
  }

  const COLS = ["Nome", "Slug", "Plano", "Status", "Módulos", "Criado em", "Ações"];

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tenants.length} cliente{tenants.length !== 1 ? "s" : ""} cadastrado{tenants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo Tenant
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {COLS.map((col) => (
                  <TableCell
                    key={col}
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap"
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-600">
                    Nenhum tenant encontrado.
                  </TableCell>
                </TableRow>
              )}
              {tenants.map((t) => (
                <TableRow key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  {/* Nome */}
                  <TableCell className="px-5 py-4 text-start">
                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {t.name}
                    </span>
                  </TableCell>

                  {/* Slug */}
                  <TableCell className="px-5 py-4 text-start">
                    <code className="rounded bg-gray-100 dark:bg-white/[0.05] px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {t.slug}
                    </code>
                  </TableCell>

                  {/* Plano */}
                  <TableCell className="px-5 py-4 text-start">
                    <Badge size="sm" color={planBadgeColor(t.plan)}>
                      {PLAN_LABELS[t.plan]}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-5 py-4 text-start">
                    <Badge size="sm" color={statusBadgeColor(t.status)}>
                      {t.status === "active"
                        ? "Ativo"
                        : t.status === "inactive"
                        ? "Inativo"
                        : "Suspenso"}
                    </Badge>
                  </TableCell>

                  {/* Módulos */}
                  <TableCell className="px-5 py-4 text-start">
                    {t.projects.length === 0 ? (
                      <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {t.projects.slice(0, 3).map((p) => (
                          <span
                            key={p.id}
                            className="rounded bg-gray-100 dark:bg-white/[0.05] px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400"
                          >
                            {p.type}
                          </span>
                        ))}
                        {t.projects.length > 3 && (
                          <span className="text-xs text-gray-400">+{t.projects.length - 3}</span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Criado em */}
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                    <ActivateButton tenantId={t.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewTenantModal
        isOpen={isOpen}
        onClose={closeModal}
        onCreated={handleTenantCreated}
      />
    </>
  );
}
