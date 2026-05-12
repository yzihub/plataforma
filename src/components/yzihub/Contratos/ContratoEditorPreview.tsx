"use client";

// ─── ContratoEditorPreview ────────────────────────────────────────────────────
// Painel direito do editor: exibe o contrato como folha de papel com logo Jurema.

interface ContratoEditorPreviewProps {
  body: string;
  templateName?: string;
  templateFileId?: string;
}

function isOfficialTemplateFileId(value: string | null | undefined) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,}$/.test(value) && !value.startsWith("ID_");
}

export default function ContratoEditorPreview({ body, templateName, templateFileId }: ContratoEditorPreviewProps) {
  const hasOfficialTemplate = isOfficialTemplateFileId(templateFileId);

  return (
    <div className="flex flex-col">
      {/* Header do preview */}
      <div className="border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Preview
        </span>
      </div>

      {/* Área de fundo — simula mesa */}
      <div className="bg-gray-300 px-3 py-5 dark:bg-gray-700">
        {/*
          zoom: 0.42 escala o A4 (794px) para ~334px — cabe no painel de 360px.
          Diferente de transform:scale, zoom afeta o layout da folha.
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
                src="/images/jurema/logo-black-official.svg"
                alt="Jurema Brokers"
                style={{ height: "56px", width: "auto" }}
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
            ) : hasOfficialTemplate ? (
              <div style={{ flex: 1 }}>
                <div style={{ marginTop: "64px", textAlign: "center" }}>
                  <p style={{ color: "#111827", fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
                    {templateName || "Modelo oficial selecionado"}
                  </p>
                  <p style={{ color: "#4b5563", fontSize: "13px", lineHeight: "1.6", margin: "0 auto", maxWidth: "460px" }}>
                    Prévia visual. O documento final será gerado pelo Google Docs.
                  </p>
                </div>

                <div style={{ marginTop: "64px", borderTop: "1px solid #e5e7eb", paddingTop: "18px" }}>
                  <p style={{ color: "#6b7280", fontSize: "11px", lineHeight: "1.6" }}>
                    Este painel não carrega o DOCX real nem reproduz sua formatação. Ele mostra apenas o modelo oficial selecionado e os campos que serão preenchidos pelo fluxo de geração.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "13px" }}>
                  Selecione um template oficial
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
