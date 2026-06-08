import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const envBackup = { ...process.env };

async function loadModule() {
  vi.resetModules();
  return import("./evolution");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  process.env = { ...envBackup };
});

describe("createEvolutionInstance", () => {
  it("recovers when creating hits a broken Evolution instanceId state", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    process.env.EVOLUTION_WEBHOOK_URL =
      "https://app.example/api/webhooks/evolution";

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
            response: { message: "Instance deleted" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            instance: { instanceName: "main", status: "connecting" },
            qrcode: {
              base64: "data:image/png;base64,test",
              code: "2@test",
              count: 1,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { createEvolutionInstance } = await loadModule();

    await expect(createEvolutionInstance()).resolves.toMatchObject({
      image: "data:image/png;base64,test",
      code: "2@test",
      raw: {
        instance: { instanceName: "main", status: "connecting" },
        qrcode: {
          base64: "data:image/png;base64,test",
          code: "2@test",
          count: 1,
        },
      },
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://evolution.example/instance/create",
      "https://evolution.example/instance/delete/main",
      "https://evolution.example/instance/restart/main",
      "https://evolution.example/instance/delete/main",
      "https://evolution.example/instance/create",
      "https://evolution.example/webhook/set/main",
    ]);
  });

  it("does not fail create when configuring the webhook hits a broken Evolution instanceId state", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    process.env.EVOLUTION_WEBHOOK_URL =
      "https://app.example/api/webhooks/evolution";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "SUCCESS",
            response: { message: "Instance already exists" },
          }),
          { status: 200 },
        ),
      )
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
      );
    vi.stubGlobal("fetch", fetchMock);

    const { createEvolutionInstance } = await loadModule();

    await expect(createEvolutionInstance()).resolves.toMatchObject({
      raw: {
        status: "SUCCESS",
        response: { message: "Instance already exists" },
      },
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://evolution.example/instance/create",
      "https://evolution.example/webhook/set/main",
    ]);
  });
});

describe("verifyEvolutionWebhook", () => {
  it("reports a configured webhook when url, enabled flag, and events match", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    process.env.EVOLUTION_WEBHOOK_URL =
      "https://app.example/api/webhooks/evolution";

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          webhook: {
            enabled: true,
            url: "https://app.example/api/webhooks/evolution",
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "CONNECTION_UPDATE",
              "QRCODE_UPDATED",
              "CONTACTS_UPSERT",
              "CHATS_UPSERT",
            ],
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { verifyEvolutionWebhook } = await loadModule();

    await expect(verifyEvolutionWebhook()).resolves.toEqual({
      configured: true,
      enabled: true,
      urlMatches: true,
      configuredUrl: "https://app.example/api/webhooks/evolution",
      expectedUrl: "https://app.example/api/webhooks/evolution",
      missingEvents: [],
    });
  });

  it("reports missing webhook configuration when no webhook is returned", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    process.env.EVOLUTION_WEBHOOK_URL =
      "https://app.example/api/webhooks/evolution";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ webhook: null }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { verifyEvolutionWebhook } = await loadModule();

    await expect(verifyEvolutionWebhook()).resolves.toMatchObject({
      configured: false,
      enabled: false,
      urlMatches: false,
      configuredUrl: undefined,
      expectedUrl: "https://app.example/api/webhooks/evolution",
      missingEvents: expect.arrayContaining(["MESSAGES_UPSERT"]),
    });
  });

  it("reports wrong url and missing events", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    process.env.EVOLUTION_WEBHOOK_URL =
      "https://app.example/api/webhooks/evolution";

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          webhook: {
            enabled: true,
            url: "https://wrong.example/api/webhooks/evolution",
            events: ["MESSAGES_UPSERT"],
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { verifyEvolutionWebhook } = await loadModule();

    await expect(verifyEvolutionWebhook()).resolves.toMatchObject({
      configured: true,
      enabled: true,
      urlMatches: false,
      configuredUrl: "https://wrong.example/api/webhooks/evolution",
      expectedUrl: "https://app.example/api/webhooks/evolution",
      missingEvents: expect.arrayContaining([
        "MESSAGES_UPDATE",
        "CONNECTION_UPDATE",
      ]),
    });
  });
});

describe("fetchAllInstances", () => {
  it("maps instance names and states from documented response paths", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { instance: { instanceName: "main", state: "open" } },
            {
              instanceName: "sales",
              connectionStatus: { state: "connecting" },
            },
            { name: "support", status: "close" },
          ]),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAllInstances } = await loadModule();

    await expect(fetchAllInstances()).resolves.toEqual([
      { name: "main", state: "open" },
      { name: "sales", state: "connecting" },
      { name: "support", state: "close" },
    ]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://evolution.example/instance/fetchInstances",
    ]);
  });

  it("returns an empty list when Evolution responds with a non-array payload", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAllInstances } = await loadModule();

    await expect(fetchAllInstances()).resolves.toEqual([]);
  });
});
