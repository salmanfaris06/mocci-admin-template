"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClockIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export type PipelineItem = {
  id: string;
  title: string;
  stageId: string;
  valueCents?: number | null;
  notes?: string | null;
  position?: number;
  lastActivityAt?: Date | string | null;
  contactId?: string;
  contactName?: string | null;
  phone?: string | null;
  remoteJid: string;
  conversationId?: string | null;
  lastMessageSummary?: string | null;
  conversationLastMessageAt?: Date | string | null;
  unreadCount?: number | null;
  tags?: string[];
  priority?: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  position: number;
  color: string;
  items: PipelineItem[];
};

type PipelineContactCardProps = {
  item: PipelineItem;
  isOverlay?: boolean;
};

function initials(name: string | null | undefined) {
  return (name || "WA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCurrency(valueCents: number | null | undefined) {
  if (!valueCents) return "No value";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(valueCents / 100);
}

function formatRelativeDate(value: Date | string | null | undefined) {
  if (!value) return "No activity";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

export function PipelineContactCard({ item, isOverlay = false }: PipelineContactCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "pipeline-item", item },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const contactName = item.contactName || item.title;
  const inboxHref = item.conversationId ? `/inbox?conversation=${item.conversationId}` : "/inbox";
  const activityAt = "conversationLastMessageAt" in item ? item.conversationLastMessageAt || item.lastActivityAt : item.lastActivityAt;
  const note = "notes" in item ? item.notes : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 shadow-none transition hover:border-primary/40 hover:bg-muted/40",
        isDragging && "opacity-40",
        isOverlay && "rotate-2 border-primary/50 shadow-lg"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="text-xs">{initials(contactName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{contactName}</p>
                <p className="truncate text-muted-foreground text-xs">{item.title}</p>
              </div>
              {"unreadCount" in item && item.unreadCount ? <Badge className="h-5 rounded-sm px-1.5 text-xs">{item.unreadCount}</Badge> : null}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs">
              <PhoneIcon className="size-3" />
              <span className="truncate">{"phone" in item && item.phone ? item.phone : item.remoteJid}</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-2 text-muted-foreground text-xs">
            <div className="flex gap-1.5">
              <MessageCircleIcon className="mt-0.5 size-3 shrink-0" />
              <p className="line-clamp-2">{"lastMessageSummary" in item && item.lastMessageSummary ? item.lastMessageSummary : note ?? "No recent message."}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {(item.tags ?? []).slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="h-5 rounded-sm px-1.5 text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{formatCurrency(item.valueCents)}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarClockIcon className="size-3" /> {formatRelativeDate(activityAt)}
            </span>
          </div>

          <Link href={inboxHref} className="inline-flex text-primary text-xs opacity-0 transition-opacity group-hover:opacity-100">
            Open chat
          </Link>
        </div>
      </div>
    </Card>
  );
}
