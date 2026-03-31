import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 px-6">
      <div className="text-center max-w-md">
        <span className="text-6xl font-bold text-brand-500">403</span>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Acesso não autorizado
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Seu e-mail não está cadastrado na plataforma. Entre em contato com o
          administrador para solicitar acesso.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
