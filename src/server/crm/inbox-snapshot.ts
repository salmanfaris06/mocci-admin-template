import { inArray } from "drizzle-orm";

import type { ChatMessageData } from "@/components/ui/chat";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";

import { getConversationContactLabel, getConversationSourceLabel, getGroupParticipantJid, getInboundSenderId, getInboundSenderName } from "./whatsapp-display";

type ConversationPreview = Awaited<ReturnType<typeof getRecentConversations>>[number];
type ConversationMessage = Awaited<ReturnType<typeof getConversationMessages>>[number];

function readText(message: ConversationMessage) {
  if ("text" in message && message.text) return message.text;
  if ("caption" in message && message.caption) return message.caption;
  if ("transcript" in message && message.transcript) return message.transcript;
  if ("body" in message && message.body) return message.body;
  return "Unsupported message";
}

function readTimestamp(message: ConversationMessage) {
  if ("sentAt" in message && message.sentAt) return message.sentAt;
  return message.createdAt;
}

function toChatMessage(message: ConversationMessage, conversation: ConversationPreview, participantNames: Map<string, string>): ChatMessageData {
  const isOutgoing = message.direction === "outbound";
  const rawMetadata = "rawMetadata" in message ? message.rawMetadata : {};
  const participantJid = getGroupParticipantJid(rawMetadata);

  return {
    id: message.id,
    senderId: isOutgoing ? "crm-agent" : getInboundSenderId({ remoteJid: conversation.remoteJid, rawMetadata }),
    senderName: isOutgoing ? "CRM Agent" : getInboundSenderName({ ...conversation, participantContactName: participantJid ? participantNames.get(participantJid) : null, rawMetadata }),
    text: readText(message),
    timestamp: readTimestamp(message),
    status: isOutgoing ? "sent" : "delivered",
  };
}

function toConversationPreview(conversation: ConversationPreview) {
  return {
    ...conversation,
    displayName: getConversationContactLabel(conversation),
    sourceLabel: getConversationSourceLabel(conversation),
  };
}

async function getParticipantNames(participantJids: string[]) {
  if (!process.env.DATABASE_URL || participantJids.length === 0) return new Map<string, string>();

  const rows = await db
    .select({ displayName: contacts.displayName, remoteJid: contacts.remoteJid })
    .from(contacts)
    .where(inArray(contacts.remoteJid, participantJids));

  return new Map(rows.flatMap((contact) => (contact.displayName ? [[contact.remoteJid, contact.displayName] as const] : [])));
}

export async function getInboxSnapshot(conversationId?: string) {
  const conversations = await getRecentConversations(50);
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const conversationMessages = activeConversation ? await getConversationMessages(activeConversation.id) : [];
  const participantJids = [...new Set(conversationMessages.map((message) => getGroupParticipantJid("rawMetadata" in message ? message.rawMetadata : {})).filter((jid): jid is string => Boolean(jid)))];
  const participantNames = await getParticipantNames(participantJids);
  const messages = activeConversation ? conversationMessages.map((message) => toChatMessage(message, activeConversation, participantNames)) : [];

  return { conversations: conversations.map(toConversationPreview), activeConversationId: activeConversation?.id ?? null, messages };
}
