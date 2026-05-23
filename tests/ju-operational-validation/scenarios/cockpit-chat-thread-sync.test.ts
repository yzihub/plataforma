import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const chatPagePath = path.join(process.cwd(), "src", "app", "cockpit", "chat", "page.tsx");
const messagesRoutePath = path.join(
  process.cwd(),
  "src",
  "app",
  "api",
  "conversations",
  "[id]",
  "messages",
  "route.ts",
);

function chatPageSource() {
  return fs.readFileSync(chatPagePath, "utf8");
}

describe("Cockpit chat thread synchronization", () => {
  it("resets and hydrates messages by selected conversation id", () => {
    const source = chatPageSource();

    expect(source).toContain("selectedIdRef");
    expect(source).toContain("messagesRequestRef");
    expect(source).toContain("AbortController");
    expect(source).toContain('cache: "no-store"');
    expect(source).toContain("message.conversation_id === selectedId");
    expect(source).toContain("setMessages([])");
  });

  it("subscribes realtime updates to the selected conversation only", () => {
    const source = chatPageSource();

    expect(source).toContain("cockpit-chat-thread:${selectedId}");
    expect(source).toContain("conversation_messages");
    expect(source).toContain("filter: `conversation_id=eq.${selectedId}`");
    expect(source).toContain("next.conversation_id !== selectedIdRef.current");
    expect(source).toContain("removeChannel(channel)");
  });

  it("keeps the messages endpoint scoped to conversation_id and no-store", () => {
    const source = fs.readFileSync(messagesRoutePath, "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain(".eq(\"conversation_id\", id)");
    expect(source).toContain('"Cache-Control": "no-store"');
    expect(source).not.toContain(".eq(\"lead_id\", id)");
  });
});
