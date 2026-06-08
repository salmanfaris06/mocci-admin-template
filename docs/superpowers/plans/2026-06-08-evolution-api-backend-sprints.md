# Evolution API Backend Sprints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden and extend the Evolution API backend integration across Sprint 1 through Sprint 4 while keeping all technical configuration server-side.

**Architecture:** Keep Evolution API access behind typed server-side wrappers. Sprint 1 hardens the shared client, webhook security, and idempotency; Sprint 2 adds webhook verification/backfill/recovery; Sprint 3 adds outgoing message lifecycle and read/number checks; Sprint 4 adds media and interactive message wrappers. Each sprint must be verified and committed before moving to the next sprint.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Drizzle ORM, PostgreSQL schema definitions, Evolution API v2.3.7.

---

## File Structure

- `backend/src/evolution/client.ts`: low-level Evolution API HTTP client used by backend and Next server wrappers.
- `backend/src/evolution/client.test.ts`: unit tests for endpoint paths, methods, headers, body shape, timeout, and errors.
- `src/server/crm/evolution.ts`: Next server wrapper for env settings, webhook configuration, instance lifecycle, and higher-level CRM operations.
- `src/server/crm/whatsapp-connection.ts`: shared connection-state helper and connected gating.
- `src/app/api/webhooks/evolution/route.ts`: inbound webhook route for default event URL.
- `src/app/api/webhooks/evolution/[event]/route.ts`: inbound webhook route for event-specific URL.
- `src/app/api/webhooks/evolution/route.test.ts`: webhook route/security/idempotency tests.
- `src/server/db/schema.ts`: Drizzle schema for messages/jobs/webhook events as needed.
- `src/server/crm/outgoing-messages.ts`: new service for outgoing message lifecycle and retries.
- `src/server/crm/backfill.ts`: new service for contacts/messages backfill from Evolution Chat API.
- `docs/evolution-api-guidelines.md`: update only when behavior diverges from current guideline.

---

## Sprint 1: Hardening Core

### Task 1.1: Centralize client error shape and redaction

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`

- [ ] **Step 1: Write failing tests for typed errors and base URL normalization**

Add tests to `backend/src/evolution/client.test.ts`:

```ts
it("normalizes trailing slash from Evolution base URL", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ instance: { state: "open" } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const client = new EvolutionClient({ baseUrl: "https://evolution.example/", apiKey: "secret", instanceName: "main" });

  await client.getConnectionState();

  expect(fetchMock.mock.calls[0][0]).toBe("https://evolution.example/instance/connectionState/main");
});

it("throws typed redacted errors without leaking apikey", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "bad key secret" } }), { status: 401 }));
  vi.stubGlobal("fetch", fetchMock);

  const client = new EvolutionClient({ baseUrl: "https://evolution.example", apiKey: "secret", instanceName: "main" });

  await expect(client.getConnectionState()).rejects.toMatchObject({
    name: "EvolutionApiError",
    status: 401,
    endpoint: "/instance/connectionState/main",
  });
  await expect(client.getConnectionState()).rejects.not.toThrow("secret");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- backend/src/evolution/client.test.ts
```

Expected: tests fail because errors are generic and base URL trailing slash creates double slash.

- [ ] **Step 3: Implement typed error and URL normalization**

Add `EvolutionApiError`, `redactSensitiveText`, `normalizeBaseUrl`, and update `request()` so thrown messages do not leak `apiKey`.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- backend/src/evolution/client.test.ts
```

Expected: pass.

- [ ] **Step 5: Verify sprint checkpoint**

Run:

```bash
npm run lint && npm run build && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/evolution/client.ts backend/src/evolution/client.test.ts
git commit -m "fix: harden evolution api client errors"
git push origin master
```

### Task 1.2: Webhook secret validation

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Modify: `src/server/crm/evolution.ts`
- Modify: `src/app/api/webhooks/evolution/route.ts`
- Modify: `src/app/api/webhooks/evolution/[event]/route.ts`
- Modify: `src/app/api/webhooks/evolution/route.test.ts`

- [ ] **Step 1: Write failing tests for webhook header configuration and rejection**

Test `setWebhook()` sends optional `headers.x-webhook-secret` when provided. Test webhook route returns `401` when `EVOLUTION_WEBHOOK_SECRET` is set and inbound header is missing/wrong.

- [ ] **Step 2: Implement `EVOLUTION_WEBHOOK_SECRET` settings**

Update `getEvolutionSettings()` to include `webhookSecret`. Update `configureEvolutionWebhook()` and `EvolutionClient.setWebhook(webhookUrl, webhookSecret?)`.

- [ ] **Step 3: Implement inbound validation**

Add a shared `assertEvolutionWebhookAuthorized(request: Request)` helper in route module or route-local helper. Use constant-time-ish comparison for equal-length values with `crypto.timingSafeEqual` where available.

- [ ] **Step 4: Run targeted tests**

```bash
npm test -- backend/src/evolution/client.test.ts src/app/api/webhooks/evolution/route.test.ts
```

Expected: pass.

- [ ] **Step 5: Full verify and commit**

```bash
npm run lint && npm run build && npm test
git add backend/src/evolution/client.ts backend/src/evolution/client.test.ts src/server/crm/evolution.ts src/app/api/webhooks/evolution/route.ts src/app/api/webhooks/evolution/[event]/route.ts src/app/api/webhooks/evolution/route.test.ts
git commit -m "feat: validate evolution webhook secret"
git push origin master
```

### Task 1.3: Idempotency review and tests

