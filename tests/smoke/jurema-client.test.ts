import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMessageToJurema } from "@/lib/agents/jurema";

const JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

function mockOk(json: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => json,
  });
}

describe("sendMessageToJurema (smoke)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("envia POST para /agent/jurema usando tenant fallback do env", async () => {
    const fakeResponse = {
      mode: "reply",
      messages: ["ok"],
      metadata: { agent: "jurema", deal_stage: "qualificacao" },
    };
    const fetchMock = mockOk(fakeResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMessageToJurema({
      message: "oi",
      phone: "5585988811150",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string; headers: Record<string, string> }];
    expect(url).toBe("https://yzi-os.test.local/agent/jurema");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body);
    expect(body.tenant_id).toBe(JUREMA_TENANT_ID);
    expect(body.message).toBe("oi");
    expect(body.phone).toBe("5585988811150");

    expect(result).toEqual(fakeResponse);
  });

  it("respeita tenant_id customizado no payload", async () => {
    const fetchMock = mockOk({ mode: "reply", messages: [], metadata: {} });
    vi.stubGlobal("fetch", fetchMock);

    await sendMessageToJurema({
      message: "oi",
      phone: "5585988811150",
      tenant_id: "custom-tenant",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit & { body: string }])[1].body);
    expect(body.tenant_id).toBe("custom-tenant");
  });

  it("lança erro quando backend responde !ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendMessageToJurema({ message: "oi", phone: "5585988811150" })
    ).rejects.toThrow(/500.*boom|boom.*500/);
  });
});
