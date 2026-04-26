"use client";

import { useEffect, useState } from "react";
import type { Broker, BrokerInput } from "@/types/brokers";

// ─── Field / label classes — padrão PropertyDrawer ────────────────────────────

const fieldCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500";

const labelCls = "block text-xs font-medium text-gray-400 mb-1";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CorretorDrawerProps {
  open: boolean;
  broker: Broker | null;
  onClose: () => void;
  onSave: (input: BrokerInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void> | void;
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm: BrokerInput = {
  name: "",
  phone: null,
  email: null,
  role: null,
  tipo: null,
  cpf: null,
  is_active: true,
  address: null,
  city: null,
  state: null,
  zip_code: null,
  bank: null,
  bank_agency: null,
  bank_account: null,
  bank_account_type: null,
  pix_key: null,
  pix_key_type: null,
  pix_beneficiary: null,
  notes: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorretorDrawer({
  open,
  broker,
  onClose,
  onSave,
  onDelete,
}: CorretorDrawerProps) {
  const isEditing = broker !== null;

  const [form, setForm] = useState<BrokerInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (broker) {
      setForm({
        name: broker.name ?? "",
        phone: broker.phone ?? null,
        email: broker.email ?? null,
        role: broker.role ?? null,
        tipo: broker.tipo ?? null,
        cpf: broker.cpf ?? null,
        is_active: broker.is_active ?? true,
        address: broker.address ?? null,
        city: broker.city ?? null,
        state: broker.state ?? null,
        zip_code: broker.zip_code ?? null,
        bank: broker.bank ?? null,
        bank_agency: broker.bank_agency ?? null,
        bank_account: broker.bank_account ?? null,
        bank_account_type: broker.bank_account_type ?? null,
        pix_key: broker.pix_key ?? null,
        pix_key_type: broker.pix_key_type ?? null,
        pix_beneficiary: broker.pix_beneficiary ?? null,
        notes: broker.notes ?? null,
      });
    } else {
      setForm(emptyForm);
    }
    setSaveError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broker, open]);

  function str(val: string | null | undefined): string {
    return val ?? "";
  }

  function setField<K extends keyof BrokerInput>(key: K, value: BrokerInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nullIfEmpty(v: string): string | null {
    return v.trim() === "" ? null : v.trim();
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
    if (form.name.trim().length < 2) {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
      return;
    }

    setSaving(true);
    setSaveError(false);

    try {
      const input: BrokerInput = {
        name: form.name.trim(),
        phone: nullIfEmpty(str(form.phone))?.replace(/\D/g, "") ?? null,
        email: nullIfEmpty(str(form.email)),
        role: nullIfEmpty(str(form.role)),
        tipo: nullIfEmpty(str(form.tipo)),
        cpf: nullIfEmpty(str(form.cpf)),
        is_active: form.is_active,
        address: nullIfEmpty(str(form.address)),
        city: nullIfEmpty(str(form.city)),
        state: nullIfEmpty(str(form.state)),
        zip_code: nullIfEmpty(str(form.zip_code)),
        bank: nullIfEmpty(str(form.bank)),
        bank_agency: nullIfEmpty(str(form.bank_agency)),
        bank_account: nullIfEmpty(str(form.bank_account)),
        bank_account_type: nullIfEmpty(str(form.bank_account_type)),
        pix_key: nullIfEmpty(str(form.pix_key)),
        pix_key_type: nullIfEmpty(str(form.pix_key_type)),
        pix_beneficiary: nullIfEmpty(str(form.pix_beneficiary)),
        notes: nullIfEmpty(str(form.notes)),
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
      <form
        onSubmit={handleSubmit}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 leading-snug">
              {isEditing ? "Editar Corretor" : "Novo Corretor"}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {isEditing
                ? "Atualize os dados do corretor"
                : "Preencha os dados do novo corretor"}
            </p>
          </div>
          <button
            type="button"
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

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400/40">

          {/* ── Dados Pessoais ─────────────────────────────────────── */}
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Dados Pessoais
          </p>

          <div>
            <label className={labelCls}>
              Nome completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={str(form.name)}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Ex: João Silva"
              className={fieldCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="tel"
                value={str(form.phone)}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="85999999999"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>CPF</label>
              <input
                type="text"
                value={str(form.cpf)}
                onChange={(e) => setField("cpf", e.target.value)}
                placeholder="000.000.000-00"
                className={fieldCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>E-mail</label>
            <input
              type="email"
              value={str(form.email)}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="corretor@exemplo.com"
              className={fieldCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select
                value={str(form.tipo)}
                onChange={(e) => setField("tipo", e.target.value)}
                className={fieldCls}
              >
                <option value="">Selecionar...</option>
                <option value="autonomo">Autônomo</option>
                <option value="pj">PJ</option>
                <option value="clt">CLT</option>
                <option value="estagiario">Estagiário</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Cargo</label>
              <input
                type="text"
                value={str(form.role)}
                onChange={(e) => setField("role", e.target.value)}
                placeholder="Ex: Corretor Sênior"
                className={fieldCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => setField("is_active", !form.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
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
              className={`text-xs font-medium ${
                form.is_active ? "text-emerald-500" : "text-gray-400"
              }`}
            >
              {form.is_active ? "Ativo" : "Inativo"}
            </span>
          </div>

          {/* ── Endereço ───────────────────────────────────────────── */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Endereço
            </p>
          </div>

          <div>
            <label className={labelCls}>Endereço</label>
            <input
              type="text"
              value={str(form.address)}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Rua, número, complemento"
              className={fieldCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cidade</label>
              <input
                type="text"
                value={str(form.city)}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Fortaleza"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <input
                type="text"
                value={str(form.state)}
                onChange={(e) => setField("state", e.target.value)}
                placeholder="CE"
                maxLength={2}
                className={fieldCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>CEP</label>
            <input
              type="text"
              value={str(form.zip_code)}
              onChange={(e) => setField("zip_code", e.target.value)}
              placeholder="60000-000"
              className={fieldCls}
            />
          </div>

          {/* ── Dados Bancários ────────────────────────────────────── */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Dados Bancários
            </p>
          </div>

          <div>
            <label className={labelCls}>Banco</label>
            <input
              type="text"
              value={str(form.bank)}
              onChange={(e) => setField("bank", e.target.value)}
              placeholder="Nubank, Itaú, Bradesco..."
              className={fieldCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Agência</label>
              <input
                type="text"
                value={str(form.bank_agency)}
                onChange={(e) => setField("bank_agency", e.target.value)}
                placeholder="0001"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Conta</label>
              <input
                type="text"
                value={str(form.bank_account)}
                onChange={(e) => setField("bank_account", e.target.value)}
                placeholder="12345-6"
                className={fieldCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Tipo de Conta</label>
            <select
              value={str(form.bank_account_type)}
              onChange={(e) => setField("bank_account_type", e.target.value)}
              className={fieldCls}
            >
              <option value="">Selecionar...</option>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="pagamento">Pagamento</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo de Chave PIX</label>
              <select
                value={str(form.pix_key_type)}
                onChange={(e) => setField("pix_key_type", e.target.value)}
                className={fieldCls}
              >
                <option value="">Selecionar...</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Aleatória</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Chave PIX</label>
              <input
                type="text"
                value={str(form.pix_key)}
                onChange={(e) => setField("pix_key", e.target.value)}
                placeholder="Chave PIX"
                className={fieldCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Nome do Favorecido</label>
            <input
              type="text"
              value={str(form.pix_beneficiary)}
              onChange={(e) => setField("pix_beneficiary", e.target.value)}
              placeholder="Nome do favorecido"
              className={fieldCls}
            />
          </div>

          {/* ── Informações Operacionais ────────────────────────────── */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Informações Operacionais
            </p>
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <textarea
              rows={3}
              value={str(form.notes)}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Anotações internas sobre o corretor..."
              className={`${fieldCls} resize-none`}
            />
          </div>

        </div>

        {/* ── Footer fixo ── */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-5">
          {saveError && (
            <p className="text-xs text-red-500 mb-3 text-center">
              Erro ao salvar. Verifique os dados e tente novamente.
            </p>
          )}
          <div className="flex gap-3">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting || saving}
                className="rounded-xl border border-red-300 dark:border-red-700 py-2.5 px-4 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || deleting || form.name.trim().length < 2}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : isEditing
                ? "Salvar Corretor"
                : "Criar Corretor"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
