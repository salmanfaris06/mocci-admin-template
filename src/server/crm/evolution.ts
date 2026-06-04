import "server-only";

import { EvolutionClient } from "../../../backend/src/evolution/client";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function vercelWebhookUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return undefined;

  const origin = vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://") ? vercelUrl : `https://${vercelUrl}`;
  return `${origin.replace(/\/$/, "")}/api/webhooks/evolution`;
}

function getWebhookUrl() {
  const configuredUrl = process.env.EVOLUTION_WEBHOOK_URL?.trim();
  const fallbackUrl = vercelWebhookUrl();

  if (!configuredUrl) return fallbackUrl;

  const isLocalhost = /https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuredUrl);
  if (isLocalhost && process.env.VERCEL_URL) return fallbackUrl;

  return configuredUrl;
}

export async function getEvolutionSettings() {
  return {
    baseUrl: requiredEnv("EVOLUTION_BASE_URL"),
    apiKey: requiredEnv("EVOLUTION_API_KEY"),
    instanceName: requiredEnv("EVOLUTION_INSTANCE_NAME"),
    webhookUrl: getWebhookUrl(),
  };
}

export async function getEvolutionClient() {
  const { apiKey, baseUrl, instanceName } = await getEvolutionSettings();
  return new EvolutionClient({ apiKey, baseUrl, instanceName });
}

export async function configureEvolutionWebhook() {
  const settings = await getEvolutionSettings();
  if (!settings.webhookUrl) return undefined;

  const client = new EvolutionClient(settings);
  return client.setWebhook(settings.webhookUrl);
}

function readStringField(value: unknown, path: string[]): string | undefined {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return typeof cursor === "string" ? cursor : undefined;
}

export function extractQrCodeData(response: unknown) {
  const base64Image =
    readStringField(response, ["base64"]) ??
    readStringField(response, ["qrcode", "base64"]) ??
    readStringField(response, ["qrcode", "base64QRCode"]) ??
    readStringField(response, ["qrCode", "base64"]) ??
    readStringField(response, ["qr", "base64"]);
  const qrCode =
    readStringField(response, ["code"]) ??
    readStringField(response, ["qrcode", "code"]) ??
    readStringField(response, ["qrCode", "code"]) ??
    readStringField(response, ["qr", "code"]) ??
    readStringField(response, ["qrcode"]);
  const pairingCode = readStringField(response, ["pairingCode"]) ?? readStringField(response, ["qrcode", "pairingCode"]);
  const image = base64Image?.startsWith("data:image") ? base64Image : base64Image ? `data:image/png;base64,${base64Image}` : undefined;

  return { image, code: qrCode, pairingCode, raw: response };
}

export async function createEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);
  const response = await client.createInstance(settings.webhookUrl);

  if (settings.webhookUrl) {
    await client.setWebhook(settings.webhookUrl).catch(() => undefined);
  }

  return response;
}

export async function connectEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);

  if (settings.webhookUrl) {
    await client.setWebhook(settings.webhookUrl).catch(() => undefined);
  }

  return extractQrCodeData(await client.connectInstance());
}

function getStringField(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return typeof cursor === "string" ? cursor : undefined;
}

function findInstance(instances: unknown, instanceName: string) {
  if (!Array.isArray(instances)) return undefined;

  return instances.find((instance) => {
    const name =
      getStringField(instance, ["name"]) ??
      getStringField(instance, ["instanceName"]) ??
      getStringField(instance, ["instance", "instanceName"]) ??
      getStringField(instance, ["instance", "name"]);

    return name === instanceName;
  });
}

export async function testEvolutionConnection() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);

  if (settings.webhookUrl) {
    await client.setWebhook(settings.webhookUrl).catch(() => undefined);
  }

  const connectionState = await client.getConnectionState();
  const instances = await client.fetchInstances().catch(() => undefined);

  return {
    connectionState,
    instance: findInstance(instances, settings.instanceName),
    webhookUrl: settings.webhookUrl,
  };
}

export async function disconnectWhatsAppInstance() {
  const client = await getEvolutionClient();
  return client.logoutInstance();
}

export async function deleteWhatsAppInstance() {
  const client = await getEvolutionClient();
  return client.deleteInstance();
}
