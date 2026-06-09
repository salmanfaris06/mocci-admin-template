import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { jobs, webhookEvents } from "@/server/db/schema";
import { buildEvolutionWebhookIngestion } from "../../../../server/crm/evolution-webhook-processing";

async function parseRequestPayload(request: Request, pathEvent?: string) {
  const bodyText = await request.text();
  let raw: unknown = null;
  let parseError: string | undefined;

  if (bodyText.trim()) {
    try {
      raw = JSON.parse(bodyText) as unknown;
    } catch (error) {
      parseError = error instanceof Error ? error.message : "Invalid JSON body";
      raw = { bodyText };
    }
  }

  return {
    meta: {
      requestId: crypto.randomUUID(),
      url: request.url,
      pathname: new URL(request.url).pathname,
      pathEvent: pathEvent ?? null,
      method: request.method,
      contentType: request.headers.get("content-type"),
      userAgent: request.headers.get("user-agent"),
      parseError,
      receivedAt: new Date().toISOString(),
    },
    raw,
  };
}

function webhookSecretMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isEvolutionWebhookAuthorized(request: Request) {
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) return true;

  const actualSecret = request.headers.get("x-webhook-secret")?.trim();
  return Boolean(
    actualSecret && webhookSecretMatches(actualSecret, expectedSecret),
  );
}

export async function handleEvolutionWebhook(
  request: Request,
  pathEvent?: string,
) {
  if (!isEvolutionWebhookAuthorized(request)) {
    return Response.json(
      { ok: false, error: "Unauthorized webhook" },
      { status: 401 },
    );
  }

  const payload = await parseRequestPayload(request, pathEvent);
  const ingestion = await buildEvolutionWebhookIngestion(payload, pathEvent);

  const [insertedEvent] = await db
    .insert(webhookEvents)
    .values({
      eventType: ingestion.eventType,
      idempotencyKey: ingestion.idempotencyKey,
      rawPayload: ingestion.rawPayload,
      status: payload.meta.parseError ? "failed" : "queued",
      errorMessage: payload.meta.parseError,
    })
    .onConflictDoNothing({ target: webhookEvents.idempotencyKey })
    .returning({
      id: webhookEvents.id,
      idempotencyKey: webhookEvents.idempotencyKey,
    });

  if (!insertedEvent) {
    await db
      .update(webhookEvents)
      .set({ status: "ignored_duplicate", updatedAt: new Date() })
      .where(eq(webhookEvents.idempotencyKey, ingestion.idempotencyKey));

    return Response.json({
      ok: true,
      queued: false,
      duplicate: true,
      eventType: ingestion.eventType,
      pathEvent: pathEvent ?? null,
      parseError: payload.meta.parseError ?? null,
    });
  }

  if (!payload.meta.parseError) {
    await db.insert(jobs).values({
      type: "evolution_webhook_event",
      status: "queued",
      payload: {
        webhookEventId: insertedEvent.id,
        eventType: ingestion.eventType,
        pathEvent: pathEvent ?? null,
      },
    });
  }

  return Response.json(
    {
      ok: true,
      queued: !payload.meta.parseError,
      eventType: ingestion.eventType,
      pathEvent: pathEvent ?? null,
      parseError: payload.meta.parseError ?? null,
    },
    { status: payload.meta.parseError ? 400 : 202 },
  );
}

export async function GET(request: Request) {
  return Response.json({
    ok: true,
    endpoint: new URL(request.url).pathname,
    status: "ready",
    message:
      "Evolution webhook endpoint is ready. Incoming WhatsApp messages must be delivered with POST and a JSON body.",
  });
}

export async function POST(request: Request) {
  return handleEvolutionWebhook(request);
}
