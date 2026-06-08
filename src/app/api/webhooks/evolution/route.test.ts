import { describe, expect, it, vi } from "vitest";

const insertValues = vi.fn();
const updateSet = vi.fn();
const insertedMessages: Record<string, unknown>[] = [];
const insertedWebhookEvents: Record<string, unknown>[] = [];
const updatedConversations: Record<string, unknown>[] = [];
const updatedMessages: Record<string, unknown>[] = [];
const existingMessagesByEvolutionId = new Map<string, { id: string; status: string; conversationId: string }>();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/db/schema", () => ({
  contacts: { id: "contacts.id", remoteJid: "contacts.remoteJid" },
  conversations: { id: "conversations.id", contactId: "conversations.contactId", status: "conversations.status" },
  messages: { id: "messages.id", evolutionMessageId: "messages.evolutionMessageId", status: "messages.status", conversationId: "messages.conversationId" },
  webhookEvents: { idempotencyKey: "webhookEvents.idempotencyKey" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
}));

vi.mock("../../../../server/crm/ai-reply", () => ({
  triggerAiWhatsAppReply: vi.fn(async () => ({ skipped: "test" })),
}));

vi.mock("../../../../server/crm/inbox-events", () => ({
  publishInboxEvent: vi.fn(async () => undefined),
}));

vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn((table: unknown) => ({
      values: (value: Record<string, unknown>) => {
        insertValues(value);
        if (table && typeof table === "object" && "evolutionMessageId" in table) insertedMessages.push(value);
        if (table && typeof table === "object" && "idempotencyKey" in table) insertedWebhookEvents.push(value);
        return {
          onConflictDoNothing: () => ({ returning: async () => [{ id: "message-1", ...value }] }),
          onConflictDoUpdate: () => ({
            returning: async () => [{ id: "contact-1", ...value }],
          }),
          returning: async () => [{ id: "conversation-1", ...value }],
        };
      },
    })),
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => {
            if (table && typeof table === "object" && "evolutionMessageId" in table) {
              const evolutionMessageId = existingMessagesByEvolutionId.keys().next().value;
              if (!evolutionMessageId) return [];
              const existing = existingMessagesByEvolutionId.get(evolutionMessageId);
              return existing ? [existing] : [];
            }
            return [];
          },
        }),
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: (value: Record<string, unknown>) => {
        updateSet(value);
        if (table && typeof table === "object" && "evolutionMessageId" in table) {
          updatedMessages.push(value);
        } else {
          updatedConversations.push(value);
        }
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

  it("updates message status on MESSAGES_UPDATE", async () => {
    existingMessagesByEvolutionId.clear();
    updatedMessages.length = 0;
    existingMessagesByEvolutionId.set("msg-out-1", { id: "message-out-1", status: "sent", conversationId: "conversation-1" });

    const { handleEvolutionWebhook } = await import("./route");
    const request = new Request("https://example.com/api/webhooks/evolution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "MESSAGES_UPDATE",
        data: { key: { id: "msg-out-1" }, status: "DELIVERY_ACK" },
      }),
    });

    const response = await handleEvolutionWebhook(request);
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, eventType: "MESSAGES_UPDATE", processedUpdates: 1 });
    expect(updatedMessages).toEqual([expect.objectContaining({ status: "delivered" })]);
  });
});
