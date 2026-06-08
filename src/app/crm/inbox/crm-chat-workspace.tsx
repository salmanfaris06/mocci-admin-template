"use client";

import { AlertTriangleIcon, MessageCircleIcon, PhoneIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ChatMessageData } from "@/components/ui/chat";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { CrmChatThread } from "./crm-chat-thread";
import { promoteConversationPreview, selectConversationPreview } from "./optimistic-chat";
import { type MessageStatusEvent, type ConversationUpdatedEvent, useInboxStream } from "./use-inbox-stream";

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

type WhatsAppConnection =
  | { status: "not-configured" }
  | { status: "no-instance"; instanceName: string }
  | { status: "connected"; instanceName: string; state: string }
  | { status: "disconnected"; instanceName: string; state: string }
  | { status: "unknown"; instanceName: string };

type CrmChatWorkspaceProps = {
  initialActiveConversationId: string | null;
  initialConversations: ConversationPreview[];
  initialHasMoreMessages?: boolean;
  initialMessages: ChatMessageData[];
  whatsAppConnection: WhatsAppConnection;
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

function canReceiveRealtimeEvents(connection: WhatsAppConnection) {
  return connection.status !== "not-configured" && connection.status !== "no-instance";
}

function OfflineBanner({ connection }: { connection: WhatsAppConnection }) {
  if (connection.status !== "disconnected" && connection.status !== "unknown") return null;

  const description =
    connection.status === "unknown"
      ? `Could not verify WhatsApp instance ${connection.instanceName}. Existing conversations remain visible, but new messages may not arrive until Evolution API is reachable.`
      : `WhatsApp instance ${connection.instanceName} is ${connection.state}. Existing conversations remain visible, but new messages will not arrive until it reconnects.`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b bg-amber-50 px-4 py-3 text-amber-950 text-sm dark:bg-amber-950/25 dark:text-amber-200">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
        <p>{description}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/api-settings">Reconnect WhatsApp</Link>
      </Button>
    </div>
  );
}

function InboxEmptyState({ connection }: { connection: WhatsAppConnection }) {
  if (connection.status === "not-configured") {
    return <InboxSetupState description="Configure Evolution API environment variables, then create and scan a WhatsApp instance before using the inbox." title="WhatsApp belum dikonfigurasi" />;
  }

  if (connection.status === "no-instance") {
    return <InboxSetupState description={`Instance ${connection.instanceName} belum ada di Evolution API. Buat instance dan scan QR untuk mulai menerima pesan.`} title="WhatsApp belum terhubung" />;
  }

  if (connection.status === "disconnected") {
    return <InboxSetupState description={`Instance ${connection.instanceName} sedang ${connection.state}. Sambungkan ulang WhatsApp agar pesan baru masuk ke inbox.`} title="WhatsApp sedang offline" />;
  }

  if (connection.status === "unknown") {
    return <InboxSetupState description={`Status instance ${connection.instanceName} belum bisa diverifikasi. Cek logs Vercel/VPS dan sambungkan ulang jika perlu.`} title="Status WhatsApp belum diketahui" />;
  }

  return (
    <div>
      <MessageCircleIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
      <h2 className="font-medium text-lg">Belum ada percakapan</h2>
      <p className="mt-1 text-muted-foreground text-sm">Pesan WhatsApp baru akan muncul di sini setelah webhook diterima.</p>
    </div>
  );
}

function InboxSetupState({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <MessageCircleIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
      <h2 className="font-medium text-lg">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">{description}</p>
      <Button asChild className="mt-4" size="sm">
        <Link href="/api-settings">Buka API Settings</Link>
      </Button>
    </div>
  );
}

export function CrmChatWorkspace({ initialActiveConversationId, initialConversations, initialHasMoreMessages = false, initialMessages, whatsAppConnection }: CrmChatWorkspaceProps) {
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

  const handleOptimisticSend = React.useCallback((message: ChatMessageData) => {
    setMessages((currentMessages) => [...currentMessages, message]);
  }, []);

  const shouldSyncInbox = canReceiveRealtimeEvents(whatsAppConnection);
  const { connected } = useInboxStream({
    enabled: shouldSyncInbox,
    onMessageStatus: React.useCallback((event: MessageStatusEvent) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === event.messageId
            ? { ...message, status: event.status as ChatMessageData["status"] }
            : message,
        ),
      );
    }, []),
    onConversationUpdated: React.useCallback((event: ConversationUpdatedEvent) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === event.conversationId
            ? {
                ...conversation,
                lastMessageSummary: event.lastMessageSummary,
                lastMessageAt: new Date(event.lastMessageAt),
                unreadCount: event.unreadCount,
              }
            : conversation,
        ),
      );
    }, []),
    onMessageNew: React.useCallback(() => {
      refreshInbox(selectedConversationId);
    }, [refreshInbox, selectedConversationId]),
  });

  React.useEffect(() => {
    if (!shouldSyncInbox) return;

    const intervalMs = connected ? 30_000 : 10_000;
    const timer = window.setInterval(() => {
      refreshInbox(selectedConversationId);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [connected, refreshInbox, selectedConversationId, shouldSyncInbox]);

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
          <OfflineBanner connection={whatsAppConnection} />
          {activeConversation ? (
            <CrmChatThread
              contactName={activeConversation.displayName ?? activeConversation.contactName ?? activeConversation.phone ?? activeConversation.remoteJid}
              conversationId={activeConversation.id}
              hasMoreMessages={hasMoreMessages}
              isLoadingOlder={isLoadingOlder}
              key={activeConversation.id}
              messages={messages}
              onLoadOlder={handleLoadOlderMessages}
              onLocalSend={handleLocalSend}
              onOptimisticSend={handleOptimisticSend}
              remoteJid={activeConversation.sourceLabel ?? activeConversation.remoteJid}
              to={activeConversation.phone ?? activeConversation.remoteJid}
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8 text-center">
              <InboxEmptyState connection={whatsAppConnection} />
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
