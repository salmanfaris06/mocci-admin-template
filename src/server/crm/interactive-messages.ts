type InteractiveClient = {
  sendButtonsMessage(input: Record<string, unknown>): Promise<unknown>;
  sendListMessage(input: Record<string, unknown>): Promise<unknown>;
  sendPollMessage(input: Record<string, unknown>): Promise<unknown>;
};

function requireFallbackText(value: unknown) {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Interactive messages require fallback text");
}

export async function sendButtonsWithFallback(
  client: Pick<InteractiveClient, "sendButtonsMessage">,
  input: Record<string, unknown>,
) {
  requireFallbackText(input.text);
  return client.sendButtonsMessage(input);
}

export async function sendListWithFallback(
  client: Pick<InteractiveClient, "sendListMessage">,
  input: Record<string, unknown>,
) {
  requireFallbackText(input.description);
  return client.sendListMessage(input);
}

export async function sendPollWithFallback(
  client: Pick<InteractiveClient, "sendPollMessage">,
  input: Record<string, unknown>,
) {
  requireFallbackText(input.name);
  return client.sendPollMessage(input);
}
