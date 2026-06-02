export type EvolutionClientOptions = { baseUrl: string; apiKey: string; instanceName: string };

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

  sendTextMessage(number: string, text: string) {
    return this.request(`/message/sendText/${this.options.instanceName}`, { method: "POST", body: JSON.stringify({ number, text }) });
  }
}
