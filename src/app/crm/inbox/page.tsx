import { PageHeader } from "@/components/showcase";

import { getInboxSnapshot } from "@/server/crm/inbox-snapshot";

import { CrmChatWorkspace } from "./crm-chat-workspace";

export const dynamic = "force-dynamic";

export default async function CrmInboxPage() {
  const { activeConversationId, conversations, messages } = await getInboxSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" description="Live WhatsApp conversations captured through Evolution API webhooks." />
      <CrmChatWorkspace initialActiveConversationId={activeConversationId} initialConversations={conversations} initialMessages={messages} />
    </div>
  );
}
