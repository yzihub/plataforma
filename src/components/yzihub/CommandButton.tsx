"use client";

import React, { useState } from "react";

export type CrmAction =
  | "contact"
  | "schedule"
  | "send_proposal"
  | "close"
  | "lose";

interface CommandButtonProps {
  action: CrmAction;
  leadId: string;
  tenantId: string;
  onSuccess?: (jobId: string) => void;
  onError?: (message: string) => void;
}

const ACTION_CONFIG: Record<
  CrmAction,
  { label: string; border: string; text: string; hover: string }
> = {
  contact: {
    label: "ENTRAR EM CONTATO",
    border: "border-brand-400 dark:border-brand-500",
    text: "text-brand-600 dark:text-brand-400",
    hover: "hover:bg-brand-50 dark:hover:bg-brand-500/10",
  },
  schedule: {
    label: "MARCAR REUNIÃO",
    border: "border-amber-400 dark:border-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    hover: "hover:bg-amber-50 dark:hover:bg-amber-500/10",
  },
  send_proposal: {
    label: "GERAR PROPOSTA",
    border: "border-violet-400 dark:border-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    hover: "hover:bg-violet-50 dark:hover:bg-violet-500/10",
  },
  close: {
    label: "FECHAR",
    border: "border-emerald-400 dark:border-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
  },
  lose: {
    label: "PERDER",
    border: "border-rose-400 dark:border-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    hover: "hover:bg-rose-50 dark:hover:bg-rose-500/10",
  },
};

type ButtonState = "idle" | "loading" | "success" | "error";

export default function CommandButton({
  action,
  leadId,
  tenantId,
  onSuccess,
  onError,
}: CommandButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const config = ACTION_CONFIG[action];

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");

    try {
      const res = await fetch("/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, lead_id: leadId, tenant_id: tenantId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        onError?.(data.error ?? "Erro ao executar ação.");
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      setState("success");
      onSuccess?.(data.job_id);
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      onError?.("Erro de conexão. Tente novamente.");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";

  const stateClasses = isError
    ? "border-rose-400 dark:border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
    : isSuccess
    ? "border-emerald-400 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
    : `${config.border} ${config.text} ${config.hover}`;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide border bg-transparent transition-all duration-150",
        stateClasses,
        isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      title={config.label}
    >
      {isLoading && (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {isSuccess && <CheckIcon />}
      {isError && <XIcon />}
      {!isLoading && !isSuccess && !isError && <span>{config.label}</span>}
      {(isSuccess || isError) && (
        <span>{isSuccess ? "OK" : "ERRO"}</span>
      )}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M3 3l6 6M9 3l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
