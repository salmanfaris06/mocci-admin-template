# Inbox Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full WhatsApp inbox flow — message status updates via `MESSAGES_UPDATE` webhook (Phase 1) and Vercel-compatible realtime via DB-backed SSE (Phase 2).

**Architecture:** Evolution API webhooks write to PostgreSQL (`messages`, `inbox_events`). UI reads snapshots via existing `/api/crm/inbox` and receives push updates via `/api/crm/inbox/stream` SSE. Polling remains as fallback.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Evolution API webhooks

**Spec:** `docs/superpowers/specs/2026-06-08-inbox-flow-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/server/crm/message-status.ts` | **NEW** — ACK extraction, status mapping, monotonic rules |
| `src/server/crm/message-status.test.ts` | **NEW** — unit tests for status logic |
| `src/app/api/webhooks/evolution/evolution-message.ts` | Add `getEvolutionMessageId`, `getEvolutionAckStatus` |
| `src/app/api/webhooks/evolution/evolution-message.test.ts` | Tests for new helpers |
| `src/app/api/webhooks/evolution/route.ts` | Add `MESSAGES_UPDATE` handler + event publish |
| `src/app/api/webhooks/evolution/route.test.ts` | Tests for UPDATE handler |
| `src/server/crm/inbox-snapshot.ts` | Map DB `status` to `ChatMessageData.status` |
| `src/app/crm/inbox/crm-chat-thread.tsx` | Sync `initialMessages` prop via `useEffect` |
| `src/server/db/schema.ts` | Add `inbox_events` table |
| `src/server/crm/inbox-events.ts` | **NEW** — `publishInboxEvent` helper |
| `src/server/crm/inbox-events.test.ts` | **NEW** — publish helper tests |
| `src/app/api/crm/inbox/stream/route.ts` | **NEW** — SSE endpoint |
| `src/app/crm/inbox/use-inbox-stream.ts` | **NEW** — client EventSource hook |
| `src/app/crm/inbox/crm-chat-workspace.tsx` | Integrate SSE + adaptive polling |
| `src/app/crm/inbox/actions.ts` | Store `evolutionMessageId` from send response |

---

## Phase 1 — Message Status Update

### Task 1: Message status module

**Files:**
- Create: `src/server/crm/message-status.ts`
- Create: `src/server/crm/message-status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/crm/message-status.test.ts
import { describe, expect, it } from "vitest";

import { mapAckToMessageStatus, shouldUpdateStatus, toChatMessageStatus } from "./message-status";

describe("mapAckToMessageStatus", () => {
  it("maps SERVER_ACK to sent", () => {
    expect(mapAckToMessageStatus("SERVER_ACK")).toBe("sent");
  });

  it("maps DELIVERY_ACK to delivered", () => {
    expect(mapAckToMessageStatus("DELIVERY_ACK")).toBe("delivered");
  });

  it("maps READ to read", () => {
    expect(mapAckToMessageStatus("READ")).toBe("read");
  });

  it("maps ERROR to failed", () => {
    expect(mapAckToMessageStatus("ERROR")).toBe("failed");
  });

  it("defaults unknown ACK to sent", () => {
    expect(mapAckToMessageStatus("UNKNOWN")).toBe("sent");
  });
});

describe("shouldUpdateStatus", () => {
  it("allows sent → delivered", () => {
    expect(shouldUpdateStatus("sent", "delivered")).toBe(true);
  });

  it("blocks read → sent", () => {
    expect(shouldUpdateStatus("read", "sent")).toBe(false);
  });

  it("blocks delivered → sent", () => {
    expect(shouldUpdateStatus("delivered", "sent")).toBe(false);
  });

  it("allows delivered → read", () => {
    expect(shouldUpdateStatus("delivered", "read")).toBe(true);
  });
});

describe("toChatMessageStatus", () => {
  it("maps received inbound to delivered in UI", () => {
    expect(toChatMessageStatus("received", "inbound")).toBe("delivered");
  });

  it("maps sent outbound to sent in UI", () => {
    expect(toChatMessageStatus("sent", "outbound")).toBe("sent");
  });

  it("maps read outbound to read in UI", () => {
    expect(toChatMessageStatus("read", "outbound")).toBe("read");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd D:/_Project/CRM-Dashboard/mocci-admin-template && npm test -- src/server/crm/message-status.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/crm/message-status.ts
export type DbMessageStatus = "received" | "sent" | "delivered" | "read" | "failed";
export type ChatMessageStatus = "sent" | "delivered" | "read" | "failed";

const STATUS_RANK: Record<DbMessageStatus, number> = {
  received: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
};

export function mapAckToMessageStatus(ack: string): DbMessageStatus {
  const normalized = ack.trim().toUpperCase();
  if (normalized === "DELIVERY_ACK") return "delivered";
  if (normalized === "READ" || normalized === "PLAYED") return "read";
  if (normalized === "ERROR") return "failed";
  if (normalized === "PENDING" || normalized === "SERVER_ACK") return "sent";
  return "sent";
}

export function shouldUpdateStatus(current: string, next: DbMessageStatus): boolean {
  const currentRank = STATUS_RANK[current as DbMessageStatus] ?? 0;
  const nextRank = STATUS_RANK[next] ?? 0;
  if (next === "failed") return current !== "read";
  return nextRank >= currentRank;
}

export function toChatMessageStatus(dbStatus: string, direction: "inbound" | "outbound"): ChatMessageStatus {
  if (direction === "inbound") return "delivered";
  if (dbStatus === "delivered") return "delivered";
  if (dbStatus === "read") return "read";
  if (dbStatus === "failed") return "failed";
  return "sent";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/server/crm/message-status.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/crm/message-status.ts src/server/crm/message-status.test.ts
git commit -m "feat: add message status mapping for Evolution ACK"
```

