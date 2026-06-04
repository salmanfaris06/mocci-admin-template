"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { aiProviderKeys, apiSettings } from "@/server/db/schema";
import { configureEvolutionWebhook, connectEvolutionInstance, createEvolutionInstance, deleteWhatsAppInstance, disconnectWhatsAppInstance, testEvolutionConnection } from "@/server/crm/evolution";
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

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("EVOLUTION_BASE_URL")) return "EVOLUTION_BASE_URL is missing. Fill Base URL + API key in settings or add it to Vercel env.";
  if (message.includes("EVOLUTION_API_KEY")) return "Evolution API key is missing. Fill the API key field and save settings, or add EVOLUTION_API_KEY to Vercel env.";
  if (message.includes("EVOLUTION_INSTANCE_NAME")) return "Evolution instance name is missing. Fill Instance name in settings or add EVOLUTION_INSTANCE_NAME to Vercel env.";
  if (message.includes("Unsupported state") || message.includes("authenticate") || message.includes("decrypt")) return "Saved Evolution API key cannot be decrypted in this environment. Use the same SECRETS_ENCRYPTION_KEY as the environment that saved it, or re-save the API key in production.";
  if (message.includes("SECRETS_ENCRYPTION_KEY")) return "SECRETS_ENCRYPTION_KEY is missing or invalid in Vercel env.";
  if (message.includes("Evolution API request failed")) return message;

  return "WhatsApp action failed. Check Vercel env and Evolution API settings.";
}

async function safeAction<T>(action: () => Promise<T>) {
  try {
    return { ok: true as const, data: await action() };
  } catch (error) {
    return { ok: false as const, error: publicError(error) };
  }
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

  await configureEvolutionWebhook().catch(() => undefined);

  revalidatePath("/api-settings");
  revalidatePath("/crm/settings");
}

export async function testEvolutionSettings() {
  return safeAction(async () => {
    const state = await testEvolutionConnection();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return state;
  });
}

export async function createWhatsAppInstance() {
  return safeAction(async () => {
    const response = await createEvolutionInstance();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return response;
  });
}

export async function connectWhatsAppInstance() {
  return safeAction(async () => {
    const qr = await connectEvolutionInstance();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return qr;
  });
}

export async function disconnectWhatsApp() {
  return safeAction(async () => {
    const response = await disconnectWhatsAppInstance();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return response;
  });
}

export async function deleteWhatsApp() {
  return safeAction(async () => {
    const response = await deleteWhatsAppInstance();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return response;
  });
}

export async function saveOpenAiKey(formData: FormData) {
  const key = encryptionKey();
  await db.insert(aiProviderKeys).values({ provider: "openai", encryptedApiKey: encryptSecret(requiredString(formData, "openAiApiKey"), key), isActive: true, isDefault: true }).onConflictDoUpdate({
    target: aiProviderKeys.provider,
    set: { encryptedApiKey: encryptSecret(requiredString(formData, "openAiApiKey"), key), isActive: true, isDefault: true, updatedAt: new Date() },
  });
  revalidatePath("/api-settings");
}
