"use client";

import React, { useState } from "react";

export type CrmAction =
  | "qualify"
  | "send_proposal"
  | "schedule"
  | "close"
  | "ai_takeover";

interface CommandButtonProps {
  action: CrmAction;
  leadId: string;
  tenantId: string;
  onSuccess?: (jobId: string) => void;
  onError?: (message: string) => void;
}

const ACTION_CONFIG: Record<
  CrmAction,
  { label: string; color: string; hoverColor: string }
> = {
  qualify: {
    label: "QUALIFICAR",
    color: "bg-brand-500",
    hoverColor: "hover:bg-brand-600",
  },
  send_proposal: {
    label: "ENVIAR PROPOSTA",
    color: "bg-violet-500",
    hoverColor: "hover:bg-violet-600",
  },
  schedule: {
    label: "AGENDAR",
    color: "bg-amber-500",
    hoverColor: "hover:bg-amber-600",
  },
  close: {
    label: "FECHAR",
    color: "bg-emerald-500",
    hoverColor: "hover:bg-emerald-600",
  },
  ai_takeover: {
    label: "IA ASSUMIR",
    color: "bg-rose-500",
    hoverColor: "hover:bg-rose-600",
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

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide text-white transition-all duration-150",
        isError
          ? "bg-red-500 hover:bg-red-600"
          : isSuccess
          ? "bg-emerald-500 hover:bg-emerald-600"
          : `${config.color} ${config.hoverColor}`,
        isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      title={config.label}
    >
      {isLoading && (
        <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
