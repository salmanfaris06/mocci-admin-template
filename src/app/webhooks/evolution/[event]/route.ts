import { handleEvolutionWebhook } from "@/app/api/webhooks/evolution/route";

export async function GET(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  return handleEvolutionWebhook(request, event);
}

export async function POST(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  return handleEvolutionWebhook(request, event);
}
