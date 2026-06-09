# Webhook DB Queue Reliability Design

## Goal

Improve Evolution API webhook reliability by making the webhook endpoint fast and durable: receive, validate, persist, enqueue, then process asynchronously from the existing `jobs` table.

## Selected Approach

Use the existing Postgres-backed `jobs` table as the first queue implementation. This avoids new infrastructure, works with the current Drizzle/Postgres stack, and creates a migration path to Supabase Queues/Inngest later if throughput grows.

## Architecture

Current webhook processing is synchronous: the route stores a webhook event and immediately normalizes contacts, conversations, messages, pipeline items, and AI triggers. The new design splits this into two paths:

```txt
POST /api/webhooks/evolution[/event]
  -> validate secret + parse JSON
  -> derive stronger idempotency key
  -> insert webhook_events row
  -> insert jobs row: type=evolution_webhook_event
  -> return 202 quickly

POST /api/jobs/process
  -> claim queued jobs safely
  -> process saved webhook payload using existing normalization logic
  -> mark webhook_event/job succeeded or failed
```

## Data Model

`webhook_events` remains the audit source. Its `idempotency_key` should include event type plus stable message ID or payload hash. `status` records the lifecycle: `received`, `queued`, `processing`, `processed`, `failed`, or `ignored_duplicate`.

`jobs` stores queue items. Each Evolution webhook job payload should include:

```json
{
  "webhookEventId": "uuid",
  "eventType": "MESSAGES_UPSERT",
  "pathEvent": "messages-upsert"
}
```

## Processing Rules

- Duplicate webhook events must not enqueue duplicate jobs.
- The webhook endpoint should not trigger AI directly.
- AI trigger remains in the processor after message normalization.
- Failed jobs keep an error message and can be retried later.
- The first implementation can process jobs through an internal endpoint/manual trigger; scheduled processing can be added after this foundation is stable.

## Security

- Keep existing `EVOLUTION_WEBHOOK_SECRET` timing-safe header validation.
- Add a separate `JOBS_PROCESS_SECRET` for the processor endpoint.
- Never expose raw webhook payloads through public endpoints.
- Do not log secrets or full PII payloads in responses.

## Testing

- Webhook route test should assert duplicate events are ignored and new events enqueue a job.
- Processor tests should assert a queued job runs existing message normalization and marks status succeeded.
- Failure tests should assert job/webhook status becomes failed with a safe error message.

## Out of Scope

- External queue providers.
- Admin replay UI.
- Cron/scheduled processor setup.
- Large schema redesign.
