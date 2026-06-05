import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { contacts, conversations, messages, webhookEvents } from "@/server/db/schema";
import { triggerAiWhatsAppReply } from "../../../../server/crm/ai-reply";
import { getGroupNameFromMetadata, isGroupJid } from "../../../../server/crm/whatsapp-display";

function readPath(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function readString(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const result = readPath(value, path);
    if (typeof result === "string" && result.trim()) return result.trim();
  }
  return undefined;
}

function eventNameFromPath(pathEvent?: string) {
  if (!pathEvent) return undefined;
  return pathEvent.replace(/-/g, "_").toUpperCase();
}

function getEventType(payload: unknown, pathEvent?: string) {
  return readString(payload, [["event"], ["eventType"], ["type"], ["raw", "event"], ["raw", "eventType"], ["raw", "type"]]) ?? eventNameFromPath(pathEvent) ?? "unknown";
}

function messageEnvelope(payload: unknown) {
  const raw = readPath(payload, ["raw"]);
  const source = raw && typeof raw === "object" ? raw : payload;
  const data = readPath(source, ["data"]);
  return data && typeof data === "object" ? data : source;
}

function getMessageId(payload: unknown) {
  return readString(payload, [["raw", "data", "key", "id"], ["raw", "data", "id"], ["raw", "key", "id"], ["raw", "id"], ["data", "key", "id"], ["data", "id"], ["key", "id"], ["id"]]);
}

function getRemoteJid(payload: unknown) {
  return readString(payload, [["raw", "data", "key", "remoteJid"], ["raw", "data", "remoteJid"], ["raw", "key", "remoteJid"], ["raw", "remoteJid"], ["raw", "sender"], ["data", "key", "remoteJid"], ["data", "remoteJid"], ["key", "remoteJid"], ["remoteJid"], ["sender"]]);
}

function getPushName(payload: unknown) {
  return readString(payload, [["raw", "data", "pushName"], ["raw", "pushName"], ["raw", "data", "verifiedBizName"], ["raw", "verifiedBizName"], ["raw", "data", "notifyName"], ["raw", "notifyName"], ["data", "pushName"], ["pushName"], ["data", "verifiedBizName"], ["verifiedBizName"], ["data", "notifyName"], ["notifyName"]]);
}

function getMessageText(payload: unknown) {
  const envelope = messageEnvelope(payload);
  return (
    readString(payload, [["raw", "data", "message", "conversation"], ["raw", "data", "message", "extendedTextMessage", "text"], ["raw", "data", "message", "imageMessage", "caption"], ["raw", "data", "message", "videoMessage", "caption"], ["raw", "data", "message", "documentMessage", "caption"], ["raw", "data", "text"], ["data", "message", "conversation"], ["data", "message", "extendedTextMessage", "text"], ["data", "message", "imageMessage", "caption"], ["data", "message", "videoMessage", "caption"], ["data", "message", "documentMessage", "caption"], ["data", "text"], ["text"]]) ??
    readString(envelope, [["message", "conversation"], ["message", "extendedTextMessage", "text"], ["message", "imageMessage", "caption"], ["message", "videoMessage", "caption"], ["message", "documentMessage", "caption"], ["message", "buttonsResponseMessage", "selectedDisplayText"], ["message", "listResponseMessage", "title"]]) ??
    "Unsupported message"
  );
}

function getMessageType(payload: unknown) {
  const message = readPath(payload, ["raw", "data", "message"]) ?? readPath(payload, ["raw", "message"]) ?? readPath(payload, ["data", "message"]) ?? readPath(payload, ["message"]);
  if (!message || typeof message !== "object") return "unknown";
  if ("conversation" in message || "extendedTextMessage" in message) return "text";
  if ("imageMessage" in message) return "image";
  if ("videoMessage" in message) return "video";
  if ("audioMessage" in message) return "audio";
  if ("documentMessage" in message) return "document";
  return "unknown";
}

function getIsFromMe(payload: unknown) {
  return readPath(payload, ["raw", "data", "key", "fromMe"]) === true || readPath(payload, ["raw", "key", "fromMe"]) === true || readPath(payload, ["data", "key", "fromMe"]) === true || readPath(payload, ["key", "fromMe"]) === true;
}

function messagePayloads(payload: unknown) {
  const raw = readPath(payload, ["raw"]);
  const source = raw && typeof raw === "object" ? raw : payload;
  const data = readPath(source, ["data"]);
  if (Array.isArray(data)) return data.map((item) => ({ event: getEventType(payload), data: item }));
  if (Array.isArray(source)) return source.map((item) => ({ event: "MESSAGES_UPSERT", data: item }));
  return [payload];
}

function phoneFromJid(remoteJid: string) {
  const phone = remoteJid.split("@")[0]?.replace(/\D/g, "");
  return phone || undefined;
}

function idempotencyKey(payload: unknown, pathEvent?: string) {
  const messageId = getMessageId(payload);
  if (messageId) return messageId;
  const requestId = readString(payload, [["meta", "requestId"]]);
  return `${getEventType(payload, pathEvent)}:${requestId ?? `${Date.now()}:${Math.random().toString(36).slice(2)}`}`;
}

