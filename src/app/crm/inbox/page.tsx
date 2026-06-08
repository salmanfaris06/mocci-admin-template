import { PageHeader } from "@/components/showcase";

import { fetchAllInstances } from "@/server/crm/evolution";
import { getInboxSnapshot } from "@/server/crm/inbox-snapshot";

import { CrmChatWorkspace } from "./crm-chat-workspace";

export const dynamic = "force-dynamic";

type WhatsAppConnection =
  | { status: "not-configured" }
  | { status: "no-instance"; instanceName: string }
  | { status: "connected"; instanceName: string; state: string }
  | { status: "disconnected"; instanceName: string; state: string }
  | { status: "unknown"; instanceName: string };

function isConnectedState(state: string) {
  const normalizedState = state.toLowerCase();
  return normalizedState === "open" || normalizedState === "connected";
}

async function getWhatsAppConnection(): Promise<WhatsAppConnection> {
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME?.trim();
  const evolutionConfigured = Boolean(process.env.EVOLUTION_BASE_URL && instanceName && process.env.EVOLUTION_API_KEY);

  if (!evolutionConfigured || !instanceName) return { status: "not-configured" };

  try {
    const instances = await fetchAllInstances();
    const instance = instances.find((candidate) => candidate.name === instanceName);

    if (!instance) return { status: "no-instance", instanceName };
    if (isConnectedState(instance.state)) return { status: "connected", instanceName, state: instance.state };

    return { status: "disconnected", instanceName, state: instance.state };
  } catch {
    return { status: "unknown", instanceName };
  }
}

export default async function CrmInboxPage() {
  const [{ activeConversationId, conversations, hasMoreMessages, messages }, whatsAppConnection] = await Promise.all([getInboxSnapshot(), getWhatsAppConnection()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" description="Live WhatsApp conversations captured through Evolution API webhooks." />
      <CrmChatWorkspace initialActiveConversationId={activeConversationId} initialConversations={conversations} initialHasMoreMessages={hasMoreMessages} initialMessages={messages} whatsAppConnection={whatsAppConnection} />
    </div>
  );
}
