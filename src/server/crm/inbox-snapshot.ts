import { inArray } from "drizzle-orm";

import type { ChatMessageData } from "@/components/ui/chat";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";

import { toChatMessageStatus } from "./message-status";
import { getConversationContactLabel, getConversationSourceLabel, getGroupNameFromMetadata, getGroupParticipantJid, getInboundSenderId, getInboundSenderName, isGroupJid } from "./whatsapp-display";

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

type GetInboxSnapshotOptions = {
  before?: string;
  messageLimit?: number;
};

function withGroupName(conversation: ConversationPreview, groupName: string | null): ConversationPreview {
  if (!groupName || !isGroupJid(conversation.remoteJid)) return conversation;
  return { ...conversation, contactName: groupName };
}

function toChatMessage(message: ConversationMessage, conversation: ConversationPreview, participantNames: Map<string, string>): ChatMessageData {
  const isOutgoing = message.direction === "outbound";
  const rawMetadata = "rawMetadata" in message ? message.rawMetadata : {};
  const participantJid = getGroupParticipantJid(rawMetadata);

  const inboundSenderName = getInboundSenderName({ ...conversation, participantContactName: participantJid ? participantNames.get(participantJid) : null, rawMetadata });
  const senderName = isGroupJid(conversation.remoteJid) ? `${inboundSenderName} · ${getConversationContactLabel(conversation)}` : inboundSenderName;

  const dbStatus = "status" in message && typeof message.status === "string" ? message.status : isOutgoing ? "sent" : "received";

  return {
    id: message.id,
    senderId: isOutgoing ? "crm-agent" : getInboundSenderId({ remoteJid: conversation.remoteJid, rawMetadata }),
    senderName: isOutgoing ? "CRM Agent" : senderName,
    text: readText(message),
    timestamp: readTimestamp(message),
    status: toChatMessageStatus(dbStatus, message.direction),
  };
}

function readUnreadCount(conversation: ConversationPreview) {
  if ("unreadCount" in conversation && typeof conversation.unreadCount === "number") return conversation.unreadCount;
  return 0;
}

function toConversationPreview(conversation: ConversationPreview) {
  return {
    ...conversation,
    displayName: getConversationContactLabel(conversation),
    isGroup: isGroupJid(conversation.remoteJid),
    sourceLabel: getConversationSourceLabel(conversation),
    unreadCount: readUnreadCount(conversation),
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

async function safeGetRecentConversations() {
  try {
    return await getRecentConversations(50);
  } catch (error) {
    console.error("Failed to load inbox conversations", error);
    return [];
  }
}

async function safeGetConversationMessages(conversationId: string, options: { before?: string; limit: number }) {
  try {
    return await getConversationMessages(conversationId, options);
  } catch (error) {
    console.error("Failed to load inbox messages", error);
    return [];
  }
}

export async function getInboxSnapshot(conversationId?: string, options: GetInboxSnapshotOptions = {}) {
  const messageLimit = options.messageLimit ?? 50;
  const conversations = await safeGetRecentConversations();
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const conversationMessages = activeConversation ? await safeGetConversationMessages(activeConversation.id, { before: options.before, limit: messageLimit + 1 }) : [];
  const hasMoreMessages = conversationMessages.length > messageLimit;
  const visibleMessages = hasMoreMessages ? conversationMessages.slice(1) : conversationMessages;
  const activeGroupName = visibleMessages.map((message) => getGroupNameFromMetadata("rawMetadata" in message ? message.rawMetadata : {})).find((name): name is string => Boolean(name));
  const enrichedActiveConversation = activeConversation ? withGroupName(activeConversation, activeGroupName ?? null) : undefined;
  const participantJids = [...new Set(visibleMessages.map((message) => getGroupParticipantJid("rawMetadata" in message ? message.rawMetadata : {})).filter((jid): jid is string => Boolean(jid)))];
  const participantNames = await getParticipantNames(participantJids).catch((error) => {
    console.error("Failed to load group participant names", error);
    return new Map<string, string>();
  });
  const messages = enrichedActiveConversation ? visibleMessages.map((message) => toChatMessage(message, enrichedActiveConversation, participantNames)) : [];
  const conversationPreviews = conversations.map((conversation) => toConversationPreview(conversation.id === enrichedActiveConversation?.id ? enrichedActiveConversation : conversation));

  return { conversations: conversationPreviews, activeConversationId: activeConversation?.id ?? null, hasMoreMessages, messages };
}
