import { getEvolutionClient } from "@/server/crm/evolution";
import { getInboxSnapshot } from "@/server/crm/inbox-snapshot";
import { markConversationMessagesAsRead } from "@/server/crm/read-receipts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const conversationId = searchParams.get("conversationId") ?? undefined;
  const before = searchParams.get("before") ?? undefined;
  if (conversationId) {
    const client = await getEvolutionClient().catch(() => undefined);
    if (client) {
      await markConversationMessagesAsRead(client, conversationId).catch(
        () => undefined,
      );
    }
  }

  const snapshot = await getInboxSnapshot(conversationId, { before });

  return Response.json(snapshot);
}
