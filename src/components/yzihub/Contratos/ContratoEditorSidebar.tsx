"use client";

// ─── ContratoEditorSidebar ────────────────────────────────────────────────────

import { useRef, useState } from "react";
import type { Lead } from "@/lib/crm/types";

interface TemplateOption {
  id: string;
  label: string;
  type: string;
}

interface PropertyData {
  id: string;
  titulo_comercial: string;
  bairro: string | null;
  valor: number;
}

interface BrokerData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export interface ContratoEditorSidebarProps {
  templates: TemplateOption[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onUploadDocx: (file: File) => Promise<void>;
  uploadLoading: boolean;
  lead: Lead | null;
  property: PropertyData | null;
  broker: BrokerData | null;
}

type TemplateSource = "interno" | "upload";

const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";
const readonlyCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 cursor-not-allowed select-none";
const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function Missing({ label }: { label: string }) {
  return (
    <div className={readonlyCls}>
      <span className="text-red-400">{label} nao vinculado</span>
    </div>
  );
}

export default function ContratoEditorSidebar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onUploadDocx,
  uploadLoading,
  lead,
  property,
  broker,
}: ContratoEditorSidebarProps) {
  const [source, setSource] = useState<TemplateSource>("interno");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const valor = lead?.value ?? 0;
  const comissao = valor * 0.05;

  async function handleFile(file: File) {
    if (!file) return;
    await onUploadDocx(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Configuracoes
        </span>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">

        {/* Bloco: Origem do Template */}
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Origem do Template
          </p>

          {/* Tabs */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            {(["interno", "upload"] as TemplateSource[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSource(tab)}
                className={[
                  "flex-1 py-1.5 text-xs font-medium transition-colors",
                  source === tab
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                {tab === "interno" ? "Template Interno" : "Upload .docx"}
              </button>
            ))}
          </div>

          {/* Tab: Interno */}
          {source === "interno" && (
            <div>
              <label className={labelCls}>
                Modelo de Contrato <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => onSelectTemplate(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                O template sera carregado com{" "}
                <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {"{{vars}}"}
                </code>{" "}
                visiveis para edicao.
              </p>
            </div>
          )}

          {/* Tab: Upload */}
          {source === "upload" && (
            <div>
              <label className={labelCls}>Arquivo .doc / .docx</label>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
                  dragOver
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-300 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                ].join(" ")}
              >
                {uploadLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                ) : (
                  <>
                    <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Arraste ou clique para selecionar
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      .doc ou .docx
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                O texto do arquivo sera extraido como template. Voce pode adicionar{" "}
                <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {"{{vars}}"}
                </code>{" "}
                no editor apos o upload.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800" />

        {/* Bloco: Dados pré-preenchidos */}
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Dados pre-preenchidos
          </p>
          <div className="space-y-3">

            <div>
              <label className={labelCls}>Comprador / Locatario</label>
              {lead ? (
                <div className={readonlyCls}>{lead.name}</div>
              ) : (
                <Missing label="Lead" />
              )}
            </div>

            <div>
              <label className={labelCls}>Imovel</label>
              {property ? (
                <div className={readonlyCls}>
                  {property.titulo_comercial}
                  {property.bairro ? (
                    <span className="block text-xs text-gray-400 mt-0.5">{property.bairro}</span>
                  ) : null}
                </div>
              ) : (
                <Missing label="Imovel" />
              )}
            </div>

            <div>
              <label className={labelCls}>Corretor Responsavel</label>
              {broker ? (
                <div className={readonlyCls}>{broker.full_name}</div>
              ) : (
                <Missing label="Corretor" />
              )}
            </div>

            <div>
              <label className={labelCls}>Valor</label>
              <div className={readonlyCls}>
                {valor > 0 ? formatBRL(valor) : <span className="text-red-400">Valor nao definido</span>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Comissao (5% auto)</label>
              <div className={readonlyCls}>{valor > 0 ? formatBRL(comissao) : "—"}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