---

### Task 2: Evolution message helpers for UPDATE payload

**Files:**
- Modify: `src/app/api/webhooks/evolution/evolution-message.ts`
- Modify: `src/app/api/webhooks/evolution/evolution-message.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add to evolution-message.test.ts
import { getEvolutionAckStatus, getEvolutionMessageId } from "./evolution-message";

describe("getEvolutionMessageId", () => {
  it("reads key.id from data envelope", () => {
    expect(getEvolutionMessageId({ data: { key: { id: "msg-abc" } } })).toBe("msg-abc");
  });
});

describe("getEvolutionAckStatus", () => {
  it("reads status from update payload", () => {
    expect(getEvolutionAckStatus({ data: { status: "DELIVERY_ACK" } })).toBe("DELIVERY_ACK");
  });

  it("reads update.status fallback", () => {
    expect(getEvolutionAckStatus({ data: { update: { status: "READ" } } })).toBe("READ");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/webhooks/evolution/evolution-message.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Write minimal implementation**

```ts
// Add to evolution-message.ts (reuse readPath pattern)
function readString(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const result = readPath(value, path);
    if (typeof result === "string" && result.trim()) return result.trim();
  }
  return undefined;
}

export function getEvolutionMessageId(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "key", "id"],
    ["raw", "data", "id"],
    ["data", "key", "id"],
    ["data", "id"],
    ["key", "id"],
    ["id"],
  ]);
}

export function getEvolutionAckStatus(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "status"],
    ["raw", "data", "update", "status"],
    ["raw", "status"],
    ["data", "status"],
    ["data", "update", "status"],
    ["status"],
    ["update", "status"],
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/webhooks/evolution/evolution-message.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/evolution/evolution-message.ts src/app/api/webhooks/evolution/evolution-message.test.ts
git commit -m "feat: extract message id and ACK status from Evolution payloads"
```

---

### Task 3: MESSAGES_UPDATE webhook handler

**Files:**
- Modify: `src/app/api/webhooks/evolution/route.ts`
- Modify: `src/app/api/webhooks/evolution/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add to route.test.ts — extend db mock to track message updates
const updatedMessages: Record<string, unknown>[] = [];

// In db.update mock, add branch for messages table:
// if table has evolutionMessageId → push to updatedMessages

it("updates message status on MESSAGES_UPDATE", async () => {
  const { handleEvolutionWebhook } = await import("./route");
  const request = new Request("https://example.com/api/webhooks/evolution", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "MESSAGES_UPDATE",
      data: { key: { id: "msg-out-1" }, status: "DELIVERY_ACK" },
    }),
  });

  const response = await handleEvolutionWebhook(request);
  const body = await response.json();

  expect(body.ok).toBe(true);
  expect(body.processedUpdates).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/webhooks/evolution/route.test.ts`
Expected: FAIL — `processedUpdates` undefined

- [ ] **Step 3: Write minimal implementation**

Add to `route.ts`:

```ts
import { getEvolutionAckStatus, getEvolutionMessageId } from "./evolution-message";
import { mapAckToMessageStatus, shouldUpdateStatus } from "@/server/crm/message-status";

