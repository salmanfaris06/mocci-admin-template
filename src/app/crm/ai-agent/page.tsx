import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { aiAgents } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function CrmAiAgentPage() {
  const agents = await db.select().from(aiAgents).limit(20);
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">AI Agent</h1>{agents.map((agent) => <Card key={agent.id}><CardHeader><CardTitle>{agent.name}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-muted-foreground text-sm">{agent.provider} / {agent.modelId}</p><p className="whitespace-pre-wrap text-sm">{agent.systemPrompt}</p></CardContent></Card>)}</div>;
}
