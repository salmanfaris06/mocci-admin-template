import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

describe("backend server", () => {
  it("responds to health checks", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
