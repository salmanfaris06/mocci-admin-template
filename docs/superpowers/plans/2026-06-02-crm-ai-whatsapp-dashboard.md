# CRM AI WhatsApp Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP foundation for a CRM admin dashboard for AI Agent WhatsApp operations.

**Architecture:** Keep the existing Next.js 16 admin UI as the dashboard app and add a standalone Node backend processor in the same repository. Use Supabase Postgres through Drizzle as the source of truth, Evolution API as WhatsApp transport, and Vercel AI SDK for AI reply workflows.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn-style components, Node.js, Fastify, Drizzle ORM, PostgreSQL/Supabase, Vercel AI SDK, OpenAI provider, Zod, Vitest.

---

## Scope Split

The approved design spans database, backend processing, external integrations, AI, and dashboard UI. This plan builds the foundation in small, verifiable commits. Deeper production polish for Inbox, Kanban drag/drop, encrypted settings persistence, multimodal AI, and real Evolution smoke testing should be implemented as follow-up plans after this foundation passes.

## File Structure Map

- `package.json` — backend/dev/test/db scripts and dependencies.
- `.env.example` — required environment variable names with safe sample values.
- `drizzle.config.ts` — Drizzle migration config.
- `src/server/db/schema.ts` — Drizzle table definitions.
- `src/server/db/index.ts` — database client.
- `src/server/db/seed.ts` — seed model pricing, default agent, pipeline stages.
- `src/server/domain/types.ts` — shared enums and TypeScript types.
- `src/server/domain/costing.ts` — token/cost calculation.
- `src/server/security/crypto.ts` — key encryption/decryption.
- `backend/src/server.ts` — Fastify app bootstrap.
- `backend/src/config.ts` — backend env validation.
- `backend/src/routes/health.ts` — health endpoint.
- `backend/src/routes/webhooks-evolution.ts` — Evolution webhook receiver.
- `backend/src/evolution/client.ts` — Evolution API client.
- `backend/src/evolution/normalizers.ts` — webhook payload normalizers.
- `backend/src/jobs/queue.ts` — Postgres-backed job helpers.
- `backend/src/jobs/worker.ts` — job polling and dispatch.
- `backend/src/jobs/process-webhook.ts` — contact/conversation/message upsert logic.
- `backend/src/ai/provider.ts` — AI SDK provider setup.
- `backend/src/ai/reply-runner.ts` — AI reply orchestration with typing keep-alive.
- `backend/src/ai/media.ts` — transcription/image adapter stubs for foundation.
- `src/config/nav.ts` — CRM navigation.
- `src/app/crm/**/page.tsx` — CRM dashboard pages.
- `src/server/dashboard/queries.ts` — dashboard server queries.
- `src/server/dashboard/actions.ts` — CRM settings server actions.

---

## Task 1: Install Dependencies and Add Scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.env.example`

- [ ] **Step 1: Install runtime dependencies**

Run:

```bash
npm install drizzle-orm postgres fastify @fastify/cors @fastify/rate-limit @ai-sdk/openai ai server-only
```

Expected: install completes and updates `package.json` plus `package-lock.json`.

- [ ] **Step 2: Install development dependencies**

Run:

```bash
npm install -D drizzle-kit tsx vitest @vitest/coverage-v8
```

Expected: install completes and updates dev dependencies.

- [ ] **Step 3: Update scripts in `package.json`**

Set scripts to include:

```json
{
  "dev": "next dev",
  "dev:backend": "tsx watch backend/src/server.ts",
  "build": "next build",
  "start": "next start",
  "start:backend": "tsx backend/src/server.ts",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "tsx src/server/db/seed.ts"
}
```

- [ ] **Step 4: Create `.env.example`**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mocci_crm"
BACKEND_PORT="4000"
BACKEND_PUBLIC_URL="http://localhost:4000"
DASHBOARD_ORIGIN="http://localhost:3000"
ADMIN_API_TOKEN="replace-with-random-admin-token"
WEBHOOK_SHARED_SECRET="replace-with-random-webhook-secret"
SECRETS_ENCRYPTION_KEY="replace-with-32-byte-base64-key"
```

- [ ] **Step 5: Verify command availability**

Run:

```bash
npm run test -- --help
npm run lint -- --help
```

Expected: commands print help or complete without module resolution errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add CRM backend dependencies and scripts"
```

---

