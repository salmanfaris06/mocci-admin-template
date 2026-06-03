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
