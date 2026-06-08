import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const senderTypeEnum = pgEnum("sender_type", ["customer", "ai", "admin", "system"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "audio", "image", "video", "document", "unknown"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "resolved", "needs_attention"]);
export const aiStatusEnum = pgEnum("ai_status", ["enabled", "disabled", "processing", "error"]);
export const aiRunStatusEnum = pgEnum("ai_run_status", ["queued", "running", "succeeded", "failed", "timeout"]);
export const aiCapabilityEnum = pgEnum("ai_capability", ["chat", "vision", "transcription"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "succeeded", "failed", "cancelled"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
};

export const apiSettings = pgTable("api_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  evolutionBaseUrl: text("evolution_base_url").notNull(),
  evolutionInstanceName: text("evolution_instance_name").notNull(),
  evolutionApiKeyEncrypted: text("evolution_api_key_encrypted"),
  webhookUrl: text("webhook_url"),
  webhookEnabled: boolean("webhook_enabled").default(false).notNull(),
  connectionState: text("connection_state").default("unknown").notNull(),
  latestQrCode: text("latest_qr_code"),
  ...timestamps,
});

export const aiProviderKeys = pgTable("ai_provider_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("ai_provider_keys_provider_idx").on(table.provider)]);

export const modelPricing = pgTable("model_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  capability: aiCapabilityEnum("capability").notNull(),
  inputPricePerMillion: numeric("input_price_per_million", { precision: 12, scale: 6 }).notNull(),
  outputPricePerMillion: numeric("output_price_per_million", { precision: 12, scale: 6 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("model_pricing_provider_model_capability_idx").on(table.provider, table.modelId, table.capability)]);

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  remoteJid: text("remote_jid").notNull(),
  phone: text("phone"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  source: text("source").default("whatsapp").notNull(),
  aiEnabled: boolean("ai_enabled").default(true).notNull(),
  status: text("status").default("new").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  notes: text("notes"),
  ...timestamps,
}, (table) => [uniqueIndex("contacts_remote_jid_idx").on(table.remoteJid)]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  status: conversationStatusEnum("status").default("open").notNull(),
  aiStatus: aiStatusEnum("ai_status").default("enabled").notNull(),
  lastMessageSummary: text("last_message_summary"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  unreadCount: integer("unread_count").default(0).notNull(),
  ...timestamps,
}, (table) => [
  index("conversations_last_message_at_idx").on(table.lastMessageAt),
  index("conversations_contact_id_idx").on(table.contactId),
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  evolutionMessageId: text("evolution_message_id"),
  direction: messageDirectionEnum("direction").notNull(),
  senderType: senderTypeEnum("sender_type").notNull(),
  messageType: messageTypeEnum("message_type").default("unknown").notNull(),
  text: text("text"),
  caption: text("caption"),
  transcript: text("transcript"),
  visionSummary: text("vision_summary"),
  rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default("received").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("messages_evolution_message_id_idx").on(table.evolutionMessageId),
  index("messages_conversation_created_at_idx").on(table.conversationId, table.createdAt),
  index("messages_created_at_idx").on(table.createdAt),
]);

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

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  provider: text("provider").default("openai").notNull(),
  modelId: text("model_id").notNull(),
  temperature: numeric("temperature", { precision: 3, scale: 2 }).default("0.70").notNull(),
  maxOutputTokens: integer("max_output_tokens").default(800).notNull(),
  timeoutSeconds: integer("timeout_seconds").default(45).notNull(),
  typingIntervalSeconds: integer("typing_interval_seconds").default(6).notNull(),
  fallbackTimeoutMessage: text("fallback_timeout_message").notNull(),
  ...timestamps,
});

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  inboundMessageId: uuid("inbound_message_id").references(() => messages.id),
  outputMessageId: uuid("output_message_id").references(() => messages.id),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  agentId: uuid("agent_id").references(() => aiAgents.id).notNull(),
  status: aiRunStatusEnum("status").default("queued").notNull(),
  latencyMs: integer("latency_ms"),
  generatedResponse: text("generated_response"),
  errorMessage: text("error_message"),
  ...timestamps,
}, (table) => [index("ai_runs_created_at_idx").on(table.createdAt)]);

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiRunId: uuid("ai_run_id").references(() => aiRuns.id).notNull(),
  messageId: uuid("message_id").references(() => messages.id),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  capability: aiCapabilityEnum("capability").notNull(),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  inputPricePerMillionSnapshot: numeric("input_price_per_million_snapshot", { precision: 12, scale: 6 }).notNull(),
  outputPricePerMillionSnapshot: numeric("output_price_per_million_snapshot", { precision: 12, scale: 6 }).notNull(),
  computedCostUsd: numeric("computed_cost_usd", { precision: 12, scale: 6 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  color: text("color").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("pipeline_stages_name_idx").on(table.name)]);

export const pipelineItems = pgTable("pipeline_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  stageId: uuid("stage_id").references(() => pipelineStages.id).notNull(),
  title: text("title").notNull(),
  valueCents: integer("value_cents"),
  notes: text("notes"),
  position: integer("position").default(0).notNull(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  ...timestamps,
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").default("received").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  errorMessage: text("error_message"),
  ...timestamps,
}, (table) => [
  uniqueIndex("webhook_events_idempotency_key_idx").on(table.idempotencyKey),
  index("webhook_events_created_at_idx").on(table.createdAt),
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  status: jobStatusEnum("status").default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).defaultNow().notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  errorMessage: text("error_message"),
  ...timestamps,
});
