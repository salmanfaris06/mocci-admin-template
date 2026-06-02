"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { aiProviderKeys, apiSettings } from "@/server/db/schema";
import { encryptSecret } from "@/server/security/crypto";

function requiredString(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function encryptionKey() {
  const key = process.env.SECRETS_ENCRYPTION_KEY;
  if (!key) throw new Error("SECRETS_ENCRYPTION_KEY is required to store API credentials");
  return key;
}

export async function saveEvolutionSettings(formData: FormData) {
  const key = encryptionKey();
  await db.insert(apiSettings).values({
    evolutionBaseUrl: requiredString(formData, "evolutionBaseUrl"),
    evolutionInstanceName: requiredString(formData, "evolutionInstanceName"),
    evolutionApiKeyEncrypted: encryptSecret(requiredString(formData, "evolutionApiKey"), key),
    webhookUrl: requiredString(formData, "webhookUrl"),
    webhookEnabled: true,
  });
  revalidatePath("/crm/settings");
}

export async function saveOpenAiKey(formData: FormData) {
  const key = encryptionKey();
  await db.insert(aiProviderKeys).values({ provider: "openai", encryptedApiKey: encryptSecret(requiredString(formData, "openAiApiKey"), key), isActive: true, isDefault: true });
  revalidatePath("/crm/settings");
}
