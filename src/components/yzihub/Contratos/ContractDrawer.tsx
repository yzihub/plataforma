"use client";

import { useState, useRef } from "react";
import Badge from "@/components/ui/badge/Badge";
import { CloseIcon } from "@/icons";
import { CONTRACT_STATUS_CONFIG } from "@/types/contracts";
import type { Contract, ContractStatus } from "@/types/contracts";

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200 text-right">{value}</span>
    </div>
  );
}

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "draft",     label: "Rascunho"  },
  { value: "sent",      label: "Enviado"   },
  { value: "signed",    label: "Assinado"  },
  { value: "cancelled", label: "Cancelado" },
];

// ─── ContractDrawer ───────────────────────────────────────────────────────────

interface ContractDrawerProps {
  contract: Contract | null;
  onClose: () => void;
  onContractUpdated: (updated: Contract) => void;
}

export default function ContractDrawer({
  contract,
  onClose,
  onContractUpdated,
}: ContractDrawerProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue]   = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [changingStatus, setChangingStatus] = useState(false);

  const [markingAssinado, setMarkingAssinado] = useState(false);
  const [confirmAssinado, setConfirmAssinado] = useState(false);

  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "Pendente";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // ─── Editar notas ───────────────────────────────────────────

  function handleStartEditNotes() {
    setNotesValue(contract?.notes ?? "");
    setEditingNotes(true);
  }

  async function handleSaveNotes() {
    if (!contract) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (!res.ok) throw new Error("Erro ao salvar notas");
      const updated: Contract = await res.json();
      onContractUpdated(updated);
      setEditingNotes(false);
      showFeedback("Notas salvas com sucesso");
    } catch {
      showFeedback("Erro ao salvar notas");
    } finally {
      setSavingNotes(false);
    }
  }

  // ─── Alterar status ─────────────────────────────────────────

  async function handleStatusChange(newStatus: ContractStatus) {
    if (!contract || newStatus === contract.status) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      const updated: Contract = await res.json();
      onContractUpdated(updated);
      showFeedback(`Status alterado para "${CONTRACT_STATUS_CONFIG[newStatus].label}"`);
    } catch {
      showFeedback("Erro ao alterar status");
    } finally {
      setChangingStatus(false);
    }
  }

  // ─── Marcar como assinado ────────────────────────────────────

  async function handleMarkAssinado() {
    if (!contract) return;
    setMarkingAssinado(true);
    setConfirmAssinado(false);
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "signed" }),
      });
      if (!res.ok) throw new Error("Erro ao marcar como assinado");
      const updated: Contract = await res.json();
      onContractUpdated(updated);
      showFeedback("Contrato marcado como assinado");
    } catch {
      showFeedback("Erro ao marcar como assinado");
    } finally {
      setMarkingAssinado(false);
    }
  }

  // ─── Upload arquivo ──────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contract) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Erro ao fazer upload");
      }
      const updated: Contract = await res.json();
      onContractUpdated(updated);
      showFeedback("Arquivo anexado com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer upload";
      setUploadError(msg);
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const statusCfg = contract ? CONTRACT_STATUS_CONFIG[contract.status] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          contract ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          contract ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {contract && statusCfg && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge size="sm" color="light">
                    {contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                  </Badge>
                  <Badge size="sm" color={statusCfg.color}>
                    {statusCfg.label}
                  </Badge>
                </div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  {contract.title ?? contract.lead_name}
                </h2>
                {contract.project_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{contract.project_name}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            {/* Feedback toast */}
            {feedback && (
              <div className="mx-5 mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {feedback}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* ─── Informacoes ─── */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Informacoes
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Lead vinculado" value={contract.lead_name} />
                  <InfoRow
                    label="Valor"
                    value={
                      <span className="font-semibold text-emerald-500">
                        {formatCurrency(contract.value)}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Tipo"
                    value={contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                  />
                  <InfoRow label="Corretor" value={contract.corretor_name ?? "—"} />
                </div>
              </section>

              {/* ─── Notas ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Notas / Observacoes
                  </h3>
                  {!editingNotes && (
                    <button
                      onClick={handleStartEditNotes}
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      rows={4}
                      placeholder="Observacoes sobre o contrato..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-all"
                      >
                        {savingNotes ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 min-h-[60px]">
                    {contract.notes ?? (
                      <span className="text-gray-400 italic">Sem notas</span>
                    )}
                  </p>
                )}
              </section>

              {/* ─── Datas ─── */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Datas
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Criado em"    value={formatDate(contract.created_at)} />
                  <InfoRow label="Assinado em"  value={formatDate(contract.signed_at)} />
                  <InfoRow
                    label="Vencimento"
                    value={contract.expires_at ? formatDate(contract.expires_at) : "Sem vencimento"}
                  />
                </div>
              </section>

              {/* ─── Arquivo ─── */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Arquivo do Contrato
                </h3>

                {contract.file_url && contract.file_name ? (
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">📄</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                        {contract.file_name}
                      </span>
                    </div>
                    <a
                      href={contract.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors ml-2"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 dark:hover:bg-brand-500/5 transition-colors">
                      <span className="text-2xl mb-1">📎</span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {uploading ? "Enviando..." : "Clique para anexar PDF ou DOCX (max 10MB)"}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc"
                        className="hidden"
                        disabled={uploading}
                        onChange={handleFileChange}
                      />
                    </label>
                    {uploadError && (
                      <p className="mt-2 text-xs text-red-500">{uploadError}</p>
                    )}
                  </div>
                )}
              </section>

              {/* ─── Acoes ─── */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Acoes
                </h3>
                <div className="space-y-3">

                  {/* Alterar status */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Alterar status
                    </label>
                    <select
                      value={contract.status}
                      disabled={changingStatus}
                      onChange={(e) => handleStatusChange(e.target.value as ContractStatus)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 transition-colors disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Marcar como assinado */}
                  {contract.status !== "signed" && (
                    <>
                      {confirmAssinado ? (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 p-3">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-2">
                            Confirmar assinatura? A data sera registrada automaticamente.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmAssinado(false)}
                              className="flex-1 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleMarkAssinado}
                              disabled={markingAssinado}
                              className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-all"
                            >
                              {markingAssinado ? "Confirmando..." : "Confirmar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmAssinado(true)}
                          className="w-full flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5 transition-all group"
                        >
                          <span>Marcar como Assinado</span>
                          <span className="text-emerald-300 group-hover:text-emerald-500">→</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
