import {
  BotIcon,
  CheckCircle2Icon,
  ClockIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatComposer, ChatMessages, ChatProvider, type ChatMessageData } from "@/components/ui/chat";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getConversationMessages, getRecentConversations } from "@/server/crm/queries";

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

function displayStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
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

function MetricCard({ description, icon: Icon, title, value }: { description: string; icon: typeof MessageCircleIcon; title: string; value: string }) {
  return (
    <Card className="gap-3 bg-card/70 py-4 shadow-none backdrop-blur-sm">
      <CardHeader className="gap-3 px-4">
        <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
          <Icon className="size-3.5" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
        <CardAction>
          <span className="font-semibold text-2xl tabular-nums tracking-tight">{value}</span>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export default async function CrmInboxPage() {
  const conversations = await getRecentConversations(50);
  const activeConversation = conversations[0];
  const messages = activeConversation ? await getConversationMessages(activeConversation.id) : [];
  const activeName = activeConversation ? (activeConversation.contactName ?? activeConversation.remoteJid) : "";
  const chatMessages = activeConversation ? messages.map((message) => toChatMessage(message, activeName)) : [];
  const needsAttentionCount = conversations.filter((conversation) => conversation.status === "needs_attention").length;
  const aiProcessingCount = conversations.filter((conversation) => conversation.aiStatus === "processing").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_32%),radial-gradient(circle_at_84%_0%,color-mix(in_oklab,var(--muted-foreground)_12%,transparent),transparent_30%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-end">
          <div className="flex max-w-4xl flex-col gap-4">
            <Badge className="w-fit" variant="secondary">
              <MessageCircleIcon />
              WhatsApp CRM workspace
            </Badge>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-4xl font-semibold text-3xl tracking-tight md:text-5xl">Turn WhatsApp conversations into qualified pipeline.</h1>
              <p className="max-w-2xl text-muted-foreground text-sm leading-6 md:text-base">
                Preview customer threads, AI reply state, and sales handoff context from one operational command center.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard description="Newest leads in the inbox" icon={UsersIcon} title="Threads" value={String(conversations.length)} />
            <MetricCard description="Awaiting human follow-up" icon={ClockIcon} title="Attention" value={String(needsAttentionCount)} />
            <MetricCard description="AI workflows currently active" icon={SparklesIcon} title="AI state" value={String(aiProcessingCount)} />
          </div>
        </div>
      </section>

      <Card className="overflow-hidden p-0 shadow-sm">
        <CardContent className="grid min-h-[720px] p-0 lg:grid-cols-[390px_1fr]">
          <aside className="border-border border-b bg-muted/20 lg:border-r lg:border-b-0">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="font-medium text-sm">Conversation intelligence</h2>
                  <p className="text-muted-foreground text-xs">Newest leads first, enriched with AI status.</p>
                </div>
                <Badge variant="outline">{conversations.length}</Badge>
              </div>
            </div>
            <Separator />

            <div className="max-h-[650px] overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <Empty className="min-h-[320px] border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageCircleIcon />
                    </EmptyMedia>
                    <EmptyTitle>No conversations yet</EmptyTitle>
                    <EmptyDescription>Connect WhatsApp or enable demo data to preview CRM conversations.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {conversations.map((conversation) => {
                    const active = conversation.id === activeConversation?.id;
                    const contactName = conversation.contactName ?? conversation.remoteJid;

                    return (
                      <article
                        className={cn(
                          "group rounded-2xl border p-3 transition-[background-color,border-color,box-shadow,transform] active:scale-[0.99]",
                          active
                            ? "border-primary/40 bg-primary/5 shadow-sm"
                            : "border-transparent bg-background/70 hover:border-border hover:bg-card hover:shadow-sm",
                        )}
                        key={conversation.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            <Avatar className="ring-1 ring-border" size="lg">
                              <AvatarFallback>{getInitials(contactName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-sm">{contactName}</div>
                              <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                                <PhoneIcon className="size-3" />
                                <span className="truncate">{conversation.phone ?? conversation.remoteJid}</span>
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 text-muted-foreground text-[11px] tabular-nums">{formatTime(conversation.lastMessageAt)}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-muted-foreground text-sm leading-5">{conversation.lastMessageSummary ?? "No message summary yet."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={statusVariant(conversation.status)}>{displayStatus(conversation.status)}</Badge>
                          <Badge variant={statusVariant(conversation.aiStatus)}>
                            <BotIcon />
                            AI {displayStatus(conversation.aiStatus)}
                          </Badge>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[720px] flex-col bg-background">
            {activeConversation ? (
              <ChatProvider className="flex min-h-[720px] flex-1 flex-col bg-background" currentUser={crmUser} theme="lunar">
                <header className="flex flex-col gap-4 border-border border-b bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="ring-1 ring-border" size="lg">
                      <AvatarFallback>{getInitials(activeName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-lg tracking-tight">{activeName}</h2>
                      <p className="truncate text-muted-foreground text-sm">{activeConversation.remoteJid}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(activeConversation.status)}>
                      <ClockIcon />
                      {displayStatus(activeConversation.status)}
                    </Badge>
                    <Badge variant={statusVariant(activeConversation.aiStatus)}>
                      <CheckCircle2Icon />
                      AI {displayStatus(activeConversation.aiStatus)}
                    </Badge>
                  </div>
                </header>

                {chatMessages.length > 0 ? (
                  <ChatMessages className="min-h-0 flex-1" messages={chatMessages} />
                ) : (
                  <Empty className="m-6 border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessageCircleIcon />
                      </EmptyMedia>
                      <EmptyTitle>No messages in this thread</EmptyTitle>
                      <EmptyDescription>Messages will appear here once this conversation has WhatsApp activity.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}

                <div className="border-border border-t bg-card/50 p-4">
                  <div className="rounded-2xl border bg-background p-3 shadow-xs">
                    <ChatComposer disabled placeholder="Preview only — sending is not connected yet" />
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-muted-foreground text-xs leading-5">
                      <SendIcon className="mt-0.5 size-3.5 shrink-0" />
                      <span>Sending is preview-only in demo mode. Connect Evolution API actions to send real WhatsApp replies.</span>
                    </div>
                  </div>
                </div>
              </ChatProvider>
            ) : (
              <Empty className="m-6 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageCircleIcon />
                  </EmptyMedia>
                  <EmptyTitle>No CRM chats yet</EmptyTitle>
                  <EmptyDescription>Connect WhatsApp or enable demo data to preview chat conversations.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
