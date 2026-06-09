import {
  BotIcon,
  DollarSignIcon,
  MessageCircleIcon,
  UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/showcase";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCachedCrmDashboardOverview } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatDateTime(value: Date | null) {
  if (!value) return "No activity yet";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatPipelineValue(valueCents: number) {
  return currencyFormatter.format(valueCents / 100);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function DashboardPage() {
  const dashboard = await getCachedCrmDashboardOverview();

  const cards = [
    {
      title: "Contacts",
      value: dashboard.summary.contacts.toLocaleString("en-US"),
      description: "Total CRM contacts",
      icon: UsersIcon,
    },
    {
      title: "Conversations",
      value: dashboard.summary.conversations.toLocaleString("en-US"),
      description: `${dashboard.unreadConversations} with unread messages`,
      icon: MessageCircleIcon,
    },
    {
      title: "AI Success Rate",
      value: `${dashboard.aiSuccessRate}%`,
      description: `$${Number(dashboard.summary.aiCostUsd).toFixed(2)} AI cost`,
      icon: BotIcon,
    },
    {
      title: "Pipeline Value",
      value: formatPipelineValue(dashboard.pipelineValueCents),
      description: `${dashboard.pipelineByStage.reduce((total, stage) => total + stage.count, 0)} active opportunities`,
      icon: DollarSignIcon,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="CRM overview for WhatsApp conversations, AI activity, and active pipeline."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">{card.title}</p>
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-semibold tracking-tight">
                  {card.value}
                </p>
                <p className="text-muted-foreground text-xs">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent conversations</CardTitle>
            <CardDescription className="text-xs">
              Latest WhatsApp threads needing context or follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last message</TableHead>
                  <TableHead className="text-right">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recentConversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell className="font-medium">
                      {conversation.contactName ??
                        conversation.phone ??
                        conversation.remoteJid}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {statusLabel(conversation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[320px] truncate">
                      {conversation.lastMessageSummary ?? "No summary yet"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {formatDateTime(conversation.lastMessageAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI activity</CardTitle>
            <CardDescription className="text-xs">
              Latest automation runs and token consumption.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Input tokens</p>
                <p className="font-semibold">
                  {compactFormatter.format(dashboard.summary.inputTokens)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Output tokens</p>
                <p className="font-semibold">
                  {compactFormatter.format(dashboard.summary.outputTokens)}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {dashboard.aiRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {run.contactName ?? "Unknown contact"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {run.latencyMs
                        ? `${run.latencyMs}ms latency`
                        : "No latency yet"}
                    </p>
                  </div>
                  <Badge
                    variant={run.status === "succeeded" ? "default" : "outline"}
                    className="capitalize"
                  >
                    {statusLabel(run.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline by stage</CardTitle>
          <CardDescription className="text-xs">
            Open opportunity count and estimated value by CRM stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {dashboard.pipelineByStage.map((stage) => (
              <div key={stage.stage} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{stage.stage}</p>
                <p className="mt-2 text-2xl font-semibold">{stage.count}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatPipelineValue(stage.valueCents)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
