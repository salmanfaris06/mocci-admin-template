import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { aiAgents, aiRuns, aiUsageLogs, contacts, conversations, messages, pipelineItems, pipelineStages } from "@/server/db/schema";

const demoSummary = {
  contacts: 248,
  conversations: 42,
  messages: 1836,
  aiCostUsd: "18.42",
  inputTokens: 842_500,
  outputTokens: 218_900,
};

const demoConversations = [
  {
    id: "demo-conversation-1",
    status: "open" as const,
    aiStatus: "enabled" as const,
    lastMessageSummary: "Saya tertarik paket WhatsApp automation untuk klinik.",
    lastMessageAt: new Date("2026-06-02T09:24:00.000Z"),
    contactName: "Dr. Nadira Putri",
    remoteJid: "628121110001@s.whatsapp.net",
    phone: "628121110001",
  },
  {
    id: "demo-conversation-2",
    status: "needs_attention" as const,
    aiStatus: "error" as const,
    lastMessageSummary: "Bisa dibantu follow up proposal kemarin?",
    lastMessageAt: new Date("2026-06-02T08:10:00.000Z"),
    contactName: "Raka Pratama",
    remoteJid: "628131110002@s.whatsapp.net",
    phone: "628131110002",
  },
  {
    id: "demo-conversation-3",
    status: "open" as const,
    aiStatus: "processing" as const,
    lastMessageSummary: "Berapa harga setup CRM + AI agent?",
    lastMessageAt: new Date("2026-06-01T16:45:00.000Z"),
    contactName: "Maya Santoso",
    remoteJid: "628141110003@s.whatsapp.net",
    phone: "628141110003",
  },
];

const demoContacts = [
  { id: "demo-contact-1", displayName: "Dr. Nadira Putri", phone: "628121110001", remoteJid: "628121110001@s.whatsapp.net", status: "qualified", aiEnabled: true },
  { id: "demo-contact-2", displayName: "Raka Pratama", phone: "628131110002", remoteJid: "628131110002@s.whatsapp.net", status: "proposal", aiEnabled: false },
  { id: "demo-contact-3", displayName: "Maya Santoso", phone: "628141110003", remoteJid: "628141110003@s.whatsapp.net", status: "new", aiEnabled: true },
];

const demoPipelineBoard = [
  {
    id: "demo-stage-new",
    name: "New Lead",
    position: 1,
    color: "blue",
    items: [
      { id: "demo-item-1", title: "Klinik Sehat Sentosa", stageId: "demo-stage-new", valueCents: 8_500_000, contactName: "Dr. Nadira Putri", remoteJid: "628121110001@s.whatsapp.net" },
    ],
  },
  {
    id: "demo-stage-qualified",
    name: "Qualified",
    position: 2,
    color: "violet",
    items: [
      { id: "demo-item-2", title: "Retail WhatsApp AI Agent", stageId: "demo-stage-qualified", valueCents: 12_000_000, contactName: "Maya Santoso", remoteJid: "628141110003@s.whatsapp.net" },
    ],
  },
  {
    id: "demo-stage-proposal",
    name: "Proposal",
    position: 3,
    color: "amber",
    items: [
      { id: "demo-item-3", title: "CRM follow-up automation", stageId: "demo-stage-proposal", valueCents: 15_000_000, contactName: "Raka Pratama", remoteJid: "628131110002@s.whatsapp.net" },
    ],
  },
  { id: "demo-stage-customer", name: "Customer", position: 4, color: "emerald", items: [] },
  { id: "demo-stage-lost", name: "Lost", position: 5, color: "red", items: [] },
];

const demoAiRuns = [
  { id: "demo-run-1", status: "succeeded" as const, latencyMs: 1840, errorMessage: null, createdAt: new Date("2026-06-02T09:25:00.000Z"), contactName: "Dr. Nadira Putri" },
  { id: "demo-run-2", status: "timeout" as const, latencyMs: 45_000, errorMessage: "Fallback timeout message sent", createdAt: new Date("2026-06-02T08:11:00.000Z"), contactName: "Raka Pratama" },
  { id: "demo-run-3", status: "running" as const, latencyMs: null, errorMessage: null, createdAt: new Date("2026-06-02T07:55:00.000Z"), contactName: "Maya Santoso" },
];

const demoAgents = [
  {
    id: "demo-agent-1",
    name: "Customer Service Agent",
    provider: "openai",
    modelId: "gpt-4.1-mini",
    systemPrompt: "Jawab pertanyaan pelanggan WhatsApp secara ramah, singkat, dan bantu arahkan ke tahap pipeline berikutnya.",
    isActive: true,
    isDefault: true,
  },
];

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function getCrmDashboardSummary() {
  if (!isDatabaseConfigured()) return demoSummary;

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
  if (!isDatabaseConfigured()) return demoConversations.slice(0, limit);

  return db.select({ id: conversations.id, status: conversations.status, aiStatus: conversations.aiStatus, lastMessageSummary: conversations.lastMessageSummary, lastMessageAt: conversations.lastMessageAt, contactName: contacts.displayName, remoteJid: contacts.remoteJid, phone: contacts.phone }).from(conversations).innerJoin(contacts, eq(conversations.contactId, contacts.id)).orderBy(desc(conversations.lastMessageAt)).limit(limit);
}

export async function getConversationMessages(conversationId: string) {
  if (!isDatabaseConfigured()) return [];

  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function getPipelineBoard() {
  if (!isDatabaseConfigured()) return demoPipelineBoard;

  const [stages, items] = await Promise.all([
    db.select().from(pipelineStages).orderBy(pipelineStages.position),
    db.select({ id: pipelineItems.id, title: pipelineItems.title, stageId: pipelineItems.stageId, valueCents: pipelineItems.valueCents, contactName: contacts.displayName, remoteJid: contacts.remoteJid }).from(pipelineItems).innerJoin(contacts, eq(pipelineItems.contactId, contacts.id)).orderBy(pipelineItems.position),
  ]);
  return stages.map((stage) => ({ ...stage, items: items.filter((item) => item.stageId === stage.id) }));
}

export async function getAiRunHistory(limit = 50) {
  if (!isDatabaseConfigured()) return demoAiRuns.slice(0, limit);

  return db.select({ id: aiRuns.id, status: aiRuns.status, latencyMs: aiRuns.latencyMs, errorMessage: aiRuns.errorMessage, createdAt: aiRuns.createdAt, contactName: contacts.displayName }).from(aiRuns).innerJoin(contacts, eq(aiRuns.contactId, contacts.id)).orderBy(desc(aiRuns.createdAt)).limit(limit);
}

export async function getCrmContacts(limit = 100) {
  if (!isDatabaseConfigured()) return demoContacts.slice(0, limit);

  return db.select().from(contacts).limit(limit);
}

export async function getAiAgents(limit = 20) {
  if (!isDatabaseConfigured()) return demoAgents.slice(0, limit);

  return db.select().from(aiAgents).limit(limit);
}
