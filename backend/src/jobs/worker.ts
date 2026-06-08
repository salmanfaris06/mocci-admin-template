import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../../src/server/db";
import {
  aiProviderKeys,
  apiSettings,
  jobs,
} from "../../../src/server/db/schema";
import { retryOutgoingTextMessage } from "../../../src/server/crm/outgoing-messages";
import { decryptSecret } from "../../../src/server/security/crypto";
import { runAiReply } from "../ai/reply-runner";
import { EvolutionClient } from "../evolution/client";
import { processWebhookJob } from "./process-webhook";
import { markJobFailed } from "./queue";

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

async function getEvolutionSettings() {
  const [settings] = await db.select().from(apiSettings).limit(1);
  return {
    baseUrl: settings?.evolutionBaseUrl ?? requiredEnv("EVOLUTION_BASE_URL"),
    apiKey:
      decryptIfPossible(settings?.evolutionApiKeyEncrypted ?? null) ??
      requiredEnv("EVOLUTION_API_KEY"),
    instanceName:
      settings?.evolutionInstanceName ?? requiredEnv("EVOLUTION_INSTANCE_NAME"),
  };
}

async function getOpenAiApiKey() {
  const [providerKey] = await db
    .select()
    .from(aiProviderKeys)
    .where(eq(aiProviderKeys.provider, "openai"))
    .limit(1);
  return (
    decryptIfPossible(providerKey?.encryptedApiKey ?? null) ??
    requiredEnv("OPENAI_API_KEY")
  );
}

export async function runNextJob(workerId = "default-worker") {
  const [job] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "queued"),
        inArray(jobs.type, [
          "process_webhook",
          "ai_reply",
          "whatsapp.send_text.retry",
        ]),
        lte(jobs.scheduledAt, new Date()),
      ),
    )
    .orderBy(asc(jobs.scheduledAt))
    .limit(1);
  if (!job) return false;

  await db
    .update(jobs)
    .set({
      status: "running",
      lockedAt: new Date(),
      lockedBy: workerId,
      attempts: job.attempts + 1,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, job.id));

  try {
    if (job.type === "process_webhook")
      await processWebhookJob(job.id, job.payload as Record<string, unknown>);
    if (job.type === "ai_reply") {
      const settings = await getEvolutionSettings();
      const evolutionClient = new EvolutionClient(settings);
      await runAiReply({
        ...(job.payload as {
          messageId: string;
          conversationId: string;
          contactId: string;
        }),
        evolutionClient,
        openAiApiKey: await getOpenAiApiKey(),
      });
      await db
        .update(jobs)
        .set({ status: "succeeded", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
    }
    if (job.type === "whatsapp.send_text.retry") {
      const settings = await getEvolutionSettings();
      const evolutionClient = new EvolutionClient(settings);
      await retryOutgoingTextMessage(
        evolutionClient,
        job.payload as Parameters<typeof retryOutgoingTextMessage>[1],
      );
      await db
        .update(jobs)
        .set({ status: "succeeded", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
    }
    return true;
  } catch (error) {
    await markJobFailed(
      job.id,
      error instanceof Error ? error.message : "Unknown job error",
    );
    return true;
  }
}

export async function runWorkerLoop() {
  const workerId = `worker-${process.pid}`;
  setInterval(() => {
    runNextJob(workerId).catch((error) => console.error(error));
  }, 1000);
}
