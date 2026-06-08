import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  contacts,
  conversations,
  messages,
  pipelineItems,
  pipelineStages,
  webhookEvents,
} from "@/server/db/schema";
import { publishInboxEvent } from "../../../../server/crm/inbox-events";
import {
  mapAckToMessageStatus,
  shouldUpdateStatus,
} from "../../../../server/crm/message-status";
import {
  getEvolutionAckStatus,
  getEvolutionIsFromMe,
  getEvolutionMessageId,
} from "./evolution-message";
import { triggerAiWhatsAppReply } from "../../../../server/crm/ai-reply";
import { getWhatsAppAiReplyEligibility } from "../../../../server/crm/whatsapp-ai-eligibility";
import {
  getGroupNameFromMetadata,
  isGroupJid,
} from "../../../../server/crm/whatsapp-display";

function readPath(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor))
      return undefined;
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
  return (
    readString(payload, [
      ["event"],
      ["eventType"],
      ["type"],
      ["raw", "event"],
      ["raw", "eventType"],
      ["raw", "type"],
    ]) ??
    eventNameFromPath(pathEvent) ??
    "unknown"
  );
}

function messageEnvelope(payload: unknown) {
  const raw = readPath(payload, ["raw"]);
  const source = raw && typeof raw === "object" ? raw : payload;
  const data = readPath(source, ["data"]);
  return data && typeof data === "object" ? data : source;
}

function getMessageId(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "key", "id"],
    ["raw", "data", "id"],
    ["raw", "key", "id"],
    ["raw", "id"],
    ["data", "key", "id"],
    ["data", "id"],
    ["key", "id"],
    ["id"],
  ]);
}

function getRemoteJid(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "key", "remoteJid"],
    ["raw", "data", "remoteJid"],
    ["raw", "key", "remoteJid"],
    ["raw", "remoteJid"],
    ["raw", "sender"],
    ["data", "key", "remoteJid"],
    ["data", "remoteJid"],
    ["key", "remoteJid"],
    ["remoteJid"],
    ["sender"],
  ]);
}

function getPushName(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "pushName"],
    ["raw", "pushName"],
    ["raw", "data", "verifiedBizName"],
    ["raw", "verifiedBizName"],
    ["raw", "data", "notifyName"],
    ["raw", "notifyName"],
    ["data", "pushName"],
    ["pushName"],
    ["data", "verifiedBizName"],
    ["verifiedBizName"],
    ["data", "notifyName"],
    ["notifyName"],
  ]);
}

function getMessageText(payload: unknown) {
  const envelope = messageEnvelope(payload);
  return (
    readString(payload, [
      ["raw", "data", "message", "conversation"],
      ["raw", "data", "message", "extendedTextMessage", "text"],
      ["raw", "data", "message", "imageMessage", "caption"],
      ["raw", "data", "message", "videoMessage", "caption"],
      ["raw", "data", "message", "documentMessage", "caption"],
      ["raw", "data", "text"],
      ["data", "message", "conversation"],
      ["data", "message", "extendedTextMessage", "text"],
      ["data", "message", "imageMessage", "caption"],
      ["data", "message", "videoMessage", "caption"],
      ["data", "message", "documentMessage", "caption"],
      ["data", "text"],
      ["text"],
    ]) ??
    readString(envelope, [
      ["message", "conversation"],
      ["message", "extendedTextMessage", "text"],
      ["message", "imageMessage", "caption"],
      ["message", "videoMessage", "caption"],
      ["message", "documentMessage", "caption"],
      ["message", "buttonsResponseMessage", "selectedDisplayText"],
      ["message", "listResponseMessage", "title"],
    ]) ??
    "Unsupported message"
  );
}

function getMessageType(payload: unknown) {
  const message =
    readPath(payload, ["raw", "data", "message"]) ??
    readPath(payload, ["raw", "message"]) ??
    readPath(payload, ["data", "message"]) ??
    readPath(payload, ["message"]);
  if (!message || typeof message !== "object") return "unknown";
  if ("conversation" in message || "extendedTextMessage" in message)
    return "text";
  if ("imageMessage" in message) return "image";
  if ("videoMessage" in message) return "video";
  if ("audioMessage" in message) return "audio";
  if ("documentMessage" in message) return "document";
  return "unknown";
}

