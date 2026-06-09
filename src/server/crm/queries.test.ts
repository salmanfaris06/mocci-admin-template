import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({
  aiAgents: {},
  aiRuns: {},
  aiUsageLogs: {
    computedCostUsd: "computedCostUsd",
    inputTokens: "inputTokens",
    outputTokens: "outputTokens",
  },
  contacts: {},
  conversations: {},
  messages: {},
  pipelineItems: {},
  pipelineStages: {},
}));

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("CRM demo data without database configuration", () => {
  it("returns useful dashboard summary data when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getCrmDashboardSummary } = await import("./queries");

    await expect(getCrmDashboardSummary()).resolves.toMatchObject({
      contacts: expect.any(Number),
      conversations: expect.any(Number),
      messages: expect.any(Number),
      aiCostUsd: expect.any(String),
      inputTokens: expect.any(Number),
      outputTokens: expect.any(Number),
    });
    expect((await getCrmDashboardSummary()).contacts).toBeGreaterThan(0);
  });

  it("returns demo records for CRM pages when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const {
      getAiAgents,
      getAiRunHistory,
      getCrmAnalyticsOverview,
      getCrmContacts,
      getCrmDashboardOverview,
      getPipelineBoard,
      getRecentConversations,
    } = await import("./queries");

    await expect(getRecentConversations()).resolves.not.toHaveLength(0);
    await expect(getCrmContacts()).resolves.not.toHaveLength(0);
    await expect(getPipelineBoard()).resolves.not.toHaveLength(0);
    await expect(getAiRunHistory()).resolves.not.toHaveLength(0);
    await expect(getAiAgents()).resolves.not.toHaveLength(0);
    await expect(getCrmDashboardOverview()).resolves.toMatchObject({
      summary: {
        contacts: expect.any(Number),
        conversations: expect.any(Number),
        messages: expect.any(Number),
        aiCostUsd: expect.any(String),
      },
      recentConversations: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          status: expect.any(String),
        }),
      ]),
      aiRuns: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          status: expect.any(String),
        }),
      ]),
      pipelineByStage: expect.arrayContaining([
        expect.objectContaining({
          stage: expect.any(String),
          count: expect.any(Number),
          valueCents: expect.any(Number),
        }),
      ]),
      pipelineValueCents: expect.any(Number),
      aiSuccessRate: expect.any(Number),
      unreadConversations: expect.any(Number),
    });
    await expect(getCrmAnalyticsOverview()).resolves.toMatchObject({
      kpis: {
        conversations: expect.any(Number),
        contacts: expect.any(Number),
        messages: expect.any(Number),
        aiSuccessRate: expect.any(Number),
      },
      conversationStatus: expect.arrayContaining([
        expect.objectContaining({
          status: "open",
          count: expect.any(Number),
          percent: expect.any(Number),
        }),
      ]),
      aiRunsByStatus: expect.arrayContaining([
        expect.objectContaining({
          status: "succeeded",
          count: expect.any(Number),
          percent: expect.any(Number),
        }),
      ]),
      topTags: expect.arrayContaining([
        expect.objectContaining({
          tag: expect.any(String),
          count: expect.any(Number),
          percent: expect.any(Number),
        }),
      ]),
      pipelineByStage: expect.arrayContaining([
        expect.objectContaining({
          stage: expect.any(String),
          count: expect.any(Number),
          valueCents: expect.any(Number),
        }),
      ]),
    });
  });

  it("returns demo chat messages for a selected demo conversation when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getConversationMessages, getRecentConversations } =
      await import("./queries");

    const [conversation] = await getRecentConversations(1);

    expect(conversation).toBeDefined();
    await expect(getConversationMessages(conversation.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conversationId: conversation.id,
          direction: "inbound",
          body: expect.any(String),
        }),
        expect.objectContaining({
          conversationId: conversation.id,
          direction: "outbound",
          body: expect.any(String),
        }),
      ]),
    );
  });
});
