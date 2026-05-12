"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon, CloseLineIcon, MoreDotIcon } from "@/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type FollowupTask = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  type: string;
  priority: string;
  status: string;
  trigger_source: string | null;
  trigger_reason: string | null;
  detected_at: string;
  due_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type FollowupsResponse = {
  ok: true;
  tenant_id: string;
  generated_at: string;
  tasks: FollowupTask[];
};

type FilterKey = "todos" | "pendente" | "automatizado" | "ignorado";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "pendente", label: "Pendentes" },
  { key: "automatizado", label: "Automatizados" },
  { key: "ignorado", label: "Ignorados" },
];

// ─── Helpers visuais ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pendente:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    em_andamento:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    resolvido:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    ignorado:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    automatizado:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  };
  const cls = styles[status] ?? styles.pendente;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critica:
      "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
    alta: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    media: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    baixa: "bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500",
  };
  const cls = styles[priority] ?? styles.media;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {priority}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── ActionMenu (dropdown padrão TailAdmin) ───────────────────────────────────

function ActionMenu({
  task,
  onAction,
  busy,
}: {
  task: FollowupTask;
  onAction: (id: string, action: "resolver" | "ignorar") => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isFinal = task.status === "resolvido" || task.status === "ignorado";

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy || isFinal}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Ações"
      >
        <span className="block size-4">
          <MoreDotIcon />
        </span>
      </button>

      {open && !isFinal && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAction(task.id, "resolver");
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <span className="size-4 text-emerald-500">
              <CheckCircleIcon />
            </span>
            Resolver
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAction(task.id, "ignorar");
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <span className="size-4 text-gray-500">
              <CloseLineIcon />
            </span>
            Ignorar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── FollowupsClient ─────────────────────────────────────────────────────────

export default function FollowupsClient() {
  const [data, setData] = useState<FollowupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: FilterKey) => {
    setLoading(true);
    setError(null);
    try {
      const url =
        status === "todos"
          ? "/api/followups"
          : `/api/followups?status=${encodeURIComponent(status)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Erro ${res.status}`);
      }
      const json: FollowupsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const handleAction = useCallback(
    async (id: string, action: "resolver" | "ignorar") => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/followups/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Erro ${res.status}`);
        }
        await load(filter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar");
      } finally {
        setBusyId(null);
      }
    },
    [filter, load]
  );

  const tasks = data?.tasks ?? [];

  return (
    <div className="space-y-4">
      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800 dark:hover:bg-gray-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Erro ao carregar follow-ups
            </p>
            <p className="mt-1 text-xs text-red-500 dark:text-red-300">
              {error}
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma tarefa de follow-up
              {filter !== "todos" ? ` no estado "${filter}"` : ""}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-4">
                    Lead
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-2">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-2">
                    Prioridade
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-2">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-2">
                    Motivo
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-2 whitespace-nowrap">
                    Created At
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-2 whitespace-nowrap">
                    Resolved At
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider text-gray-500 py-3 px-4 w-12">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[180px]">
                        {task.lead_name ?? "—"}
                      </div>
                      {task.lead_phone && (
                        <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                          {task.lead_phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {task.type}
                    </td>
                    <td className="py-3 px-2">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400 max-w-[260px] truncate">
                      {task.trigger_reason ?? "—"}
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(task.created_at)}
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(task.resolved_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ActionMenu
                        task={task}
                        onAction={handleAction}
                        busy={busyId === task.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">
          {tasks.length} tarefa(s) · Atualizado em{" "}
          {new Date(data.generated_at).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}
