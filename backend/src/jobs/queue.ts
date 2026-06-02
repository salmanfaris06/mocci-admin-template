import { eq } from "drizzle-orm";
import { db } from "../../../src/server/db";
import { jobs } from "../../../src/server/db/schema";

export type JobType = "process_webhook" | "ai_reply";

export async function enqueueJob(type: JobType, payload: Record<string, unknown>) {
  const [job] = await db.insert(jobs).values({ type, payload }).returning();
  return job;
}

export async function markJobSucceeded(id: string) {
  await db.update(jobs).set({ status: "succeeded", updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function markJobFailed(id: string, errorMessage: string) {
  await db.update(jobs).set({ status: "failed", errorMessage, updatedAt: new Date() }).where(eq(jobs.id, id));
}
