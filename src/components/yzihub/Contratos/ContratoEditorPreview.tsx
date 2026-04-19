"use client";

// ─── ContratoEditorPreview ────────────────────────────────────────────────────
// Painel direito do editor: exibe o texto do contrato formatado em tempo real.

interface ContratoEditorPreviewProps {
  body: string;
}

export default function ContratoEditorPreview({ body }: ContratoEditorPreviewProps) {
  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header do preview */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Preview
        </span>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
        {body ? (
          <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {body}
          </pre>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center mt-12">
            Selecione um template para ver o preview
          </p>
        )}
      </div>
    </div>
  );
}
