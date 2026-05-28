import type { IncomingHttpHeaders } from "node:http";
import type Redis from "ioredis";

const INBOUND_REPLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPath(record: unknown, ...path: string[]): unknown {
  let current: unknown = record;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function extractFirstMessageId(record: unknown): string {
  const candidates = [
    getPath(record, "body", "data", "key", "id"),
    getPath(record, "body", "key", "id"),
    getPath(record, "data", "key", "id"),
    getPath(record, "key", "id"),
    getPath(record, "body", "data", "messageId"),
    getPath(record, "body", "data", "message_id"),
    getPath(record, "data", "messageId"),
    getPath(record, "data", "message_id"),
    getPath(record, "messageId"),
    getPath(record, "message_id"),
    getPath(record, "external_message_id"),
    getPath(record, "id"),
  ];
  return firstString(...candidates);
}

function extractConversationId(record: unknown): string {
  const candidates = [
    getPath(record, "conversation_id"),
    getPath(record, "body", "data", "key", "remoteJid"),
    getPath(record, "body", "key", "remoteJid"),
    getPath(record, "data", "key", "remoteJid"),
    getPath(record, "remoteJid"),
    getPath(record, "body", "data", "key", "remoteJidAlt"),
    getPath(record, "key", "remoteJid"),
  ];
  return firstString(...candidates);
}

export type WebhookSecurityFingerprint = {
  message_id: string;
  conversation_id: string;
  remote_jid: string;
};

export function extractWebhookFingerprint(body: unknown): WebhookSecurityFingerprint {
  return {
    message_id: extractFirstMessageId(body),
    conversation_id: extractConversationId(body),
    remote_jid: firstString(
      getPath(body, "remoteJid"),
      getPath(body, "body", "data", "key", "remoteJid"),
      getPath(body, "body", "key", "remoteJid"),
      getPath(body, "data", "key", "remoteJid"),
    ),
  };
}

export function validateWebhookSecret(headers: IncomingHttpHeaders): { ok: boolean; reason?: string } {
  const expected = firstString(
    process.env.JUREMA_TOOL_WEBHOOK_SECRET,
    process.env.RUNTIME_COGNITIVE_WEBHOOK_SECRET,
    process.env.EVOLUTION_WEBHOOK_SECRET,
  );
  if (!expected) {
    const isProduction = clean(process.env.NODE_ENV) === "production";
    const isActiveMode = clean(process.env.RUNTIME_MODE) === "active";
    if (isProduction || isActiveMode) {
      return { ok: false, reason: "missing_webhook_secret_config" };
    }
    return { ok: true };
  }
  const received = firstString(
    headers["x-webhook-secret"],
    headers["x-evolution-webhook-secret"],
    headers["x-evolution-secret"],
  );
  if (!received) return { ok: false, reason: "missing_webhook_secret" };
  if (received !== expected) return { ok: false, reason: "invalid_webhook_secret" };
  return { ok: true };
}

export async function reserveInboundMessage(
  redis: Redis,
  messageId: string,
  ttlMs = INBOUND_REPLAY_TTL_MS,
): Promise<boolean> {
  const key = `ju:cognitive:inbound:${clean(messageId)}`;
  if (!clean(messageId)) return true;
  const result = await redis.set(key, "1", "PX", ttlMs, "NX");
  return result === "OK";
}
