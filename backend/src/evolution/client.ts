export type EvolutionClientOptions = {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  timeoutMs?: number;
};

export class EvolutionApiError extends Error {
  name = "EvolutionApiError";

  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function redactSensitiveText(value: string, secrets: string[]) {
  return secrets
    .filter(Boolean)
    .reduce((text, secret) => text.replaceAll(secret, "[REDACTED]"), value);
}

function readErrorCode(bodyText: string) {
  try {
    const parsed = JSON.parse(bodyText) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    const error =
      "error" in parsed ? (parsed as Record<string, unknown>).error : undefined;
    if (!error || typeof error !== "object") return undefined;
    const code = (error as Record<string, unknown>).code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

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
  idempotentBrokenInstanceMessage?: string;
  idempotentConnectionClosedMessage?: string;
  idempotentNotFoundMessage?: string;
};

export class EvolutionClient {
  private readonly baseUrl: string;

  constructor(private readonly options: EvolutionClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  private async request(
    path: string,
    init: RequestInit = {},
    requestOptions: EvolutionRequestOptions = {},
  ) {
    const timeoutMs = this.options.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          apikey: this.options.apiKey,
          ...init.headers,
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        const bodyText = await response.text();
        if (
          requestOptions.idempotentAlreadyExistsMessage &&
          bodyText.toLowerCase().includes("already in use")
        ) {
          return {
            status: "SUCCESS",
            error: false,
            response: {
              message: requestOptions.idempotentAlreadyExistsMessage,
            },
          };
        }
        if (
          requestOptions.idempotentBrokenInstanceMessage &&
          bodyText.includes("reading 'instanceId'")
        ) {
          throw new Error(
            `Evolution API broken instance state ${response.status}: ${bodyText}`,
          );
        }
        if (
          requestOptions.idempotentConnectionClosedMessage &&
          bodyText.toLowerCase().includes("connection closed")
        ) {
          return {
            status: "SUCCESS",
            error: false,
            response: {
              message: requestOptions.idempotentConnectionClosedMessage,
            },
          };
        }
        if (
          requestOptions.idempotentNotFoundMessage &&
          response.status === 404
        ) {
          return {
            status: "SUCCESS",
            error: false,
            response: { message: requestOptions.idempotentNotFoundMessage },
          };
        }
        const redactedBodyText = redactSensitiveText(bodyText, [
          this.options.apiKey,
        ]);
        const code = readErrorCode(bodyText);
        throw new EvolutionApiError(
          `Evolution API request failed ${response.status}: ${redactedBodyText}`,
          response.status,
          path,
          code,
        );
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
    return this.request(
      `/chat/markMessageAsRead/${this.options.instanceName}`,
      { method: "POST", body: JSON.stringify({ readMessages }) },
    );
  }

  setPresence(
    presence: "available" | "unavailable" | "composing" | "recording",
  ) {
    return this.request(`/instance/setPresence/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ presence }),
    });
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
                byEvents: true,
                base64: false,
                webhookByEvents: true,
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
    return this.request(
      `/instance/connectionState/${this.options.instanceName}`,
    );
  }

  fetchInstances() {
    return this.request("/instance/fetchInstances");
  }

  setWebhook(webhookUrl: string, webhookSecret?: string) {
    return this.request(`/webhook/set/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: true,
          base64: false,
          webhookByEvents: true,
          webhookBase64: false,
          events: defaultWebhookEvents,
          headers: webhookSecret
            ? { "x-webhook-secret": webhookSecret }
            : undefined,
        },
      }),
    });
  }

  logoutInstance() {
    return this.request(
      `/instance/logout/${this.options.instanceName}`,
      { method: "DELETE" },
      { idempotentConnectionClosedMessage: "Instance already disconnected" },
    );
  }

  restartInstance() {
    return this.request(
      `/instance/restart/${this.options.instanceName}`,
      { method: "PUT" },
      { idempotentNotFoundMessage: "Instance not found" },
    );
  }

  async deleteInstance() {
    try {
      return await this.request(
        `/instance/delete/${this.options.instanceName}`,
        { method: "DELETE" },
        {
          idempotentBrokenInstanceMessage: "Instance already deleted",
          idempotentConnectionClosedMessage: "Instance already deleted",
          idempotentNotFoundMessage: "Instance already deleted",
        },
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("Evolution API broken instance state")
      )
        throw error;

      await this.restartInstance().catch(() => undefined);
      return this.request(
        `/instance/delete/${this.options.instanceName}`,
        { method: "DELETE" },
        {
          idempotentConnectionClosedMessage: "Instance already deleted",
          idempotentNotFoundMessage: "Instance already deleted",
        },
      );
    }
  }

  sendTextMessage(number: string, text: string) {
    return this.request(`/message/sendText/${this.options.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ number, text }),
    });
  }
}