async function processMessageUpdate(payload: unknown) {
  const evolutionMessageId = getEvolutionMessageId(payload);
  const ack = getEvolutionAckStatus(payload);
  if (!evolutionMessageId || !ack) return false;

  const nextStatus = mapAckToMessageStatus(ack);
  const [existing] = await db
    .select({ id: messages.id, status: messages.status, conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.evolutionMessageId, evolutionMessageId))
    .limit(1);

  if (!existing || !shouldUpdateStatus(existing.status, nextStatus)) return false;

  await db
    .update(messages)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(messages.id, existing.id));

  return true;
}

async function processMessageUpdateEvent(payload: unknown, pathEvent?: string) {
  const eventType = getEventType(payload, pathEvent).toLowerCase();
  if (!eventType.includes("messages.update") && !eventType.includes("messages_update")) return 0;

  let processed = 0;
  for (const item of messagePayloads(payload)) {
    if (await processMessageUpdate(item)) processed += 1;
  }
  return processed;
}
```

Update `handleEvolutionWebhook`:

```ts
const processedMessages = payload.meta.parseError ? 0 : await processMessageEvent(payload, pathEvent);
const processedUpdates = payload.meta.parseError ? 0 : await processMessageUpdateEvent(payload, pathEvent);

return Response.json({
  ok: true,
  eventType,
  pathEvent: pathEvent ?? null,
  processedMessages,
  processedUpdates,
  parseError: payload.meta.parseError ?? null,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/webhooks/evolution/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/evolution/route.ts src/app/api/webhooks/evolution/route.test.ts
git commit -m "feat: handle MESSAGES_UPDATE webhook for delivery status"
```

---

### Task 4: Inbox snapshot reads DB status

**Files:**
- Modify: `src/server/crm/inbox-snapshot.ts`

- [ ] **Step 1: Update `toChatMessage` to use DB status**

```ts
import { toChatMessageStatus } from "./message-status";

function toChatMessage(message: ConversationMessage, conversation: ConversationPreview, participantNames: Map<string, string>): ChatMessageData {
  const isOutgoing = message.direction === "outbound";
  // ... existing sender logic unchanged ...

  const dbStatus = "status" in message && typeof message.status === "string" ? message.status : isOutgoing ? "sent" : "received";

  return {
    id: message.id,
    senderId: isOutgoing ? "crm-agent" : getInboundSenderId({ remoteJid: conversation.remoteJid, rawMetadata }),
    senderName: isOutgoing ? "CRM Agent" : senderName,
    text: readText(message),
    timestamp: readTimestamp(message),
    status: toChatMessageStatus(dbStatus, message.direction),
  };
}
```

- [ ] **Step 2: Verify queries return status field**

Check `src/server/crm/queries.ts` — `getConversationMessages` must select `messages.status`. If missing, add it to the select.

- [ ] **Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/crm/inbox-snapshot.ts src/server/crm/queries.ts
git commit -m "feat: show message delivery status from database in inbox"
```

---

### Task 5: UI sync messages on refresh

**Files:**
- Modify: `src/app/crm/inbox/crm-chat-thread.tsx`

- [ ] **Step 1: Add useEffect to sync initialMessages**

```tsx
React.useEffect(() => {
  setMessages(initialMessages);
}, [initialMessages]);
```

- [ ] **Step 2: Remove unstable key from workspace**

In `crm-chat-workspace.tsx`, change thread key from:
```tsx
key={`${activeConversation.id}:${messages.at(-1)?.id ?? "empty"}`}
```
to:
```tsx
key={activeConversation.id}
```

This prevents full remount on every refresh; `useEffect` handles message updates.

- [ ] **Step 3: Manual verify**

Run: `npm run dev`
1. Open `/crm/inbox`
2. Send a message
3. Wait for polling refresh (10s) — status tick should update without losing scroll

- [ ] **Step 4: Commit**

```bash
git add src/app/crm/inbox/crm-chat-thread.tsx src/app/crm/inbox/crm-chat-workspace.tsx
git commit -m "fix: sync inbox thread messages without remounting on refresh"
```

---

### Task 6: Store evolutionMessageId on manual send

**Files:**
- Modify: `src/app/crm/inbox/actions.ts`

- [ ] **Step 1: Extract message ID from Evolution send response**

```ts
function readEvolutionMessageId(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;
  const obj = response as Record<string, unknown>;
  const key = obj.key;
  if (key && typeof key === "object" && typeof (key as Record<string, unknown>).id === "string") {
    return (key as Record<string, unknown>).id as string;
  }
  if (typeof obj.messageId === "string") return obj.messageId;
  return undefined;
}

// In sendManualWhatsAppMessage:
const evolutionMessageId = readEvolutionMessageId(response);

await db.insert(messages).values({
  conversationId: values.conversationId,
  evolutionMessageId,
  direction: "outbound",
  // ... rest unchanged
});
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/crm/inbox/actions.ts
git commit -m "feat: store evolution message id on manual send for status tracking"
```

---

## Phase 2 — Realtime SSE

### Task 7: inbox_events database migration

**Files:**
- Modify: `src/server/db/schema.ts`
- Generate: `drizzle/` migration files

- [ ] **Step 1: Add table to schema**

```ts
export const inboxEvents = pgTable("inbox_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("inbox_events_created_at_idx").on(table.createdAt),
  index("inbox_events_conversation_created_at_idx").on(table.conversationId, table.createdAt),
]);
```

- [ ] **Step 2: Generate and run migration**

Run:
```bash
npm run db:generate
npm run db:migrate
```
Expected: migration SQL created and applied

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema.ts drizzle/
git commit -m "feat: add inbox_events table for realtime SSE"
```

---

### Task 8: Publish inbox events from webhook

**Files:**
- Create: `src/server/crm/inbox-events.ts`
- Create: `src/server/crm/inbox-events.test.ts`
- Modify: `src/app/api/webhooks/evolution/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/crm/inbox-events.test.ts
import { describe, expect, it, vi } from "vitest";

const inserted: Record<string, unknown>[] = [];

vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: (value: Record<string, unknown>) => {
        inserted.push(value);
        return { returning: async () => [{ id: "evt-1", ...value }] };
      },
    })),
  },
}));

