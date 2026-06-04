import type { ChatMessageData } from "@/components/ui/chat";
import { PageHeader } from "@/components/showcase";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";

import { CrmChatWorkspace } from "./crm-chat-workspace";

export const dynamic = "force-dynamic";

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

export default async function CrmInboxPage() {
  const conversations = await getRecentConversations(50);
  const activeConversation = conversations[0];
  const initialMessages = activeConversation ? (await getConversationMessages(activeConversation.id)).map(toChatMessage) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" description="Live WhatsApp conversations captured through Evolution API webhooks." />
      <CrmChatWorkspace initialConversations={conversations} initialMessages={initialMessages} />
    </div>
  );
}