**Files:**
- Modify: `src/app/api/webhooks/evolution/route.test.ts`
- Modify: `src/app/api/webhooks/evolution/route.ts`

- [ ] **Step 1: Add duplicate webhook test**

Add a test that sends the same payload twice and asserts only one webhook event/message is processed.

- [ ] **Step 2: Fix idempotency key if needed**

Ensure `idempotencyKey()` uses stable message id whenever available and does not fall back to random for real message payloads.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- src/app/api/webhooks/evolution/route.test.ts
npm run lint && npm run build && npm test
git add src/app/api/webhooks/evolution/route.ts src/app/api/webhooks/evolution/route.test.ts
git commit -m "test: cover evolution webhook idempotency"
git push origin master
```

---

## Sprint 2: Recovery and Sync

### Task 2.1: Verify webhook configuration

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Modify: `src/server/crm/evolution.ts`
- Modify: `src/server/crm/evolution.test.ts`

- [ ] Add `getWebhook()` wrapper for `GET /webhook/find/{instanceName}`.
- [ ] Add `verifyEvolutionWebhook()` returning `{ configured, enabled, urlMatches, missingEvents }`.
- [ ] Tests cover `null`, wrong URL, missing events, and configured webhook.
- [ ] Verify, commit, push.

### Task 2.2: Auto reconfigure webhook after lifecycle actions

**Files:**
- Modify: `src/server/crm/evolution.ts`
- Modify: `src/server/crm/evolution.test.ts`

- [ ] Ensure create/connect/restart flows set and verify webhook.
- [ ] Tests assert webhook set after create/connect/restart.
- [ ] Verify, commit, push.

### Task 2.3: Backfill contacts/messages service

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Create: `src/server/crm/backfill.ts`
- Create: `src/server/crm/backfill.test.ts`

- [ ] Add `findContacts`, `findChats`, `findMessages` wrappers.
- [ ] Create backfill service with small `take` defaults and idempotent upsert.
- [ ] Tests cover pagination input, no overwrite of manual notes/status, and duplicate messages.
- [ ] Verify, commit, push.

---

## Sprint 3: Messaging Reliability

### Task 3.1: Outgoing message status lifecycle

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: migration if project migration workflow is active.
- Create: `src/server/crm/outgoing-messages.ts`
- Create: `src/server/crm/outgoing-messages.test.ts`
- Modify send-message API/server action currently used by Inbox.

- [ ] Add service that inserts pending outbound message before sending.
- [ ] Update to `sending`, then `sent` or `failed`.
- [ ] Tests cover success/failure.
- [ ] Verify, commit, push.

### Task 3.2: Retry failed outbound messages

**Files:**
- Modify: `src/server/crm/outgoing-messages.ts`
- Modify: `src/server/crm/outgoing-messages.test.ts`
- Possibly modify: `src/server/db/schema.ts` or reuse `jobs` table.

- [ ] Queue retry job for transient failures.
- [ ] Cap attempts and mark permanent failure.
- [ ] Tests cover retry schedule and dead-letter behavior.
- [ ] Verify, commit, push.

### Task 3.3: Mark message as read

**Files:**
- Modify: existing inbox API route/service.
- Modify tests for inbox/message status.

- [ ] Call `markMessageAsRead()` when opening conversation and message keys are available.
- [ ] Update unread count optimistic locally.
- [ ] Ignore Evolution failure without crashing UI.
- [ ] Verify, commit, push.

### Task 3.4: Check WhatsApp numbers before import/outbound

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Create: `src/server/crm/whatsapp-numbers.ts`
- Create: `src/server/crm/whatsapp-numbers.test.ts`

- [ ] Add `checkWhatsAppNumbers(numbers)` wrapper.
- [ ] Add batching and validation service.
- [ ] Tests cover formatting, batching, and invalid number rejection.
- [ ] Verify, commit, push.

---

## Sprint 4: Advanced Messaging

### Task 4.1: Media message wrapper

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Create: `src/server/crm/media-message.ts`
- Create: `src/server/crm/media-message.test.ts`

- [ ] Add multipart `sendMediaMessage()` wrapper.
- [ ] Validate media type allowlist and file name for documents.
- [ ] Tests cover FormData request and validation failures.
- [ ] Verify, commit, push.

### Task 4.2: Interactive messages wrappers

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Create: `src/server/crm/interactive-messages.ts`
- Create: `src/server/crm/interactive-messages.test.ts`

- [ ] Add wrappers for buttons, list, poll.
- [ ] Require fallback text in service layer.
- [ ] Tests cover body shape for each endpoint.
- [ ] Verify, commit, push.

### Task 4.3: Reaction wrapper

**Files:**
- Modify: `backend/src/evolution/client.ts`
- Modify: `backend/src/evolution/client.test.ts`
- Create/Modify: `src/server/crm/message-reactions.ts`
- Create/Modify: `src/server/crm/message-reactions.test.ts`

- [ ] Add `sendReaction()` wrapper.
- [ ] Validate original message key exists.
- [ ] Tests cover missing key rejection and request body.
- [ ] Verify, commit, push.

---

## Self-Review

- Spec coverage: All recommendation groups from Sprint 1 through Sprint 4 are represented.
- Placeholder scan: This plan contains high-level future sprint tasks but no TODO markers. Sprint 1 has concrete test/implementation/commit steps. Later sprints intentionally remain task-level because implementation should be adjusted after Sprint 1 changes land.
- Type consistency: Uses existing `EvolutionClient`, `getEvolutionSettings`, webhook route names, and current schema/service names.
