import "server-only";

import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
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
      measured("contacts count", () =>
        db.select({ count: sql<number>`count(*)::int` }).from(contacts),
      ),
      measured("conversations count", () =>
        db.select({ count: sql<number>`count(*)::int` }).from(conversations),
      ),
      measured("messages count", () =>
        db.select({ count: sql<number>`count(*)::int` }).from(messages),
      ),
      measured("ai usage totals", () =>
        db
          .select({
            costUsd: sql<string>`coalesce(sum(${aiUsageLogs.computedCostUsd}), 0)::text`,
            inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
            outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
          })
          .from(aiUsageLogs),
      ),
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

  return measured("recent conversations", () =>
    db
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
      .limit(limit),
  );
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

  return measured("ai run history", () =>
    db
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
      .limit(limit),
  );
}

type PipelineStageSummary = Array<{
  stage: string;
  count: number;
  valueCents: number;
}>;

type CrmDashboardOverview = {
  summary: Awaited<ReturnType<typeof getCrmDashboardSummary>>;
  recentConversations: Awaited<ReturnType<typeof getRecentConversations>>;
  aiRuns: Awaited<ReturnType<typeof getAiRunHistory>>;
  pipelineByStage: PipelineStageSummary;
  pipelineValueCents: number;
  aiSuccessRate: number;
  unreadConversations: number;
};

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
  pipelineByStage: PipelineStageSummary;
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

function logSlowQuery(name: string, startedAt: number, thresholdMs = 1200) {
  const durationMs = Date.now() - startedAt;
  if (durationMs >= thresholdMs) {
    console.warn(`[crm-query] ${name} took ${durationMs}ms`);
  }
}

async function measured<T>(name: string, query: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    return await query();
  } finally {
    logSlowQuery(name, startedAt);
  }
}

async function withFallbackTimeout<T>(
  task: Promise<T>,
  fallback: T,
  label: string,
  ms = 3500,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(
        `[crm-query] ${label} exceeded ${ms}ms; returning fallback data`,
      );
      resolve(fallback);
    }, ms);
  });

  try {
    return await Promise.race([task, timeout]);
  } catch (error) {
    console.warn(`[crm-query] ${label} failed; returning fallback data`, error);
    return fallback;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function demoPipelineStageSummary(): PipelineStageSummary {
  return demoPipelineBoard.map((stage) => ({
    stage: stage.name,
    count: stage.items.length,
    valueCents: stage.items.reduce(
      (total, item) => total + (item.valueCents ?? 0),
      0,
    ),
  }));
}

function demoDashboardOverview(): CrmDashboardOverview {
  const pipelineByStage = demoPipelineStageSummary();
  return {
    summary: demoSummary,
    recentConversations: demoConversations.slice(0, 5),
    aiRuns: demoAiRuns.slice(0, 5),
    pipelineByStage,
    pipelineValueCents: pipelineByStage.reduce(
      (total, stage) => total + stage.valueCents,
      0,
    ),
    aiSuccessRate: calculateAiSuccessRate(demoAiRuns),
    unreadConversations: demoContacts.filter(
      (contact) => contact.unreadCount > 0,
    ).length,
  };
}

function demoAnalyticsOverview(): CrmAnalyticsOverview {
  return buildCrmAnalyticsOverview({
    summary: demoSummary,
    conversationsList: demoConversations,
    aiRunsList: demoAiRuns,
    contactsList: demoContacts,
    pipelineBoard: demoPipelineBoard,
  });
}

async function getPipelineStageSummary(): Promise<PipelineStageSummary> {
  if (!isDatabaseConfigured()) return demoPipelineStageSummary();

  return measured("pipeline stage summary", () =>
    db
      .select({
        stage: pipelineStages.name,
        count: sql<number>`count(${pipelineItems.id})::int`,
        valueCents: sql<number>`coalesce(sum(${pipelineItems.valueCents}), 0)::int`,
      })
      .from(pipelineStages)
      .leftJoin(pipelineItems, eq(pipelineItems.stageId, pipelineStages.id))
      .groupBy(pipelineStages.id)
      .orderBy(asc(pipelineStages.position)),
  );
}

async function getUnreadConversationCount() {
  if (!isDatabaseConfigured()) {
    return demoContacts.filter((contact) => contact.unreadCount > 0).length;
  }

  const [record] = await measured("unread conversations count", () =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(gt(conversations.unreadCount, 0)),
  );

  return record?.count ?? 0;
}

async function getConversationStatusBreakdown() {
  if (!isDatabaseConfigured()) {
    const counts = countBy(
      demoConversations.map((conversation) => conversation.status),
    );
    return Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
      percent: percentOf(count, demoConversations.length),
    }));
  }

  const records = await measured("conversation status breakdown", () =>
    db
      .select({
        status: conversations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(conversations)
      .groupBy(conversations.status),
  );
  const total = records.reduce((sum, record) => sum + record.count, 0);

  return records.map((record) => ({
    status: record.status,
    count: record.count,
    percent: percentOf(record.count, total),
  }));
}

async function getAiRunStatusBreakdown() {
  if (!isDatabaseConfigured()) {
    const counts = countBy(demoAiRuns.map((run) => run.status));
    return Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
      percent: percentOf(count, demoAiRuns.length),
    }));
  }

  const records = await measured("ai run status breakdown", () =>
    db
      .select({
        status: aiRuns.status,
        count: sql<number>`count(*)::int`,
      })
      .from(aiRuns)
      .groupBy(aiRuns.status),
  );
  const total = records.reduce((sum, record) => sum + record.count, 0);

  return records.map((record) => ({
    status: record.status,
    count: record.count,
    percent: percentOf(record.count, total),
  }));
}