function messagePayloads(payload: unknown) {
  const raw = readPath(payload, ["raw"]);
  const source = raw && typeof raw === "object" ? raw : payload;
  const data = readPath(source, ["data"]);
  if (Array.isArray(data))
    return data.map((item) => ({ event: getEventType(payload), data: item }));
  if (Array.isArray(source))
    return source.map((item) => ({ event: "MESSAGES_UPSERT", data: item }));
  return [payload];
}

function phoneFromJid(remoteJid: string) {
  const phone = remoteJid.split("@")[0]?.replace(/\D/g, "");
  return phone || undefined;
}

async function stablePayloadHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function idempotencyKey(payload: unknown, pathEvent?: string) {
  const messageId = getMessageId(payload);
  if (messageId) return messageId;

  return `${getEventType(payload, pathEvent)}:${await stablePayloadHash((payload as { raw?: unknown }).raw ?? payload)}`;
}

async function upsertContact(remoteJid: string, payload: unknown) {
  const displayName = isGroupJid(remoteJid)
    ? getGroupNameFromMetadata(payload)
    : getPushName(payload);
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

async function getOrCreateConversation(
  contactId: string,
  summary: string,
  now: Date,
) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.contactId, contactId),
        eq(conversations.status, "open"),
      ),
    )
    .limit(1);
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

async function ensurePipelineItem(
  contact: {
    id: string;
    displayName: string | null;
    phone: string | null;
    remoteJid: string;
  },
  conversationId: string,
  summary: string,
  now: Date,
) {
  const [existingItem] = await db
    .select({ id: pipelineItems.id })
    .from(pipelineItems)
    .where(eq(pipelineItems.contactId, contact.id))
    .limit(1);
  if (existingItem) return existingItem;

  const [firstStage] = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.position))
    .limit(1);
  if (!firstStage) return null;

  const title =
    contact.displayName ||
    contact.phone ||
    contact.remoteJid.split("@")[0] ||
    "WhatsApp Contact";
  const [item] = await db
    .insert(pipelineItems)
    .values({
      contactId: contact.id,
      conversationId,
      stageId: firstStage.id,
      title,
      notes: summary,
      position: 0,
      lastActivityAt: now,
    })
    .returning({ id: pipelineItems.id });

  return item;
}

async function processSingleMessage(payload: unknown) {
  const remoteJid = getRemoteJid(payload);
  const evolutionMessageId = getMessageId(payload);
  if (!remoteJid || !evolutionMessageId) return false;

  const text = getMessageText(payload);
  const now = new Date();
  const contact = await upsertContact(remoteJid, payload);
  const conversation = await getOrCreateConversation(contact.id, text, now);
  await ensurePipelineItem(contact, conversation.id, text, now);
  const fromMe = getEvolutionIsFromMe(payload);

  const [inboundMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      evolutionMessageId,
      direction: fromMe ? "outbound" : "inbound",
      senderType: fromMe ? "admin" : "customer",
      messageType: getMessageType(payload) as
        | "text"
        | "audio"
        | "image"
        | "video"
        | "document"
        | "unknown",
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
      unreadCount: fromMe
        ? conversation.unreadCount
        : conversation.unreadCount + 1,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversation.id));

  const aiEligibility = getWhatsAppAiReplyEligibility({
    fromMe,
    inboundMessageInserted: Boolean(inboundMessage),
    remoteJid,
  });
  if (aiEligibility.shouldReply && inboundMessage) {
    await triggerAiWhatsAppReply({
      contactId: contact.id,
      conversationId: conversation.id,
      inboundMessageId: inboundMessage.id,
      remoteJid,
      text,
    })
      .then((result) => {
        if (result.skipped)
          console.info("WhatsApp AI auto-reply skipped", result);
      })
      .catch((error) => {
        console.error("WhatsApp AI auto-reply failed", error);
      });
  } else {
    console.info("WhatsApp AI auto-reply skipped", aiEligibility);
  }

  if (inboundMessage) {
    await publishInboxEvent("message.new", conversation.id, {
      messageId: inboundMessage.id,
      direction: fromMe ? "outbound" : "inbound",
      text,
      timestamp: now.toISOString(),
    });
    await publishInboxEvent("conversation.updated", conversation.id, {
      lastMessageSummary: text,
      lastMessageAt: now.toISOString(),
      unreadCount: fromMe
        ? conversation.unreadCount
        : conversation.unreadCount + 1,
    });
  }

  return true;
}

