export const evolutionWebhookEvents = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "MESSAGES_DELETE",
  "SEND_MESSAGE",
  "PRESENCE_UPDATE",
] as const;

export type EvolutionWebhookEvent = (typeof evolutionWebhookEvents)[number];

export const messageDirections = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof messageDirections)[number];

export const senderTypes = ["customer", "ai", "admin", "system"] as const;
export type SenderType = (typeof senderTypes)[number];

export const messageTypes = ["text", "audio", "image", "video", "document", "unknown"] as const;
export type MessageType = (typeof messageTypes)[number];

export const conversationStatuses = ["open", "resolved", "needs_attention"] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

export const aiRunStatuses = ["queued", "running", "succeeded", "failed", "timeout"] as const;
export type AiRunStatus = (typeof aiRunStatuses)[number];

export const aiCapabilities = ["chat", "vision", "transcription"] as const;
export type AiCapability = (typeof aiCapabilities)[number];
