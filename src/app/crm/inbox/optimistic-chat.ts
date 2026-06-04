import type { ChatMessageData } from "@/components/ui/chat";

type CreateOptimisticMessageInput = {
  id: string;
  now: Date;
  senderId: string;
  senderName: string;
  text: string;
};

export function createOptimisticMessage({ id, now, senderId, senderName, text }: CreateOptimisticMessageInput): ChatMessageData {
  return {
    id,
    senderId,
    senderName,
    status: "sent",
    text,
    timestamp: now,
  };
}

type ConversationPreview = {
  id: string;
  lastMessageAt: Date | null;
  lastMessageSummary: string | null;
};

type PromoteConversationPreviewInput = {
  conversationId: string;
  lastMessageAt: Date;
  lastMessageSummary: string;
};

export function promoteConversationPreview<TConversation extends ConversationPreview>(
  conversations: TConversation[],
  { conversationId, lastMessageAt, lastMessageSummary }: PromoteConversationPreviewInput,
) {
  const updatedConversation = conversations.find((conversation) => conversation.id === conversationId);
  const otherConversations = conversations.filter((conversation) => conversation.id !== conversationId);

  if (!updatedConversation) return conversations;

  return [{ ...updatedConversation, lastMessageAt, lastMessageSummary }, ...otherConversations];
}

export function selectConversationPreview<TConversation extends ConversationPreview>(conversations: TConversation[], selectedConversationId?: string | null) {
  return conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];
}
