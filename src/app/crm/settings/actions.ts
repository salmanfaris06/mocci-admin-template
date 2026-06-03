"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { aiProviderKeys, apiSettings } from "@/server/db/schema";
import { connectEvolutionInstance, createEvolutionInstance, testEvolutionConnection } from "@/server/crm/evolution";
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
  const values = {
    evolutionBaseUrl: requiredString(formData, "evolutionBaseUrl"),
    evolutionInstanceName: requiredString(formData, "evolutionInstanceName"),
    evolutionApiKeyEncrypted: encryptSecret(requiredString(formData, "evolutionApiKey"), key),
    webhookUrl: requiredString(formData, "webhookUrl"),
    webhookEnabled: true,
    updatedAt: new Date(),
  };
  const [existing] = await db.select({ id: apiSettings.id }).from(apiSettings).limit(1);
  if (existing) {
    await db.update(apiSettings).set(values).where(eq(apiSettings.id, existing.id));
  } else {
    await db.insert(apiSettings).values(values);
  }
  revalidatePath("/crm/settings");
}

export async function testEvolutionSettings() {
  const state = await testEvolutionConnection();
  revalidatePath("/crm/settings");
  return state;
}

export async function createWhatsAppInstance() {
  const response = await createEvolutionInstance();
  revalidatePath("/crm/settings");
  return response;
}

export async function connectWhatsAppInstance() {
  const qr = await connectEvolutionInstance();
  revalidatePath("/crm/settings");
  return qr;
}

export async function saveOpenAiKey(formData: FormData) {
  const key = encryptionKey();
  await db.insert(aiProviderKeys).values({ provider: "openai", encryptedApiKey: encryptSecret(requiredString(formData, "openAiApiKey"), key), isActive: true, isDefault: true }).onConflictDoUpdate({
    target: aiProviderKeys.provider,
    set: { encryptedApiKey: encryptSecret(requiredString(formData, "openAiApiKey"), key), isActive: true, isDefault: true, updatedAt: new Date() },
  });
  revalidatePath("/crm/settings");
}
