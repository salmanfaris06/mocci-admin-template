import { PageHeader } from "@/components/showcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskSecret } from "@/server/security/crypto";

import { saveOpenAiKey } from "./actions";
import { WhatsAppLoginCard } from "./whatsapp-login-card";

export const dynamic = "force-dynamic";

function EnvStatus({ label, value, secret = false }: { label: string; value?: string; secret?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value ? (secret ? maskSecret(value) : value) : "Not configured"}</div>
    </div>
  );
}

function vercelWebhookUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return undefined;

  const origin = vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://") ? vercelUrl : `https://${vercelUrl}`;
  return `${origin.replace(/\/$/, "")}/api/webhooks/evolution`;
}

function effectiveWebhookUrl() {
  const configuredUrl = process.env.EVOLUTION_WEBHOOK_URL?.trim();
  const fallbackUrl = vercelWebhookUrl();

  if (!configuredUrl) return fallbackUrl;
  if (/https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuredUrl) && process.env.VERCEL_URL) return fallbackUrl;
  return configuredUrl;
}

export default async function CrmSettingsPage() {
  const maskedOpenAi = process.env.OPENAI_API_KEY ? maskSecret(process.env.OPENAI_API_KEY) : "Not configured";
  const evolutionConfigured = Boolean(process.env.EVOLUTION_BASE_URL && process.env.EVOLUTION_INSTANCE_NAME && process.env.EVOLUTION_API_KEY);
  const webhookUrl = effectiveWebhookUrl();

  return (
    <div className="space-y-6">
      <PageHeader title="API Settings" description="Evolution API is configured from environment variables. Secrets are never rendered back to the browser." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolution API</CardTitle>
            <CardDescription>{evolutionConfigured ? "Configured from environment variables" : "Missing required environment variables"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3">
              <EnvStatus label="EVOLUTION_BASE_URL" value={process.env.EVOLUTION_BASE_URL} />
              <EnvStatus label="EVOLUTION_INSTANCE_NAME" value={process.env.EVOLUTION_INSTANCE_NAME} />
              <EnvStatus label="EVOLUTION_API_KEY" value={process.env.EVOLUTION_API_KEY} secret />
              <EnvStatus label="Effective webhook URL" value={webhookUrl} />
              <EnvStatus label="EVOLUTION_WEBHOOK_URL" value={process.env.EVOLUTION_WEBHOOK_URL} />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Edit these values in your deployment environment, for example Vercel Project Settings → Environment Variables. Then redeploy the app and click Refresh status.
            </div>
          </CardContent>
        </Card>
        <WhatsAppLoginCard initialConnectionState={evolutionConfigured ? "Not tested" : "Evolution env not configured"} />

        <Card>
          <CardHeader>
            <CardTitle>OpenAI</CardTitle>
            <CardDescription>Current env fallback: {maskedOpenAi}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveOpenAiKey} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="openAiApiKey">OpenAI API key</Label>
                <Input id="openAiApiKey" name="openAiApiKey" type="password" autoComplete="new-password" />
              </div>
              <Button className="w-fit" type="submit">
                Save OpenAI key
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
