import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { conversations, messages } from "@/server/db/schema";

type EvolutionTextClient = {
  sendTextMessage(number: string, text: string): Promise<unknown>;
};

type SendOutgoingTextMessageInput = {
  conversationId: string;
  to: string;
  text: string;
  senderType: "admin" | "ai";
  metadata?: Record<string, unknown>;
};

export function readEvolutionMessageId(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;
  const record = response as Record<string, unknown>;
  const key = record.key;
  if (
    key &&
    typeof key === "object" &&
    typeof (key as Record<string, unknown>).id === "string"
  )
    return (key as Record<string, unknown>).id as string;
  if (typeof record.messageId === "string") return record.messageId;
  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Evolution send failed";
}

export async function sendOutgoingTextMessage(
  client: EvolutionTextClient,
  input: SendOutgoingTextMessageInput,
) {
  const queuedAt = new Date();
  const [message] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      direction: "outbound",
      senderType: input.senderType,
      messageType: "text",
      text: input.text,
      rawMetadata: input.metadata ?? {},
      status: "sending",
      sentAt: queuedAt,
    })
    .returning();

  try {
    const response = await client.sendTextMessage(input.to, input.text);
    const sentAt = new Date();
    const evolutionMessageId = readEvolutionMessageId(response);

    await db
      .update(messages)
      .set({
        evolutionMessageId,
        rawMetadata: { ...(input.metadata ?? {}), evolutionResponse: response },
        status: "sent",
        sentAt,
        updatedAt: sentAt,
      })
      .where(eq(messages.id, message.id));

    await db
      .update(conversations)
      .set({
        lastMessageAt: sentAt,
        lastMessageSummary: input.text,
        updatedAt: sentAt,
      })
      .where(eq(conversations.id, input.conversationId));

    return {
      messageId: message.id,
      evolutionMessageId,
      status: "sent" as const,
      sentAt,
    };
  } catch (error) {
    const failedAt = new Date();
    await db
      .update(messages)
      .set({
        status: "failed",
        rawMetadata: {
          ...(input.metadata ?? {}),
          errorMessage: errorMessage(error),
        },
        updatedAt: failedAt,
      })
      .where(eq(messages.id, message.id));
    throw error;
  }
}
