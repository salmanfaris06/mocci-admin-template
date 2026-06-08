type ReactionKey = {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
};

type ReactionClient = {
  sendReaction(input: Record<string, unknown>): Promise<unknown>;
};

type SendMessageReactionInput = {
  reactionKey: ReactionKey;
  reactionMessage: string;
};

function assertReactionKey(key: ReactionKey) {
  if (!key.remoteJid || typeof key.fromMe !== "boolean" || !key.id)
    throw new Error("Reaction requires original message key");
}

export async function sendMessageReaction(
  client: ReactionClient,
  input: SendMessageReactionInput,
) {
  assertReactionKey(input.reactionKey);
  if (!input.reactionMessage.trim())
    throw new Error("Reaction message is required");
  return client.sendReaction({
    reactionKey: input.reactionKey,
    reactionMessage: input.reactionMessage,
  });
}
