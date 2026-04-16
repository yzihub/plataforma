"use client";

import { useEffect, useState } from "react";
import type { Broker, BrokerInput } from "@/types/brokers";

// ─── Field classes (TailAdmin padrão) ─────────────────────────────────────────

const fieldCls =
  "w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary dark:text-white/90";

const labelCls = "mb-2.5 block text-sm font-medium text-black dark:text-white";

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
    is_active: true,
  };

  const [form, setForm] = useState<BrokerInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (broker) {
      setForm({
        full_name: broker.full_name,
        phone: broker.phone ?? "",
        email: broker.email ?? "",
        role: broker.role ?? "",
        is_active: broker.is_active ?? true,
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
    if (form.full_name.trim().length < 2) {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
      return;
    }

    setSaving(true);
    setSaveError(false);

    try {
      const input: BrokerInput = {
        full_name: form.full_name.trim(),
        phone: form.phone?.replace(/\D/g, "") || null,
        email: form.email?.trim() || null,
        role: form.role?.trim() || null,
        is_active: form.is_active,
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
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-dark shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">
              {isEditing ? "Editar Corretor" : "Novo Corretor"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing
                ? "Atualize os dados do corretor"
                : "Preencha os dados do novo corretor"}
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
          <div className="space-y-4.5">

            {/* Nome completo */}
            <div>
              <label className={labelCls}>
                Nome completo <span className="text-meta-1">*</span>
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

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setField("is_active", !form.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-checked={form.is_active}
                  role="switch"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                      form.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${
                    form.is_active
                      ? "text-success-600 dark:text-success-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {form.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              {saveError && (
                <p className="text-xs text-meta-1 mb-3 text-center">
                  Erro ao salvar. Tente novamente.
                </p>
              )}

              <div className={`flex gap-3 ${isEditing && onDelete ? "justify-between" : ""}`}>
                {isEditing && onDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={deleting || saving}
                    className="rounded border border-meta-1 py-2.5 px-5 text-sm font-medium text-meta-1 hover:bg-meta-1 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Excluindo..." : "Excluir"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || deleting || form.full_name.trim().length < 2}
                  className="flex flex-1 justify-center rounded bg-primary py-2.5 px-5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving
                    ? "Salvando..."
                    : isEditing
                    ? "Salvar Alterações"
                    : "Criar Corretor"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
