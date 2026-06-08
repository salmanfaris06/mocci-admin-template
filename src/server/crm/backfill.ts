import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { contacts, conversations, messages } from "@/server/db/schema";

type EvolutionBackfillClient = {
  findContacts(query?: Record<string, unknown>): Promise<unknown>;
  findMessages(query?: Record<string, unknown>): Promise<unknown>;
};

type BackfillOptions = {
  take?: number;
};

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
    const candidate = readPath(value, path);
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
  }
  return undefined;
}

function asArray(response: unknown) {
  if (Array.isArray(response)) return response;
  const records = readPath(response, ["records"]);
  if (Array.isArray(records)) return records;
  const data = readPath(response, ["data"]);
  if (Array.isArray(data)) return data;
  return [];
}

function phoneFromJid(remoteJid: string) {
  const phone = remoteJid.split("@")[0]?.replace(/\D/g, "");
  return phone || undefined;
}

function getContactRemoteJid(payload: unknown) {
  return readString(payload, [["remoteJid"], ["jid"], ["id"]]);
}

function getMessageRemoteJid(payload: unknown) {
  return readString(payload, [["key", "remoteJid"], ["remoteJid"], ["jid"]]);
}

function getDisplayName(payload: unknown) {
  return readString(payload, [
    ["pushName"],
    ["name"],
    ["notify"],
    ["verifiedName"],
    ["verifiedBizName"],
  ]);
}

function getAvatarUrl(payload: unknown) {
  return readString(payload, [
    ["profilePicUrl"],
    ["profilePictureUrl"],
    ["imgUrl"],
    ["picture"],
  ]);
}

function getMessageId(payload: unknown) {
  return readString(payload, [["key", "id"], ["id"]]);
}

function getMessageText(payload: unknown) {
  return (
    readString(payload, [
      ["message", "conversation"],
      ["message", "extendedTextMessage", "text"],
      ["message", "imageMessage", "caption"],
      ["message", "videoMessage", "caption"],
      ["text"],
    ]) ?? "Unsupported message"
  );
}

function getMessageType(payload: unknown) {
  const message = readPath(payload, ["message"]);
  if (!message || typeof message !== "object") return "unknown";
  if ("conversation" in message || "extendedTextMessage" in message)
    return "text";
  if ("imageMessage" in message) return "image";
  if ("videoMessage" in message) return "video";
  if ("audioMessage" in message) return "audio";
  if ("documentMessage" in message) return "document";
  return "unknown";
}

function getMessageDate(payload: unknown) {
  const timestamp = readPath(payload, ["messageTimestamp"]);
  const numericTimestamp =
    typeof timestamp === "string" ? Number(timestamp) : timestamp;
  if (typeof numericTimestamp === "number" && Number.isFinite(numericTimestamp))
    return new Date(numericTimestamp * 1000);
  return new Date();
}

async function upsertBackfillContact(payload: unknown) {
  const remoteJid = getContactRemoteJid(payload);
  if (!remoteJid) return undefined;

  const [contact] = await db
    .insert(contacts)
    .values({
      remoteJid,
      phone: phoneFromJid(remoteJid),
      displayName: getDisplayName(payload),
      avatarUrl: getAvatarUrl(payload),
      source: "whatsapp",
    })
    .onConflictDoUpdate({
      target: contacts.remoteJid,
      set: {
        phone: phoneFromJid(remoteJid),
        displayName: getDisplayName(payload),
        avatarUrl: getAvatarUrl(payload),
        updatedAt: new Date(),
      },
    })
    .returning();

  return contact;
}

async function getOrCreateBackfillConversation(
  contactId: string,
  summary: string,
  date: Date,
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
      lastMessageAt: date,
      unreadCount: 0,
    })
    .returning();

  return conversation;
}

export async function backfillEvolutionContactsAndMessages(
  client: EvolutionBackfillClient,
  options: BackfillOptions = {},
) {
  const take = Math.min(Math.max(options.take ?? 50, 1), 100);
  const contactsResponse = await client.findContacts({ limit: take });
  const messageResponse = await client.findMessages({ limit: take });
  const contactRows = asArray(contactsResponse);
  const messageRows = asArray(messageResponse);

  for (const contactRow of contactRows) {
    await upsertBackfillContact(contactRow);
  }

  const seenMessageIds = new Set<string>();
  let messagesAttempted = 0;

  for (const messageRow of messageRows) {
    const remoteJid = getMessageRemoteJid(messageRow);
    const evolutionMessageId = getMessageId(messageRow);
    if (
      !remoteJid ||
      !evolutionMessageId ||
      seenMessageIds.has(evolutionMessageId)
    )
      continue;
    seenMessageIds.add(evolutionMessageId);

    const contact = await upsertBackfillContact({
      ...((messageRow && typeof messageRow === "object"
        ? messageRow
        : {}) as Record<string, unknown>),
      remoteJid,
    });
    if (!contact) continue;

    const text = getMessageText(messageRow);
    const sentAt = getMessageDate(messageRow);
    const conversation = await getOrCreateBackfillConversation(
      contact.id,
      text,
      sentAt,
    );
    const fromMe = readPath(messageRow, ["key", "fromMe"]) === true;

    const [insertedMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        evolutionMessageId,
        direction: fromMe ? "outbound" : "inbound",
        senderType: fromMe ? "admin" : "customer",
        messageType: getMessageType(messageRow) as
          | "text"
          | "audio"
          | "image"
          | "video"
          | "document"
          | "unknown",
        text,
        rawMetadata: messageRow as Record<string, unknown>,
        status: fromMe ? "sent" : "received",
        sentAt,
      })
      .onConflictDoNothing({ target: messages.evolutionMessageId })
      .returning();

    if (insertedMessage) {
      await db
        .update(conversations)
        .set({
          lastMessageSummary: text,
          lastMessageAt: sentAt,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));
    }

    messagesAttempted += 1;
  }

  return {
    contactsFetched: contactRows.length,
    messagesFetched: messageRows.length,
    messagesAttempted,
  };
}
