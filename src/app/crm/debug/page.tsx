import { BugIcon, DatabaseIcon, LinkIcon, MessageSquareIcon, WebhookIcon } from "lucide-react";

import { PageHeader } from "@/components/showcase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCrmDebugData } from "@/server/crm/debug";

import { RefreshDebugButton } from "./refresh-debug-button";

export const dynamic = "force-dynamic";

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{JSON.stringify(value, null, 2)}</pre>;
}

function ErrorCard({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="py-4 text-sm text-destructive">{message}</CardContent>
    </Card>
  );
}

function readParsedState(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readPath(value: unknown, path: string[]) {
  let cursor = value;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" || typeof cursor === "number" || typeof cursor === "boolean" ? String(cursor) : undefined;
}

function normalizePhone(value?: string) {
  if (!value) return "-";
  const number = value.split("@")[0]?.replace(/\D/g, "");
  return number ? `+${number}` : value;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "processed" || status === "open" || status === "received" ? "default" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function CrmDebugPage() {
  const debug = await getCrmDebugData();
  const parsedConnectionState = debug.settings?.connectionState ? readParsedState(debug.settings.connectionState) : null;
  const state = readPath(parsedConnectionState, ["connectionState", "instance", "state"]) ?? readPath(parsedConnectionState, ["instance", "connectionStatus"]) ?? debug.settings?.connectionState ?? "unknown";
  const instanceName = readPath(parsedConnectionState, ["connectionState", "instance", "instanceName"]) ?? readPath(parsedConnectionState, ["instance", "name"]) ?? debug.settings?.evolutionInstanceName ?? "-";
  const profileName = readPath(parsedConnectionState, ["instance", "profileName"]);
  const phone = normalizePhone(readPath(parsedConnectionState, ["instance", "ownerJid"]) ?? readPath(parsedConnectionState, ["instance", "number"]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Debug & Logs" description="Inspect Evolution webhooks, message ingestion, connection state, and CRM database health." />
        <RefreshDebugButton />
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="webhooks"><WebhookIcon /> Webhook Logs</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquareIcon /> Message Processing</TabsTrigger>
          <TabsTrigger value="evolution"><LinkIcon /> Evolution Connection</TabsTrigger>
          <TabsTrigger value="database"><DatabaseIcon /> Database Health</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <ErrorCard message={debug.webhookLogsError} />
          <div className="grid gap-3">
            {debug.webhookLogs.length ? (
              debug.webhookLogs.map((event) => (
                <Card key={event.id}>
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">{event.eventType}</CardTitle>
                      <StatusBadge status={event.status} />
                    </div>
                    <CardDescription>{event.createdAt.toLocaleString()} · {event.idempotencyKey}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.errorMessage ? <p className="text-sm text-destructive">{event.errorMessage}</p> : null}
                    <JsonBlock value={event.rawPayload} />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card><CardContent className="py-8 text-sm text-muted-foreground">No webhook logs yet. Trigger a WhatsApp message after saving the webhook URL.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <ErrorCard message={debug.recentMessagesError} />
          <div className="grid gap-3">
            {debug.recentMessages.length ? (
              debug.recentMessages.map((message) => (
                <Card key={message.id}>
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">{message.contactName ?? message.remoteJid}</CardTitle>
                      <div className="flex gap-2"><Badge variant="outline">{message.direction}</Badge><StatusBadge status={message.status} /></div>
                    </div>
                    <CardDescription>{message.createdAt.toLocaleString()} · {message.evolutionMessageId ?? "no evolution id"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>{message.text ?? message.caption ?? "Unsupported message"}</p>
                    <div className="grid gap-1 text-muted-foreground md:grid-cols-2">
                      <span>Remote JID: {message.remoteJid}</span>
                      <span>Phone: {message.phone ?? "-"}</span>
                      <span>Conversation: {message.conversationId}</span>
                      <span>Sender: {message.senderType} · {message.messageType}</span>
                    </div>
                    <JsonBlock value={message.rawMetadata} />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card><CardContent className="py-8 text-sm text-muted-foreground">No processed messages yet. If webhook logs exist, check whether processedMessages is 0 or payload lacks remoteJid/message id.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4">
          <ErrorCard message={debug.settingsError} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BugIcon className="size-4" /> Evolution Instance</CardTitle>
              <CardDescription>Current saved settings and last tested connection state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">State</div><div className="font-medium">{state}</div></div>
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Instance</div><div className="font-medium">{instanceName}</div></div>
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Number</div><div className="font-medium">{phone}</div></div>
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Profile</div><div className="font-medium">{profileName ?? "-"}</div></div>
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Webhook enabled</div><div className="font-medium">{debug.settings?.webhookEnabled ? "yes" : "no"}</div></div>
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Webhook URL</div><div className="break-all font-medium">{debug.settings?.webhookUrl ?? "-"}</div></div>
              </div>
              <JsonBlock value={parsedConnectionState ?? debug.settings?.connectionState ?? null} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <ErrorCard message={debug.countsError} />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(debug.counts).map(([name, count]) => (
              <Card key={name}>
                <CardHeader>
                  <CardDescription>{name}</CardDescription>
                  <CardTitle className="text-3xl">{count}</CardTitle>
                </CardHeader>
              </Card>
            ))}
            {!Object.keys(debug.counts).length ? <Card><CardContent className="py-8 text-sm text-muted-foreground">No database count data available.</CardContent></Card> : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
