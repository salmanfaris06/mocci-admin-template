import { afterEach, describe, expect, it, vi } from "vitest";

import { EvolutionClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EvolutionClient", () => {
  it("configures the instance webhook using the Evolution v2 webhookBase64 field", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({ baseUrl: "https://evolution.example", apiKey: "secret", instanceName: "main" });

    await client.setWebhook("https://app.example/api/webhooks/evolution");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://evolution.example/webhook/set/main",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ apikey: "secret", "content-type": "application/json" }),
        body: expect.any(String),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      enabled: true,
      url: "https://app.example/api/webhooks/evolution",
      webhookByEvents: false,
      webhookBase64: false,
      events: expect.arrayContaining(["MESSAGES_UPSERT"]),
    });
  });
});
