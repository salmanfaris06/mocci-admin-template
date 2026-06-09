# Webhook DB Queue Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Evolution webhook ingestion fast and reliable by persisting raw events, enqueueing DB jobs, and processing webhook normalization asynchronously.

**Architecture:** Split webhook receive from webhook processing. The route inserts `webhook_events` + `jobs` and returns `202`; a secured processor endpoint claims queued jobs and calls extracted webhook normalization logic.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, Postgres, Vitest.

---

## File Structure

- Modify `src/server/db/schema.ts`: add helpful indexes for queued job claiming and webhook status filtering.
- Create `src/server/crm/evolution-webhook-processing.ts`: extracted pure/server processing helpers from the current route.
- Modify `src/app/api/webhooks/evolution/route.ts`: receive-only route that stores event and enqueues job.
- Create `src/app/api/jobs/process/route.ts`: secured job processor endpoint.
- Modify `src/app/api/webhooks/evolution/route.test.ts`: update expectations for queued webhook behavior.
- Create `src/app/api/jobs/process/route.test.ts`: processor success/failure tests.
- Create Drizzle migration via `npm run db:generate` after schema changes.

---

### Task 1: Add queue-oriented schema indexes

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: generated migration under `drizzle/`

- [ ] **Step 1: Update schema indexes**

Add indexes to `jobs` for queue claiming and to `webhookEvents` for status dashboards:

```ts
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").default("received").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  errorMessage: text("error_message"),
  ...timestamps,
}, (table) => [
  uniqueIndex("webhook_events_idempotency_key_idx").on(table.idempotencyKey),
  index("webhook_events_created_at_idx").on(table.createdAt),
  index("webhook_events_status_created_at_idx").on(table.status, table.createdAt),
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  status: jobStatusEnum("status").default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).defaultNow().notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  errorMessage: text("error_message"),
  ...timestamps,
}, (table) => [
  index("jobs_status_scheduled_at_idx").on(table.status, table.scheduledAt),
  index("jobs_type_status_scheduled_at_idx").on(table.type, table.status, table.scheduledAt),
]);
```

- [ ] **Step 2: Generate migration**

Run:

```bash
npm run db:generate
```

Expected: a new migration file is created in `drizzle/`.

- [ ] **Step 3: Verify build types**

Run:

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema.ts drizzle
git commit -m "perf: add queue processing indexes"
```

---

### Task 2: Extract webhook processing logic

**Files:**
- Create: `src/server/crm/evolution-webhook-processing.ts`
- Modify: `src/app/api/webhooks/evolution/route.ts`
- Test: `src/app/api/webhooks/evolution/route.test.ts`

- [ ] **Step 1: Move existing processing helpers**

Move parsing and normalization functions from `route.ts` into `src/server/crm/evolution-webhook-processing.ts`. Export:

```ts
export async function buildEvolutionWebhookIngestion(payload: unknown, pathEvent?: string) {
  return {
    eventType: getEventType(payload, pathEvent),
    idempotencyKey: await idempotencyKey(payload, pathEvent),
    rawPayload: (payload && typeof payload === "object" ? payload : { raw: payload }) as Record<string, unknown>,
  };
}

export async function processEvolutionWebhookPayload(payload: unknown, pathEvent?: string) {
  const eventType = getEventType(payload, pathEvent);
  let processedMessages = 0;

  for (const messagePayload of messagePayloads(payload)) {
    if (isMessageUpsertEvent(getEventType(messagePayload, pathEvent))) {
      await processMessage(messagePayload);
      processedMessages += 1;
    }

    if (isMessageAckEvent(getEventType(messagePayload, pathEvent))) {
      await processMessageAck(messagePayload);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/crm/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/crm/inbox");

  return { ok: true, eventType, processedMessages };
}
```

- [ ] **Step 2: Keep route behavior temporarily**

After extraction, keep `handleEvolutionWebhook()` calling `processEvolutionWebhookPayload()` synchronously so tests still pass before queue changes.

- [ ] **Step 3: Run webhook tests**

```bash
npm test -- src/app/api/webhooks/evolution/route.test.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/crm/evolution-webhook-processing.ts src/app/api/webhooks/evolution/route.ts src/app/api/webhooks/evolution/route.test.ts
git commit -m "refactor: extract evolution webhook processing"
```

---

### Task 3: Change webhook endpoint to enqueue jobs

**Files:**
- Modify: `src/app/api/webhooks/evolution/route.ts`
- Modify: `src/app/api/webhooks/evolution/route.test.ts`

- [ ] **Step 1: Add queue insertion**

Update `handleEvolutionWebhook()` to:

1. validate secret
2. parse JSON
3. call `buildEvolutionWebhookIngestion()`
4. insert `webhookEvents` with `status: "queued"`
5. insert `jobs` with `type: "evolution_webhook_event"`
6. return `202`

The duplicate path should return `200` with `queued: false` and `duplicate: true`.

- [ ] **Step 2: Update tests**

Change standard payload test to expect:

```ts
expect(response.status).toBe(202);
expect(body).toMatchObject({
  ok: true,
  queued: true,
  eventType: "MESSAGES_UPSERT",
});
expect(insertedWebhookEvents).toEqual([
  expect.objectContaining({
    eventType: "MESSAGES_UPSERT",
    idempotencyKey: "MESSAGES_UPSERT:main:msg-1",
    status: "queued",
  }),
]);
expect(insertedJobs).toEqual([
  expect.objectContaining({
    type: "evolution_webhook_event",
    status: "queued",
  }),
]);
expect(triggerAiWhatsAppReplyMock).not.toHaveBeenCalled();
```

- [ ] **Step 3: Run webhook tests**

```bash
npm test -- src/app/api/webhooks/evolution/route.test.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/evolution/route.ts src/app/api/webhooks/evolution/route.test.ts
git commit -m "feat: enqueue evolution webhook jobs"
```

---

### Task 4: Add secured processor endpoint

**Files:**
- Create: `src/app/api/jobs/process/route.ts`
- Create: `src/app/api/jobs/process/route.test.ts`

- [ ] **Step 1: Implement secret check**

`POST /api/jobs/process` must require `JOBS_PROCESS_SECRET` when configured. Accept headers:

```txt
x-jobs-process-secret: <secret>
```

Use `timingSafeEqual` like the existing webhook secret check.

- [ ] **Step 2: Claim one queued job**

Select the oldest job where:

```txt
type = evolution_webhook_event
status = queued
scheduled_at <= now
```

Set it to `running`, increment `attempts`, and set `lockedAt`/`lockedBy`.

- [ ] **Step 3: Process job payload**

Read `payload.webhookEventId`, load matching `webhook_events`, mark it `processing`, call `processEvolutionWebhookPayload(rawPayload, pathEvent)`, then mark both rows succeeded/processed.

- [ ] **Step 4: Handle failure**

If processing throws, mark job `failed`, mark webhook event `failed`, store `errorMessage` truncated to 1000 chars, and return `500` with safe JSON:

```json
{ "ok": false, "processed": 0, "failed": 1 }
```

- [ ] **Step 5: Add tests**

T
