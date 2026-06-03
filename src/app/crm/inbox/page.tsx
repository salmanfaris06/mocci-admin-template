import { MessageCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ChatMessageData } from "@/components/ui/chat";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";

import { CrmChatWorkspace } from "./crm-chat-workspace";

export const dynamic = "force-dynamic";

const crmUser = {
  id: "crm-agent",
  name: "CRM AI Agent",
  status: "online" as const,
};

function getMessageText(message: Awaited<ReturnType<typeof getConversationMessages>>[number]) {
  if ("body" in message) return message.body ?? "";

  return message.text ?? message.caption ?? message.transcript ?? "";
}

function getMessageStatus(message: Awaited<ReturnType<typeof getConversationMessages>>[number]) {
  if (message.status === "sending" || message.status === "sent" || message.status === "delivered" || message.status === "read" || message.status === "failed") return message.status;

  return "sent";
}

function toChatMessage(message: Awaited<ReturnType<typeof getConversationMessages>>[number], contactName: string): ChatMessageData {
  const isOutbound = message.direction === "outbound";

  return {
    id: message.id,
    senderId: isOutbound ? crmUser.id : "customer",
    senderName: isOutbound ? crmUser.name : contactName,
    text: getMessageText(message),
    timestamp: message.createdAt ?? new Date(),
    status: isOutbound ? getMessageStatus(message) : undefined,
  };
}

export default async function CrmInboxPage() {
  const conversations = await getRecentConversations(50);
  const activeConversation = conversations[0];
  const messages = activeConversation ? await getConversationMessages(activeConversation.id) : [];
  const chatMessages = activeConversation ? messages.map((message) => toChatMessage(message, activeConversation.contactName ?? activeConversation.remoteJid)) : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-muted-foreground text-sm">
            <MessageCircleIcon className="size-4" />
            WhatsApp CRM workspace
          </div>
          <h1 className="font-semibold text-3xl tracking-tight">CRM Chat</h1>
          <p className="text-muted-foreground text-sm">Preview WhatsApp conversations, AI replies, and follow-up context from one workspace.</p>
        </div>
        <Badge className="w-fit" variant="secondary">
          Local demo replies
        </Badge>
      </div>

      <CrmChatWorkspace initialConversations={conversations} initialMessages={chatMessages} />
    </div>
  );
}
