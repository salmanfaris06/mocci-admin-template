export type EvolutionClientOptions = { baseUrl: string; apiKey: string; instanceName: string; timeoutMs?: number };

const defaultWebhookEvents = [
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "CONNECTION_UPDATE",
  "QRCODE_UPDATED",
  "CONTACTS_UPSERT",
  "CHATS_UPSERT",
];

type EvolutionRequestOptions = {
  idempotentAlreadyExistsMessage?: string;
  idempotentConnectionClosedMessage?: string;
  idempotentNotFoundMessage?: string;
};

export class EvolutionClient {
  constructor(private readonly options: EvolutionClientOptions) {}

  private async request(path: string, init: RequestInit = {}, requestOptions: EvolutionRequestOptions = {}) {
    const timeoutMs = this.options.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        ...init,
        headers: { "content-type": "application/json", apikey: this.options.apiKey, ...init.headers },
        signal: controller.signal,
      });
      if (!response.ok) {
        const bodyText = await response.text();
        if (requestOptions.idempotentAlreadyExistsMessage && bodyText.toLowerCase().includes("already in use")) {
          return { status: "SUCCESS", error: false, response: { message: requestOptions.idempotentAlreadyExistsMessage } };
        }
        if (requestOptions.idempotentConnectionClosedMessage && bodyText.toLowerCase().includes("connection closed")) {
          return { status: "SUCCESS", error: false, response: { message: requestOptions.idempotentConnectionClosedMessage } };
        }
        if (requestOptions.idempotentNotFoundMessage && response.status === 404) {
          return { status: "SUCCESS", error: false, response: { message: requestOptions.idempotentNotFoundMessage } };
        }
        throw new Error(`Evolution API request failed ${response.status}: ${bodyText}`);
      }
      return response.json() as Promise<unknown>;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Evolution API request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  markMessageAsRead(readMessages: unknown[]) {
    return this.request(`/chat/markMessageAsRead/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ readMessages }) });
  }

  setPresence(presence: "available" | "unavailable" | "composing" | "recording") {
    return this.request(`/instance/setPresence/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ presence }) });
  }

  createInstance(webhookUrl?: string) {
    return this.request(
      "/instance/create",
      {
        method: "POST",
        body: JSON.stringify({
          instanceName: this.options.instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          webhook: webhookUrl
            ? {
                enabled: true,
                url: webhookUrl,
                byEvents: false,
                base64: false,
                webhookByEvents: false,
                webhookBase64: false,
                events: defaultWebhookEvents,
              }
            : undefined,
        }),
      },
      { idempotentAlreadyExistsMessage: "Instance already exists" },
    );
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
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          webhookByEvents: false,
          webhookBase64: false,
          events: defaultWebhookEvents,
        },
      }),
    });
  }

  logoutInstance() {
    return this.request(`/instance/logout/${this.options.instanceName}`, { method: "DELETE" }, { idempotentConnectionClosedMessage: "Instance already disconnected" });
  }

  deleteInstance() {
    return this.request(`/instance/delete/${this.options.instanceName}`, { method: "DELETE" }, { idempotentConnectionClosedMessage: "Instance already deleted", idempotentNotFoundMessage: "Instance already deleted" });
  }

  sendTextMessage(number: string, text: string) {
    return this.request(`/message/sendText/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ number, text }) });
  }
}
