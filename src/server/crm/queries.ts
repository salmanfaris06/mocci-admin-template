import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { aiRuns, aiUsageLogs, contacts, conversations, messages, pipelineItems, pipelineStages } from "@/server/db/schema";

export async function getCrmDashboardSummary() {
  const [[contactCount], [conversationCount], [messageCount], [usageTotals]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contacts),
    db.select({ count: sql<number>`count(*)::int` }).from(conversations),
    db.select({ count: sql<number>`count(*)::int` }).from(messages),
    db.select({ costUsd: sql<string>`coalesce(sum(${aiUsageLogs.computedCostUsd}), 0)::text`, inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`, outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int` }).from(aiUsageLogs),
  ]);

  return {
    contacts: contactCount?.count ?? 0,
    conversations: conversationCount?.count ?? 0,
    messages: messageCount?.count ?? 0,
    aiCostUsd: usageTotals?.costUsd ?? "0",
    inputTokens: usageTotals?.inputTokens ?? 0,
    outputTokens: usageTotals?.outputTokens ?? 0,
  };
}

export async function getRecentConversations(limit = 20) {
  return db.select({ id: conversations.id, status: conversations.status, aiStatus: conversations.aiStatus, lastMessageSummary: conversations.lastMessageSummary, lastMessageAt: conversations.lastMessageAt, contactName: contacts.displayName, remoteJid: contacts.remoteJid, phone: contacts.phone }).from(conversations).innerJoin(contacts, eq(conversations.contactId, contacts.id)).orderBy(desc(conversations.lastMessageAt)).limit(limit);
}

export async function getConversationMessages(conversationId: string) {
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function getPipelineBoard() {
  const [stages, items] = await Promise.all([
    db.select().from(pipelineStages).orderBy(pipelineStages.position),
    db.select({ id: pipelineItems.id, title: pipelineItems.title, stageId: pipelineItems.stageId, valueCents: pipelineItems.valueCents, contactName: contacts.displayName, remoteJid: contacts.remoteJid }).from(pipelineItems).innerJoin(contacts, eq(pipelineItems.contactId, contacts.id)).orderBy(pipelineItems.position),
  ]);
  return stages.map((stage) => ({ ...stage, items: items.filter((item) => item.stageId === stage.id) }));
}

export async function getAiRunHistory(limit = 50) {
  return db.select({ id: aiRuns.id, status: aiRuns.status, latencyMs: aiRuns.latencyMs, errorMessage: aiRuns.errorMessage, createdAt: aiRuns.createdAt, contactName: contacts.displayName }).from(aiRuns).innerJoin(contacts, eq(aiRuns.contactId, contacts.id)).orderBy(desc(aiRuns.createdAt)).limit(limit);
}
