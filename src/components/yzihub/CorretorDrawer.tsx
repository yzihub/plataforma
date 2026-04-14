"use client";

import { useEffect, useState } from "react";
import type { Broker, BrokerInput } from "@/types/brokers";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "senior", label: "Sênior" },
  { value: "junior", label: "Júnior" },
  { value: "manager", label: "Gerente" },
];

// ─── Shared field classes (padrão PropertyDrawer) ─────────────────────────────

const fieldCls =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 focus:outline-none focus:border-brand-500";

const labelCls = "block text-xs font-medium text-gray-400 mb-1";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CorretorDrawerProps {
  open: boolean;
  broker: Broker | null;
  onClose: () => void;
  onSave: (input: BrokerInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void> | void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorretorDrawer({
  open,
  broker,
  onClose,
  onSave,
  onDelete,
}: CorretorDrawerProps) {
  const isEditing = broker !== null;

  const emptyForm: BrokerInput = {
    full_name: "",
    phone: "",
    email: "",
    role: "",
  };

  const [form, setForm] = useState<BrokerInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Sync form when broker changes
  useEffect(() => {
    if (broker) {
      setForm({
        full_name: broker.full_name,
        phone: broker.phone ?? "",
        email: broker.email ?? "",
        role: broker.role ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setSaveError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broker, open]);

  function setField<K extends keyof BrokerInput>(key: K, value: BrokerInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDeleteClick() {
    if (!broker || !onDelete) return;
    if (!window.confirm("Excluir corretor?")) return;

    setDeleting(true);
    try {
      await onDelete(broker.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;

    setSaving(true);
    setSaveError(false);

    try {
      const input: BrokerInput = {
        full_name: form.full_name.trim(),
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        role: form.role?.trim() || null,
      };

      await onSave(input, isEditing ? broker!.id : undefined);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {isEditing ? "Editar Corretor" : "Novo Corretor"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEditing ? "Atualize os dados do corretor" : "Preencha os dados do novo corretor"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">

            {/* Nome completo */}
            <div>
              <label className={labelCls}>
                Nome completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="Ex: João Silva"
                className={fieldCls}
              />
            </div>

            {/* Telefone */}
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="Ex: 85999999999"
                className={fieldCls}
              />
            </div>

            {/* E-mail */}
            <div>
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="Ex: corretor@exemplo.com"
                className={fieldCls}
              />
            </div>

            {/* Função */}
            <div>
              <label className={labelCls}>Função</label>
              <select
                value={form.role ?? ""}
                onChange={(e) => setField("role", e.target.value)}
                className={fieldCls}
              >
                <option value="">Selecionar...</option>
                {ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Erro + Salvar */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              {saveError && (
                <p className="text-xs text-red-500 mb-2 text-center">
                  Erro ao salvar. Tente novamente.
                </p>
              )}
              <div className={`flex gap-3 ${isEditing && onDelete ? "justify-between" : ""}`}>
                {isEditing && onDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={deleting || saving}
                    className="rounded-xl border border-red-300 dark:border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Excluindo..." : "Excluir"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || deleting || !form.full_name.trim()}
                  className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {saving ? "Salvando..." : isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR CORRETOR"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
