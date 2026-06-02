import type { MessageDirection, MessageType, SenderType } from "../../src/server/domain/types";

type EvolutionWebhookPayload = { event?: string; instance?: string; data?: Record<string, unknown> };

type EvolutionMessageData = Record<string, unknown>;

export type NormalizedEvolutionMessage = {
  evolutionMessageId: string;
  remoteJid: string;
  displayName?: string;
  direction: MessageDirection;
  senderType: SenderType;
  messageType: MessageType;
  text?: string;
  caption?: string;
  timestamp?: Date;
  raw: Record<string, unknown>;
};

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function getNestedString(value: unknown, path: string[]) {
  let cursor: unknown = value;
  for (const part of path) cursor = getRecord(cursor)?.[part];
  return typeof cursor === "string" ? cursor : undefined;
}

export function createWebhookIdempotencyKey(payload: EvolutionWebhookPayload) {
  const instance = payload.instance ?? "unknown-instance";
  const event = payload.event ?? "unknown-event";
  const messageId = getNestedString(payload.data, ["key", "id"]) ?? JSON.stringify(payload.data ?? {}).slice(0, 120);
  return `${instance}:${event}:${messageId}`;
}

export function normalizeEvolutionMessage(data: EvolutionMessageData): NormalizedEvolutionMessage {
  const key = getRecord(data.key);
  const message = getRecord(data.message);
  const fromMe = key?.fromMe === true;
  const conversation = typeof message?.conversation === "string" ? message.conversation : undefined;
  const caption = getNestedString(message, ["imageMessage", "caption"]) ?? getNestedString(message, ["videoMessage", "caption"]);
  const hasAudio = Boolean(message?.audioMessage);
  const hasImage = Boolean(message?.imageMessage);
  const hasVideo = Boolean(message?.videoMessage);
  const hasDocument = Boolean(message?.documentMessage);
  const messageType: MessageType = conversation ? "text" : hasAudio ? "audio" : hasImage ? "image" : hasVideo ? "video" : hasDocument ? "document" : "unknown";
  const messageTimestamp = typeof data.messageTimestamp === "number" ? new Date(data.messageTimestamp * 1000) : undefined;

  return {
    evolutionMessageId: String(key?.id ?? crypto.randomUUID()),
    remoteJid: String(key?.remoteJid ?? "unknown"),
    displayName: typeof data.pushName === "string" ? data.pushName : undefined,
    direction: fromMe ? "outbound" : "inbound",
    senderType: fromMe ? "ai" : "customer",
    messageType,
    text: conversation,
    caption,
    timestamp: messageTimestamp,
    raw: data,
  };
}
