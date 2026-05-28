import { describe, expect, it, vi } from "vitest";
import { extractWebhookFingerprint, reserveInboundMessage, validateWebhookSecret } from "@/runtime/webhook_security";

describe("WebhookSecurity", () => {
  it("extracts message and conversation identifiers from Evolution payloads", () => {
    const fingerprint = extractWebhookFingerprint({
      body: {
        data: {
          key: {
            id: "msg-123",
            remoteJid: "5583999990002@s.whatsapp.net",
          },
        },
      },
    });

    expect(fingerprint.message_id).toBe("msg-123");
    expect(fingerprint.conversation_id).toContain("@s.whatsapp.net");
  });

  it("validates the x-webhook-secret header against the configured secret", () => {
    vi.stubEnv("JUREMA_TOOL_WEBHOOK_SECRET", "secret-123");
    expect(validateWebhookSecret({ "x-webhook-secret": "secret-123" } as never).ok).toBe(true);
    expect(validateWebhookSecret({ "x-webhook-secret": "wrong" } as never).ok).toBe(false);
  });

  it("keeps backward-compatible secret fallbacks", () => {
    vi.stubEnv("JUREMA_TOOL_WEBHOOK_SECRET", "");
    vi.stubEnv("RUNTIME_COGNITIVE_WEBHOOK_SECRET", "runtime-secret");
    expect(validateWebhookSecret({ "x-webhook-secret": "runtime-secret" } as never).ok).toBe(true);

    vi.stubEnv("RUNTIME_COGNITIVE_WEBHOOK_SECRET", "");
    vi.stubEnv("EVOLUTION_WEBHOOK_SECRET", "evolution-secret");
    expect(validateWebhookSecret({ "x-webhook-secret": "evolution-secret" } as never).ok).toBe(true);
  });

  it("reserves inbound message ids only once for replay protection", async () => {
    const calls: Array<string[]> = [];
    const redis = {
      set: async (...args: string[]) => {
        calls.push(args);
        return calls.length === 1 ? "OK" : null;
      },
    } as never;

    const first = await reserveInboundMessage(redis, "msg-456");
    const second = await reserveInboundMessage(redis, "msg-456");

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(calls[0][0]).toContain("ju:cognitive:inbound:msg-456");
  });
});
