import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({
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

describe("CRM queries without database configuration", () => {
  it("returns an empty dashboard summary instead of throwing when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getCrmDashboardSummary } = await import("./queries");

    await expect(getCrmDashboardSummary()).resolves.toEqual({
      contacts: 0,
      conversations: 0,
      messages: 0,
      aiCostUsd: "0",
      inputTokens: 0,
      outputTokens: 0,
    });
  });
});
