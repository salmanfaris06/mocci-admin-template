import { eq } from "drizzle-orm";
import { db } from "../../../src/server/db";
import { contacts, conversations, jobs, messages, webhookEvents } from "../../../src/server/db/schema";
import { normalizeEvolutionMessage } from "../evolution/normalizers";
import { enqueueJob } from "./queue";

export async function processWebhookJob(jobId: string, payload: Record<string, unknown>) {
  const webhookEventId = String(payload.webhookEventId);
  const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, webhookEventId));
  if (!event) throw new Error(`Webhook event not found: ${webhookEventId}`);

  if (event.eventType === "MESSAGES_UPSERT") {
    const raw = event.rawPayload as { data?: Record<string, unknown> };
    const normalized = normalizeEvolutionMessage(raw.data ?? {});
    const summary = normalized.text ?? normalized.caption ?? `[${normalized.messageType}]`;

    const [contact] = await db.insert(contacts).values({
      remoteJid: normalized.remoteJid,
      displayName: normalized.displayName,
      phone: normalized.remoteJid.split("@")[0],
    }).onConflictDoUpdate({
      target: contacts.remoteJid,
      set: { displayName: normalized.displayName, updatedAt: new Date() },
    }).returning();

    const [conversation] = await db.insert(conversations).values({
      contactId: contact.id,
      lastMessageSummary: summary,
      lastMessageAt: normalized.timestamp ?? new Date(),
      unreadCount: normalized.direction === "inbound" ? 1 : 0,
    }).returning();

    const [message] = await db.insert(messages).values({
      conversationId: conversation.id,
      evolutionMessageId: normalized.evolutionMessageId,
      direction: normalized.direction,
      senderType: normalized.senderType,
      messageType: normalized.messageType,
      text: normalized.text,
      caption: normalized.caption,
      rawMetadata: normalized.raw,
      status: "received",
      sentAt: normalized.timestamp,
    }).onConflictDoNothing().returning();

    if (message && normalized.direction === "inbound" && contact.aiEnabled) {
      await enqueueJob("ai_reply", { messageId: message.id, conversationId: conversation.id, contactId: contact.id });
    }
  }

  await db.update(webhookEvents).set({ status: "processed", updatedAt: new Date() }).where(eq(webhookEvents.id, webhookEventId));
  await db.update(jobs).set({ status: "succeeded", updatedAt: new Date() }).where(eq(jobs.id, jobId));
}
