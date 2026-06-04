import { describe, expect, it, vi } from "vitest";

const insertValues = vi.fn();
const updateSet = vi.fn();
const insertedMessages: Record<string, unknown>[] = [];
const insertedWebhookEvents: Record<string, unknown>[] = [];
const updatedConversations: Record<string, unknown>[] = [];

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/db/schema", () => ({
  contacts: { id: "contacts.id", remoteJid: "contacts.remoteJid" },
  conversations: { id: "conversations.id", contactId: "conversations.contactId", status: "conversations.status" },
  messages: { evolutionMessageId: "messages.evolutionMessageId" },
  webhookEvents: { idempotencyKey: "webhookEvents.idempotencyKey" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
}));

vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn((table: unknown) => ({
      values: (value: Record<string, unknown>) => {
        insertValues(value);
        if (table && typeof table === "object" && "evolutionMessageId" in table) insertedMessages.push(value);
        if (table && typeof table === "object" && "idempotencyKey" in table) insertedWebhookEvents.push(value);
        return {
          onConflictDoNothing: () => ({ returning: async () => [] }),
          onConflictDoUpdate: () => ({
            returning: async () => [{ id: "contact-1", ...value }],
          }),
          returning: async () => [{ id: "conversation-1", ...value }],
        };
      },
    })),
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: (value: Record<string, unknown>) => {
        updateSet(value);
        updatedConversations.push(value);
        return { where: async () => undefined };
      },
    })),
  },
}));

describe("Evolution webhook route", () => {
  it("processes a standard Evolution MESSAGES_UPSERT payload into an inbox message", async () => {
    const { handleEvolutionWebhook } = await import("./route");
    const request = new Request("https://example.com/api/webhooks/evolution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "MESSAGES_UPSERT",
        instance: "main",
        data: {
          key: {
            id: "msg-1",
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
          },
          pushName: "Jane",
          message: { conversation: "Halo" },
        },
      }),
    });

    const response = await handleEvolutionWebhook(request);
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, eventType: "MESSAGES_UPSERT", processedMessages: 1 });
    expect(insertedWebhookEvents).toEqual([
      expect.objectContaining({ eventType: "MESSAGES_UPSERT", idempotencyKey: "msg-1" }),
    ]);
    expect(insertedMessages).toEqual([
      expect.objectContaining({
        evolutionMessageId: "msg-1",
        direction: "inbound",
        senderType: "customer",
        messageType: "text",
        text: "Halo",
      }),
    ]);
    expect(updatedConversations).toEqual(expect.arrayContaining([expect.objectContaining({ lastMessageSummary: "Halo", unreadCount: 1 })]));
  });
});
