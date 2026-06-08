import { afterEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn();
const conflictUpdates: Record<string, unknown>[] = [];
const insertedMessages: Record<string, unknown>[] = [];

vi.mock("@/server/db/schema", () => ({
  contacts: {
    id: "contacts.id",
    remoteJid: "contacts.remoteJid",
  },
  conversations: {
    id: "conversations.id",
    contactId: "conversations.contactId",
    status: "conversations.status",
  },
  messages: {
    id: "messages.id",
    evolutionMessageId: "messages.evolutionMessageId",
  },
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
        if (table && typeof table === "object" && "evolutionMessageId" in table)
          insertedMessages.push(value);
        return {
          onConflictDoNothing: () => ({
            returning: async () => [{ id: "message-1", ...value }],
          }),
          onConflictDoUpdate: (_config: { set: Record<string, unknown> }) => {
            conflictUpdates.push(_config.set);
            return { returning: async () => [{ id: "contact-1", ...value }] };
          },
          returning: async () => [
            { id: "conversation-1", unreadCount: 0, ...value },
          ],
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
      set: () => ({ where: async () => undefined }),
    })),
  },
}));

afterEach(() => {
  insertValues.mockClear();
  conflictUpdates.length = 0;
  insertedMessages.length = 0;
});

describe("backfillEvolutionContactsAndMessages", () => {
  it("fetches contacts and messages with safe defaults and idempotent upserts", async () => {
    const client = {
      findContacts: vi.fn(async () => [
        {
          remoteJid: "628123@s.whatsapp.net",
          pushName: "Jane",
          profilePicUrl: "https://cdn.example/jane.jpg",
        },
      ]),
      findMessages: vi.fn(async () => [
        {
          key: {
            id: "msg-backfill-1",
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
          },
          pushName: "Jane",
          message: { conversation: "Halo dari history" },
          messageTimestamp: 1_700_000_000,
        },
        {
          key: {
            id: "msg-backfill-1",
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
          },
          pushName: "Jane",
          message: { conversation: "Duplicate history" },
          messageTimestamp: 1_700_000_000,
        },
      ]),
    };

    const { backfillEvolutionContactsAndMessages } = await import("./backfill");

    await expect(
      backfillEvolutionContactsAndMessages(client, { take: 25 }),
    ).resolves.toEqual({
      contactsFetched: 1,
      messagesFetched: 2,
      messagesAttempted: 1,
    });

    expect(client.findContacts).toHaveBeenCalledWith({ limit: 25 });
    expect(client.findMessages).toHaveBeenCalledWith({ limit: 25 });
    expect(conflictUpdates[0]).not.toHaveProperty("notes");
    expect(conflictUpdates[0]).not.toHaveProperty("status");
    expect(insertedMessages).toHaveLength(1);
    expect(insertedMessages[0]).toMatchObject({
      evolutionMessageId: "msg-backfill-1",
      direction: "inbound",
      senderType: "customer",
      messageType: "text",
      text: "Halo dari history",
    });
  });
});