async function getTopContactTags(limit = 6) {
  if (!isDatabaseConfigured()) {
    const counts = countBy(
      demoContacts.flatMap((contact) => contact.tags ?? []),
    );
    return Array.from(counts.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        percent: percentOf(count, demoContacts.length),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, limit);
  }

  const records = await measured("top contact tags", () =>
    db.execute(sql<Array<{ tag: string; count: number }>>`
      select tag, count(*)::int as count
      from ${contacts}, jsonb_array_elements_text(${contacts.tags}) as tag
      group by tag
      order by count desc, tag asc
      limit ${limit}
    `),
  );
  const [contactTotal] = await measured(
    "contacts count for tag percentages",
    () => db.select({ count: sql<number>`count(*)::int` }).from(contacts),
  );
  const total = contactTotal?.count ?? 0;

  return (
    records as unknown as Array<{ tag: string; count: number | string }>
  ).map((record) => {
    const count = Number(record.count);
    return {
      tag: record.tag,
      count,
      percent: percentOf(count, total),
    };
  });
}

async function getAnalyticsAiSuccessRate() {
  if (!isDatabaseConfigured()) return calculateAiSuccessRate(demoAiRuns);

  const [record] = await measured("ai success rate", () =>
    db
      .select({
        succeeded: sql<number>`count(*) filter (where ${aiRuns.status} = 'succeeded')::int`,
        completed: sql<number>`count(*) filter (where ${aiRuns.status} in ('succeeded', 'failed', 'timeout'))::int`,
      })
      .from(aiRuns),
  );

  return percentOf(record?.succeeded ?? 0, record?.completed ?? 0);
}

function calculateAiSuccessRate(
  aiRunsList: Awaited<ReturnType<typeof getAiRunHistory>>,
) {
  const completedRuns = aiRunsList.filter(
    (run) =>
      run.status === "succeeded" ||
      run.status === "failed" ||
      run.status === "timeout",
  );
  const succeededRuns = completedRuns.filter(
    (run) => run.status === "succeeded",
  ).length;

  return percentOf(succeededRuns, completedRuns.length);
}

export async function getCrmDashboardOverview(): Promise<CrmDashboardOverview> {
  if (!isDatabaseConfigured()) return demoDashboardOverview();

  return withFallbackTimeout(
    (async () => {
      const [
        summary,
        recentConversations,
        aiRunsList,
        pipelineByStage,
        unreadConversations,
      ] = await Promise.all([
        getCrmDashboardSummary(),
        getRecentConversations(5),
        getAiRunHistory(5),
        getPipelineStageSummary(),
        getUnreadConversationCount(),
      ]);

      return {
        summary,
        recentConversations,
        aiRuns: aiRunsList,
        pipelineByStage,
        pipelineValueCents: pipelineByStage.reduce(
          (total, stage) => total + stage.valueCents,
          0,
        ),
        aiSuccessRate: calculateAiSuccessRate(aiRunsList),
        unreadConversations,
      };
    })(),
    demoDashboardOverview(),
    "dashboard overview",
  );
}

export const getCachedCrmDashboardOverview = unstable_cache(
  getCrmDashboardOverview,
  ["crm-dashboard-overview"],
  { revalidate: 60 },
);

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
  if (!isDatabaseConfigured()) return demoAnalyticsOverview();

  return withFallbackTimeout(
    (async () => {
      const [
        summary,
        conversationStatus,
        aiRunsByStatus,
        topTags,
        pipelineByStage,
        unreadConversations,
        aiSuccessRate,
      ] = await Promise.all([
        getCrmDashboardSummary(),
        getConversationStatusBreakdown(),
        getAiRunStatusBreakdown(),
        getTopContactTags(),
        getPipelineStageSummary(),
        getUnreadConversationCount(),
        getAnalyticsAiSuccessRate(),
      ]);
      const pipelineValueCents = pipelineByStage.reduce(
        (total, stage) => total + stage.valueCents,
        0,
      );

      return {
        kpis: {
          ...summary,
          aiSuccessRate,
          pipelineValueCents,
          unreadConversations,
        },
        conversationStatus,
        aiRunsByStatus,
        topTags,
        pipelineByStage,
      };
    })(),
    demoAnalyticsOverview(),
    "analytics overview",
  );
}

export const getCachedCrmAnalyticsOverview = unstable_cache(
  getCrmAnalyticsOverview,
  ["crm-analytics-overview"],
  { revalidate: 60 },
);

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
