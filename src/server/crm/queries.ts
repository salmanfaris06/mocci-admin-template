import "server-only";

import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  aiAgents,
  aiRuns,
  aiUsageLogs,
  contacts,
  conversations,
  messages,
  pipelineItems,
  pipelineStages,
} from "@/server/db/schema";

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
  {
    id: "demo-contact-1",
    displayName: "Dr. Nadira Putri",
    phone: "628121110001",
    remoteJid: "628121110001@s.whatsapp.net",
    source: "whatsapp",
    status: "qualified",
    aiEnabled: true,
    tags: ["hot lead", "clinic"],
    notes: "Interested in WhatsApp automation for two clinic branches.",
    createdAt: new Date("2026-06-01T08:00:00.000Z"),
    updatedAt: new Date("2026-06-02T09:24:00.000Z"),
    conversationId: "demo-conversation-1",
    conversationStatus: "open" as const,
    lastMessageSummary: "Saya tertarik paket WhatsApp automation untuk klinik.",
    lastMessageAt: new Date("2026-06-02T09:24:00.000Z"),
    unreadCount: 2,
    pipelineStageId: "demo-stage-new",
    pipelineStageName: "New Lead",
  },
  {
    id: "demo-contact-2",
    displayName: "Raka Pratama",
    phone: "628131110002",
    remoteJid: "628131110002@s.whatsapp.net",
    source: "whatsapp",
    status: "proposal",
    aiEnabled: false,
    tags: ["proposal", "needs human"],
    notes: "Waiting for implementation timeline confirmation.",
    createdAt: new Date("2026-06-01T08:30:00.000Z"),
    updatedAt: new Date("2026-06-02T08:10:00.000Z"),
    conversationId: "demo-conversation-2",
    conversationStatus: "needs_attention" as const,
    lastMessageSummary: "Bisa dibantu follow up proposal kemarin?",
    lastMessageAt: new Date("2026-06-02T08:10:00.000Z"),
    unreadCount: 1,
    pipelineStageId: "demo-stage-proposal",
    pipelineStageName: "Proposal",
  },
  {
    id: "demo-contact-3",
    displayName: "Maya Santoso",
    phone: "628141110003",
    remoteJid: "628141110003@s.whatsapp.net",
    source: "whatsapp",
    status: "new",
    aiEnabled: true,
    tags: ["pricing"],
    notes: "Asked for CRM + AI agent setup price.",
    createdAt: new Date("2026-06-01T09:00:00.000Z"),
    updatedAt: new Date("2026-06-01T16:45:00.000Z"),
    conversationId: "demo-conversation-3",
    conversationStatus: "open" as const,
    lastMessageSummary: "Berapa harga setup CRM + AI agent?",
    lastMessageAt: new Date("2026-06-01T16:45:00.000Z"),
    unreadCount: 0,
    pipelineStageId: "demo-stage-qualified",
    pipelineStageName: "Qualified",
  },
];

const demoPipelineBoard = [
  {
    id: "demo-stage-new",
    name: "New Lead",
    position: 1,
    color: "blue",
    items: [
      {
        id: "demo-item-1",
        title: "Klinik Sehat Sentosa",
        stageId: "demo-stage-new",
        valueCents: 8_500_000,
        contactId: "demo-contact-1",
        contactName: "Dr. Nadira Putri",
        phone: "628121110001",
        remoteJid: "628121110001@s.whatsapp.net",
        conversationId: "demo-conversation-1",
        lastMessageSummary:
          "Saya tertarik paket WhatsApp automation untuk klinik.",
        lastActivityAt: new Date("2026-06-02T09:24:00.000Z"),
        tags: ["hot lead", "clinic"],
        priority: "high",
      },
    ],
  },
  {
    id: "demo-stage-qualified",
    name: "Qualified",
    position: 2,
    color: "violet",
    items: [
      {
        id: "demo-item-2",
        title: "Retail WhatsApp AI Agent",
        stageId: "demo-stage-qualified",
        valueCents: 12_000_000,
        contactId: "demo-contact-3",
        contactName: "Maya Santoso",
        phone: "628141110003",
        remoteJid: "628141110003@s.whatsapp.net",
        conversationId: "demo-conversation-3",
        lastMessageSummary: "Berapa harga setup CRM + AI agent?",
        lastActivityAt: new Date("2026-06-01T16:45:00.000Z"),
        tags: ["pricing"],
        priority: "medium",
      },
    ],
  },
  {
    id: "demo-stage-proposal",
    name: "Proposal",
    position: 3,
    color: "amber",
    items: [
      {
        id: "demo-item-3",
        title: "CRM follow-up automation",
        stageId: "demo-stage-proposal",
        valueCents: 15_000_000,
        contactId: "demo-contact-2",
        contactName: "Raka Pratama",
        phone: "628131110002",
        remoteJid: "628131110002@s.whatsapp.net",
        conversationId: "demo-conversation-2",
        lastMessageSummary: "Bisa dibantu follow up proposal kemarin?",
        lastActivityAt: new Date("2026-06-02T08:10:00.000Z"),
        tags: ["proposal", "needs human"],
        priority: "high",
      },
    ],
  },
  {
    id: "demo-stage-customer",
    name: "Customer",
    position: 4,
    color: "emerald",
    items: [],
  },
  { id: "demo-stage-lost", name: "Lost", position: 5, color: "red", items: [] },
];

