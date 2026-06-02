import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiRunHistory, getCrmDashboardSummary } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function CrmAnalyticsPage() {
  const [summary, runs] = await Promise.all([getCrmDashboardSummary(), getAiRunHistory()]);
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">AI Analytics</h1><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Input tokens</CardTitle></CardHeader><CardContent className="font-semibold text-2xl">{summary.inputTokens}</CardContent></Card><Card><CardHeader><CardTitle>Output tokens</CardTitle></CardHeader><CardContent className="font-semibold text-2xl">{summary.outputTokens}</CardContent></Card><Card><CardHeader><CardTitle>Cost</CardTitle></CardHeader><CardContent className="font-semibold text-2xl">${summary.aiCostUsd}</CardContent></Card></div><Card><CardHeader><CardTitle>Recent AI runs</CardTitle></CardHeader><CardContent className="space-y-2">{runs.map((run) => <div className="rounded-lg border p-3" key={run.id}><strong>{run.status}</strong><p className="text-muted-foreground text-sm">{run.contactName ?? "Unknown contact"} · {run.latencyMs ?? 0}ms</p>{run.errorMessage ? <p className="text-destructive text-sm">{run.errorMessage}</p> : null}</div>)}</CardContent></Card></div>;
}
