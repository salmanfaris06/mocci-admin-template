import { afterEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn();
const updateSet = vi.fn();
const insertedMessages: Record<string, unknown>[] = [];
const insertedPipelineItems: Record<string, unknown>[] = [];
const insertedWebhookEvents: Record<string, unknown>[] = [];
const updatedConversations: Record<string, unknown>[] = [];
const updatedMessages: Record<string, unknown>[] = [];
const existingMessagesByEvolutionId = new Map<
  string,
  { id: string; status: string; conversationId: string }
>();
const existingWebhookKeys = new Set<string>();
const triggerAiWhatsAppReplyMock = vi.fn(async () => ({ skipped: "test" }));
const publishInboxEventMock = vi.fn(async () => undefined);
const envBackup = { ...process.env };

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/db/schema", () => ({
  contacts: { id: "contacts.id", remoteJid: "contacts.remoteJid" },
  conversations: {
    id: "conversations.id",
    contactId: "conversations.contactId",
    status: "conversations.status",
  },
  messages: {
    id: "messages.id",
    evolutionMessageId: "messages.evolutionMessageId",
    status: "messages.status",
    conversationId: "messages.conversationId",
  },
  pipelineItems: {
    id: "pipelineItems.id",
    contactId: "pipelineItems.contactId",
  },
  pipelineStages: {
    id: "pipelineStages.id",
    name: "pipelineStages.name",
    position: "pipelineStages.position",
  },
  webhookEvents: { idempotencyKey: "webhookEvents.idempotencyKey" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  asc: (value: unknown) => ({ type: "asc", value }),
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
}));

vi.mock("../../../../server/crm/ai-reply", () => ({
  triggerAiWhatsAppReply: triggerAiWhatsAppReplyMock,
}));

vi.mock("../../../../server/crm/inbox-events", () => ({
  publishInboxEvent: publishInboxEventMock,
}));

vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn((table: unknown) => ({
      values: (value: Record<string, unknown>) => {
        insertValues(value);
        if (table && typeof table === "object" && "evolutionMessageId" in table)
          insertedMessages.push(value);
        if (
          table &&
          typeof table === "object" &&
          "contactId" in table &&
          !("status" in table)
        )
          insertedPipelineItems.push(value);
        if (table && typeof table === "object" && "idempotencyKey" in table)
          insertedWebhookEvents.push(value);
        return {
          onConflictDoNothing: () => ({
            returning: async () => {
              if (
                table &&
                typeof table === "object" &&
                "idempotencyKey" in table
              ) {
                const idempotencyKey = String(value.idempotencyKey);
                if (existingWebhookKeys.has(idempotencyKey)) return [];
                existingWebhookKeys.add(idempotencyKey);
                return [{ id: "webhook-event-1", ...value }];
              }

              return [{ id: "message-1", ...value }];
            },
          }),
          onConflictDoUpdate: () => ({
            returning: async () => [{ id: "contact-1", ...value }],
          }),
          returning: async () => [{ id: "conversation-1", ...value }],
        };
      },
    })),
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        orderBy: () => ({
          limit: async () => {
            if (table && typeof table === "object" && "position" in table)
              return [{ id: "stage-new", name: "New Lead" }];
            return [];
          },
        }),
        where: () => ({
          limit: async () => {
            if (
              table &&
              typeof table === "object" &&
              "evolutionMessageId" in table
            ) {
              const evolutionMessageId = existingMessagesByEvolutionId
                .keys()
                .next().value;
              if (!evolutionMessageId) return [];
              const existing =
                existingMessagesByEvolutionId.get(evolutionMessageId);
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
        if (
          table &&
          typeof table === "object" &&
          "evolutionMessageId" in table
        ) {
          updatedMessages.push(value);
        } else {
          updatedConversations.push(value);
        }
        return { where: async () => undefined };
      },
    })),
  },
}));

afterEach(() => {
  insertValues.mockClear();
  updateSet.mockClear();
  insertedMessages.length = 0;
  insertedPipelineItems.length = 0;
  insertedWebhookEvents.length = 0;
  updatedConversations.length = 0;
  updatedMessages.length = 0;
  existingMessagesByEvolutionId.clear();
  existingWebhookKeys.clear();
  triggerAiWhatsAppReplyMock.mockClear();
  publishInboxEventMock.mockClear();
  process.env = { ...envBackup };
});

describe("Evolution webhook route", () => {
  it("rejects webhook requests when configured secret is missing", async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = "webhook-secret";

    const { handleEvolutionWebhook } = await import("./route");
    const request = new Request("https://example.com/api/webhooks/evolution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "MESSAGES_UPSERT" }),
    });

    const response = await handleEvolutionWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized webhook" });
  });

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

    expect(body).toMatchObject({
      ok: true,
      eventType: "MESSAGES_UPSERT",
      processedMessages: 1,
    });
    expect(insertedWebhookEvents).toEqual([
      expect.objectContaining({
        eventType: "MESSAGES_UPSERT",
        idempotencyKey: "msg-1",
      }),
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
    expect(updatedConversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lastMessageSummary: "Halo", unreadCount: 1 }),
      ]),
    );
    expect(insertedPipelineItems).toEqual([
      expect.objectContaining({
        contactId: "contact-1",
        conversationId: "conversation-1",
        stageId: "stage-new",
        title: "Jane",
        lastActivityAt: expect.any(Date),
      }),
    ]);
  });

  it("keeps duplicate webhook delivery idempotent", async () => {
    const { handleEvolutionWebhook } = await import("./route");
    const body = JSON.stringify({
      event: "MESSAGES_UPSERT",
      data: {
        key: {
          id: "dup-msg-1",
          remoteJid: "628999@s.whatsapp.net",
          fromMe: false,
        },
        pushName: "Duplicate Lead",
        message: { conversation: "Halo lagi" },
      },
    });

    const firstResponse = await handleEvolutionWebhook(
      new Request("https://example.com/api/webhooks/evolution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    const secondResponse = await handleEvolutionWebhook(
      new Request("https://example.com/api/webhooks/evolution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );

    await expect(firstResponse.json()).resolves.toMatchObject({
      processedMessages: 1,
    });
    await expect(secondResponse.json()).resolves.toMatchObject({
      processedMessages: 0,
      duplicate: true,
    });
    expect(insertedMessages).toHaveLength(1);
    expect(insertedPipelineItems).toHaveLength(1);
    expect(updatedConversations.filter((update) => "lastMessageSummary" in update)).toHaveLength(1);
    expect(triggerAiWhatsAppReplyMock).toHaveBeenCalledTimes(1);
    expect(publishInboxEventMock).toHaveBeenCalledTimes(2);
  });

  it("updates message status on MESSAGES_UPDATE", async () => {
    existingMessagesByEvolutionId.clear();
    updatedMessages.length = 0;
    existingMessagesByEvolutionId.set("msg-out-1", {
      id: "message-out-1",
      status: "sent",
      conversationId: "conversation-1",
    });

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

    expect(body).toMatchObject({
      ok: true,
      eventType: "MESSAGES_UPDATE",
      processedUpdates: 1,
    });
    expect(updatedMessages).toEqual([
      expect.objectContaining({ status: "delivered" }),
    ]);
  });
});
