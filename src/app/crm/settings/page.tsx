import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/server/db";
import { apiSettings } from "@/server/db/schema";
import { maskSecret } from "@/server/security/crypto";

import { saveEvolutionSettings, saveOpenAiKey } from "./actions";
import { WhatsAppLoginCard } from "./whatsapp-login-card";

export const dynamic = "force-dynamic";

export default async function CrmSettingsPage() {
  const [settings] = process.env.DATABASE_URL ? await db.select().from(apiSettings).limit(1) : [];
  const maskedEvolution = process.env.EVOLUTION_API_KEY ? maskSecret(process.env.EVOLUTION_API_KEY) : "Not configured";
  const maskedOpenAi = process.env.OPENAI_API_KEY ? maskSecret(process.env.OPENAI_API_KEY) : "Not configured";
  const connectionState = settings?.connectionState ?? "Not tested";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-3xl tracking-tight">CRM Settings</h1>
        <p className="text-muted-foreground">Store API credentials encrypted. Full secrets are never rendered back to the browser.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolution API</CardTitle>
            <CardDescription>Current env fallback: {maskedEvolution}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form action={saveEvolutionSettings} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="evolutionBaseUrl">Base URL</Label>
                <Input id="evolutionBaseUrl" name="evolutionBaseUrl" placeholder="https://evolution.example.com" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="evolutionInstanceName">Instance name</Label>
                <Input id="evolutionInstanceName" name="evolutionInstanceName" placeholder="main" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="evolutionApiKey">API key</Label>
                <Input id="evolutionApiKey" name="evolutionApiKey" type="password" autoComplete="new-password" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input id="webhookUrl" name="webhookUrl" placeholder="https://api.example.com/webhooks/evolution" />
              </div>
              <Button className="w-fit" type="submit">
                Save Evolution settings
              </Button>
            </form>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-medium">Connection state</div>
              <p className="mt-1 break-words text-muted-foreground">{connectionState}</p>
            </div>
          </CardContent>
        </Card>
        <WhatsAppLoginCard initialConnectionState={connectionState} />

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
