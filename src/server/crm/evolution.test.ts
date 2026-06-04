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
    process.env.EVOLUTION_WEBHOOK_URL = "https://app.example/api/webhooks/evolution";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 500, error: "Internal Server Error", response: { message: "Cannot read properties of undefined (reading 'instanceId')" } }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 500, error: "Internal Server Error", response: { message: "Cannot read properties of undefined (reading 'instanceId')" } }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ instance: { instanceName: "main", state: "close" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "SUCCESS", response: { message: "Instance deleted" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "SUCCESS", response: { message: "Instance created" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { createEvolutionInstance } = await loadModule();

    await expect(createEvolutionInstance()).resolves.toMatchObject({
      status: "SUCCESS",
      response: { message: "Instance created" },
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
    process.env.EVOLUTION_WEBHOOK_URL = "https://app.example/api/webhooks/evolution";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "SUCCESS", response: { message: "Instance already exists" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 500, error: "Internal Server Error", response: { message: "Cannot read properties of undefined (reading 'instanceId')" } }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { createEvolutionInstance } = await loadModule();

    await expect(createEvolutionInstance()).resolves.toMatchObject({
      status: "SUCCESS",
      response: { message: "Instance already exists" },
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://evolution.example/instance/create",
      "https://evolution.example/webhook/set/main",
    ]);
  });
});
