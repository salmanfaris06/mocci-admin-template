import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({
  aiAgents: {},
  aiRuns: {},
  aiUsageLogs: { computedCostUsd: "computedCostUsd", inputTokens: "inputTokens", outputTokens: "outputTokens" },
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
    const { getAiAgents, getAiRunHistory, getCrmContacts, getPipelineBoard, getRecentConversations } = await import("./queries");

    await expect(getRecentConversations()).resolves.not.toHaveLength(0);
    await expect(getCrmContacts()).resolves.not.toHaveLength(0);
    await expect(getPipelineBoard()).resolves.not.toHaveLength(0);
    await expect(getAiRunHistory()).resolves.not.toHaveLength(0);
    await expect(getAiAgents()).resolves.not.toHaveLength(0);
  });
});
