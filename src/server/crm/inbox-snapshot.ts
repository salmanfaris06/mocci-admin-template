import type { ChatMessageData } from "@/components/ui/chat";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";

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

function toChatMessage(message: ConversationMessage): ChatMessageData {
  const isOutgoing = message.direction === "outbound";

  return {
    id: message.id,
    senderId: isOutgoing ? "crm-agent" : "customer",
    senderName: isOutgoing ? "CRM Agent" : "Customer",
    text: readText(message),
    timestamp: readTimestamp(message),
    status: isOutgoing ? "sent" : "delivered",
  };
}

export async function getInboxSnapshot(conversationId?: string) {
  const conversations = await getRecentConversations(50);
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const messages = activeConversation ? (await getConversationMessages(activeConversation.id)).map(toChatMessage) : [];

  return { conversations, activeConversationId: activeConversation?.id ?? null, messages };
}
