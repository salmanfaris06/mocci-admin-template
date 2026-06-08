import { describe, expect, it, vi } from "vitest";

const inserted: Record<string, unknown>[] = [];

vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: (value: Record<string, unknown>) => {
        inserted.push(value);
        return { returning: async () => [{ id: "evt-1", ...value }] };
      },
    })),
  },
}));

vi.mock("@/server/db/schema", () => ({
  inboxEvents: { eventType: "inboxEvents.eventType" },
}));

describe("publishInboxEvent", () => {
  it("inserts event row", async () => {
    inserted.length = 0;
    const { publishInboxEvent } = await import("./inbox-events");
    await publishInboxEvent("message.new", "conv-1", { messageId: "msg-1" });
    expect(inserted[0]).toMatchObject({
      eventType: "message.new",
      conversationId: "conv-1",
      payload: { messageId: "msg-1" },
    });
  });
});
