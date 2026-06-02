import { describe, expect, it } from "vitest";

describe("backend server", () => {
  it("responds to health checks", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/mocci_crm_test";
    const { buildServer } = await import("./server");
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
