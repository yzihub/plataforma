"use client";

import { useEffect, useState } from "react";
import type { Broker, BrokerInput } from "@/types/brokers";

// ─── Field / label classes (TailAdmin dark padrão) ────────────────────────────

const fieldCls =
  "w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary dark:text-white/90";

const labelCls = "mb-2.5 block text-sm font-medium text-black dark:text-white";

const sectionTitleCls =
  "text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 mt-1";

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
          <div className="space-y-4">

            {/* ── Dados Pessoais ─────────────────────────────────────── */}
            <p className={sectionTitleCls}>Dados Pessoais</p>

            {/* Nome */}
            <div>
              <label className={labelCls}>
                Nome completo <span className="text-meta-1">*</span>
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

            {/* Telefone */}
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="tel"
                value={str(form.phone)}
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
                value={str(form.email)}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="Ex: corretor@exemplo.com"
                className={fieldCls}
              />
            </div>

            {/* CPF */}
            <div>
              <label className={labelCls}>CPF</label>
              <input
                type="text"
                value={str(form.cpf)}
                onChange={(e) => setField("cpf", e.target.value)}
                placeholder="Ex: 000.000.000-00"
                className={fieldCls}
              />
            </div>

            {/* Tipo / Role em linha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo</label>
                <select
                  value={str(form.tipo)}
                  onChange={(e) => setField("tipo", e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Selecione</option>
                  <option value="autonomo">Autônomo</option>
                  <option value="pj">PJ</option>
                  <option value="clt">CLT</option>
                  <option value="estagiario">Estagiário</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Role / Cargo</label>
                <input
                  type="text"
                  value={str(form.role)}
                  onChange={(e) => setField("role", e.target.value)}
                  placeholder="Ex: Corretor Sênior"
                  className={fieldCls}
                />
              </div>
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

            {/* ── Endereço ───────────────────────────────────────────── */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className={sectionTitleCls}>Endereço</p>
            </div>

            {/* Endereço */}
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

            {/* Cidade / Estado em linha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cidade</label>
                <input
                  type="text"
                  value={str(form.city)}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Ex: Fortaleza"
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <input
                  type="text"
                  value={str(form.state)}
                  onChange={(e) => setField("state", e.target.value)}
                  placeholder="Ex: CE"
                  maxLength={2}
                  className={fieldCls}
                />
              </div>
            </div>

            {/* CEP */}
            <div>
              <label className={labelCls}>CEP</label>
              <input
                type="text"
                value={str(form.zip_code)}
                onChange={(e) => setField("zip_code", e.target.value)}
                placeholder="Ex: 60000-000"
                className={fieldCls}
              />
            </div>

            {/* ── Financeiro & PIX ───────────────────────────────────── */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className={sectionTitleCls}>Financeiro & PIX</p>
            </div>

            {/* Banco */}
            <div>
              <label className={labelCls}>Banco</label>
              <input
                type="text"
                value={str(form.bank)}
                onChange={(e) => setField("bank", e.target.value)}
                placeholder="Ex: Nubank, Itaú, Bradesco"
                className={fieldCls}
              />
            </div>

            {/* Agência / Conta em linha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Agência</label>
                <input
                  type="text"
                  value={str(form.bank_agency)}
                  onChange={(e) => setField("bank_agency", e.target.value)}
                  placeholder="Ex: 0001"
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>Conta</label>
                <input
                  type="text"
                  value={str(form.bank_account)}
                  onChange={(e) => setField("bank_account", e.target.value)}
                  placeholder="Ex: 12345-6"
                  className={fieldCls}
                />
              </div>
            </div>

            {/* Tipo de conta */}
            <div>
              <label className={labelCls}>Tipo de Conta</label>
              <select
                value={str(form.bank_account_type)}
                onChange={(e) => setField("bank_account_type", e.target.value)}
                className={fieldCls}
              >
                <option value="">Selecione</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="pagamento">Pagamento</option>
              </select>
            </div>

            {/* Chave PIX / Tipo em linha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de Chave PIX</label>
                <select
                  value={str(form.pix_key_type)}
                  onChange={(e) => setField("pix_key_type", e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Selecione</option>
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

            {/* Favorecido */}
            <div>
              <label className={labelCls}>Favorecido</label>
              <input
                type="text"
                value={str(form.pix_beneficiary)}
                onChange={(e) => setField("pix_beneficiary", e.target.value)}
                placeholder="Nome do favorecido"
                className={fieldCls}
              />
            </div>

            {/* ── Observações ────────────────────────────────────────── */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className={sectionTitleCls}>Observações</p>
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

            {/* ── Ações ─────────────────────────────────────────────── */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              {saveError && (
                <p className="text-xs text-meta-1 mb-3 text-center">
                  Erro ao salvar. Verifique os dados e tente novamente.
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
                  disabled={saving || deleting || form.name.trim().length < 2}
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
