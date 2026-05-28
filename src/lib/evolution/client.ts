// ─── Evolution API Client — SERVER ONLY ──────────────────────────────────────
// This module reads EVOLUTION_* environment variables.
// It must NEVER be imported in client bundles.
// No NEXT_PUBLIC_* env vars are used here — keys never reach the browser.

import type {
  EvolutionDisconnectResponse,
  EvolutionQrResponse,
  EvolutionStatusResponse,
  EvolutionStatusValue,
  EvolutionTestSendInput,
  EvolutionTestSendResponse,
  EvolutionWebhookResponse,
} from "./types";

// ─── Env helpers ─────────────────────────────────────────────────────────────

function readEnv() {
  return {
    baseUrl: process.env.EVOLUTION_API_URL ?? process.env.EVOLUTION_BASE_URL ?? "",
    apiKey: process.env.EVOLUTION_API_KEY ?? "",
    instance: process.env.EVOLUTION_INSTANCE ?? process.env.EVOLUTION_INSTANCE_NAME ?? "",
  };
}

/**
 * Returns true only if all three required env vars are present and non-empty.
 * When false, all functions return safe stubs (no external calls).
 */
export function isEvolutionConfigured(): boolean {
  const { baseUrl, apiKey, instance } = readEnv();
  return baseUrl.length > 0 && apiKey.length > 0 && instance.length > 0;
}

// ─── State mapping ────────────────────────────────────────────────────────────

