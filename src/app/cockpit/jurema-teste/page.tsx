"use client";

import React, { useState } from "react";
import { sendMessageToJurema } from "@/lib/agents/jurema";
import type { JuremaResponse } from "@/lib/agents/jurema";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JuremaTeste() {
  const [phone, setPhone]           = useState("5585988811150");
  const [message, setMessage]       = useState("Oi, estou procurando um imóvel");
  const [source, setSource]         = useState("");
  const [entrypoint, setEntrypoint] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [response, setResponse]     = useState<JuremaResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await sendMessageToJurema({
        message,
        phone,
        ...(source     ? { source }               : {}),
        ...(entrypoint ? { entrypoint }            : {}),
        ...(propertyId ? { property_id: propertyId } : {}),
      });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Teste — Ju / Jurema
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ferramenta interna para testar o backend da Ju.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-white/80 uppercase tracking-wider">
            Payload
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Telefone */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Telefone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="5585988811150"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>

            {/* Mensagem */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Mensagem <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={3}
                placeholder="Oi, estou procurando um imóvel"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Source <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="site"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>

            {/* Entrypoint */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Entrypoint <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={entrypoint}
                onChange={(e) => setEntrypoint(e.target.value)}
                placeholder="property_search"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>

            {/* Property ID */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Property ID <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="JP009"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !phone.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enviando…
                </>
              ) : (
                "Enviar para Ju"
              )}
            </button>
          </form>
        </div>

        {/* ── Response ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-5 py-4">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                Erro
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 break-all">{error}</p>
            </div>
          )}

          {/* Messages */}
          {response && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Mensagens ({response.messages.length})
              </p>
              <div className="space-y-2">
                {response.messages.map((msg, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-white/90 whitespace-pre-wrap"
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {response && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Metadata
              </p>

              {/* Key fields highlight */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(
                  [
                    ["deal_stage",            response.metadata.deal_stage],
                    ["qualification_status",  response.metadata.qualification_status],
                    ["lead_score",            response.metadata.lead_score],
                    ["imoveis_count",         response.metadata.imoveis_count],
                  ] as [string, unknown][]
                )
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2"
                    >
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{k}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                        {String(v)}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Full JSON */}
              <pre className="overflow-x-auto rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 text-xs text-gray-600 dark:text-gray-300 font-mono leading-relaxed">
                {JSON.stringify(response.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Empty state */}
          {!response && !error && !loading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-600">
                A resposta da Ju aparecerá aqui
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
