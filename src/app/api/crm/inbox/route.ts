import { getInboxSnapshot } from "@/server/crm/inbox-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const conversationId = new URL(request.url).searchParams.get("conversationId") ?? undefined;
  const snapshot = await getInboxSnapshot(conversationId);

  return Response.json(snapshot);
}
