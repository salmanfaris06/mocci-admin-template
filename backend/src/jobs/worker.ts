import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "../../../src/server/db";
import { jobs } from "../../../src/server/db/schema";
import { runAiReply } from "../ai/reply-runner";
import { EvolutionClient } from "../evolution/client";
import { processWebhookJob } from "./process-webhook";
import { markJobFailed } from "./queue";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function runNextJob(workerId = "default-worker") {
  const [job] = await db.select().from(jobs).where(and(eq(jobs.status, "queued"), lte(jobs.scheduledAt, new Date()))).orderBy(asc(jobs.scheduledAt)).limit(1);
  if (!job) return false;

  await db.update(jobs).set({ status: "running", lockedAt: new Date(), lockedBy: workerId, attempts: job.attempts + 1, updatedAt: new Date() }).where(eq(jobs.id, job.id));

  try {
    if (job.type === "process_webhook") await processWebhookJob(job.id, job.payload as Record<string, unknown>);
    if (job.type === "ai_reply") {
      const evolutionClient = new EvolutionClient({ baseUrl: requiredEnv("EVOLUTION_BASE_URL"), apiKey: requiredEnv("EVOLUTION_API_KEY"), instanceName: requiredEnv("EVOLUTION_INSTANCE_NAME") });
      await runAiReply({ ...(job.payload as { messageId: string; conversationId: string; contactId: string }), evolutionClient, openAiApiKey: requiredEnv("OPENAI_API_KEY") });
      await db.update(jobs).set({ status: "succeeded", updatedAt: new Date() }).where(eq(jobs.id, job.id));
    }
    return true;
  } catch (error) {
    await markJobFailed(job.id, error instanceof Error ? error.message : "Unknown job error");
    return true;
  }
}

export async function runWorkerLoop() {
  const workerId = `worker-${process.pid}`;
  setInterval(() => { runNextJob(workerId).catch((error) => console.error(error)); }, 1000);
}
