import { eq, gt } from "drizzle-orm";

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
        let cursorCreatedAt: Date | null = null;
        if (lastId) {
          const [cursor] = await db.select().from(inboxEvents).where(eq(inboxEvents.id, lastId)).limit(1);
          cursorCreatedAt = cursor?.createdAt ?? null;
        }

        const rows = cursorCreatedAt
          ? await db
              .select()
              .from(inboxEvents)
              .where(gt(inboxEvents.createdAt, cursorCreatedAt))
              .orderBy(inboxEvents.createdAt)
              .limit(50)
          : [];

        for (const row of rows) {
          lastId = row.id;
          push(`id: ${row.id}\nevent: ${row.eventType}\ndata: ${JSON.stringify({ conversationId: row.conversationId, ...row.payload })}\n\n`);
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
