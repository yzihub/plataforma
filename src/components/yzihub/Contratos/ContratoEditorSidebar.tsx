"use client";

// ─── ContratoEditorSidebar ────────────────────────────────────────────────────
// Painel esquerdo do editor: seletor de template + dados pré-preenchidos (readonly).

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

interface ContratoEditorSidebarProps {
  templates: TemplateOption[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  lead: Lead | null;
  property: PropertyData | null;
  broker: BrokerData | null;
}

// Padrão visual aprovado (copiado do GerarContratoDrawer)
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
      <span className="text-red-400">
        {label} nao vinculado
      </span>
    </div>
  );
}

export default function ContratoEditorSidebar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  lead,
  property,
  broker,
}: ContratoEditorSidebarProps) {
  const valor = lead?.value ?? 0;
  const comissao = valor * 0.05;

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

        {/* Bloco: Template */}
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Template
          </p>
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
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800" />

        {/* Bloco: Dados pré-preenchidos */}
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Dados pre-preenchidos
          </p>
          <div className="space-y-3">

            {/* Comprador */}
            <div>
              <label className={labelCls}>Comprador / Locatario</label>
              {lead ? (
                <div className={readonlyCls}>{lead.name}</div>
              ) : (
                <Missing label="Lead" />
              )}
            </div>

            {/* Imovel */}
            <div>
              <label className={labelCls}>Imovel</label>
              {property ? (
                <div className={readonlyCls}>
                  {property.titulo_comercial}
                  {property.bairro ? (
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {property.bairro}
                    </span>
                  ) : null}
                </div>
              ) : (
                <Missing label="Imovel" />
              )}
            </div>

            {/* Corretor */}
            <div>
              <label className={labelCls}>Corretor Responsavel</label>
              {broker ? (
                <div className={readonlyCls}>{broker.full_name}</div>
              ) : (
                <Missing label="Corretor" />
              )}
            </div>

            {/* Valor */}
            <div>
              <label className={labelCls}>Valor</label>
              <div className={readonlyCls}>
                {valor > 0 ? formatBRL(valor) : <span className="text-red-400">Valor nao definido</span>}
              </div>
            </div>

            {/* Comissao 5% */}
            <div>
              <label className={labelCls}>Comissao (5% auto)</label>
              <div className={readonlyCls}>
                {valor > 0 ? formatBRL(comissao) : "—"}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