function mapEvolutionState(state: string | undefined): EvolutionStatusValue {
  switch (state) {
    case "open":
      return "conectado";
    case "close":
      return "desconectado";
    case "connecting":
      return "aguardando_qr";
    default:
      return "desconectado";
  }
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

/**
 * GET instance connection state from Evolution API.
 * Returns safe stub when env vars not configured.
 */
export async function getInstanceStatus(): Promise<EvolutionStatusResponse> {
  if (!isEvolutionConfigured()) {
    return {
      ok: true,
      configured: false,
      status: "pendente_configuracao",
      message: "Integracao pendente de configuracao no servidor",
    };
  }

  const { baseUrl, apiKey, instance } = readEnv();

  try {
    const res = await fetch(
      `${baseUrl}/instance/connectionState/${instance}`,
      {
        headers: { apikey: apiKey },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return {
        ok: true,
        configured: true,
        status: "erro",
        message: `Falha ao consultar evolution: HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    // Evolution API response shape: { instance: { state: "open" | "close" | "connecting", ... } }
    const state: string | undefined =
      data?.instance?.state ?? data?.state ?? data?.connectionStatus;
    const statusValue = mapEvolutionState(state);

    // Try to extract phone number from profile info
    const phoneNumber: string | null =
      data?.instance?.owner ??
      data?.instance?.profileName ??
      data?.owner ??
      null;

    return {
      ok: true,
      configured: true,
      status: statusValue,
      instance: instance,
      phone_number: phoneNumber,
    };
  } catch {
    return {
      ok: true,
      configured: true,
      status: "erro",
      message: "Falha ao consultar evolution",
    };
  }
}

/**
 * POST to connect instance and retrieve QR code.
 * Returns safe stub when env vars not configured.
 */
export async function fetchQrCode(): Promise<EvolutionQrResponse> {
  if (!isEvolutionConfigured()) {
    return {
      ok: true,
      configured: false,
      status: "pendente_configuracao",
      qr: null,
    };
  }

  const { baseUrl, apiKey, instance } = readEnv();

  try {
    const res = await fetch(`${baseUrl}/instance/connect/${instance}`, {
      headers: { apikey: apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: true,
        configured: true,
        status: "erro",
        qr: null,
      };
    }

    const data = await res.json();
    // Evolution API may return qr in different fields
    const qr: string | null =
      data?.base64 ??
      data?.qrcode?.base64 ??
      data?.qr?.base64 ??
      data?.code ??
      null;

    return {
      ok: true,
      configured: true,
      status: qr ? "aguardando_qr" : "desconectado",
      qr,
    };
  } catch {
    return {
      ok: true,
      configured: true,
      status: "erro",
      qr: null,
    };
  }
}

/**
 * DELETE (logout) to disconnect WhatsApp instance.
 * Returns safe stub when env vars not configured.
 */
export async function disconnectInstance(): Promise<EvolutionDisconnectResponse> {
  if (!isEvolutionConfigured()) {
    return {
      ok: true,
      configured: false,
      status: "pendente_configuracao",
    };
  }

  const { baseUrl, apiKey, instance } = readEnv();

  try {
    const res = await fetch(`${baseUrl}/instance/logout/${instance}`, {
      method: "DELETE",
      headers: { apikey: apiKey },
    });

    if (!res.ok) {
      return {
        ok: true,
        configured: true,
        status: "erro",
      };
    }

    return {
      ok: true,
      configured: true,
      status: "desconectado",
    };
  } catch {
    return {
      ok: true,
      configured: true,
      status: "erro",
    };
  }
}

// ─── Webhook helpers ──────────────────────────────────────────────────────────

/** URL publica esperada do webhook YZI OS para a Evolution. */
export const EXPECTED_WEBHOOK_URL = "https://yzi-os.yzihub.com/webhook/evolution";

/**
 * GET webhook config da instancia na Evolution.
 * Endpoint: GET {baseUrl}/webhook/find/{instance}
 * Resposta tipica: { url, enabled, events, webhookByEvents, webhookBase64 }
 * Retorna safe stub quando env vars nao estao configuradas.
 */
export async function getInstanceWebhook(): Promise<EvolutionWebhookResponse> {
  if (!isEvolutionConfigured()) {
    return {
      ok: true,
      configured: false,
      status: "pendente_configuracao",
      webhook_url: null,
      expected_url: EXPECTED_WEBHOOK_URL,
      message: "Integracao pendente de configuracao no servidor",
    };
  }

  const { baseUrl, apiKey, instance } = (function readEnvLocal() {
    return {
      baseUrl: process.env.EVOLUTION_API_URL ?? process.env.EVOLUTION_BASE_URL ?? "",
      apiKey: process.env.EVOLUTION_API_KEY ?? "",
      instance: process.env.EVOLUTION_INSTANCE ?? process.env.EVOLUTION_INSTANCE_NAME ?? "",
    };
  })();

  try {
    const res = await fetch(`${baseUrl}/webhook/find/${instance}`, {
      headers: { apikey: apiKey },
      cache: "no-store",
    });

    // Evolution retorna 404 quando webhook ausente — tratar como "ausente"
    if (res.status === 404) {
      return {
        ok: true,
        configured: true,
        status: "ausente",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
      };
    }

    if (!res.ok) {
      return {
        ok: true,
        configured: true,
        status: "erro",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
        message: `Falha ao consultar webhook: HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const url: string | null = data?.url ?? data?.webhook?.url ?? null;
    const events: string[] | null = Array.isArray(data?.events) ? data.events : null;
    const enabled: boolean | undefined =
      typeof data?.enabled === "boolean" ? data.enabled : undefined;

    if (!url) {
      return {
        ok: true,
        configured: true,
        status: "ausente",
        webhook_url: null,
        expected_url: EXPECTED_WEBHOOK_URL,
        events,
        enabled,
      };
    }

    const status: EvolutionWebhookResponse["status"] =
      url.trim().replace(/\/+$/, "") ===
      EXPECTED_WEBHOOK_URL.trim().replace(/\/+$/, "")
        ? "configurado"
        : "divergente";

    return {
      ok: true,
      configured: true,
      status,
      webhook_url: url,
      expected_url: EXPECTED_WEBHOOK_URL,
      events,
      enabled,
    };
  } catch {
    return {
      ok: true,
      configured: true,
      status: "erro",
      webhook_url: null,
      expected_url: EXPECTED_WEBHOOK_URL,
      message: "Falha ao consultar webhook",
    };
  }
}

/**
 * POST to send a test WhatsApp message via Evolution API.
 * Returns safe stub when env vars not configured.
 */
export async function sendTestMessage(
  input: EvolutionTestSendInput
): Promise<EvolutionTestSendResponse> {
  if (!isEvolutionConfigured()) {
    return {
      ok: true,
      configured: false,
      status: "pendente_configuracao",
      sent: false,
    };
  }

  const { baseUrl, apiKey, instance } = readEnv();

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: input.phone,
        text: input.message ?? "[YZI] Teste de envio do cockpit.",
      }),
    });

    if (!res.ok) {
      return {
        ok: true,
        configured: true,
        status: "erro",
        sent: false,
      };
    }

    const data = await res.json();

    return {
      ok: true,
      configured: true,
      status: "conectado",
      sent: true,
      message_id: data?.key?.id ?? null,
    };
  } catch {
    return {
      ok: true,
      configured: true,
      status: "erro",
      sent: false,
    };
  }
}
