import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPipelineBoard } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function CrmPipelinePage() {
  const board = await getPipelineBoard();
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">Pipeline</h1><div className="grid gap-4 md:grid-cols-5">{board.map((stage) => <Card key={stage.id}><CardHeader><CardTitle>{stage.name}</CardTitle></CardHeader><CardContent className="space-y-2">{stage.items.map((item) => <div className="rounded-md border p-3" key={item.id}><strong className="text-sm">{item.title}</strong><p className="text-muted-foreground text-xs">{item.contactName ?? item.remoteJid}</p></div>)}</CardContent></Card>)}</div></div>;
}