const demoMessages = {
  "demo-conversation-1": [
    {
      id: "demo-message-1-1",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-1",
      direction: "inbound" as const,
      body: "Halo, saya tertarik paket WhatsApp automation untuk klinik. Bisa bantu jelaskan alurnya?",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-02T09:18:00.000Z"),
    },
    {
      id: "demo-message-1-2",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-2",
      direction: "outbound" as const,
      body: "Tentu Dok. Biasanya flow-nya: pasien chat WhatsApp, AI jawab FAQ, lalu lead masuk CRM untuk follow-up admin.",
      messageType: "text" as const,
      status: "delivered" as const,
      metadata: { actor: "ai" },
      createdAt: new Date("2026-06-02T09:20:00.000Z"),
    },
    {
      id: "demo-message-1-3",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-3",
      direction: "inbound" as const,
      body: "Kalau untuk 2 cabang klinik dan butuh laporan harian, bisa?",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-02T09:23:00.000Z"),
    },
    {
      id: "demo-message-1-4",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-4",
      direction: "outbound" as const,
      body: "Bisa. Saya bisa siapkan dashboard per cabang, ringkasan percakapan, dan notifikasi jika ada pasien yang perlu dibalas manusia.",
      messageType: "text" as const,
      status: "sent" as const,
      metadata: { actor: "ai" },
      createdAt: new Date("2026-06-02T09:24:00.000Z"),
    },
  ],
  "demo-conversation-2": [
    {
      id: "demo-message-2-1",
      conversationId: "demo-conversation-2",
      contactId: "demo-contact-2",
      externalMessageId: "demo-wa-2-1",
      direction: "inbound" as const,
      body: "Pagi, bisa dibantu follow up proposal kemarin? Tim saya minta estimasi timeline implementasi.",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-02T08:10:00.000Z"),
    },
    {
      id: "demo-message-2-2",
      conversationId: "demo-conversation-2",
      contactId: "demo-contact-2",
      externalMessageId: "demo-wa-2-2",
      direction: "outbound" as const,
      body: "Siap Pak Raka. Untuk CRM + WhatsApp automation biasanya 10-14 hari kerja setelah kebutuhan final disetujui.",
      messageType: "text" as const,
      status: "failed" as const,
      metadata: { actor: "ai", note: "Demo failed state" },
      createdAt: new Date("2026-06-02T08:11:00.000Z"),
    },
  ],
  "demo-conversation-3": [
    {
      id: "demo-message-3-1",
      conversationId: "demo-conversation-3",
      contactId: "demo-contact-3",
      externalMessageId: "demo-wa-3-1",
      direction: "inbound" as const,
      body: "Berapa harga setup CRM + AI agent untuk WhatsApp?",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-01T16:45:00.000Z"),
    },
    {
      id: "demo-message-3-2",
      conversationId: "demo-conversation-3",
      contactId: "demo-contact-3",
      externalMessageId: "demo-wa-3-2",
      direction: "outbound" as const,
      body: "Paket awal mulai dari Rp8,5 juta untuk setup CRM, integrasi WhatsApp, dan satu AI agent dengan knowledge base dasar.",
      messageType: "text" as const,
      status: "sent" as const,
      metadata: { actor: "ai" },
      createdAt: new Date("2026-06-01T16:46:00.000Z"),
    },
  ],
};

const demoAiRuns = [
  {
    id: "demo-run-1",
    status: "succeeded" as const,
    latencyMs: 1840,
    errorMessage: null,
    createdAt: new Date("2026-06-02T09:25:00.000Z"),
    contactName: "Dr. Nadira Putri",
  },
  {
    id: "demo-run-2",
    status: "timeout" as const,
    latencyMs: 45_000,
    errorMessage: "Fallback timeout message sent",
    createdAt: new Date("2026-06-02T08:11:00.000Z"),
    contactName: "Raka Pratama",
  },
  {
    id: "demo-run-3",
    status: "running" as const,
    latencyMs: null,
    errorMessage: null,
    createdAt: new Date("2026-06-02T07:55:00.000Z"),
    contactName: "Maya Santoso",
  },
];