## Task 2: Add Drizzle Schema and Seed Data

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/server/domain/types.ts`
- Create: `src/server/db/schema.ts`
- Create: `src/server/db/index.ts`
- Create: `src/server/db/seed.ts`

- [ ] **Step 1: Create `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
```

- [ ] **Step 2: Create `src/server/domain/types.ts`**

```ts
export const evolutionWebhookEvents = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "MESSAGES_DELETE",
  "SEND_MESSAGE",
  "PRESENCE_UPDATE",
] as const;

export type EvolutionWebhookEvent = (typeof evolutionWebhookEvents)[number];
export const messageDirections = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof messageDirections)[number];
export const senderTypes = ["customer", "ai", "admin", "system"] as const;
export type SenderType = (typeof senderTypes)[number];
export const messageTypes = ["text", "audio", "image", "video", "document", "unknown"] as const;
export type MessageType = (typeof messageTypes)[number];
export const conversationStatuses = ["open", "resolved", "needs_attention"] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];
export const aiRunStatuses = ["queued", "running", "succeeded", "failed", "timeout"] as const;
export type AiRunStatus = (typeof aiRunStatuses)[number];
export const aiCapabilities = ["chat", "vision", "transcription"] as const;
export type AiCapability = (typeof aiCapabilities)[number];
```

- [ ] **Step 3: Create `src/server/db/schema.ts`**

Define Drizzle tables from the approved spec: `apiSettings`, `aiProviderKeys`, `modelPricing`, `contacts`, `conversations`, `messages`, `aiAgents`, `aiRuns`, `aiUsageLogs`, `pipelineStages`, `pipelineItems`, `webhookEvents`, and `jobs`. Use `uuid().defaultRandom()` primary keys, `jsonb` for raw payloads, and unique indexes for `contacts.remoteJid`, `messages.evolutionMessageId`, `webhookEvents.idempotencyKey`, and `modelPricing(provider, modelId, capability)`.

Minimum required enum definitions:

```ts
export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const senderTypeEnum = pgEnum("sender_type", ["customer", "ai", "admin", "system"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "audio", "image", "video", "document", "unknown"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "resolved", "needs_attention"]);
export const aiStatusEnum = pgEnum("ai_status", ["enabled", "disabled", "processing", "error"]);
export const aiRunStatusEnum = pgEnum("ai_run_status", ["queued", "running", "succeeded", "failed", "timeout"]);
export const aiCapabilityEnum = pgEnum("ai_capability", ["chat", "vision", "transcription"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "succeeded", "failed", "cancelled"]);
```

- [ ] **Step 4: Create `src/server/db/index.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
export type Db = typeof db;
```

- [ ] **Step 5: Create `src/server/db/seed.ts`**

Seed five pipeline stages, OpenAI model pricing rows for chat/vision/transcription, and one default active AI agent named `Customer Service Agent` with timeout `45`, typing interval `6`, and fallback message:

```ts
const fallbackTimeoutMessage = "Maaf, saya butuh waktu lebih lama untuk memproses pesan ini. Tim kami akan meninjau percakapan ini.";
```

- [ ] **Step 6: Generate migration**

Run:

```bash
npm run db:generate
```

Expected: a migration is created under `drizzle/`.

- [ ] **Step 7: Verify**

Run:

```bash
npm run lint
npm run test
```

Expected: lint passes and tests pass or report no test files.

- [ ] **Step 8: Commit**

```bash
git add drizzle.config.ts drizzle src/server/db src/server/domain package.json package-lock.json
git commit -m "feat: add CRM database schema"
```

---

## Task 3: Add Costing and Secret Helpers

**Files:**
- Create: `src/server/domain/costing.ts`
- Create: `src/server/domain/costing.test.ts`
- Create: `src/server/security/crypto.ts`
- Create: `src/server/security/crypto.test.ts`

- [ ] **Step 1: Write `src/server/domain/costing.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { calculateTokenCostUsd } from "./costing";

describe("calculateTokenCostUsd", () => {
  it("calculates input and output token cost using per-million prices", () => {
    expect(calculateTokenCostUsd({
      inputTokens: 1000,
      outputTokens: 500,
      inputPricePerMillion: "0.400000",
      outputPricePerMillion: "1.600000",
    })).toBe("0.001200");
  });

  it("returns zero cost for zero tokens", () => {
    expect(calculateTokenCostUsd({
      inputTokens: 0,
      outputTokens: 0,
      inputPricePerMillion: "0.400000",
      outputPricePerMillion: "1.600000",
    })).toBe("0.000000");
  });
});
```

- [ ] **Step 2: Create `src/server/domain/costing.ts`**

```ts
type CalculateTokenCostInput = {
  inputTokens: number;
  outputTokens: number;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
};

