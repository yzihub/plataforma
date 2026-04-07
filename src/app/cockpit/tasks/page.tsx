export default function TasksPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Tarefas
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organize as atividades do seu time
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova Tarefa
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 dark:border-gray-800 dark:bg-white/[0.03]">
        <svg
          className="size-14 text-gray-200 dark:text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
          Nenhuma tarefa cadastrada ainda.
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
          Crie sua primeira tarefa para começar.
        </p>
      </div>
    </div>
  );
}
