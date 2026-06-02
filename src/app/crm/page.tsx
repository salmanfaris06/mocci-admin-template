import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmDashboardSummary, getRecentConversations } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function CrmOverviewPage() {
  const [summary, conversations] = await Promise.all([getCrmDashboardSummary(), getRecentConversations(6)]);
  return <div className="space-y-6 p-6"><div><h1 className="font-semibold text-3xl tracking-tight">CRM AI Overview</h1><p className="text-muted-foreground">WhatsApp conversations, AI usage, and pipeline health.</p></div><div className="grid gap-4 md:grid-cols-4">{Object.entries({ Contacts: summary.contacts, Conversations: summary.conversations, Messages: summary.messages, "AI Cost": `$${summary.aiCostUsd}` }).map(([label, value]) => <Card key={label}><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="font-semibold text-2xl">{value}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>Recent conversations</CardTitle></CardHeader><CardContent className="space-y-3">{conversations.map((conversation) => <div className="rounded-lg border p-3" key={conversation.id}><div className="font-medium">{conversation.contactName ?? conversation.remoteJid}</div><p className="text-muted-foreground text-sm">{conversation.lastMessageSummary ?? "No messages yet"}</p></div>)}</CardContent></Card></div>;
}
