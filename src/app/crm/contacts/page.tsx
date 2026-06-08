import { MessageCircleIcon, UserPlusIcon, UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/showcase";
import { getCrmContacts } from "@/server/crm/queries";
import { StatCards } from "@/app/pages/ecommerce/stat-card";

import { ContactsTable } from "./contacts-table";

export default async function ContactsPage() {
  const contacts = await getCrmContacts(100);
  const activeChats = contacts.filter((contact) => contact.conversationStatus === "open").length;
  const newLeads = contacts.filter((contact) => contact.status === "new").length;
  const needFollowUp = contacts.filter((contact) => contact.conversationStatus === "needs_attention" || contact.pipelineStageName === "Proposal").length;


  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description="Manage WhatsApp contacts, CRM status, and recent conversation context." />

      <StatCards
        stats={[
          { label: "Total contacts", value: String(contacts.length), icon: UsersIcon },
          { label: "New leads", value: String(newLeads), icon: UserPlusIcon },
          { label: "Need follow-up", value: String(needFollowUp), icon: MessageCircleIcon },
          { label: "Active chats", value: String(activeChats), icon: MessageCircleIcon },
        ]}
      />

      <ContactsTable contacts={contacts} />
    </div>
  );
}
