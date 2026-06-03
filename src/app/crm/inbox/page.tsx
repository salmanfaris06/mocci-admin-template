import { BotIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ChatMessageData } from "@/components/ui/chat";
import { cn } from "@/lib/utils";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";

import { CrmChatThread } from "./crm-chat-thread";

export const dynamic = "force-dynamic";

const crmUser = {
  id: "crm-agent",
  name: "CRM AI Agent",
  status: "online" as const,
};

function formatTime(value: Date | null) {
  if (!value) return "No activity";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function statusVariant(status: string) {
  if (status === "needs_attention" || status === "error" || status === "failed") return "destructive" as const;
  if (status === "processing") return "secondary" as const;
  return "outline" as const;
}

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
          Demo send disabled
        </Badge>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="grid min-h-[720px] p-0 lg:grid-cols-[360px_1fr]">
          <aside className="border-border border-b bg-muted/20 lg:border-r lg:border-b-0">
            <div className="border-border border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium text-sm">Conversations</h2>
                  <p className="text-muted-foreground text-xs">Newest leads first</p>
                </div>
                <Badge variant="outline">{conversations.length}</Badge>
              </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">No conversations yet.</div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => {
                    const active = conversation.id === activeConversation?.id;

                    return (
                      <div
                        className={cn(
                          "rounded-xl border p-3 transition-colors",
                          active ? "border-primary/40 bg-primary/5 shadow-sm" : "border-transparent bg-background hover:border-border hover:bg-muted/40",
                        )}
                        key={conversation.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-sm">{conversation.contactName ?? conversation.remoteJid}</div>
                            <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                              <PhoneIcon className="size-3" />
                              <span className="truncate">{conversation.phone ?? conversation.remoteJid}</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-muted-foreground text-[11px]">{formatTime(conversation.lastMessageAt)}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-muted-foreground text-sm">{conversation.lastMessageSummary ?? "No message summary yet."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={statusVariant(conversation.status)}>{conversation.status}</Badge>
                          <Badge variant={statusVariant(conversation.aiStatus)}>
                            <BotIcon className="size-3" />
                            {conversation.aiStatus}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[720px] flex-col bg-background">
            {activeConversation ? (
              <CrmChatThread
                aiStatus={activeConversation.aiStatus}
                aiStatusVariant={statusVariant(activeConversation.aiStatus)}
                contactName={activeConversation.contactName ?? activeConversation.remoteJid}
                initialMessages={chatMessages}
                remoteJid={activeConversation.remoteJid}
                status={activeConversation.status}
                statusVariant={statusVariant(activeConversation.status)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageCircleIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
                  <h2 className="font-medium text-lg">No CRM chats yet</h2>
                  <p className="mt-1 text-muted-foreground text-sm">Connect WhatsApp or enable demo data to preview chat conversations.</p>
                </div>
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
