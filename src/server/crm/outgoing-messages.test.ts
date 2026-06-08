import { afterEach, describe, expect, it, vi } from "vitest";

const insertedValues: Record<string, unknown>[] = [];
const insertedJobs: Record<string, unknown>[] = [];
const updateSets: Record<string, unknown>[] = [];

vi.mock("@/server/db/schema", () => ({
  conversations: { id: "conversations.id" },
  jobs: { id: "jobs.id", type: "jobs.type" },
  messages: { id: "messages.id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
}));

vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn((table: unknown) => ({
      values: (value: Record<string, unknown>) => {
        if (table && typeof table === "object" && "type" in table)
          insertedJobs.push(value);
        insertedValues.push(value);
        return {
          returning: async () => [{ id: "outgoing-message-1", ...value }],
        };
      },
    })),
    update: vi.fn(() => ({
      set: (value: Record<string, unknown>) => {
        updateSets.push(value);
        return { where: async () => undefined };
      },
    })),
  },
}));

afterEach(() => {
  insertedValues.length = 0;
  insertedJobs.length = 0;
  updateSets.length = 0;
});

describe("sendOutgoingTextMessage", () => {
  it("creates a sending message, sends via Evolution, then marks it sent", async () => {
    const client = {
      sendTextMessage: vi.fn(async () => ({ key: { id: "evo-1" } })),
    };
    const { sendOutgoingTextMessage } = await import("./outgoing-messages");

    await expect(
      sendOutgoingTextMessage(client, {
        conversationId: "conversation-1",
        to: "628123",
        text: "Halo",
        senderType: "admin",
      }),
    ).resolves.toMatchObject({
      messageId: "outgoing-message-1",
      evolutionMessageId: "evo-1",
      status: "sent",
    });

    expect(insertedValues[0]).toMatchObject({
      conversationId: "conversation-1",
      direction: "outbound",
      senderType: "admin",
      messageType: "text",
      text: "Halo",
      status: "sending",
    });
    expect(updateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "sent",
          evolutionMessageId: "evo-1",
        }),
        expect.objectContaining({ lastMessageSummary: "Halo" }),
      ]),
    );
  });

  it("marks the message failed when Evolution send fails", async () => {
    const client = {
      sendTextMessage: vi.fn(async () => {
        throw new Error("Evolution unavailable");
      }),
    };
    const { sendOutgoingTextMessage } = await import("./outgoing-messages");

    await expect(
      sendOutgoingTextMessage(client, {
        conversationId: "conversation-1",
        to: "628123",
        text: "Halo",
        senderType: "admin",
      }),
    ).rejects.toThrow("Evolution unavailable");

    expect(updateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "failed",
          rawMetadata: expect.objectContaining({
            errorMessage: "Evolution unavailable",
          }),
        }),
      ]),
    );
    expect(insertedJobs).toEqual([
      expect.objectContaining({
        type: "whatsapp.send_text.retry",
        status: "queued",
        attempts: 0,
        payload: expect.objectContaining({
          conversationId: "conversation-1",
          to: "628123",
          text: "Halo",
          messageId: "outgoing-message-1",
        }),
      }),
    ]);
  });
});

describe("retryOutgoingTextMessage", () => {
  it("marks retry as permanently failed after max attempts", async () => {
    const client = {
      sendTextMessage: vi.fn(async () => {
        throw new Error("Still unavailable");
      }),
    };
    const { retryOutgoingTextMessage } = await import("./outgoing-messages");

    await expect(
      retryOutgoingTextMessage(client, {
        messageId: "outgoing-message-1",
        conversationId: "conversation-1",
        to: "628123",
        text: "Halo",
        senderType: "admin",
        attempt: 3,
        maxAttempts: 3,
      }),
    ).resolves.toEqual({ status: "failed_permanent", attempts: 3 });

    expect(updateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "failed",
          rawMetadata: expect.objectContaining({
            permanentFailure: true,
            attempts: 3,
          }),
        }),
      ]),
    );
    expect(insertedJobs).toHaveLength(0);
  });
});
