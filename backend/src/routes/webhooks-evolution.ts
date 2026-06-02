import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../../../src/server/db";
import { webhookEvents } from "../../../src/server/db/schema";
import { getConfig } from "../config";
import { createWebhookIdempotencyKey } from "../evolution/normalizers";
import { enqueueJob } from "../jobs/queue";

type EvolutionWebhookBody = { event?: string; instance?: string; data?: Record<string, unknown> };

function isAuthorized(request: FastifyRequest) {
  const config = getConfig();
  if (!config.WEBHOOK_SHARED_SECRET) return true;
  return request.headers["x-webhook-secret"] === config.WEBHOOK_SHARED_SECRET;
}

export async function registerEvolutionWebhookRoute(app: FastifyInstance) {
  app.post<{ Body: EvolutionWebhookBody }>("/webhooks/evolution", async (request, reply) => {
    if (!isAuthorized(request)) return reply.code(401).send({ error: "Unauthorized" });

    const body = request.body;
    const idempotencyKey = createWebhookIdempotencyKey(body);
    const eventType = body.event ?? "UNKNOWN";

    const [event] = await db.insert(webhookEvents).values({ eventType, idempotencyKey, rawPayload: body }).onConflictDoNothing().returning();
    if (event) await enqueueJob("process_webhook", { webhookEventId: event.id });

    return reply.code(200).send({ ok: true });
  });
}
