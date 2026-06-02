"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { signIn } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import React, { useState } from "react";

// Monta a URL de redirect para fluxos que voltam via /auth/callback.
// NEXT_PUBLIC_APP_URL tem prioridade — garante domínio oficial em produção
// mesmo se o usuário acessar via preview/alt-domain. Em dev, configurar a
// env como http://localhost:<porta> no .env.local. Fallback para origin
// se a env não estiver definida (SSR-safe).
// `next` permite rotear o usuário para uma tela específica após o callback
// (ex.: recuperação de senha → /reset-password).
const getRedirectUrl = (next?: string) => {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const base = `${appUrl}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
};

export default function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modo "esqueci a senha": troca o formulário de login pelo de recuperação.
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Login email/senha — usa a server action signIn (Supabase signInWithPassword).
  // O redirect (/cockpit ou /control) é decidido no backend pela action.
  async function handleEmailSignIn(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signIn(formData);
    // Em caso de sucesso a action faz redirect (não retorna). Só chega aqui em erro.
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  // Recuperação de senha — Supabase envia email com link que volta por
  // /auth/callback?next=/reset-password, onde o usuário define a nova senha.
  // Mensagem genérica (não revela se o email existe).
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!resetEmail.trim()) {
      setError("Informe seu email.");
      return;
    }
    setResetLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      { redirectTo: getRedirectUrl("/reset-password") }
    );
    setResetLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  function switchToForgot() {
    setError(null);
    setResetSent(false);
    setResetEmail("");
    setMode("forgot");
  }

  function switchToLogin() {
    setError(null);
    setMode("login");
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {mode === "forgot" ? "Recuperar senha" : "Bem-vindo de volta"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === "forgot"
                ? "Informe seu email e enviaremos um link para criar uma nova senha."
                : "Entre com seu email e senha para acessar o Cockpit."}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {mode === "forgot" ? (
            /* Recuperação de senha */
            resetSent ? (
              <div className="space-y-5">
                <div className="px-4 py-3 text-sm text-green-700 bg-green-50 rounded-lg dark:bg-green-900/20 dark:text-green-400">
                  Se houver uma conta com esse email, enviamos um link para
                  redefinir a senha. Verifique sua caixa de entrada e o spam.
                </div>
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="space-y-5">
                  <div>
                    <Label>
                      Email<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="seu@email.com"
                      defaultValue={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? "Enviando..." : "Enviar link de recuperação"}
                  </button>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="w-full text-sm text-center text-brand-500 hover:underline"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            )
          ) : (
            <>
              {/* Login email/senha */}
              <form action={handleEmailSignIn}>
                <div className="space-y-5">
                  <div>
                    <Label>
                      Email<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <Label>
                      Senha<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        name="password"
                        placeholder="Sua senha"
                        type={showPassword ? "text" : "password"}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-sm text-brand-500 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </button>
                </div>
              </form>

              {/* Divisor */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                    ou
                  </span>
                </div>
              </div>

              {/* Login Google (mantido) */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                      fill="#EB4335"
                    />
                  </svg>
                )}
                {googleLoading ? "Redirecionando..." : "Entrar com Google"}
              </button>
            </>
          )}

          <p className="mt-6 text-xs text-center text-gray-400 dark:text-gray-600">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}
