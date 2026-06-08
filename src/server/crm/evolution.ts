import "server-only";

import {
  EvolutionClient,
  defaultWebhookEvents,
} from "../../../backend/src/evolution/client";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function vercelWebhookUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return undefined;

  const origin =
    vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://")
      ? vercelUrl
      : `https://${vercelUrl}`;
  return `${origin.replace(/\/$/, "")}/api/webhooks/evolution`;
}

function getWebhookUrl() {
  const configuredUrl = process.env.EVOLUTION_WEBHOOK_URL?.trim();
  const fallbackUrl = vercelWebhookUrl();

  if (!configuredUrl) return fallbackUrl;

  const isLocalhost = /https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(
    configuredUrl,
  );
  if (isLocalhost && process.env.VERCEL_URL) return fallbackUrl;

  return configuredUrl;
}

export async function getEvolutionSettings() {
  return {
    baseUrl: requiredEnv("EVOLUTION_BASE_URL"),
    apiKey: requiredEnv("EVOLUTION_API_KEY"),
    instanceName: requiredEnv("EVOLUTION_INSTANCE_NAME"),
    webhookUrl: getWebhookUrl(),
    webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET?.trim() || undefined,
  };
}

export async function getEvolutionClient() {
  const { apiKey, baseUrl, instanceName } = await getEvolutionSettings();
  return new EvolutionClient({ apiKey, baseUrl, instanceName });
}

async function verifyEvolutionWebhookWith(
  settings: Awaited<ReturnType<typeof getEvolutionSettings>>,
  client: EvolutionClient,
) {
  const response = await client.getWebhook();
  const webhook = readWebhookPayload(response);
  const configuredUrl = readStringField(webhook, ["url"]);
  const enabled = readBooleanField(webhook, ["enabled"]) ?? false;
  const configuredEvents = readStringArrayField(webhook, ["events"]) ?? [];
  const missingEvents = defaultWebhookEvents.filter(
    (event) => !configuredEvents.includes(event),
  );
  const expectedUrl = settings.webhookUrl;

  return {
    configured: Boolean(configuredUrl),
    enabled,
    urlMatches: Boolean(
      expectedUrl &&
      configuredUrl &&
      normalizeWebhookUrl(configuredUrl) === normalizeWebhookUrl(expectedUrl),
    ),
    configuredUrl,
    expectedUrl,
    missingEvents,
  };
}

async function ensureEvolutionWebhookConfigured(
  settings: Awaited<ReturnType<typeof getEvolutionSettings>>,
  client: EvolutionClient,
) {
  if (!settings.webhookUrl) return undefined;

  const configured = await client.setWebhook(
    settings.webhookUrl,
    settings.webhookSecret,
  );
  const verification = await verifyEvolutionWebhookWith(settings, client);
  return { configured, verification };
}

export async function configureEvolutionWebhook() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);
  return ensureEvolutionWebhookConfigured(settings, client);
}

function normalizeWebhookUrl(url?: string) {
  return url?.replace(/\/+$/, "");
}

function readField(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor))
      return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function readStringField(value: unknown, path: string[]): string | undefined {
  const cursor = readField(value, path);
  return typeof cursor === "string" ? cursor : undefined;
}

function readBooleanField(value: unknown, path: string[]): boolean | undefined {
  const cursor = readField(value, path);
  return typeof cursor === "boolean" ? cursor : undefined;
}

function readStringArrayField(
  value: unknown,
  path: string[],
): string[] | undefined {
  const cursor = readField(value, path);
  return Array.isArray(cursor)
    ? cursor.filter((item): item is string => typeof item === "string")
    : undefined;
}

function readWebhookPayload(response: unknown) {
  const webhook = readField(response, ["webhook"]);
  return webhook && typeof webhook === "object" ? webhook : response;
}

export async function verifyEvolutionWebhook() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);
  return verifyEvolutionWebhookWith(settings, client);
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
  const pairingCode =
    readStringField(response, ["pairingCode"]) ??
    readStringField(response, ["qrcode", "pairingCode"]);
  const image = base64Image?.startsWith("data:image")
    ? base64Image
    : base64Image
      ? `data:image/png;base64,${base64Image}`
      : undefined;

  return { image, code: qrCode, pairingCode, raw: response };
}

export async function createEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);

  try {
    const response = await client.createInstance(settings.webhookUrl);

    if (settings.webhookUrl) {
      await ensureEvolutionWebhookConfigured(settings, client).catch(
        () => undefined,
      );
    }

    return extractQrCodeData(response);
  } catch (error) {
    if (!isBrokenEvolutionInstanceError(error)) throw error;

    await client.deleteInstance();
    const response = await client.createInstance(settings.webhookUrl);
    if (settings.webhookUrl) {
      await ensureEvolutionWebhookConfigured(settings, client).catch(
        () => undefined,
      );
    }
    return extractQrCodeData(response);
  }
}

function isBrokenEvolutionInstanceError(error: unknown) {
  return (
    error instanceof Error && error.message.includes("reading 'instanceId'")
  );
}

export async function connectEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);

  if (settings.webhookUrl) {
    await ensureEvolutionWebhookConfigured(settings, client);
  }

  try {
    return extractQrCodeData(await client.connectInstance());
  } catch (error) {
    if (!isBrokenEvolutionInstanceError(error)) throw error;

    await client.deleteInstance();
    await client.createInstance(settings.webhookUrl);
    if (settings.webhookUrl) {
      await ensureEvolutionWebhookConfigured(settings, client);
    }
    return extractQrCodeData(await client.connectInstance());
  }
}

function findInstance(instances: unknown, instanceName: string) {
  if (!Array.isArray(instances)) return undefined;

  return instances.find((instance) => {
    const name =
      readStringField(instance, ["name"]) ??
      readStringField(instance, ["instanceName"]) ??
      readStringField(instance, ["instance", "instanceName"]) ??
      readStringField(instance, ["instance", "name"]);

    return name === instanceName;
  });
}

export async function testEvolutionConnection() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);

  const connectionState = await client.getConnectionState();
  const instances = await client.fetchInstances().catch(() => undefined);

  return {
    connectionState,
    instance: findInstance(instances, settings.instanceName),
    webhookUrl: settings.webhookUrl,
  };
}

export async function fetchAllInstances() {
  const client = await getEvolutionClient();
  const instances = await client.fetchInstances();

  if (!Array.isArray(instances)) return [];

  return instances.map((instance: unknown) => {
    const name =
      readStringField(instance, ["name"]) ??
      readStringField(instance, ["instanceName"]) ??
      readStringField(instance, ["instance", "instanceName"]) ??
      readStringField(instance, ["instance", "name"]) ??
      "unknown";

    const state =
      readStringField(instance, ["instance", "state"]) ??
      readStringField(instance, ["state"]) ??
      readStringField(instance, ["connectionStatus", "state"]) ??
      readStringField(instance, ["status"]) ??
      "unknown";

    return { name, state };
  });
}

export async function restartEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);
  const response = await client.restartInstance();
  if (settings.webhookUrl) {
    await ensureEvolutionWebhookConfigured(settings, client);
  }
  return response;
}

export async function disconnectWhatsAppInstance() {
  const client = await getEvolutionClient();
  return client.logoutInstance();
}

export async function deleteWhatsAppInstance() {
  const client = await getEvolutionClient();
  return client.deleteInstance();
}
