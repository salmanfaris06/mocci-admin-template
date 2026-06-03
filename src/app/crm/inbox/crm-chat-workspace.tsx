"use client";

import { MessageCircleIcon, PhoneIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ChatMessageData } from "@/components/ui/chat";
import { cn } from "@/lib/utils";

import { CrmChatThread } from "./crm-chat-thread";
import { promoteConversationPreview } from "./optimistic-chat";

type ConversationPreview = {
  id: string;
  contactName: string | null;
  lastMessageAt: Date | null;
  lastMessageSummary: string | null;
  phone: string | null;
  remoteJid: string;
};

type CrmChatWorkspaceProps = {
  initialConversations: ConversationPreview[];
  initialMessages: ChatMessageData[];
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

export function CrmChatWorkspace({ initialConversations, initialMessages }: CrmChatWorkspaceProps) {
  const [conversations, setConversations] = React.useState(initialConversations);
  const activeConversation = conversations[0];

  const handleLocalSend = React.useCallback((text: string, sentAt: Date) => {
    if (!activeConversation) return;

    setConversations((currentConversations) =>
      promoteConversationPreview(currentConversations, {
        conversationId: activeConversation.id,
        lastMessageAt: sentAt,
        lastMessageSummary: text,
      }),
    );
  }, [activeConversation]);

  return (
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
              contactName={activeConversation.contactName ?? activeConversation.remoteJid}
              conversationId={activeConversation.id}
              initialMessages={initialMessages}
              onLocalSend={handleLocalSend}
              remoteJid={activeConversation.remoteJid}
              to={activeConversation.phone ?? activeConversation.remoteJid}
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
  );
}
