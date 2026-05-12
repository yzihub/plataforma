// ─── Evolution API Types ──────────────────────────────────────────────────────
// Server-only types — never imported in client bundles directly.
// These types describe the shape of responses from /api/evolution/* routes.

export type EvolutionStatusValue =
  | "conectado"
  | "desconectado"
  | "aguardando_qr"
  | "erro"
  | "pendente_configuracao";

export type EvolutionStatusResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionStatusValue;
  instance?: string;
  phone_number?: string | null;
  last_seen_at?: string | null;
  message?: string;
};

export type EvolutionQrResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionStatusValue;
  /** base64 PNG or data URL — null when not in aguardando_qr state */
  qr: string | null;
  expires_in_seconds?: number;
};

export type EvolutionDisconnectResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionStatusValue;
};

export type EvolutionTestSendResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionStatusValue;
  sent: boolean;
  message_id?: string | null;
};

export type EvolutionTestSendInput = {
  phone: string;
  message?: string;
};

export type EvolutionWebhookStatusValue =
  | "configurado"           // url retornada bate com a esperada
  | "divergente"            // Evolution retornou url diferente da esperada
  | "ausente"               // Evolution nao tem webhook configurado
  | "erro"                  // falha de comunicacao
  | "pendente_configuracao"; // env vars nao configuradas

export type EvolutionWebhookResponse = {
  ok: true;
  configured: boolean;
  status: EvolutionWebhookStatusValue;
  /** URL atualmente configurada na Evolution (null se ausente/erro) */
  webhook_url: string | null;
  /** URL esperada (constante) — facilita comparacao no client */
  expected_url: string;
  /** lista de eventos atualmente assinados, ou null */
  events?: string[] | null;
  /** webhook ativo? (campo `enabled` da Evolution) */
  enabled?: boolean;
  message?: string;
};
