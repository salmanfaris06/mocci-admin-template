import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const fetchAllInstancesMock = vi.fn();

vi.mock("./evolution", () => ({
  fetchAllInstances: fetchAllInstancesMock,
}));

const envBackup = { ...process.env };

async function loadModule() {
  vi.resetModules();
  return import("./whatsapp-connection");
}

afterEach(() => {
  fetchAllInstancesMock.mockReset();
  vi.resetModules();
  process.env = { ...envBackup };
});

describe("isConnectedState", () => {
  it("accepts Evolution connected state variants", async () => {
    const { isConnectedState } = await loadModule();

    expect(isConnectedState("open")).toBe(true);
    expect(isConnectedState("connected")).toBe(true);
    expect(isConnectedState("connect")).toBe(true);
    expect(isConnectedState("close")).toBe(false);
  });
});

describe("canShowWhatsAppCrmData", () => {
  it("only allows CRM data when WhatsApp is connected", async () => {
    const { canShowWhatsAppCrmData } = await loadModule();

    expect(
      canShowWhatsAppCrmData({
        status: "connected",
        instanceName: "main",
        state: "open",
      }),
    ).toBe(true);
    expect(canShowWhatsAppCrmData({ status: "not-configured" })).toBe(false);
    expect(
      canShowWhatsAppCrmData({ status: "no-instance", instanceName: "main" }),
    ).toBe(false);
    expect(
      canShowWhatsAppCrmData({
        status: "disconnected",
        instanceName: "main",
        state: "close",
      }),
    ).toBe(false);
    expect(
      canShowWhatsAppCrmData({ status: "unknown", instanceName: "main" }),
    ).toBe(false);
  });
});

describe("getWhatsAppConnection", () => {
  it("reports not-configured when Evolution API env vars are missing", async () => {
    delete process.env.EVOLUTION_BASE_URL;
    delete process.env.EVOLUTION_API_KEY;
    process.env.EVOLUTION_INSTANCE_NAME = "main";

    const { getWhatsAppConnection } = await loadModule();

    await expect(getWhatsAppConnection()).resolves.toEqual({
      status: "not-configured",
    });
    expect(fetchAllInstancesMock).not.toHaveBeenCalled();
  });

  it("reports connected for the configured open WhatsApp instance", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    fetchAllInstancesMock.mockResolvedValueOnce([
      { name: "other", state: "close" },
      { name: "main", state: "open" },
    ]);

    const { getWhatsAppConnection } = await loadModule();

    await expect(getWhatsAppConnection()).resolves.toEqual({
      status: "connected",
      instanceName: "main",
      state: "open",
    });
  });

  it("reports no-instance when the configured WhatsApp instance does not exist", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    fetchAllInstancesMock.mockResolvedValueOnce([
      { name: "other", state: "open" },
    ]);

    const { getWhatsAppConnection } = await loadModule();

    await expect(getWhatsAppConnection()).resolves.toEqual({
      status: "no-instance",
      instanceName: "main",
    });
  });

  it("reports disconnected when the configured WhatsApp instance is not connected", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    fetchAllInstancesMock.mockResolvedValueOnce([
      { name: "main", state: "close" },
    ]);

    const { getWhatsAppConnection } = await loadModule();

    await expect(getWhatsAppConnection()).resolves.toEqual({
      status: "disconnected",
      instanceName: "main",
      state: "close",
    });
  });

  it("reports unknown when Evolution API cannot be checked", async () => {
    process.env.EVOLUTION_BASE_URL = "https://evolution.example";
    process.env.EVOLUTION_API_KEY = "secret";
    process.env.EVOLUTION_INSTANCE_NAME = "main";
    fetchAllInstancesMock.mockRejectedValueOnce(new Error("network failed"));

    const { getWhatsAppConnection } = await loadModule();

    await expect(getWhatsAppConnection()).resolves.toEqual({
      status: "unknown",
      instanceName: "main",
    });
  });
});