export function calculateTokenCostUsd(input: CalculateTokenCostInput) {
  const inputCost = (input.inputTokens / 1_000_000) * Number(input.inputPricePerMillion);
  const outputCost = (input.outputTokens / 1_000_000) * Number(input.outputPricePerMillion);
  return (inputCost + outputCost).toFixed(6);
}
```

- [ ] **Step 3: Write `src/server/security/crypto.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

describe("secret crypto", () => {
  it("encrypts and decrypts a secret", () => {
    const key = Buffer.alloc(32, 1).toString("base64");
    const encrypted = encryptSecret("sk-test-secret", key);
    expect(encrypted).not.toContain("sk-test-secret");
    expect(decryptSecret(encrypted, key)).toBe("sk-test-secret");
  });

  it("masks secrets", () => {
    expect(maskSecret("sk-1234567890")).toBe("sk-...7890");
  });
});
```

- [ ] **Step 4: Create `src/server/security/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function decodeKey(base64Key: string) {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("SECRETS_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptSecret(value: string, base64Key: string) {
  const key = decodeKey(base64Key);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string, base64Key: string) {
  const key = decodeKey(base64Key);
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(":");
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) throw new Error("Invalid encrypted secret payload");
  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string) {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- src/server/domain/costing.test.ts src/server/security/crypto.test.ts
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/domain/costing.ts src/server/domain/costing.test.ts src/server/security/crypto.ts src/server/security/crypto.test.ts
git commit -m "feat: add cost and secret helpers"
```

---

## Task 4: Add Backend Server and Health Route

**Files:**
- Create: `backend/src/config.ts`
- Create: `backend/src/routes/health.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/server.test.ts`

- [ ] **Step 1: Write `backend/src/server.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

describe("backend server", () => {
  it("responds to health checks", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Create `backend/src/config.ts`**

```ts
import { z } from "zod";

const envSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(4000),
  DASHBOARD_ORIGIN: z.string().url().default("http://localhost:3000"),
  ADMIN_API_TOKEN: z.string().min(16).optional(),
  WEBHOOK_SHARED_SECRET: z.string().min(16).optional(),
});

export type BackendConfig = z.infer<typeof envSchema>;
export function getConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  return envSchema.parse(env);
}
```

- [ ] **Step 3: Create `backend/src/routes/health.ts`**

```ts
import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
}
```

- [ ] **Step 4: Create `backend/src/server.ts`**

```ts
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { getConfig } from "./config";
import { registerHealthRoute } from "./routes/health";

export function buildServer() {
  const config = getConfig();
  const app = Fastify({ logger: true });
  app.register(cors, { origin: config.DASHBOARD_ORIGIN });
  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.register(registerHealthRoute);
  return app;
}

async function main() {
  const config = getConfig();
  const app = buildServer();
  await app.listen({ port: config.BACKEND_PORT, host: "0.0.0.0" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run test**

```bash
npm run test -- backend/src/server.test.ts
```

Expected: test passes.

- [ ] **Step 6: Commit**

```bash
git add backend/src
git commit -m "feat: add backend processor server"
```

---

## Task 5: Add Evolution Client and Normalizers

**Files:**
- Create: `backend/src/evolution/client.ts`
- Create: `backend/src/evolution/normalizers.ts`
- Create: `backend/src/evolution/normalizers.test.ts`

- [ ] **Step 1: Write `backend/src/evolution/normalizers.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { createWebhookIdempotencyKey, normalizeEvolutionMessage } from "./normalizers";

describe("Evolution normalizers", () => {
  it("creates a stable idempotency key", () => {
    const payload = { event: "MESSAGES_UPSERT", instance: "main", data: { key: { id: "abc" } } };
    expect(createWebhookIdempotencyKey(payload)).toBe("main:MESSAGES_UPSERT:abc");
  });

  it("normalizes a text message", () => {
    const message = normalizeEvolutionMessage({
      key: { id: "msg-1", remoteJid: "628123@s.whatsapp.net", fromMe: false },
      pushName: "Jane",
      message: { conversation: "Halo" },
      messageTimestamp: 1710000000,
    });
    expect(message).toMatchObject({
      evolutionMessageId: "msg-1",
      remoteJid: "628123@s.whatsapp.net",
      displayName: "Jane",
      direction: "inbound",
      senderType: "customer",
      messageType: "text",
      text: "Halo",
    });
  });
});
```

- [ ] **Step 2: Create `backend/src/evolution/normalizers.ts`**

Implement `createWebhookIdempotencyKey(payload)` and `normalizeEvolutionMessage(data)`. The normalizer must extract `key.id`, `key.remoteJid`, `key.fromMe`, `pushName`, `message.conversation`, `message.imageMessage.caption`, detect `audioMessage` and `imageMessage`, and return direction/sender/message type fields matching `src/server/domain/types.ts`.

- [ ] **Step 3: Create `backend/src/evolution/client.ts`**

```ts
export type EvolutionClientOptions = {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
};

export class EvolutionClient {
  constructor(private readonly options: EvolutionClientOptions) {}

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", apikey: this.options.apiKey, ...init.headers },
    });
    if (!response.ok) throw new Error(`Evolution API request failed ${response.status}: ${await response.text()}`);
    return response.json() as Promise<unknown>;
  }

  markMessageAsRead(readMessages: unknown[]) {
    return this.request(`/chat/markMessageAsRead/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ readMessages }),
    });
  }

  setPresence(presence: "available" | "unavailable" | "composing" | "recording") {
    return this.request(`/instance/setPresence/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ presence }),
    });
  }

  sendTextMessage(number: string, text: string) {
    return this.request(`/message/sendText/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ number, text }),
    });
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- backend/src/evolution/normalizers.test.ts
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/evolution
git commit -m "feat: add Evolution API client and normalizers"
```

---

## Task 6: Add Job Queue and Webhook Receiver

**Files:**
- Create: `backend/src/jobs/queue.ts`
- Create: `backend/src/routes/webhooks-evolution.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Create `backend/src/jobs/queue.ts`**

```ts
import { eq } from "drizzle-orm";
import { db } from "../../src/server/db";
import { jobs } from "../../src/server/db/schema";

export type JobType = "process_webhook" | "ai_reply" | "send_whatsapp";

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
```

- [ ] **Step 2: Create `backend/src/routes/webhooks-evolution.ts`**

Implement `POST /webhooks/evolution`: validate optional `x-webhook-secret`, compute idempotency key, insert into `webhookEvents` with `onConflictDoNothing`, enqueue `process_webhook` only for newly inserted events, and return `{ ok: true }`.

- [ ] **Step 3: Register webhook route in `backend/src/server.ts`**

Import and register:

```ts
import { registerEvolutionWebhookRoute } from "./routes/webhooks-evolution";
app.register(registerEvolutionWebhookRoute);
```

- [ ] **Step 4: Verify**

```bash
npm run test
npm run lint
```

Expected: checks pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs backend/src/routes/webhooks-evolution.ts backend/src/server.ts
git commit -m "feat: receive Evolution webhooks"
```

---

## Task 7: Process Inbound Message Webhooks

**Files:**
- Create: `backend/src/jobs/process-webhook.ts`
- Create: `backend/src/jobs/worker.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Create `backend/src/jobs/process-webhook.ts`**

Implement `processWebhookJob(jobId, payload)` so `MESSAGES_UPSERT` creates/updates contact, creates conversation, inserts message, and enqueues `ai_reply` for inbound messages when contact AI is enabled. Update the webhook event to `processed` and job to `succeeded`.

- [ ] **Step 2: Create `backend/src/jobs/worker.ts`**

Implement `runNextJob(workerId)` to select the oldest queued job, mark it running, dispatch `process_webhook`, and mark failure through `markJobFailed` on exceptions. Implement `runWorkerLoop()` using a 1000ms interval.

- [ ] **Step 3: Start worker loop from backend server**

In `backend/src/server.ts`, import `runWorkerLoop` and call it after `app.listen` in `main()`.

- [ ] **Step 4: Verify**

```bash
npm run test
npm run lint
```

Expected: checks pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs backend/src/server.ts
git commit -m "feat: process inbound WhatsApp webhook events"
```

---

## Task 8: Add AI Reply Runner with Typing Keep-Alive

**Files:**
- Create: `backend/src/ai/provider.ts`
- Create: `backend/src/ai/media.ts`
- Create: `backend/src/ai/reply-runner.ts`
- Modify: `backend/src/jobs/worker.ts`

- [ ] **Step 1: Create `backend/src/ai/provider.ts`**

```ts
import { createOpenAI } from "@ai-sdk/openai";

export function createOpenAiProvider(apiKey: string) {
  return createOpenAI({ apiKey });
}
```

- [ ] **Step 2: Create `backend/src/ai/media.ts`**

```ts
export async function transcribeAudioMessage() {
  return "[Audio transcription adapter pending provider wiring.]";
}

export async function summarizeImageMessage() {
  return "[Image understanding adapter pending provider wiring.]";
}
```

- [ ] **Step 3: Create `backend/src/ai/reply-runner.ts`**

Implement `runAiReply(input)` to load default agent/message/contact/conversation, create an `aiRuns` row, call `markMessageAsRead`, call `setPresence("composing")`, refresh composing on an interval, call `generateText`, create outbound message, insert `aiUsageLogs` using `calculateTokenCostUsd`, call `sendTextMessage`, update statuses, and always clear interval plus set presence `available` in `finally`.

- [ ] **Step 4: Dispatch `ai_reply` jobs**

Modify `backend/src/jobs/worker.ts` to handle `ai_reply`. Use database-backed API settings once available; for this foundation step, allow local smoke testing with environment variables `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`, and `OPENAI_API_KEY`.

- [ ] **Step 5: Verify current AI SDK API before finalizing**

Run:

```bash
find node_modules/ai/docs -type f -maxdepth 2 | head
```

Then search for `generateText` docs/source locally. If the installed AI SDK API differs from the plan, adjust `reply-runner.ts` to match local docs before committing.

- [ ] **Step 6: Run checks**

```bash
npm run lint
npm run build
```

Expected: lint and build pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/ai backend/src/jobs/worker.ts
git commit -m "feat: add AI reply runner with typing presence"
```

---

## Task 9: Add Dashboard Query Layer and CRM Navigation

**Files:**
- Create: `src/server/dashboard/queries.ts`
- Modify: `src/config/nav.ts`

- [ ] **Step 1: Create `src/server/dashboard/queries.ts`**

```ts
import "server-only";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { aiUsageLogs, contacts, conversations, messages } from "@/server/db/schema";

export async function getDashboardOverview() {
  const [conversationCount] = await db.select({ value: count() }).from(conversations);
  const [contactCount] = await db.select({ value: count() }).from(contacts);
  const [needsAttentionCount] = await db.select({ value: count() }).from(conversations).where(eq(conversations.status, "needs_attention"));
  const [usage] = await db.select({
    inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)`,
    outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)`,
    costUsd: sql<string>`coalesce(sum(${aiUsageLogs.computedCostUsd}), 0)::text`,
  }).from(aiUsageLogs);
  const recentMessages = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(8);

  return {
    conversationCount: conversationCount.value,
    contactCount: contactCount.value,
    needsAttentionCount: needsAttentionCount.value,
    usage,
    recentMessages,
  };
}
```

- [ ] **Step 2: Update `src/config/nav.ts`**

Keep the existing nav object shape used by `src/components/app-shell/app-sidebar.tsx`, but make the primary CRM routes available:

```ts
{ title: "Dashboard", href: "/crm/dashboard" }
{ title: "Inbox", href: "/crm/inbox" }
{ title: "Contacts", href: "/crm/contacts" }
{ title: "Leads/Pipeline", href: "/crm/pipeline" }
{ title: "AI Agent", href: "/crm/ai-agent" }
{ title: "Analytics", href: "/crm/analytics" }
{ title: "API Settings", href: "/crm/api-settings" }
```

- [ ] **Step 3: Verify**

```bash
npm run lint
```

Expected: lint passes.

- [ ] **Step 4: Commit**

```bash
git add src/server/dashboard/queries.ts src/config/nav.ts
git commit -m "feat: add CRM dashboard query layer and navigation"
```

---

## Task 10: Add CRM Dashboard Routes

**Files:**
- Create: `src/app/crm/dashboard/page.tsx`
- Create: `src/app/crm/inbox/page.tsx`
- Create: `src/app/crm/contacts/page.tsx`
- Create: `src/app/crm/pipeline/page.tsx`
- Create: `src/app/crm/ai-agent/page.tsx`
- Create: `src/app/crm/analytics/page.tsx`
- Create: `src/app/crm/api-settings/page.tsx`
- Create: `src/app/crm/loading.tsx`

- [ ] **Step 1: Create `src/app/crm/dashboard/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardOverview } from "@/server/dashboard/queries";

