import { afterEach, describe, expect, it, vi } from "vitest";

import { EvolutionClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EvolutionClient", () => {
  it("configures the instance webhook using the Evolution v2 webhook wrapper", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await client.setWebhook("https://app.example/api/webhooks/evolution");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://evolution.example/webhook/set/main",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "secret",
          "content-type": "application/json",
        }),
        body: expect.any(String),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      webhook: {
        enabled: true,
        url: "https://app.example/api/webhooks/evolution",
        byEvents: true,
        base64: false,
        webhookByEvents: true,
        webhookBase64: false,
        events: expect.arrayContaining(["MESSAGES_UPSERT"]),
      },
    });
  });

  it("configures webhook secret header when provided", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await client.setWebhook(
      "https://app.example/api/webhooks/evolution",
      "webhook-secret",
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      webhook: {
        headers: { "x-webhook-secret": "webhook-secret" },
      },
    });
  });

  it("reads connection state without reconfiguring the webhook", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ instance: { state: "open" } }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await client.getConnectionState();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://evolution.example/instance/connectionState/main",
    );
  });

  it("normalizes trailing slash from Evolution base URL", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ instance: { state: "open" } }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example/",
      apiKey: "secret",
      instanceName: "main",
    });

    await client.getConnectionState();

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://evolution.example/instance/connectionState/main",
    );
  });

  it("throws typed redacted errors without leaking apikey", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "bad key secret" },
          }),
          { status: 401 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await expect(client.getConnectionState()).rejects.toMatchObject({
      name: "EvolutionApiError",
      status: 401,
      endpoint: "/instance/connectionState/main",
    });
    await expect(client.getConnectionState()).rejects.not.toThrow("secret");
  });

  it("treats Evolution connection-closed logout as an idempotent disconnect", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 500,
            error: "Internal Server Error",
            response: { message: ["Error: Connection Closed"] },
          }),
          { status: 500 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await expect(client.logoutInstance()).resolves.toMatchObject({
      status: "SUCCESS",
      response: { message: "Instance already disconnected" },
    });
  });

  it("detects Evolution broken instanceId errors from connect", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 500,
            error: "Internal Server Error",
            response: {
              message:
                "Cannot read properties of undefined (reading 'instanceId')",
            },
          }),
          { status: 500 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await expect(client.connectInstance()).rejects.toThrow(
      "reading 'instanceId'",
    );
  });

  it("creates instances while asking Evolution to generate QR during create", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "SUCCESS",
            response: { message: "Instance created" },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await client.createInstance();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      instanceName: "main",
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    });
  });

  it("treats an existing instance name as an idempotent create", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 403,
            error: "Forbidden",
            response: { message: ['This name "main" is already in use.'] },
          }),
          { status: 403 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await expect(client.createInstance()).resolves.toMatchObject({
      status: "SUCCESS",
      response: { message: "Instance already exists" },
    });
  });

  it("treats missing instance delete as an idempotent delete", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 404,
            error: "Not Found",
            response: { message: ["instance does not exist"] },
          }),
          { status: 404 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await expect(client.deleteInstance()).resolves.toMatchObject({
      status: "SUCCESS",
      response: { message: "Instance already deleted" },
    });
  });

  it("restarts then deletes when delete hits a broken instanceId state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 500,
            error: "Internal Server Error",
            response: {
              message:
                "Cannot read properties of undefined (reading 'instanceId')",
            },
          }),
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            instance: { instanceName: "main", state: "close" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "SUCCESS",
            error: false,
            response: { message: "Instance deleted" },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
    });

    await expect(client.deleteInstance()).resolves.toMatchObject({
      status: "SUCCESS",
      response: { message: "Instance deleted" },
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://evolution.example/instance/delete/main",
      "https://evolution.example/instance/restart/main",
      "https://evolution.example/instance/delete/main",
    ]);
  });

  it("aborts slow Evolution API requests instead of hanging indefinitely", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted", "AbortError")),
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolutionClient({
      baseUrl: "https://evolution.example",
      apiKey: "secret",
      instanceName: "main",
      timeoutMs: 100,
    });
    const requestExpectation = expect(
      client.getConnectionState(),
    ).rejects.toThrow("Evolution API request timed out after 100ms");

    await vi.advanceTimersByTimeAsync(101);

    await requestExpectation;
    vi.useRealTimers();
  });
});