const demoAgents = [
  {
    id: "demo-agent-1",
    name: "Customer Service Agent",
    provider: "openai",
    modelId: "gpt-4.1-mini",
    systemPrompt:
      "Jawab pertanyaan pelanggan WhatsApp secara ramah, singkat, dan bantu arahkan ke tahap pipeline berikutnya.",
    isActive: true,
    isDefault: true,
  },
];

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function getCrmDashboardSummary() {
  if (!isDatabaseConfigured()) return demoSummary;

  const [[contactCount], [conversationCount], [messageCount], [usageTotals]] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(contacts),
      db.select({ count: sql<number>`count(*)::int` }).from(conversations),
      db.select({ count: sql<number>`count(*)::int` }).from(messages),
      db
        .select({
          costUsd: sql<string>`coalesce(sum(${aiUsageLogs.computedCostUsd}), 0)::text`,
          inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
          outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
        })
        .from(aiUsageLogs),
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

  return db
    .select({
      id: conversations.id,
      status: conversations.status,
      aiStatus: conversations.aiStatus,
      lastMessageSummary: conversations.lastMessageSummary,
      lastMessageAt: conversations.lastMessageAt,
      contactName: contacts.displayName,
      remoteJid: contacts.remoteJid,
      phone: contacts.phone,
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
}

type GetConversationMessagesOptions = {
  before?: Date | string;
  limit?: number;
};

export async function getConversationMessages(
  conversationId: string,
  options: GetConversationMessagesOptions = {},
) {
  const limit = options.limit ?? 50;
  const before = options.before ? new Date(options.before) : null;

  if (!isDatabaseConfigured()) {
    const records =
      demoMessages[conversationId as keyof typeof demoMessages] ?? [];
    const filteredRecords =
      before && !Number.isNaN(before.getTime())
        ? records.filter((message) => message.createdAt < before)
        : records;
    return filteredRecords.slice(-limit);
  }

  const whereClause =
    before && !Number.isNaN(before.getTime())
      ? and(
          eq(messages.conversationId, conversationId),
          lt(messages.createdAt, before),
        )
      : eq(messages.conversationId, conversationId);
  const records = await db
    .select()
    .from(messages)
    .where(whereClause)
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return records.reverse();
}

export async function getPipelineBoard() {
  if (!isDatabaseConfigured()) return demoPipelineBoard;

  const [stages, items] = await Promise.all([
    db.select().from(pipelineStages).orderBy(asc(pipelineStages.position)),
    db
      .select({
        id: pipelineItems.id,
        title: pipelineItems.title,
        stageId: pipelineItems.stageId,
        valueCents: pipelineItems.valueCents,
        notes: pipelineItems.notes,
        position: pipelineItems.position,
        lastActivityAt: pipelineItems.lastActivityAt,
        contactId: contacts.id,
        contactName: contacts.displayName,
        phone: contacts.phone,
        remoteJid: contacts.remoteJid,
        tags: contacts.tags,
        conversationId: conversations.id,
        lastMessageSummary: conversations.lastMessageSummary,
        conversationLastMessageAt: conversations.lastMessageAt,
        unreadCount: conversations.unreadCount,
      })
      .from(pipelineItems)
      .innerJoin(contacts, eq(pipelineItems.contactId, contacts.id))
      .leftJoin(
        conversations,
        eq(pipelineItems.conversationId, conversations.id),
      )
      .orderBy(asc(pipelineItems.position), desc(pipelineItems.updatedAt)),
  ]);

  return stages.map((stage) => ({
    ...stage,
    items: items.filter((item) => item.stageId === stage.id),
  }));
}

export async function getAiRunHistory(limit = 50) {
  if (!isDatabaseConfigured()) return demoAiRuns.slice(0, limit);

  return db
    .select({
      id: aiRuns.id,
      status: aiRuns.status,
      latencyMs: aiRuns.latencyMs,
      errorMessage: aiRuns.errorMessage,
      createdAt: aiRuns.createdAt,
      contactName: contacts.displayName,
    })
    .from(aiRuns)
    .innerJoin(contacts, eq(aiRuns.contactId, contacts.id))
    .orderBy(desc(aiRuns.createdAt))
    .limit(limit);
}

type CrmAnalyticsOverview = {
  kpis: {
    contacts: number;
    conversations: number;
    messages: number;
    aiSuccessRate: number;
    aiCostUsd: string;
    inputTokens: number;
    outputTokens: number;
    pipelineValueCents: number;
    unreadConversations: number;
  };
  conversationStatus: Array<{ status: string; count: number; percent: number }>;
  aiRunsByStatus: Array<{ status: string; count: number; percent: number }>;
  topTags: Array<{ tag: string; count: number; percent: number }>;
  pipelineByStage: Array<{ stage: string; count: number; valueCents: number }>;
};

function percentOf(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function buildCrmAnalyticsOverview({
  summary,
  conversationsList,
  aiRunsList,
  contactsList,
  pipelineBoard,
}: {
  summary: Awaited<ReturnType<typeof getCrmDashboardSummary>>;
  conversationsList: Awaited<ReturnType<typeof getRecentConversations>>;
  aiRunsList: Awaited<ReturnType<typeof getAiRunHistory>>;
  contactsList: Awaited<ReturnType<typeof getCrmContacts>>;
  pipelineBoard: Awaited<ReturnType<typeof getPipelineBoard>>;
}): CrmAnalyticsOverview {
  const conversationStatusCounts = countBy(
    conversationsList.map((conversation) => conversation.status),
  );
  const aiStatusCounts = countBy(aiRunsList.map((run) => run.status));
  const tagCounts = countBy(
    contactsList.flatMap((contact) => contact.tags ?? []),
  );
  const totalPipelineValueCents = pipelineBoard.reduce(
    (total, stage) =>
      total +
      stage.items.reduce(
        (stageTotal, item) => stageTotal + (item.valueCents ?? 0),
        0,
      ),
    0,
  );
  const aiCompletedRuns = aiRunsList.filter(
    (run) =>
      run.status === "succeeded" ||
      run.status === "failed" ||
      run.status === "timeout",
  );
  const aiSucceededRuns = aiCompletedRuns.filter(
    (run) => run.status === "succeeded",
  ).length;

  return {
    kpis: {
      ...summary,
      aiSuccessRate: percentOf(aiSucceededRuns, aiCompletedRuns.length),
      pipelineValueCents: totalPipelineValueCents,
      unreadConversations: contactsList.filter(
        (contact) => (contact.unreadCount ?? 0) > 0,
      ).length,
    },
    conversationStatus: Array.from(conversationStatusCounts.entries()).map(
      ([status, count]) => ({
        status,
        count,
        percent: percentOf(count, conversationsList.length),
      }),
    ),
    aiRunsByStatus: Array.from(aiStatusCounts.entries()).map(
      ([status, count]) => ({
        status,
        count,
        percent: percentOf(count, aiRunsList.length),
      }),
    ),
    topTags: Array.from(tagCounts.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        percent: percentOf(count, contactsList.length),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6),
    pipelineByStage: pipelineBoard.map((stage) => ({
      stage: stage.name,
      count: stage.items.length,
      valueCents: stage.items.reduce(
        (total, item) => total + (item.valueCents ?? 0),
        0,
      ),
    })),
  };
}

export async function getCrmAnalyticsOverview(): Promise<CrmAnalyticsOverview> {
  const [summary, conversationsList, aiRunsList, contactsList, pipelineBoard] =
    await Promise.all([
      getCrmDashboardSummary(),
      getRecentConversations(500),
      getAiRunHistory(500),
      getCrmContacts(500),
      getPipelineBoard(),
    ]);

  return buildCrmAnalyticsOverview({
    summary,
    conversationsList,
    aiRunsList,
    contactsList,
    pipelineBoard,
  });
}

export async function getCrmContacts(limit = 100) {
  if (!isDatabaseConfigured()) return demoContacts.slice(0, limit);

  return db
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
      phone: contacts.phone,
      remoteJid: contacts.remoteJid,
      source: contacts.source,
      status: contacts.status,
      aiEnabled: contacts.aiEnabled,
      tags: contacts.tags,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      conversationId: conversations.id,
      conversationStatus: conversations.status,
      lastMessageSummary: conversations.lastMessageSummary,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      pipelineStageId: pipelineStages.id,
      pipelineStageName: pipelineStages.name,
    })
    .from(contacts)
    .leftJoin(conversations, eq(conversations.contactId, contacts.id))
    .leftJoin(pipelineItems, eq(pipelineItems.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(pipelineItems.stageId, pipelineStages.id))
    .orderBy(desc(conversations.lastMessageAt), desc(contacts.updatedAt))
    .limit(limit);
}

export async function getAiAgents(limit = 20) {
  if (!isDatabaseConfigured()) return demoAgents.slice(0, limit);

  return db.select().from(aiAgents).limit(limit);
}
