export type EvolutionClientOptions = { baseUrl: string; apiKey: string; instanceName: string };

const defaultWebhookEvents = [
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "CONNECTION_UPDATE",
  "QRCODE_UPDATED",
  "CONTACTS_UPSERT",
  "CHATS_UPSERT",
];

export class EvolutionClient {
  constructor(private readonly options: EvolutionClientOptions) {}

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", apikey: this.options.apiKey, ...init.headers },
    });
    if (!response.ok) throw new Error(`Evolution API request failed ${response.status}: ${await response.text()}`);
    return response.json() as Promise<unknown>;
  }

  markMessageAsRead(readMessages: unknown[]) {
    return this.request(`/chat/markMessageAsRead/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ readMessages }) });
  }

  setPresence(presence: "available" | "unavailable" | "composing" | "recording") {
    return this.request(`/instance/setPresence/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ presence }) });
  }

  createInstance(webhookUrl?: string) {
    return this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: this.options.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: webhookUrl
          ? {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: false,
              events: defaultWebhookEvents,
            }
          : undefined,
      }),
    });
  }

  connectInstance() {
    return this.request(`/instance/connect/${this.options.instanceName}`);
  }

  getConnectionState() {
    return this.request(`/instance/connectionState/${this.options.instanceName}`);
  }

  fetchInstances() {
    return this.request("/instance/fetchInstances");
  }

  setWebhook(webhookUrl: string) {
    return this.request(`/webhook/set/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        base64: false,
        events: defaultWebhookEvents,
      }),
    });
  }

  logoutInstance() {
    return this.request(`/instance/logout/${this.options.instanceName}`, { method: "DELETE" });
  }

  deleteInstance() {
    return this.request(`/instance/delete/${this.options.instanceName}`, { method: "DELETE" });
  }

  sendTextMessage(number: string, text: string) {
    return this.request(`/message/sendText/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ number, text }) });
  }
}
