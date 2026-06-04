"use client";

import { MessageCircleIcon, PhoneIcon, SearchIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ChatMessageData } from "@/components/ui/chat";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { CrmChatThread } from "./crm-chat-thread";
import { promoteConversationPreview, selectConversationPreview } from "./optimistic-chat";

type ConversationFilter = "all" | "personal" | "group" | "unread";

type ConversationPreview = {
  id: string;
  contactName: string | null;
  displayName?: string;
  isGroup?: boolean;
  lastMessageAt: Date | string | null;
  lastMessageSummary: string | null;
  phone: string | null;
  remoteJid: string;
  sourceLabel?: string;
  unreadCount?: number;
};

type CrmChatWorkspaceProps = {
  initialActiveConversationId: string | null;
  initialConversations: ConversationPreview[];
  initialHasMoreMessages?: boolean;
  initialMessages: ChatMessageData[];
};

type InboxSnapshot = {
  activeConversationId: string | null;
  conversations: ConversationPreview[];
  hasMoreMessages?: boolean;
  messages: ChatMessageData[];
};

function toDate(value: Date | string | number | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSnapshot(snapshot: InboxSnapshot): InboxSnapshot {
  return {
    ...snapshot,
    conversations: snapshot.conversations.map((conversation) => ({
      ...conversation,
      lastMessageAt: toDate(conversation.lastMessageAt),
    })),
    messages: snapshot.messages.map((message) => ({
      ...message,
      timestamp: toDate(message.timestamp) ?? new Date(0),
    })),
  };
}

function formatTime(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "No activity";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function searchableText(conversation: ConversationPreview) {
  return [conversation.displayName, conversation.contactName, conversation.phone, conversation.remoteJid, conversation.sourceLabel, conversation.lastMessageSummary].filter(Boolean).join(" ").toLowerCase();
}

export function CrmChatWorkspace({ initialActiveConversationId, initialConversations, initialHasMoreMessages = false, initialMessages }: CrmChatWorkspaceProps) {
  const [conversations, setConversations] = React.useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = React.useState(initialActiveConversationId);
  const [messages, setMessages] = React.useState(initialMessages);
  const [hasMoreMessages, setHasMoreMessages] = React.useState(initialHasMoreMessages);
  const [conversationFilter, setConversationFilter] = React.useState<ConversationFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);
  const [readConversationIds, setReadConversationIds] = React.useState<Set<string>>(() => new Set(initialActiveConversationId ? [initialActiveConversationId] : []));
  const [isRefreshing, startRefreshTransition] = React.useTransition();
  const activeConversation = selectConversationPreview(conversations, selectedConversationId);

  const filteredConversations = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const unreadCount = readConversationIds.has(conversation.id) ? 0 : (conversation.unreadCount ?? 0);
      const matchesFilter =
        conversationFilter === "all" ||
        (conversationFilter === "personal" && !conversation.isGroup) ||
        (conversationFilter === "group" && conversation.isGroup) ||
        (conversationFilter === "unread" && unreadCount > 0);
      const matchesSearch = !query || searchableText(conversation).includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [conversationFilter, conversations, readConversationIds, searchQuery]);

  const refreshInbox = React.useCallback((conversationId: string | null) => {
    const params = new URLSearchParams();
    if (conversationId) params.set("conversationId", conversationId);

    startRefreshTransition(() => {
      void fetch(`/api/crm/inbox?${params.toString()}`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to refresh inbox");
          return response.json() as Promise<InboxSnapshot>;
        })
        .then((snapshot) => {
          const normalizedSnapshot = normalizeSnapshot(snapshot);
          setConversations(normalizedSnapshot.conversations);
          setSelectedConversationId(normalizedSnapshot.activeConversationId);
          setMessages(normalizedSnapshot.messages);
          setHasMoreMessages(Boolean(normalizedSnapshot.hasMoreMessages));
        })
        .catch((error) => {
          console.error(error);
        });
    });
  }, []);

  const handleSelectConversation = React.useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setReadConversationIds((current) => new Set(current).add(conversationId));
    refreshInbox(conversationId);
  }, [refreshInbox]);

  const handleLoadOlderMessages = React.useCallback(() => {
    if (!activeConversation || messages.length === 0) return;

    const oldestMessage = messages[0];
    const params = new URLSearchParams({ conversationId: activeConversation.id, before: new Date(oldestMessage.timestamp).toISOString() });

    setIsLoadingOlder(true);
    void fetch(`/api/crm/inbox?${params.toString()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load older messages");
        return response.json() as Promise<InboxSnapshot>;
      })
      .then((snapshot) => {
        const normalizedSnapshot = normalizeSnapshot(snapshot);
        setMessages((currentMessages) => [...normalizedSnapshot.messages, ...currentMessages]);
        setHasMoreMessages(Boolean(normalizedSnapshot.hasMoreMessages));
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setIsLoadingOlder(false));
  }, [activeConversation, messages]);

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

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      refreshInbox(selectedConversationId);
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [refreshInbox, selectedConversationId]);

  return (
    <Card className="h-[calc(100vh-12rem)] min-h-[560px] overflow-hidden p-0">
      <CardContent className="grid h-full min-h-0 p-0 lg:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col border-border border-b bg-muted/20 lg:border-r lg:border-b-0">
          <div className="space-y-3 border-border border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium text-sm">Conversations</h2>
                <p className="text-muted-foreground text-xs">Newest leads first</p>
              </div>
              <Badge variant="outline">{filteredConversations.length}/{conversations.length}</Badge>
            </div>

            <div className="relative">
              <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input className="h-9 pl-9" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search name, number, group..." value={searchQuery} />
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
              {([
                ["all", "All"],
                ["personal", "Personal"],
                ["group", "Group"],
                ["unread", "Unread"],
              ] as const).map(([value, label]) => (
                <button
                  className={cn("rounded-md px-2 py-1.5 text-[11px] transition-colors", conversationFilter === value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  key={value}
                  onClick={() => setConversationFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {filteredConversations.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">No conversations match this view.</div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const active = conversation.id === activeConversation?.id;
                  const unreadCount = readConversationIds.has(conversation.id) ? 0 : (conversation.unreadCount ?? 0);

                  return (
                    <button
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        active ? "border-primary/40 bg-primary/5 shadow-sm" : "border-transparent bg-background hover:border-border hover:bg-muted/40",
                      )}
                      disabled={isRefreshing && active}
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="truncate font-medium text-sm">{conversation.displayName ?? conversation.contactName ?? conversation.phone ?? conversation.remoteJid}</div>
                            {conversation.isGroup ? <Badge className="h-5 shrink-0 px-1.5 text-[10px]" variant="secondary">Group</Badge> : null}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                            <PhoneIcon className="size-3" />
                            <span className="truncate">{conversation.sourceLabel ?? conversation.phone ?? conversation.remoteJid}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="text-muted-foreground text-[11px]">{formatTime(conversation.lastMessageAt)}</span>
                          {unreadCount > 0 ? <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">{unreadCount}</Badge> : null}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-muted-foreground text-sm">{conversation.lastMessageSummary ?? "No message summary yet."}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden bg-background">
          {activeConversation ? (
            <CrmChatThread
              contactName={activeConversation.displayName ?? activeConversation.contactName ?? activeConversation.phone ?? activeConversation.remoteJid}
              conversationId={activeConversation.id}
              hasMoreMessages={hasMoreMessages}
              initialMessages={messages}
              isLoadingOlder={isLoadingOlder}
              key={`${activeConversation.id}:${messages.at(-1)?.id ?? "empty"}`}
              onLoadOlder={handleLoadOlderMessages}
              onLocalSend={handleLocalSend}
              remoteJid={activeConversation.sourceLabel ?? activeConversation.remoteJid}
              to={activeConversation.phone ?? activeConversation.remoteJid}
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8 text-center">
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
