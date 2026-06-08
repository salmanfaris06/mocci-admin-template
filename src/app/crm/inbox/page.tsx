import { PageHeader } from "@/components/showcase";

import { getInboxSnapshot } from "@/server/crm/inbox-snapshot";
import { getWhatsAppConnection } from "@/server/crm/whatsapp-connection";

import { CrmChatWorkspace } from "./crm-chat-workspace";

export const dynamic = "force-dynamic";

export default async function CrmInboxPage() {
  const [
    { activeConversationId, conversations, hasMoreMessages, messages },
    whatsAppConnection,
  ] = await Promise.all([getInboxSnapshot(), getWhatsAppConnection()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Live WhatsApp conversations captured through Evolution API webhooks."
      />
      <CrmChatWorkspace
        initialActiveConversationId={activeConversationId}
        initialConversations={conversations}
        initialHasMoreMessages={hasMoreMessages}
        initialMessages={messages}
        whatsAppConnection={whatsAppConnection}
      />
    </div>
  );
}
