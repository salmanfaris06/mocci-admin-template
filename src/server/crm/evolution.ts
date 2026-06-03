import "server-only";

import { eq } from "drizzle-orm";

import { EvolutionClient } from "../../../backend/src/evolution/client";
import { db } from "@/server/db";
import { apiSettings } from "@/server/db/schema";
import { decryptSecret } from "@/server/security/crypto";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function decryptIfPossible(value: string | null) {
  if (!value) return undefined;
  const key = process.env.SECRETS_ENCRYPTION_KEY;
  return key ? decryptSecret(value, key) : undefined;
}

export async function getEvolutionSettings() {
  const [settings] = await db.select().from(apiSettings).limit(1);

  return {
    baseUrl: settings?.evolutionBaseUrl ?? requiredEnv("EVOLUTION_BASE_URL"),
    apiKey: decryptIfPossible(settings?.evolutionApiKeyEncrypted ?? null) ?? requiredEnv("EVOLUTION_API_KEY"),
    instanceName: settings?.evolutionInstanceName ?? requiredEnv("EVOLUTION_INSTANCE_NAME"),
    settingsId: settings?.id,
  };
}

export async function getEvolutionClient() {
  const { apiKey, baseUrl, instanceName } = await getEvolutionSettings();
  return new EvolutionClient({ apiKey, baseUrl, instanceName });
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
  const code = readStringField(response, ["code"]) ?? readStringField(response, ["base64"]) ?? readStringField(response, ["qrcode", "base64"]) ?? readStringField(response, ["qrcode", "code"]);
  const pairingCode = readStringField(response, ["pairingCode"]);
  const image = code?.startsWith("data:image") ? code : code ? `data:image/png;base64,${code}` : undefined;

  return { image, pairingCode, raw: response };
}

export async function createEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);
  const [dbSettings] = settings.settingsId ? await db.select().from(apiSettings).where(eq(apiSettings.id, settings.settingsId)).limit(1) : [];

  return client.createInstance(dbSettings?.webhookUrl ?? undefined);
}

export async function connectEvolutionInstance() {
  const client = await getEvolutionClient();
  return extractQrCodeData(await client.connectInstance());
}

export async function testEvolutionConnection() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);
  const response = await client.getConnectionState();

  if (settings.settingsId) {
    await db
      .update(apiSettings)
      .set({ connectionState: JSON.stringify(response), updatedAt: new Date() })
      .where(eq(apiSettings.id, settings.settingsId));
  }

  return response;
}