describe("publishInboxEvent", () => {
  it("inserts event row", async () => {
    const { publishInboxEvent } = await import("./inbox-events");
    await publishInboxEvent("message.new", "conv-1", { messageId: "msg-1" });
    expect(inserted[0]).toMatchObject({
      eventType: "message.new",
      conversationId: "conv-1",
      payload: { messageId: "msg-1" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server/crm/inbox-events.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement publishInboxEvent**

```ts
// src/server/crm/inbox-events.ts
import { db } from "@/server/db";
import { inboxEvents } from "@/server/db/schema";

export type InboxEventType = "message.new" | "message.status" | "conversation.updated";

export async function publishInboxEvent(
  eventType: InboxEventType,
  conversationId: string,
  payload: Record<string, unknown>,
) {
  await db.insert(inboxEvents).values({ eventType, conversationId, payload });
}
```

- [ ] **Step 4: Call from webhook after UPSERT and UPDATE**

In `processSingleMessage`, after successful insert:
```ts
if (inboundMessage) {
  await publishInboxEvent("message.new", conversation.id, {
    messageId: inboundMessage.id,
    direction: fromMe ? "outbound" : "inbound",
    text,
    timestamp: now.toISOString(),
  });
  await publishInboxEvent("conversation.updated", conversation.id, {
    lastMessageSummary: text,
    lastMessageAt: now.toISOString(),
    unreadCount: fromMe ? conversation.unreadCount : conversation.unreadCount + 1,
  });
}
```

In `processMessageUpdate`, after successful update:
```ts
await publishInboxEvent("message.status", existing.conversationId, {
  messageId: existing.id,
  evolutionMessageId,
  status: nextStatus,
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/server/crm/inbox-events.test.ts src/app/api/webhooks/evolution/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/crm/inbox-events.ts src/server/crm/inbox-events.test.ts src/app/api/webhooks/evolution/route.ts
git commit -m "feat: publish inbox events from Evolution webhooks"
```

---

### Task 9: SSE stream endpoint

**Files:**
- Create: `src/app/api/crm/inbox/stream/route.ts`

- [ ] **Step 1: Create SSE route**

```ts
// src/app/api/crm/inbox/stream/route.ts
import { gt } from "drizzle-orm";

import { db } from "@/server/db";
import { inboxEvents } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STREAM_DURATION_MS = 55_000;
const POLL_INTERVAL_MS = 1_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? "";

  const encoder = new TextEncoder();
  let lastId = since;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();
      let lastHeartbeat = Date.now();

      const push = (chunk: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(chunk));
      };

      while (!closed && Date.now() - startedAt < STREAM_DURATION_MS) {
        const rows = await db
          .select()
          .from(inboxEvents)
          .where(lastId ? gt(inboxEvents.id, lastId) : undefined)
          .orderBy(inboxEvents.createdAt)
          .limit(50);

        for (const row of rows) {
          lastId = row.id;
          push(`id: ${row.id}\nevent: ${row.eventType}\ndata: ${JSON.stringify(row.payload)}\n\n`);
        }

        if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
          push(": ping\n\n");
          lastHeartbeat = Date.now();
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      controller.close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/crm/inbox/stream/route.ts
git commit -m "feat: add DB-backed SSE stream for inbox realtime updates"
```

---

### Task 10: Client SSE hook

**Files:**
- Create: `src/app/crm/inbox/use-inbox-stream.ts`

- [ ] **Step 1: Implement hook**

```ts
"use client";

import * as React from "react";

export type MessageNewEvent = {
  messageId: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
};

export type MessageStatusEvent = {
  messageId: string;
  evolutionMessageId?: string;
  status: string;
};

export type ConversationUpdatedEvent = {
  lastMessageSummary: string;
  lastMessageAt: string;
  unreadCount: number;
};

type UseInboxStreamOptions = {
  enabled?: boolean;
  onMessageNew?: (event: MessageNewEvent) => void;
  onMessageStatus?: (event: MessageStatusEvent) => void;
  onConversationUpdated?: (event: ConversationUpdatedEvent) => void;
};

export function useInboxStream({
  enabled = true,
  onMessageNew,
  onMessageStatus,
  onConversationUpdated,
}: UseInboxStreamOptions) {
  const [connected, setConnected] = React.useState(false);
  const lastEventIdRef = React.useRef("");

  React.useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams();
    if (lastEventIdRef.current) params.set("since", lastEventIdRef.current);

    const source = new EventSource(`/api/crm/inbox/stream?${params.toString()}`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.addEventListener("message.new", (event) => {
      lastEventIdRef.current = (event as MessageEvent).lastEventId || lastEventIdRef.current;
      onMessageNew?.(JSON.parse(event.data) as MessageNewEvent);
    });

    source.addEventListener("message.status", (event) => {
      lastEventIdRef.current = (event as MessageEvent).lastEventId || lastEventIdRef.current;
      onMessageStatus?.(JSON.parse(event.data) as MessageStatusEvent);
    });

    source.addEventListener("conversation.updated", (event) => {
      lastEventIdRef.current = (event as MessageEvent).lastEventId || lastEventIdRef.current;
      onConversationUpdated?.(JSON.parse(event.data) as ConversationUpdatedEvent);
    });

    return () => {
      source.close();
      setConnected(false);
    };
  }, [enabled, onMessageNew, onMessageStatus, onConversationUpdated]);

  return { connected };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/crm/inbox/use-inbox-stream.ts
git commit -m "feat: add useInboxStream hook for SSE inbox updates"
```

---

### Task 11: Integrate SSE into workspace

**Files:**
- Modify: `src/app/crm/inbox/crm-chat-workspace.tsx`

- [ ] **Step 1: Wire SSE callbacks**

```tsx
import { useInboxStream } from "./use-inbox-stream";

// Inside CrmChatWorkspace:
const { connected } = useInboxStream({
  onMessageStatus: React.useCallback((event) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === event.messageId ? { ...message, status: event.status as ChatMessageData["status"] } : message,
      ),
    );
  }, []),
  onConversationUpdated: React.useCallback((event) => {
    // update conversation preview in sidebar
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversationId
          ? {
              ...conversation,
              lastMessageSummary: event.lastMessageSummary,
              lastMessageAt: new Date(event.lastMessageAt),
              unreadCount: event.unreadCount,
            }
          : conversation,
      ),
    );
  }, [selectedConversationId]),
  onMessageNew: React.useCallback((event) => {
    // For active conversation, trigger lightweight refresh
    refreshInbox(selectedConversationId);
  }, [refreshInbox, selectedConversationId]),
});

// Adaptive polling:
React.useEffect(() => {
  const intervalMs = connected ? 30_000 : 10_000;
  const timer = window.setInterval(() => {
    refreshInbox(selectedConversationId);
  }, intervalMs);
  return () => window.clearInterval(timer);
}, [connected, refreshInbox, selectedConversationId]);
```

Remove the old fixed 10s polling `useEffect`.

- [ ] **Step 2: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 3: Manual E2E verify**

1. `npm run dev`
2. Open `/crm/inbox` in browser
3. Send WhatsApp message from phone → appears without manual refresh
4. Send reply from inbox → status tick updates
5. Wait 60s → SSE reconnects (check Network tab)

- [ ] **Step 4: Commit**

```bash
git add src/app/crm/inbox/crm-chat-workspace.tsx
git commit -m "feat: integrate SSE realtime updates into inbox workspace"
```

---

## Final Verification

- [ ] `npm test` — all tests pass
- [ ] `npm run lint` — no errors
- [ ] `npm run build` — production build succeeds
- [ ] Phase 1 manual: outbound status sent → delivered → read
- [ ] Phase 2 manual: incoming message appears via SSE without refresh
- [ ] Fallback: disconnect network → polling resumes at 10s