async function processMessageEvent(payload: unknown, pathEvent?: string) {
  const eventType = getEventType(payload, pathEvent).toLowerCase();
  if (
    !eventType.includes("messages.upsert") &&
    !eventType.includes("messages_upsert")
  )
    return 0;

  let processed = 0;
  for (const item of messagePayloads(payload)) {
    if (await processSingleMessage(item)) processed += 1;
  }

  return processed;
}

async function processMessageUpdate(payload: unknown) {
  const evolutionMessageId = getEvolutionMessageId(payload);
  const ack = getEvolutionAckStatus(payload);
  if (!evolutionMessageId || !ack) return false;

  const nextStatus = mapAckToMessageStatus(ack);
  const [existing] = await db
    .select({
      id: messages.id,
      status: messages.status,
      conversationId: messages.conversationId,
    })
    .from(messages)
    .where(eq(messages.evolutionMessageId, evolutionMessageId))
    .limit(1);

  if (!existing || !shouldUpdateStatus(existing.status, nextStatus))
    return false;

  await db
    .update(messages)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(messages.id, existing.id));

  await publishInboxEvent("message.status", existing.conversationId, {
    messageId: existing.id,
    evolutionMessageId,
    status: nextStatus,
  });

  return true;
}

async function processMessageUpdateEvent(payload: unknown, pathEvent?: string) {
  const eventType = getEventType(payload, pathEvent).toLowerCase();
  if (
    !eventType.includes("messages.update") &&
    !eventType.includes("messages_update")
  )
    return 0;

  let processed = 0;
  for (const item of messagePayloads(payload)) {
    if (await processMessageUpdate(item)) processed += 1;
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

function webhookSecretMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isEvolutionWebhookAuthorized(request: Request) {
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) return true;

  const actualSecret = request.headers.get("x-webhook-secret")?.trim();
  return Boolean(
    actualSecret && webhookSecretMatches(actualSecret, expectedSecret),
  );
}

export async function handleEvolutionWebhook(
  request: Request,
  pathEvent?: string,
) {
  if (!isEvolutionWebhookAuthorized(request)) {
    return Response.json(
      { ok: false, error: "Unauthorized webhook" },
      { status: 401 },
    );
  }

  const payload = await parseRequestPayload(request, pathEvent);
  const eventType = getEventType(payload, pathEvent);
  const key = await idempotencyKey(payload, pathEvent);

  const [insertedEvent] = await db
    .insert(webhookEvents)
    .values({
      eventType,
      idempotencyKey: key,
      rawPayload: payload,
      status: payload.meta.parseError ? "invalid_json" : "received",
      errorMessage: payload.meta.parseError,
    })
    .onConflictDoNothing({ target: webhookEvents.idempotencyKey })
    .returning({ idempotencyKey: webhookEvents.idempotencyKey });

  if (!insertedEvent) {
    return Response.json({
      ok: true,
      duplicate: true,
      eventType,
      pathEvent: pathEvent ?? null,
      processedMessages: 0,
      processedUpdates: 0,
      parseError: payload.meta.parseError ?? null,
    });
  }

  const processedMessages = payload.meta.parseError
    ? 0
    : await processMessageEvent(payload, pathEvent);
  const processedUpdates = payload.meta.parseError
    ? 0
    : await processMessageUpdateEvent(payload, pathEvent);

  await db
    .update(webhookEvents)
    .set({
      status:
        processedMessages > 0 || processedUpdates > 0
          ? "processed"
          : payload.meta.parseError
            ? "invalid_json"
            : "received",
      updatedAt: new Date(),
    })
    .where(eq(webhookEvents.idempotencyKey, key));

  revalidatePath("/debug");
  revalidatePath("/crm/debug");
  revalidatePath("/inbox");
  revalidatePath("/crm/inbox");

  return Response.json({
    ok: true,
    eventType,
    pathEvent: pathEvent ?? null,
    processedMessages,
    processedUpdates,
    parseError: payload.meta.parseError ?? null,
  });
}

export async function GET(request: Request) {
  return Response.json({
    ok: true,
    endpoint: new URL(request.url).pathname,
    status: "ready",
    message:
      "Evolution webhook endpoint is ready. Incoming WhatsApp messages must be delivered with POST and a JSON body.",
  });
}

export async function POST(request: Request) {
  return handleEvolutionWebhook(request);
}
