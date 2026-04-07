export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Chat
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Conversas com o time e agentes IA
        </p>
      </div>

      {/* Messages area */}
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
          Nenhuma mensagem ainda. Inicie uma conversa.
        </p>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]">
        <input
          type="text"
          placeholder="Digite uma mensagem..."
          disabled
          className="flex-1 bg-transparent text-sm text-gray-400 placeholder:text-gray-400 outline-none cursor-not-allowed dark:text-gray-500 dark:placeholder:text-gray-600"
        />
        <button
          type="button"
          disabled
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
