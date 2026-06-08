import { afterEach, describe, expect, it, vi } from "vitest";

let selectedJob: Record<string, unknown> | undefined;
const updateSets: Record<string, unknown>[] = [];

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  asc: (column: unknown) => ({ type: "asc", column }),
  eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
  inArray: (left: unknown, values: unknown[]) => ({
    type: "inArray",
    left,
    values,
  }),
  lte: (left: unknown, right: unknown) => ({ type: "lte", left, right }),
}));

vi.mock("../../../src/server/db/schema", () => ({
  aiProviderKeys: { provider: "aiProviderKeys.provider" },
  apiSettings: {},
  jobs: {
    id: "jobs.id",
    status: "jobs.status",
    type: "jobs.type",
    scheduledAt: "jobs.scheduledAt",
  },
}));

vi.mock("../../../src/server/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => (selectedJob ? [selectedJob] : []),
          }),
        }),
        limit: () => [],
      }),
    })),
    update: vi.fn(() => ({
      set: (value: Record<string, unknown>) => {
        updateSets.push(value);
        return { where: async () => undefined };
      },
    })),
  },
}));

vi.mock("../../../src/server/security/crypto", () => ({
  decryptSecret: vi.fn(),
}));
vi.mock("../ai/reply-runner", () => ({ runAiReply: vi.fn() }));
vi.mock("../evolution/client", () => ({
  EvolutionClient: vi.fn(function EvolutionClientMock() {
    return {
      sendTextMessage: vi.fn(async () => ({ key: { id: "evo-retry-1" } })),
    };
  }),
}));
vi.mock("./process-webhook", () => ({ processWebhookJob: vi.fn() }));
vi.mock("./queue", () => ({
  markJobFailed: vi.fn(async (id: string, errorMessage: string) =>
    updateSets.push({ status: "failed", errorMessage, id }),
  ),
}));
vi.mock("../../../src/server/crm/outgoing-messages", () => ({
  retryOutgoingTextMessage: vi.fn(async () => ({ status: "sent" })),
}));

afterEach(() => {
  selectedJob = undefined;
  updateSets.length = 0;
  vi.clearAllMocks();
});

describe("runNextJob", () => {
  it("processes queued whatsapp text retry jobs", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    selectedJob = {
      id: "job-1",
      type: "whatsapp.send_text.retry",
      status: "queued",
      attempts: 0,
      payload: {
        messageId: "message-1",
        conversationId: "conversation-1",
        to: "628123",
        text: "Halo",
        senderType: "admin",
        attempt: 1,
        maxAttempts: 3,
      },
    };

    const { runNextJob } = await import("./worker");
    const { retryOutgoingTextMessage } =
      await import("../../../src/server/crm/outgoing-messages");

    await expect(runNextJob("worker-test")).resolves.toBe(true);

    expect(retryOutgoingTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({ sendTextMessage: expect.any(Function) }),
      expect.objectContaining({
        messageId: "message-1",
        conversationId: "conversation-1",
        to: "628123",
        text: "Halo",
        senderType: "admin",
        attempt: 1,
        maxAttempts: 3,
      }),
    );
    expect(updateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "succeeded" }),
      ]),
    );
  });
});