async function upsertContact(remoteJid: string, payload: unknown) {
  const displayName = isGroupJid(remoteJid) ? getGroupNameFromMetadata(payload) : getPushName(payload);
  const [contact] = await db
    .insert(contacts)
    .values({
      remoteJid,
      phone: phoneFromJid(remoteJid),
      displayName,
      source: "whatsapp",
    })
    .onConflictDoUpdate({
      target: contacts.remoteJid,
      set: {
        displayName,
        phone: phoneFromJid(remoteJid),
        updatedAt: new Date(),
      },
    })
    .returning();

  return contact;
}

async function getOrCreateConversation(contactId: string, summary: string, now: Date) {
  const [existing] = await db.select().from(conversations).where(and(eq(conversations.contactId, contactId), eq(conversations.status, "open"))).limit(1);
  if (existing) return existing;

  const [conversation] = await db
    .insert(conversations)
    .values({
      contactId,
      status: "open",
      aiStatus: "enabled",
      lastMessageSummary: summary,
      lastMessageAt: now,
      unreadCount: 0,
    })
    .returning();

  return conversation;
}

async function processSingleMessage(payload: unknown) {
  const remoteJid = getRemoteJid(payload);
  const evolutionMessageId = getMessageId(payload);
  if (!remoteJid || !evolutionMessageId) return false;

  const text = getMessageText(payload);
  const now = new Date();
  const contact = await upsertContact(remoteJid, payload);
  const conversation = await getOrCreateConversation(contact.id, text, now);
  const fromMe = getIsFromMe(payload);

  const [inboundMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      evolutionMessageId,
      direction: fromMe ? "outbound" : "inbound",
      senderType: fromMe ? "admin" : "customer",
      messageType: getMessageType(payload) as "text" | "audio" | "image" | "video" | "document" | "unknown",
      text,
      rawMetadata: payload as Record<string, unknown>,
      status: fromMe ? "sent" : "received",
      sentAt: now,
    })
    .onConflictDoNothing({ target: messages.evolutionMessageId })
    .returning();

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastMessageSummary: text,
      unreadCount: fromMe ? conversation.unreadCount : conversation.unreadCount + 1,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversation.id));

  if (!fromMe && inboundMessage && !isGroupJid(remoteJid)) {
    await triggerAiWhatsAppReply({ contactId: contact.id, conversationId: conversation.id, inboundMessageId: inboundMessage.id, remoteJid, text }).catch((error) => {
      console.error(error);
    });
  }

  return true;
}

async function processMessageEvent(payload: unknown, pathEvent?: string) {
  const eventType = getEventType(payload, pathEvent).toLowerCase();
  if (!eventType.includes("messages.upsert") && !eventType.includes("messages_upsert")) return 0;

  let processed = 0;
  for (const item of messagePayloads(payload)) {
    if (await processSingleMessage(item)) processed += 1;
  }

  return processed;
}

async function parseRequestPayload(request: Request, pathEvent?: string) {
  const bodyText = await request.text();
  let raw: unknown = null;
  let parseError: string | undefined;

  if (bodyText.trim()) {
    try {
      raw = JSON.parse(bodyText) as unknown;
    } catch (error) {
      parseError = error instanceof Error ? error.message : "Invalid JSON body";
      raw = { bodyText };
    }
  }

  return {
    meta: {
      requestId: crypto.randomUUID(),
      url: request.url,
      pathname: new URL(request.url).pathname,
      pathEvent: pathEvent ?? null,
      method: request.method,
      contentType: request.headers.get("content-type"),
      userAgent: request.headers.get("user-agent"),
      parseError,
      receivedAt: new Date().toISOString(),
    },
    raw,
  };
}

export async function handleEvolutionWebhook(request: Request, pathEvent?: string) {
  const payload = await parseRequestPayload(request, pathEvent);
  const eventType = getEventType(payload, pathEvent);
  const key = idempotencyKey(payload, pathEvent);

  await db
    .insert(webhookEvents)
    .values({
      eventType,
      idempotencyKey: key,
      rawPayload: payload,
      status: payload.meta.parseError ? "invalid_json" : "received",
      errorMessage: payload.meta.parseError,
    })
    .onConflictDoNothing({ target: webhookEvents.idempotencyKey });

  const processedMessages = payload.meta.parseError ? 0 : await processMessageEvent(payload, pathEvent);

  await db
    .update(webhookEvents)
    .set({ status: processedMessages > 0 ? "processed" : payload.meta.parseError ? "invalid_json" : "received", updatedAt: new Date() })
    .where(eq(webhookEvents.idempotencyKey, key));

  revalidatePath("/debug");
  revalidatePath("/crm/debug");
  revalidatePath("/inbox");
  revalidatePath("/crm/inbox");

  return Response.json({ ok: true, eventType, pathEvent: pathEvent ?? null, processedMessages, parseError: payload.meta.parseError ?? null });
}

export async function GET(request: Request) {
  return Response.json({
    ok: true,
    endpoint: new URL(request.url).pathname,
    status: "ready",
    message: "Evolution webhook endpoint is ready. Incoming WhatsApp messages must be delivered with POST and a JSON body.",
  });
}

export async function POST(request: Request) {
  return handleEvolutionWebhook(request);
}
