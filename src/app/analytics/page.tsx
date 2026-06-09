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
import { Progress } from "@/components/ui/progress";
import { getCachedCrmAnalyticsOverview } from "@/server/crm/queries";

import { AnalyticsCharts } from "./analytics-charts";

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

function formatPipelineValue(valueCents: number) {
  return currencyFormatter.format(valueCents / 100);
}

function labelStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default async function AnalyticsPage() {
  const analytics = await getCachedCrmAnalyticsOverview();
  const cards = [
    {
      label: "Messages",
      value: analytics.kpis.messages.toLocaleString("en-US"),
      detail: `${analytics.kpis.conversations.toLocaleString("en-US")} conversations tracked`,
      icon: MessageCircleIcon,
    },
    {
      label: "Contacts",
      value: analytics.kpis.contacts.toLocaleString("en-US"),
      detail: `${analytics.kpis.unreadConversations} conversations unread`,
      icon: UsersIcon,
    },
    {
      label: "AI Success",
      value: `${analytics.kpis.aiSuccessRate}%`,
      detail: `${compactFormatter.format(analytics.kpis.inputTokens + analytics.kpis.outputTokens)} total tokens`,
      icon: BotIcon,
    },
    {
      label: "Pipeline",
      value: formatPipelineValue(analytics.kpis.pipelineValueCents),
      detail: `${analytics.pipelineByStage.reduce((total, stage) => total + stage.count, 0)} open opportunities`,
      icon: DollarSignIcon,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="WhatsApp CRM performance, AI run health, tags, and pipeline distribution."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">{card.label}</p>
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-semibold tracking-tight">
                  {card.value}
                </p>
                <p className="text-muted-foreground text-xs">{card.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AnalyticsCharts
        conversationStatus={analytics.conversationStatus}
        aiRunsByStatus={analytics.aiRunsByStatus}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top contact tags</CardTitle>
            <CardDescription className="text-xs">
              Most common lead qualifiers across CRM contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topTags.map((tag) => (
              <div key={tag.tag} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Badge variant="outline">{tag.tag}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {tag.count} contacts
                  </span>
                </div>
                <Progress value={tag.percent} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline distribution</CardTitle>
            <CardDescription className="text-xs">
              Opportunity count and value by active stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.pipelineByStage.map((stage) => (
              <div key={stage.stage} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{stage.stage}</p>
                  <Badge variant="secondary">{stage.count}</Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatPipelineValue(stage.valueCents)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversation mix</CardTitle>
            <CardDescription className="text-xs">
              Share of current conversation states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.conversationStatus.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="capitalize">{labelStatus(item.status)}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.percent}%
                  </span>
                </div>
                <Progress value={item.percent} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
