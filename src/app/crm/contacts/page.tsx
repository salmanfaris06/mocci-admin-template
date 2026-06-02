import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmContacts } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function CrmContactsPage() {
  const rows = await getCrmContacts();
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">Contacts</h1><Card><CardHeader><CardTitle>WhatsApp contacts</CardTitle></CardHeader><CardContent className="grid gap-3">{rows.map((contact) => <div className="rounded-lg border p-4" key={contact.id}><strong>{contact.displayName ?? contact.remoteJid}</strong><p className="text-muted-foreground text-sm">{contact.phone ?? contact.remoteJid}</p></div>)}</CardContent></Card></div>;
}
