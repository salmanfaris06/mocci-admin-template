import { handleEvolutionWebhook } from "../route";

export async function GET(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  return Response.json({
    ok: true,
    endpoint: new URL(request.url).pathname,
    event,
    status: "ready",
    message: "Evolution webhook endpoint is ready. Incoming WhatsApp messages must be delivered with POST and a JSON body.",
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  return handleEvolutionWebhook(request, event);
}