export default async function CrmDashboardPage() {
  const overview = await getDashboardOverview();
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM Dashboard</h1>
        <p className="text-muted-foreground">Monitor WhatsApp AI agent operations, usage, and conversations.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle>Conversations</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{overview.conversationCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Contacts</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{overview.contactCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Needs Attention</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{overview.needsAttentionCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Estimated Cost</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">${overview.usage.costUsd}</CardContent></Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create remaining CRM pages**

Create server components for Inbox, Contacts, Pipeline, AI Agent, Analytics, and API Settings using existing `Card` UI. Each page must have a route-specific title and one card explaining the MVP purpose. Use this exact pattern and change strings per route:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground">Live WhatsApp conversations with AI status, read receipts, and message costs.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Conversation workspace</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Conversation list, message thread, and contact panel will render here.</CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/crm/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run lint
npm run build
```

Expected: lint and build pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/crm
git commit -m "feat: add CRM dashboard routes"
```

---

## Task 11: Add Settings Server Actions and Forms

**Files:**
- Create: `src/server/dashboard/actions.ts`
- Modify: `src/app/crm/api-settings/page.tsx`
- Modify: `src/app/crm/ai-agent/page.tsx`

- [ ] **Step 1: Create `src/server/dashboard/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const apiSettingsSchema = z.object({
  evolutionBaseUrl: z.string().url(),
  evolutionInstanceName: z.string().min(1),
  evolutionApiKey: z.string().min(1),
});

const aiAgentSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string().min(20),
  modelId: z.string().min(1),
  temperature: z.coerce.number().min(0).max(2),
  maxOutputTokens: z.coerce.number().int().min(1).max(8000),
  timeoutSeconds: z.coerce.number().int().min(5).max(120),
  typingIntervalSeconds: z.coerce.number().int().min(3).max(15),
  fallbackTimeoutMessage: z.string().min(10),
});

export async function saveApiSettings(_: unknown, formData: FormData) {
  const parsed = apiSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid API settings" };
  revalidatePath("/crm/api-settings");
  return { ok: true };
}

export async function saveAiAgent(_: unknown, formData: FormData) {
  const parsed = aiAgentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid AI agent settings" };
  revalidatePath("/crm/ai-agent");
  return { ok: true };
}
```

- [ ] **Step 2: Add forms to API Settings and AI Agent pages**

Use existing `Card`, `Input`, `Label`, `Textarea`, and `Button` components. Forms must use server actions from `src/server/dashboard/actions.ts`. Secret inputs must use `type="password"` and display masked helper text instead of saved secret values.

- [ ] **Step 3: Verify**

```bash
npm run lint
npm run build
```

Expected: checks pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/dashboard/actions.ts src/app/crm/api-settings/page.tsx src/app/crm/ai-agent/page.tsx
git commit -m "feat: add CRM settings forms"
```

---

## Task 12: Final Verification Pass

**Files:**
- Modify only files required to fix verification failures.

- [ ] **Step 1: Run tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: lint passes.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Next.js build passes.

- [ ] **Step 4: Check migrations**

```bash
npm run db:generate
```

Expected: no unintended schema diff when migrations are current.

- [ ] **Step 5: Check for staged secrets**

```bash
git diff --cached -- . ':!package-lock.json' | grep -Ei 'sk-|apikey|secret|token|password' || true
```

Expected: only safe sample names from `.env.example` or code identifiers appear; no real secret values.

- [ ] **Step 6: Commit verification fixes if needed**

```bash
git status --short
git add <changed-files>
git commit -m "chore: verify CRM MVP foundation"
```

Only commit if Steps 1–5 required fixes.

---

## Follow-Up Plans

1. Full Inbox UI with conversation detail, message thread, and AI disable controls.
2. Kanban drag/drop pipeline using the existing template Kanban components.
3. Full encrypted settings persistence and admin API protection.
4. Real audio transcription and image understanding after verifying current AI SDK docs locally.
5. End-to-end Evolution API smoke tests against a configured instance.

## Self-Review Notes

- Spec coverage: the plan covers architecture, Drizzle schema, backend processor foundation, Evolution webhook handling, read/typing behavior, AI reply skeleton, dashboard routes, settings forms, and verification.
- Scope: the approved design is large, so this plan intentionally implements the foundation and leaves deep UI/multimodal hardening to named follow-up plans.
- Red-flag scan: the plan was checked for incomplete-work markers and ambiguous handoffs.
- Type consistency: names for routes, tables, helpers, and task outputs are consistent across tasks.
