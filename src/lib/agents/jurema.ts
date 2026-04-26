export type JuremaRequest = {
  message: string;
  phone: string;
  tenant_id?: string;
  source?: string;
  entrypoint?: string;
  property_id?: string;
  id_imovel?: string;
  intent?: string;
  context?: Record<string, unknown>;
};

export type JuremaResponse = {
  mode: "reply" | string;
  messages: string[];
  metadata: {
    agent?: "jurema" | string;
    lead_id?: string;
    deal_id?: string;
    deal_stage?: string;
    qualification_status?: string;
    lead_score?: number;
    missing_fields?: string[];
    imoveis_count?: number;
    feature_flags?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

const API_URL = process.env.NEXT_PUBLIC_YZI_API_URL;
const JUREMA_TENANT_ID = process.env.NEXT_PUBLIC_JUREMA_TENANT_ID;

export async function sendMessageToJurema(
  payload: JuremaRequest
): Promise<JuremaResponse> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_YZI_API_URL não configurada");
  if (!payload.tenant_id && !JUREMA_TENANT_ID) {
    throw new Error("NEXT_PUBLIC_JUREMA_TENANT_ID não configurada");
  }

  const response = await fetch(`${API_URL}/agent/jurema`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      tenant_id: payload.tenant_id ?? JUREMA_TENANT_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Erro ao chamar Ju: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<JuremaResponse>;
}
