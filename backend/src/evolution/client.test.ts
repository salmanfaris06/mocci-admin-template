import { afterEach, describe, expect, it, vi } from "vitest";

import { EvolutionClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EvolutionClient", () => {
  it("configures the instance webhook using the Evolution v2 webhook wrapper", async () => {
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
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      webhook: {
        enabled: true,
        url: "https://app.example/api/webhooks/evolution",
        byEvents: false,
        base64: false,
        webhookByEvents: false,
        webhookBase64: false,
        events: expect.arrayContaining(["MESSAGES_UPSERT"]),
      },
    });
  });

  it("reads connection state without reconfiguring the webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ instance: { state: "open" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({ baseUrl: "https://evolution.example", apiKey: "secret", instanceName: "main" });

    await client.getConnectionState();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://evolution.example/instance/connectionState/main");
  });

  it("aborts slow Evolution API requests instead of hanging indefinitely", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted", "AbortError")));
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({ baseUrl: "https://evolution.example", apiKey: "secret", instanceName: "main", timeoutMs: 100 });
    const requestExpectation = expect(client.getConnectionState()).rejects.toThrow("Evolution API request timed out after 100ms");

    await vi.advanceTimersByTimeAsync(101);

    await requestExpectation;
    vi.useRealTimers();
  });
});
