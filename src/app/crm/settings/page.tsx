import { PageHeader } from "@/components/showcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskSecret } from "@/server/security/crypto";

import { saveOpenAiKey } from "./actions";
import { WhatsAppLoginCard } from "./whatsapp-login-card";

export const dynamic = "force-dynamic";

export default async function CrmSettingsPage() {
  const maskedOpenAi = process.env.OPENAI_API_KEY ? maskSecret(process.env.OPENAI_API_KEY) : "Not configured";
  const evolutionConfigured = Boolean(process.env.EVOLUTION_BASE_URL && process.env.EVOLUTION_INSTANCE_NAME && process.env.EVOLUTION_API_KEY);

  return (
    <div className="space-y-6">
      <PageHeader title="API Settings" description="Developer-managed integrations for WhatsApp login and AI automation." />
      <div className="grid gap-4 lg:grid-cols-2">
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
