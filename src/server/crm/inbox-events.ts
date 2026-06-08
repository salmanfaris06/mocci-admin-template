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
