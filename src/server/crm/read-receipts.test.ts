import { afterEach, describe, expect, it, vi } from "vitest";

const updateSets: Record<string, unknown>[] = [];
const whereClauses: unknown[] = [];
let selectedMessages: Record<string, unknown>[] = [];

vi.mock("@/server/db/schema", () => ({
  conversations: { id: "conversations.id" },
  messages: {
    id: "messages.id",
    conversationId: "messages.conversationId",
    direction: "messages.direction",
    evolutionMessageId: "messages.evolutionMessageId",
    rawMetadata: "messages.rawMetadata",
    status: "messages.status",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
  inArray: (left: unknown, values: unknown[]) => ({
    type: "inArray",
    left,
    values,
  }),
  ne: (left: unknown, right: unknown) => ({ type: "ne", left, right }),
}));

vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => selectedMessages,
      }),
    })),
    update: vi.fn(() => ({
      set: (value: Record<string, unknown>) => {
        updateSets.push(value);
        return {
          where: async (clause: unknown) => {
            whereClauses.push(clause);
          },
        };
      },
    })),
  },
}));

afterEach(() => {
  selectedMessages = [];
  updateSets.length = 0;
  whereClauses.length = 0;
});

describe("markConversationMessagesAsReadBestEffort", () => {
  it("times out slow Evolution read receipt calls without crashing", async () => {
    selectedMessages = [
      {
        id: "local-1",
        evolutionMessageId: "evo-1",
        rawMetadata: {
          key: {
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
            id: "evo-1",
          },
        },
      },
    ];
    const client = {
      markMessageAsRead: vi.fn(() => new Promise(() => undefined)),
    };
    const { markConversationMessagesAsReadBestEffort } =
      await import("./read-receipts");

    await expect(
      markConversationMessagesAsReadBestEffort(client, "conversation-1", {
        timeoutMs: 1,
      }),
    ).resolves.toEqual({ marked: 0, skipped: "timeout" });
    expect(updateSets).toHaveLength(0);
  });
});

describe("markConversationMessagesAsRead", () => {
  it("calls Evolution with message keys and marks inbound messages read", async () => {
    selectedMessages = [
      {
        id: "local-1",
        evolutionMessageId: "evo-1",
        rawMetadata: {
          key: {
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
            id: "evo-1",
          },
        },
      },
      {
        id: "local-2",
        evolutionMessageId: "evo-2",
        rawMetadata: {
          key: {
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
            id: "evo-2",
          },
        },
      },
      { id: "local-without-key", evolutionMessageId: "evo-3", rawMetadata: {} },
    ];
    const client = { markMessageAsRead: vi.fn(async () => ({ ok: true })) };
    const { markConversationMessagesAsRead } = await import("./read-receipts");

    await expect(
      markConversationMessagesAsRead(client, "conversation-1"),
    ).resolves.toEqual({ marked: 2 });

    expect(client.markMessageAsRead).toHaveBeenCalledWith([
      { remoteJid: "628123@s.whatsapp.net", fromMe: false, id: "evo-1" },
      { remoteJid: "628123@s.whatsapp.net", fromMe: false, id: "evo-2" },
    ]);
    expect(whereClauses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "inArray",
          values: ["local-1", "local-2"],
        }),
      ]),
    );
    expect(updateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "read" }),
        expect.objectContaining({ unreadCount: 0 }),
      ]),
    );
  });

  it("ignores Evolution failures without updating local status", async () => {
    selectedMessages = [
      {
        id: "local-1",
        evolutionMessageId: "evo-1",
        rawMetadata: {
          key: {
            remoteJid: "628123@s.whatsapp.net",
            fromMe: false,
            id: "evo-1",
          },
        },
      },
    ];
    const client = {
      markMessageAsRead: vi.fn(async () => {
        throw new Error("Evolution unavailable");
      }),
    };
    const { markConversationMessagesAsRead } = await import("./read-receipts");

    await expect(
      markConversationMessagesAsRead(client, "conversation-1"),
    ).resolves.toEqual({ marked: 0, skipped: "evolution-failed" });
    expect(updateSets).toHaveLength(0);
  });
});
