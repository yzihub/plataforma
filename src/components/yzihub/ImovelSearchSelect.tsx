"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { N8nImovel } from "@/types/n8n-payloads";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImovelSearchSelectProps {
  value: string;                                                  // imovel_ref atual (UUID ou "")
  onChange: (imovelId: string, imovel: N8nImovel | null) => void;
  onResolve?: (imovel: N8nImovel | null) => void;               // dispara quando lista carrega e value já está setado
  placeholder?: string;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function formatValor(valor: number): string {
  return BRL.format(valor);
}

function matchesQuery(imovel: N8nImovel, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    imovel.titulo_comercial.toLowerCase().includes(lower) ||
    (imovel.bairro?.toLowerCase().includes(lower) ?? false) ||
    (imovel.tipo_de_imovel?.toLowerCase().includes(lower) ?? false)
  );
}

// ─── Input CSS (matched to LeadDrawer INPUT_CLS) ──────────────────────────────

const INPUT_CLS =
  "h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-800";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImovelSearchSelect({
  value,
  onChange,
  onResolve,
  placeholder = "Buscar imóvel por título ou bairro...",
  className,
}: ImovelSearchSelectProps) {
  const [imoveis, setImoveis] = useState<N8nImovel[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch imoveis on mount ──────────────────────────────────────────────────
  const fetchImoveis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/imoveis");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const envelope = await res.json() as { data: N8nImovel[] };
      setImoveis(envelope.data ?? []);
    } catch (e) {
      setError("Erro ao carregar imóveis");
      console.error("[ImovelSearchSelect] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImoveis();
  }, [fetchImoveis]);

  // Resolve value → imovel object quando lista carrega (cobre leads existentes com imovel_ref)
  useEffect(() => {
    if (!onResolve || imoveis.length === 0) return;
    onResolve(imoveis.find((i) => i.id === value) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imoveis]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────
  const selectedImovel = imoveis.find((i) => i.id === value) ?? null;

  const filtered = query
    ? imoveis.filter((i) => matchesQuery(i, query))
    : imoveis;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleFocus() {
    setOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    // Clear selection if user types (they are searching for a new imovel)
    if (value && e.target.value !== "") {
      onChange("", null);
    }
  }

  function handleSelect(imovel: N8nImovel) {
    onChange(imovel.id, imovel);
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", null);
    setQuery("");
    setOpen(false);
  }

  // ── Display value ────────────────────────────────────────────────────────────
  // When selected and dropdown closed: show label
  // When open or no selection: show query input
  const showSelectedLabel = !!value && !open;
  const inputDisplayValue = showSelectedLabel
    ? ""
    : query;

  const inputPlaceholder = showSelectedLabel
    ? ""
    : loading
    ? "Carregando imóveis..."
    : placeholder;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* Input wrapper */}
      <div className="relative">
        {showSelectedLabel ? (
          /* Selected state — display label with clear button */
          <div
            className={`${INPUT_CLS} flex items-center justify-between cursor-pointer`}
            onClick={() => { setOpen(true); }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate block">
                {selectedImovel
                  ? selectedImovel.titulo_comercial
                  : `Ref: ${value.slice(0, 8)}...`}
              </span>
              {selectedImovel?.bairro && (
                <span className="text-[11px] text-gray-400 block truncate">
                  {selectedImovel.bairro}
                  {selectedImovel.tipo_de_imovel ? ` · ${selectedImovel.tipo_de_imovel}` : ""}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Limpar seleção"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          /* Search input */
          <input
            type="text"
            value={inputDisplayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={inputPlaceholder}
            disabled={loading && imoveis.length === 0}
            autoComplete="off"
            className={INPUT_CLS}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          {loading && imoveis.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Carregando imóveis...</div>
          ) : error ? (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-red-500">{error}</span>
              <button
                type="button"
                onClick={fetchImoveis}
                className="text-xs text-brand-500 hover:underline ml-2"
              >
                Tentar novamente
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Nenhum imóvel encontrado</div>
          ) : (
            <ul>
              {filtered.map((imovel) => (
                <li key={imovel.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(imovel)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-none ${
                      imovel.id === value ? "bg-brand-50 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                      {imovel.titulo_comercial}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] text-gray-400 truncate">
                        {[
                          imovel.bairro,
                          imovel.tipo_de_imovel,
                          imovel.quartos > 0 ? `${imovel.quartos}Q` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {imovel.valor > 0 && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 ml-2 font-medium">
                          {formatValor(imovel.valor)}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
