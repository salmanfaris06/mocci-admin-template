import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/server/db";
import { conversations, messages } from "@/server/db/schema";

type ReadReceiptClient = {
  markMessageAsRead(readMessages: unknown[]): Promise<unknown>;
};

type MessageKey = {
  remoteJid: string;
  fromMe: boolean;
  id: string;
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

function readMessageKey(row: {
  evolutionMessageId: string | null;
  rawMetadata: Record<string, unknown>;
}): MessageKey | undefined {
  const remoteJid = readPath(row.rawMetadata, ["key", "remoteJid"]);
  const fromMe = readPath(row.rawMetadata, ["key", "fromMe"]);
  const id = readPath(row.rawMetadata, ["key", "id"]) ?? row.evolutionMessageId;

  if (typeof remoteJid !== "string" || typeof id !== "string") return undefined;
  return { remoteJid, fromMe: fromMe === true, id };
}

export async function markConversationMessagesAsRead(
  client: ReadReceiptClient,
  conversationId: string,
) {
  const unreadMessages = await db
    .select({
      id: messages.id,
      evolutionMessageId: messages.evolutionMessageId,
      rawMetadata: messages.rawMetadata,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.direction, "inbound"),
        ne(messages.status, "read"),
      ),
    );

  const messageKeys = unreadMessages
    .map(readMessageKey)
    .filter((key): key is MessageKey => Boolean(key));
  if (messageKeys.length === 0) return { marked: 0 };

  try {
    await client.markMessageAsRead(messageKeys);
  } catch {
    return { marked: 0, skipped: "evolution-failed" as const };
  }

  await db
    .update(messages)
    .set({ status: "read", updatedAt: new Date() })
    .where(
      inArray(
        messages.id,
        unreadMessages.map((message) => message.id),
      ),
    );
  await db
    .update(conversations)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return { marked: messageKeys.length };
}
