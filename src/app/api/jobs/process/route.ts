import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, lte } from "drizzle-orm";

import { db } from "@/server/db";
import { jobs, webhookEvents } from "@/server/db/schema";
import { processEvolutionWebhookPayload } from "@/server/crm/evolution-webhook-processing";

export const dynamic = "force-dynamic";

const WORKER_ID = `vercel-${process.pid}`;
const ERROR_MESSAGE_LIMIT = 1000;

type EvolutionWebhookJobPayload = {
  webhookEventId?: string;
  pathEvent?: string | null;
};

function secretMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.JOBS_PROCESS_SECRET?.trim();
  if (!expectedSecret) return true;

  const actualSecret = request.headers.get("x-jobs-process-secret")?.trim();
  return Boolean(actualSecret && secretMatches(actualSecret, expectedSecret));
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown job error";
  return message.slice(0, ERROR_MESSAGE_LIMIT);
}

async function claimNextWebhookJob() {
  const [job] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.type, "evolution_webhook_event"),
        eq(jobs.status, "queued"),
        lte(jobs.scheduledAt, new Date()),
      ),
    )
    .orderBy(asc(jobs.scheduledAt))
    .limit(1);

  if (!job) return null;

  await db
    .update(jobs)
    .set({
      status: "running",
      attempts: job.attempts + 1,
      lockedAt: new Date(),
      lockedBy: WORKER_ID,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, job.id));

  return job;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { ok: false, error: "Unauthorized job processor" },
      { status: 401 },
    );
  }

  const job = await claimNextWebhookJob();
  if (!job) return Response.json({ ok: true, processed: 0, failed: 0 });

  const payload = job.payload as EvolutionWebhookJobPayload;
  if (!payload.webhookEventId) {
    const errorMessage = "Job payload missing webhookEventId";
    await db
      .update(jobs)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(jobs.id, job.id));
    return Response.json(
      { ok: false, processed: 0, failed: 1 },
      { status: 500 },
    );
  }

  const [webhookEvent] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, payload.webhookEventId))
    .limit(1);

  if (!webhookEvent) {
    const errorMessage = "Webhook event not found";
    await db
      .update(jobs)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(jobs.id, job.id));
    return Response.json(
      { ok: false, processed: 0, failed: 1 },
      { status: 500 },
    );
  }

  try {
    await db
      .update(webhookEvents)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(webhookEvents.id, webhookEvent.id));

    const result = await processEvolutionWebhookPayload(
      webhookEvent.rawPayload,
      payload.pathEvent ?? undefined,
    );

    await db
      .update(webhookEvents)
      .set({ status: "processed", errorMessage: null, updatedAt: new Date() })
      .where(eq(webhookEvents.id, webhookEvent.id));
    await db
      .update(jobs)
      .set({ status: "succeeded", errorMessage: null, updatedAt: new Date() })
      .where(eq(jobs.id, job.id));

    return Response.json({ ok: true, processed: 1, failed: 0, result });
  } catch (error) {
    const errorMessage = safeErrorMessage(error);
    await db
      .update(webhookEvents)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(webhookEvents.id, webhookEvent.id));
    await db
      .update(jobs)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(jobs.id, job.id));

    return Response.json(
      { ok: false, processed: 0, failed: 1 },
      { status: 500 },
    );
  }
}
