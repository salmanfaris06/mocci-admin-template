import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, lte } from "drizzle-orm";

import { db } from "@/server/db";
import { jobs, webhookEvents } from "@/server/db/schema";
import { processEvolutionWebhookPayload } from "@/server/crm/evolution-webhook-processing";

export const dynamic = "force-dynamic";

const WORKER_ID = `vercel-${process.pid}`;
const ERROR_MESSAGE_LIMIT = 1000;
const DEFAULT_BATCH_LIMIT = 5;
const MAX_BATCH_LIMIT = 20;

type EvolutionWebhookJobPayload = {
  webhookEventId?: string;
  pathEvent?: string | null;
};

type ProcessOneResult = {
  processed: number;
  failed: number;
  empty?: boolean;
};

function secretMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isVercelCron(request: Request) {
  return (
    request.headers.get("user-agent")?.toLowerCase().includes("vercel-cron") ??
    false
  );
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.JOBS_PROCESS_SECRET?.trim();
  if (!expectedSecret) return true;
  if (isVercelCron(request)) return true;

  const headerSecret = request.headers.get("x-jobs-process-secret")?.trim();
  const bearerSecret = request.headers
    .get("authorization")
    ?.trim()
    .replace(/^Bearer\s+/i, "");
  const actualSecret = headerSecret || bearerSecret;

  return Boolean(actualSecret && secretMatches(actualSecret, expectedSecret));
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown job error";
  return message.slice(0, ERROR_MESSAGE_LIMIT);
}

function batchLimitFromRequest(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("limit"));
  if (!Number.isFinite(requested) || requested <= 0) return DEFAULT_BATCH_LIMIT;
  return Math.min(Math.floor(requested), MAX_BATCH_LIMIT);
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

async function failJob(jobId: string, errorMessage: string) {
  await db
    .update(jobs)
    .set({ status: "failed", errorMessage, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

async function processOneWebhookJob(): Promise<ProcessOneResult> {
  const job = await claimNextWebhookJob();
  if (!job) return { processed: 0, failed: 0, empty: true };

  const payload = job.payload as EvolutionWebhookJobPayload;
  if (!payload.webhookEventId) {
    await failJob(job.id, "Job payload missing webhookEventId");
    return { processed: 0, failed: 1 };
  }

  const [webhookEvent] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, payload.webhookEventId))
    .limit(1);

  if (!webhookEvent) {
    await failJob(job.id, "Webhook event not found");
    return { processed: 0, failed: 1 };
  }

  try {
    await db
      .update(webhookEvents)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(webhookEvents.id, webhookEvent.id));

    await processEvolutionWebhookPayload(
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

    return { processed: 1, failed: 0 };
  } catch (error) {
    const errorMessage = safeErrorMessage(error);
    await db
      .update(webhookEvents)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(webhookEvents.id, webhookEvent.id));
    await failJob(job.id, errorMessage);

    return { processed: 0, failed: 1 };
  }
}

async function processBatch(limit: number) {
  let processed = 0;
  let failed = 0;

  for (let index = 0; index < limit; index += 1) {
    const result = await processOneWebhookJob();
    processed += result.processed;
    failed += result.failed;
    if (result.empty) break;
  }

  return { ok: failed === 0, processed, failed, limit };
}

async function handleProcess(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { ok: false, error: "Unauthorized job processor" },
      { status: 401 },
    );
  }

  const result = await processBatch(batchLimitFromRequest(request));
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(request: Request) {
  return handleProcess(request);
}

export async function POST(request: Request) {
  return handleProcess(request);
}
