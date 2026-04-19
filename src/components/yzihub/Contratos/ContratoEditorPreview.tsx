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

      {/* Área de fundo — simula mesa */}
      <div className="flex-1 overflow-y-auto bg-gray-300 dark:bg-gray-700 py-5 px-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        {/*
          zoom: 0.42 escala o A4 (794px) para ~334px — cabe no painel de 360px.
          Diferente de transform:scale, zoom afeta o layout, eliminando double-scrollbar.
        */}
        <div style={{ zoom: 0.42, margin: "0 auto", width: "fit-content" }}>
          <div
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "794px",
              minHeight: "1122px",
              padding: "76px 96px 60px 96px", /* 20mm 25mm em px a 96dpi */
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              fontSize: "12px",
              color: "#000",
              boxSizing: "border-box",
            }}
          >
            {/* Logo à esquerda */}
            <div style={{ marginBottom: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/jurema/logo-black.svg"
                alt="Jurema Brokers"
                style={{ height: "48px", width: "auto" }}
              />
            </div>

            {/* Linha separadora */}
            <div style={{ borderTop: "1px solid #ccc", marginBottom: "16px" }} />

            {/* Corpo */}
            {body ? (
              <div style={{ flex: 1 }}>
                {body.split(/\n\n+/).map((paragraph, i) => (
                  <p
                    key={i}
                    style={{
                      marginTop: "0.6pt",
                      marginBottom: "12pt",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.0",
                      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                      fontSize: "12px",
                      color: "#000",
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "13px" }}>
                  Selecione um template para ver o preview
                </p>
              </div>
            )}

            {/* Rodapé */}
            <div style={{ borderTop: "1px solid #ccc", marginTop: "24px", paddingTop: "8px" }}>
              <p style={{ fontSize: "9px", color: "#6b7280", lineHeight: "1.5", textAlign: "center" }}>
                JUREMA BK NEGOCIOS IMOBILIARIOS LTDA<br />
                Rua Josita Almeida, 240, sala 18, Cabo Branco Altiplano – João Pessoa/PB<br />
                CNPJ: 32.140.721/0001-93 | CRECI: 1340 J
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
