"use client";

// ─── ContratoEditorPreview ────────────────────────────────────────────────────
// Painel direito do editor: exibe o contrato como folha de papel com logo Jurema.

interface ContratoEditorPreviewProps {
  body: string;
}

export default function ContratoEditorPreview({ body }: ContratoEditorPreviewProps) {
  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header do preview */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Preview
        </span>
      </div>

      {/* Área da folha de papel */}
      <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800 px-6 py-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
        <div className="mx-auto max-w-[640px] min-h-[800px] bg-white border border-gray-200 rounded-sm shadow-lg px-12 py-10">
          {/* Cabeçalho do documento */}
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/jurema/logo-black.svg"
              alt="Jurema Brokers"
              className="h-12 mx-auto mb-2"
            />
            <div className="mx-auto h-px w-24 bg-gray-300" />
          </div>

          {/* Corpo do contrato */}
          {body ? (
            <div className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-gray-900">
              {body}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center mt-20">
              Selecione um template para ver o preview
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
