import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function CrmContactsPage() {
  const rows = await db.select().from(contacts).limit(100);
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">Contacts</h1><Card><CardHeader><CardTitle>WhatsApp contacts</CardTitle></CardHeader><CardContent className="grid gap-3">{rows.map((contact) => <div className="rounded-lg border p-4" key={contact.id}><strong>{contact.displayName ?? contact.remoteJid}</strong><p className="text-muted-foreground text-sm">{contact.phone ?? contact.remoteJid}</p></div>)}</CardContent></Card></div>;
}
