import { describe, expect, it } from "vitest";

import { createOptimisticMessage, promoteConversationPreview, selectConversationPreview } from "./optimistic-chat";

describe("createOptimisticMessage", () => {
  it("creates a sent outbound demo message for the CRM agent", () => {
    const now = new Date("2026-06-03T00:00:00.000Z");

    const message = createOptimisticMessage({
      id: "local-1",
      now,
      senderId: "crm-agent",
      senderName: "CRM AI Agent",
      text: "Halo, kami bantu follow up ya.",
    });

    expect(message).toEqual({
      id: "local-1",
      senderId: "crm-agent",
      senderName: "CRM AI Agent",
      status: "sent",
      text: "Halo, kami bantu follow up ya.",
      timestamp: now,
    });
  });
});

describe("promoteConversationPreview", () => {
  it("promotes the updated conversation with the local message preview", () => {
    const now = new Date("2026-06-03T01:00:00.000Z");
    const conversations = [
      { id: "a", lastMessageAt: new Date("2026-06-02T00:00:00.000Z"), lastMessageSummary: "old a" },
      { id: "b", lastMessageAt: new Date("2026-06-02T01:00:00.000Z"), lastMessageSummary: "old b" },
    ];

    const updated = promoteConversationPreview(conversations, {
      conversationId: "b",
      lastMessageAt: now,
      lastMessageSummary: "new local reply",
    });

    expect(updated).toEqual([
      { id: "b", lastMessageAt: now, lastMessageSummary: "new local reply" },
      { id: "a", lastMessageAt: new Date("2026-06-02T00:00:00.000Z"), lastMessageSummary: "old a" },
    ]);
  });
});

describe("selectConversationPreview", () => {
  it("returns the requested conversation instead of always using the first one", () => {
    const conversations = [
      { id: "a", lastMessageAt: new Date("2026-06-02T00:00:00.000Z"), lastMessageSummary: "old a" },
      { id: "b", lastMessageAt: new Date("2026-06-02T01:00:00.000Z"), lastMessageSummary: "old b" },
    ];

    expect(selectConversationPreview(conversations, "b")).toEqual(conversations[1]);
  });

  it("falls back to the newest conversation when the selected id is missing", () => {
    const conversations = [
      { id: "a", lastMessageAt: new Date("2026-06-02T00:00:00.000Z"), lastMessageSummary: "old a" },
      { id: "b", lastMessageAt: new Date("2026-06-02T01:00:00.000Z"), lastMessageSummary: "old b" },
    ];

    expect(selectConversationPreview(conversations, "missing")).toEqual(conversations[0]);
  });
});
