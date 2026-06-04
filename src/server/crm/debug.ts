import "server-only";

import { desc, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { aiRuns, aiUsageLogs, contacts, conversations, messages, webhookEvents } from "@/server/db/schema";

async function safeQuery<T>(query: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await query(), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function countQuery(table: typeof contacts | typeof conversations | typeof messages | typeof webhookEvents | typeof aiRuns | typeof aiUsageLogs) {
  return db.select({ count: sql<number>`count(*)::int` }).from(table);
}

function vercelWebhookUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return undefined;

  const origin = vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://") ? vercelUrl : `https://${vercelUrl}`;
  return `${origin.replace(/\/$/, "")}/api/webhooks/evolution`;
}

function effectiveWebhookUrl() {
  const configuredUrl = process.env.EVOLUTION_WEBHOOK_URL?.trim();
  const fallbackUrl = vercelWebhookUrl();

  if (!configuredUrl) return fallbackUrl;
  if (/https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuredUrl) && process.env.VERCEL_URL) return fallbackUrl;
  return configuredUrl;
}

export async function getCrmDebugData() {
  const webhookUrl = effectiveWebhookUrl();
  const evolutionSettings = {
    evolutionBaseUrl: process.env.EVOLUTION_BASE_URL ?? null,
    evolutionInstanceName: process.env.EVOLUTION_INSTANCE_NAME ?? null,
    webhookUrl: webhookUrl ?? null,
    webhookEnabled: Boolean(webhookUrl),
    connectionState: process.env.EVOLUTION_BASE_URL && process.env.EVOLUTION_INSTANCE_NAME && process.env.EVOLUTION_API_KEY ? "Configured from environment" : "Evolution env not configured",
  };
  const webhookLogs = await safeQuery(() => db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(50));
  const recentMessages = await safeQuery(() =>
    db
      .select({
        id: messages.id,
        evolutionMessageId: messages.evolutionMessageId,
        direction: messages.direction,
        senderType: messages.senderType,
        messageType: messages.messageType,
        text: messages.text,
        caption: messages.caption,
        status: messages.status,
        sentAt: messages.sentAt,
        createdAt: messages.createdAt,
        conversationId: conversations.id,
        contactName: contacts.displayName,
        remoteJid: contacts.remoteJid,
        phone: contacts.phone,
        rawMetadata: messages.rawMetadata,
      })
      .from(messages)
      .innerJoin(conversations, sql`${messages.conversationId} = ${conversations.id}`)
      .innerJoin(contacts, sql`${conversations.contactId} = ${contacts.id}`)
      .orderBy(desc(messages.createdAt))
      .limit(50)
  );

  const counts = await safeQuery(async () => {
    const tables = [
      ["contacts", contacts],
      ["conversations", conversations],
      ["messages", messages],
      ["webhook_events", webhookEvents],
      ["ai_runs", aiRuns],
      ["ai_usage_logs", aiUsageLogs],
    ] as const;

    const result: Record<string, number> = {};
    for (const [name, table] of tables) {
      const [row] = await countQuery(table);
      result[name] = row?.count ?? 0;
    }
    return result;
  });

  return {
    settings: evolutionSettings,
    settingsError: null,
    webhookLogs: webhookLogs.data ?? [],
    webhookLogsError: webhookLogs.error,
    recentMessages: recentMessages.data ?? [],
    recentMessagesError: recentMessages.error,
    counts: counts.data ?? {},
    countsError: counts.error,
  };
}
