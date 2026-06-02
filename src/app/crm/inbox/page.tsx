import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentConversations } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function CrmInboxPage() {
  const conversations = await getRecentConversations(50);
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">WhatsApp Inbox</h1><Card><CardHeader><CardTitle>Conversations</CardTitle></CardHeader><CardContent className="grid gap-3">{conversations.map((conversation) => <div className="rounded-lg border p-4" key={conversation.id}><div className="flex items-center justify-between"><strong>{conversation.contactName ?? conversation.remoteJid}</strong><span className="text-muted-foreground text-sm">{conversation.status}</span></div><p className="text-muted-foreground text-sm">{conversation.lastMessageSummary}</p></div>)}</CardContent></Card></div>;
}
