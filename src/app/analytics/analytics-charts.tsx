"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const statusConfig = {
  count: { label: "Conversations", color: "var(--primary)" },
} satisfies ChartConfig;

const aiConfig = {
  count: { label: "Runs" },
  succeeded: { label: "Succeeded", color: "var(--primary)" },
  timeout: {
    label: "Timeout",
    color: "color-mix(in oklab, var(--primary) 55%, transparent)",
  },
  running: {
    label: "Running",
    color: "color-mix(in oklab, var(--primary) 35%, transparent)",
  },
  failed: {
    label: "Failed",
    color: "color-mix(in oklab, var(--destructive) 70%, transparent)",
  },
  queued: {
    label: "Queued",
    color: "color-mix(in oklab, var(--muted-foreground) 60%, transparent)",
  },
} satisfies ChartConfig;

type AnalyticsChartsProps = {
  conversationStatus: Array<{ status: string; count: number; percent: number }>;
  aiRunsByStatus: Array<{ status: string; count: number; percent: number }>;
};

const aiPalette = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 55%, transparent)",
  "color-mix(in oklab, var(--primary) 35%, transparent)",
  "color-mix(in oklab, var(--destructive) 70%, transparent)",
  "color-mix(in oklab, var(--muted-foreground) 60%, transparent)",
];

function labelStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function AnalyticsCharts({
  conversationStatus,
  aiRunsByStatus,
}: AnalyticsChartsProps) {
  const statusData = conversationStatus.map((item) => ({
    ...item,
    label: labelStatus(item.status),
  }));
  const aiData = aiRunsByStatus.map((item, index) => ({
    ...item,
    label: labelStatus(item.status),
    fill: aiPalette[index % aiPalette.length],
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Conversation status</CardTitle>
          <CardDescription className="text-xs">
            Current CRM workload by WhatsApp conversation state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={statusConfig} className="h-72 w-full">
            <BarChart data={statusData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI run health</CardTitle>
          <CardDescription className="text-xs">
            Automation outcomes across recent AI runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={aiConfig}
            className="mx-auto aspect-square max-h-48"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="label" />}
              />
              <Pie
                data={aiData}
                dataKey="count"
                nameKey="label"
                innerRadius={52}
                outerRadius={76}
              >
                {aiData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-4 space-y-2">
            {aiData.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                  aria-hidden
                />
                <span className="flex-1 capitalize">{entry.label}</span>
                <span className="text-muted-foreground">
                  {entry.count} runs
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
