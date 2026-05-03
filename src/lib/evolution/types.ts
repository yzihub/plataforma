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
