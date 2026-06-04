import type { ChatMessageData } from "@/components/ui/chat";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";

import { getConversationContactLabel, getConversationSourceLabel, getInboundSenderName } from "./whatsapp-display";

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

function toChatMessage(message: ConversationMessage, conversation: ConversationPreview): ChatMessageData {
  const isOutgoing = message.direction === "outbound";

  return {
    id: message.id,
    senderId: isOutgoing ? "crm-agent" : "customer",
    senderName: isOutgoing ? "CRM Agent" : getInboundSenderName({ ...conversation, rawMetadata: "rawMetadata" in message ? message.rawMetadata : {} }),
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

export async function getInboxSnapshot(conversationId?: string) {
  const conversations = await getRecentConversations(50);
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const messages = activeConversation ? (await getConversationMessages(activeConversation.id)).map((message) => toChatMessage(message, activeConversation)) : [];

  return { conversations: conversations.map(toConversationPreview), activeConversationId: activeConversation?.id ?? null, messages };
}
