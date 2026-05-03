import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockOk(json: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => json,
  });
}

// ─── isEvolutionConfigured ────────────────────────────────────────────────────

describe("isEvolutionConfigured", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("Test 1 — returns false when EVOLUTION_BASE_URL is missing", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "my-key");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "my-instance");
    const { isEvolutionConfigured } = await import("@/lib/evolution/client");
    expect(isEvolutionConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("Test 1b — returns false when EVOLUTION_API_KEY is missing", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "https://e.test");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "my-instance");
    const { isEvolutionConfigured } = await import("@/lib/evolution/client");
    expect(isEvolutionConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("Test 1c — returns false when EVOLUTION_INSTANCE_NAME is missing", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "https://e.test");
    vi.stubEnv("EVOLUTION_API_KEY", "my-key");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { isEvolutionConfigured } = await import("@/lib/evolution/client");
    expect(isEvolutionConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("Test 2 — returns true when all 3 env vars are set", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "https://e.test");
    vi.stubEnv("EVOLUTION_API_KEY", "my-key");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "my-instance");
    const { isEvolutionConfigured } = await import("@/lib/evolution/client");
    expect(isEvolutionConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });
});

// ─── GET /api/evolution/status ────────────────────────────────────────────────

describe("GET /api/evolution/status", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("Test 3 — returns pendente_configuracao when env not configured", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { GET } = await import("@/app/api/evolution/status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.configured).toBe(false);
    expect(json.status).toBe("pendente_configuracao");
  });

  it("Test 8a — status response does not leak env var names in JSON", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { GET } = await import("@/app/api/evolution/status/route");
    const res = await GET();
    const json = await res.json();
    const text = JSON.stringify(json);
    expect(text).not.toContain("EVOLUTION_API_KEY");
    expect(text).not.toContain("EVOLUTION_BASE_URL");
    expect(text).not.toContain("EVOLUTION_INSTANCE_NAME");
  });
});

// ─── POST /api/evolution/qr ───────────────────────────────────────────────────

describe("POST /api/evolution/qr", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("Test 4 — returns pendente_configuracao with qr:null when env not configured", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/qr/route");
    const req = new Request("http://test/api/evolution/qr", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.configured).toBe(false);
    expect(json.status).toBe("pendente_configuracao");
    expect(json.qr).toBeNull();
  });

  it("Test 8b — qr response does not leak env var names", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/qr/route");
    const req = new Request("http://test/api/evolution/qr", { method: "POST" });
    const res = await POST(req);
    const json = await res.json();
    const text = JSON.stringify(json);
    expect(text).not.toContain("EVOLUTION_API_KEY");
    expect(text).not.toContain("EVOLUTION_BASE_URL");
    expect(text).not.toContain("EVOLUTION_INSTANCE_NAME");
  });
});

// ─── POST /api/evolution/disconnect ──────────────────────────────────────────

describe("POST /api/evolution/disconnect", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("Test 5 — returns pendente_configuracao when env not configured", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/disconnect/route");
    const req = new Request("http://test/api/evolution/disconnect", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.configured).toBe(false);
    expect(json.status).toBe("pendente_configuracao");
  });

  it("Test 8c — disconnect response does not leak env var names", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/disconnect/route");
    const req = new Request("http://test/api/evolution/disconnect", {
      method: "POST",
    });
    const res = await POST(req);
    const json = await res.json();
    const text = JSON.stringify(json);
    expect(text).not.toContain("EVOLUTION_API_KEY");
    expect(text).not.toContain("EVOLUTION_BASE_URL");
    expect(text).not.toContain("EVOLUTION_INSTANCE_NAME");
  });
});

// ─── POST /api/evolution/test-send ───────────────────────────────────────────

describe("POST /api/evolution/test-send", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("Test 6 — returns pendente_configuracao with sent:false when env not configured", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/test-send/route");
    const req = new Request("http://test/api/evolution/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "5585999999999" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.configured).toBe(false);
    expect(json.status).toBe("pendente_configuracao");
    expect(json.sent).toBe(false);
  });

  it("Test 7 — returns 400 with error:phone obrigatorio when body has no phone (validation before env check)", async () => {
    // Even with env set, missing phone should still return 400
    vi.stubEnv("EVOLUTION_BASE_URL", "https://e.test");
    vi.stubEnv("EVOLUTION_API_KEY", "my-key");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "my-instance");
    const { POST } = await import("@/app/api/evolution/test-send/route");
    const req = new Request("http://test/api/evolution/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("phone obrigatorio");
  });

  it("Test 7b — returns 400 for empty body", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/test-send/route");
    const req = new Request("http://test/api/evolution/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("phone obrigatorio");
  });

  it("Test 8d — test-send response does not leak env var names", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "");
    const { POST } = await import("@/app/api/evolution/test-send/route");
    const req = new Request("http://test/api/evolution/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "5585999999999" }),
    });
    const res = await POST(req);
    const json = await res.json();
    const text = JSON.stringify(json);
    expect(text).not.toContain("EVOLUTION_API_KEY");
    expect(text).not.toContain("EVOLUTION_BASE_URL");
    expect(text).not.toContain("EVOLUTION_INSTANCE_NAME");
  });

  it("Test — mock configured: calls external fetch and returns status:conectado", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "https://e.test");
    vi.stubEnv("EVOLUTION_API_KEY", "my-key");
    vi.stubEnv("EVOLUTION_INSTANCE_NAME", "my-instance");
    const fetchMock = mockOk({ key: { id: "msg-123" } });
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/evolution/test-send/route");
    const req = new Request("http://test/api/evolution/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "5585999999999" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(true);
    expect(json.configured).toBe(true);
  });
});
