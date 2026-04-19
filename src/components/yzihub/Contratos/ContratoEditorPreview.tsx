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

      {/* Área da folha de papel — simula desktop/mesa */}
      <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-700 px-8 py-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        {/* Folha A4 — sempre branca, independente do tema */}
        <div
          className="mx-auto bg-white border border-gray-300 shadow-lg flex flex-col"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "20mm 25mm 20mm 25mm",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: "12px",
            color: "#000",
          }}
        >
          {/* Cabeçalho: logo à esquerda */}
          <div className="flex items-start mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/jurema/logo-black.svg"
              alt="Jurema Brokers"
              style={{ height: "48px", width: "auto" }}
            />
          </div>

          {/* Linha separadora */}
          <div style={{ borderTop: "1px solid #ccc", marginBottom: "16px" }} />

          {/* Corpo do contrato */}
          {body ? (
            <div
              style={{
                flex: 1,
                whiteSpace: "pre-wrap",
                lineHeight: "1.0",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                fontSize: "12px",
                color: "#000",
              }}
            >
              {body.split(/\n\n+/).map((paragraph, i) => (
                <p
                  key={i}
                  style={{
                    marginTop: "0.6pt",
                    marginBottom: "12pt",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.0",
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "12px" }}>
                Selecione um template para ver o preview
              </p>
            </div>
          )}

          {/* Rodapé fixo */}
          <div style={{ borderTop: "1px solid #ccc", marginTop: "24px", paddingTop: "8px" }}>
            <p style={{ fontSize: "9px", color: "#6b7280", lineHeight: "1.4", textAlign: "center" }}>
              JUREMA BK NEGOCIOS IMOBILIARIOS LTDA<br />
              Rua Josita Almeida, 240, sala 18, Cabo Branco Altiplano – João Pessoa/PB<br />
              CNPJ: 32.140.721/0001-93 | CRECI: 1340 J
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
