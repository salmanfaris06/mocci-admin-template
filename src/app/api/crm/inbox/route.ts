import { getInboxSnapshot } from "@/server/crm/inbox-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const conversationId = searchParams.get("conversationId") ?? undefined;
  const before = searchParams.get("before") ?? undefined;
  const snapshot = await getInboxSnapshot(conversationId, { before });

  return Response.json(snapshot);
}
