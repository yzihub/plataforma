"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Troca de senha (usuário autenticado) ────────────────────────────────────
// Usa supabase.auth.updateUser({ password }) com a sessão ativa do próprio
// usuário. Pensado para o primeiro acesso dos gestores (trocar a senha
// temporária) e para troca de senha em geral. Sem service_role.

export default function ChangePasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    setSaving(true);
    try {
      if (!isDevBypass) {
        const supabase = createClient();
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) {
          setError(err.message);
          setSaving(false);
          return;
        }
      }
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch {
      setError("Erro inesperado ao atualizar a senha.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
        Segurança
      </h3>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Defina uma nova senha de acesso.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div>
          <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Nova senha
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirmar nova senha
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 select-none">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-700"
          />
          Mostrar senha
        </label>

        {error && (
          <p className="rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2 text-sm text-error-600 dark:text-error-400">
            {error}
          </p>
        )}

        {done && (
          <p className="rounded-lg bg-success-50 dark:bg-success-500/10 px-3 py-2 text-sm text-success-600 dark:text-success-400">
            Senha atualizada com sucesso.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
