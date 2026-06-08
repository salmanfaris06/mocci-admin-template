"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircleIcon,
  MoreHorizontalIcon,
  SaveIcon,
  StickyNoteIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { getCrmContacts } from "@/server/crm/queries";
import {
  buildContactUpdatePayload,
  hasContactChanges,
  type ContactUpdatePayload,
} from "./contact-edit";

type ContactRow = Awaited<ReturnType<typeof getCrmContacts>>[number];

type ContactsTableProps = {
  contacts: ContactRow[];
};

const statusClassName: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  qualified: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  proposal: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  customer: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  lost: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  churned: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function contactName(contact: ContactRow) {
  return contact.displayName || contact.phone || contact.remoteJid;
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
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

const contactStatuses = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "active", label: "Active" },
  { value: "customer", label: "Customer" },
  { value: "lost", label: "Lost" },
] as const;

function createColumns(
  onEditContact: (contact: ContactRow) => void,
): ColumnDef<ContactRow>[] {
  return [
    {
      accessorKey: "displayName",
      header: "Contact",
      cell: ({ row }) => {
        const contact = row.original;
        const name = contactName(contact);
        return (
          <div className="flex min-w-56 items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">{name}</p>
              <p className="truncate text-muted-foreground text-xs">
                {contact.phone ?? contact.remoteJid}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || "new";
        return (
          <Badge
            className={cn(
              "h-5 rounded-sm px-1.5 text-xs capitalize",
              statusClassName[status] ?? "bg-muted text-muted-foreground",
            )}
          >
            {status.replace(/_/g, " ")}
          </Badge>
        );
      },
      filterFn: (row, id, value) =>
        !value || value === "all" || row.getValue(id) === value,
    },
    {
      accessorKey: "pipelineStageName",
      header: "Stage",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.pipelineStageName ?? "Unassigned"}
        </span>
      ),
      filterFn: (row, id, value) =>
        !value || value === "all" || row.getValue(id) === value,
    },
    {
      accessorKey: "lastMessageSummary",
      header: "Last message",
      cell: ({ row }) => (
        <div className="max-w-72">
          <p className="truncate text-sm">
            {row.original.lastMessageSummary ?? "No messages yet"}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatRelativeDate(row.original.lastMessageAt)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags ?? [];
        if (tags.length === 0)
          return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex max-w-48 flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="h-5 rounded-sm px-1.5 text-xs"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 2 ? (
              <span className="text-muted-foreground text-xs">
                +{tags.length - 2}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "unreadCount",
      header: "Unread",
      cell: ({ row }) => {
        const unread = row.original.unreadCount ?? 0;
        return unread > 0 ? (
          <Badge className="h-5 rounded-sm px-1.5 text-xs">{unread}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">0</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original;
        const inboxHref = contact.conversationId
          ? `/inbox?conversation=${contact.conversationId}`
          : "/inbox";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Contact actions"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={inboxHref}>
                  <MessageCircleIcon className="size-4" /> Open chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEditContact(contact)}>
                <UserRoundCheckIcon className="size-4" /> Edit status
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEditContact(contact)}>
                <StickyNoteIcon className="size-4" /> Edit notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function contactTagsInput(contact: ContactRow) {
  return (contact.tags ?? []).join(", ");
}

async function updateContact(contactId: string, payload: ContactUpdatePayload) {
  const response = await fetch(`/api/crm/contacts/${contactId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update contact");
  }

  return response.json();
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(
    null,
  );
  const [status, setStatus] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const columns = useMemo(
    () =>
      createColumns((contact) => {
        setSelectedContact(contact);
        setStatus(contact.status || "new");
        setTagsInput(contactTagsInput(contact));
        setNotes(contact.notes ?? "");
      }),
    [],
  );

  const payload = selectedContact
    ? buildContactUpdatePayload(
        { status, tagsInput, notes },
        {
          status: selectedContact.status || "new",
          tags: selectedContact.tags ?? [],
          notes: selectedContact.notes ?? null,
        },
      )
    : {};
  const canSave = selectedContact
    ? hasContactChanges(payload) && !isPending
    : false;

  function handleSave() {
    if (!selectedContact || !hasContactChanges(payload)) return;

    startTransition(async () => {
      try {
        await updateContact(selectedContact.id, payload);
        toast.success("Contact updated");
        setSelectedContact(null);
        router.refresh();
      } catch {
        toast.error("Failed to update contact");
      }
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={contacts}
        searchPlaceholder="Search WhatsApp contacts..."
        filters={[
          {
            columnId: "status",
            label: "Status",
            options: contactStatuses.filter((item) => item.value !== "lost"),
          },
          {
            columnId: "pipelineStageName",
            label: "Stage",
            options: [
              { value: "New Lead", label: "New Lead" },
              { value: "Qualified", label: "Qualified" },
              { value: "Proposal", label: "Proposal" },
              { value: "Customer", label: "Customer" },
              { value: "Lost", label: "Lost" },
            ],
          },
        ]}
      />

      <Sheet
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit contact</SheetTitle>
            <SheetDescription>
              {selectedContact
                ? contactName(selectedContact)
                : "Update CRM contact details."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-status">Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={isPending}
              >
                <SelectTrigger id="contact-status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {contactStatuses.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-tags">Tags</Label>
              <Input
                id="contact-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="pricing, vip, follow up"
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                Pisahkan tags dengan koma.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add CRM context, next steps, or qualification notes..."
                rows={6}
                disabled={isPending}
              />
            </div>
          </div>

          <SheetFooter>
            <Button onClick={handleSave} disabled={!canSave}>
              <SaveIcon className="size-4" />
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
