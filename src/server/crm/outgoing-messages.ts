import { eq } from "drizzle-orm";

import { db } from "../db";
import { conversations, jobs, messages } from "../db/schema";

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

type RetryOutgoingTextMessageInput = SendOutgoingTextMessageInput & {
  messageId: string;
  attempt: number;
  maxAttempts?: number;
};

function retryDelayMs(attempt: number) {
  return Math.min(60_000 * 2 ** Math.max(attempt - 1, 0), 15 * 60_000);
}

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

async function queueOutgoingRetry(
  input: RetryOutgoingTextMessageInput,
  error: unknown,
) {
  const nextAttempt = input.attempt + 1;
  const maxAttempts = input.maxAttempts ?? 3;
  if (nextAttempt > maxAttempts) return false;

  await db.insert(jobs).values({
    type: "whatsapp.send_text.retry",
    status: "queued",
    attempts: 0,
    scheduledAt: new Date(Date.now() + retryDelayMs(nextAttempt)),
    payload: {
      conversationId: input.conversationId,
      messageId: input.messageId,
      senderType: input.senderType,
      text: input.text,
      to: input.to,
      attempt: nextAttempt,
      maxAttempts,
      errorMessage: errorMessage(error),
    },
  });

  return true;
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
    await queueOutgoingRetry(
      { ...input, messageId: message.id, attempt: 0 },
      error,
    );
    throw error;
  }
}

export async function retryOutgoingTextMessage(
  client: EvolutionTextClient,
  input: RetryOutgoingTextMessageInput,
) {
  try {
    const response = await client.sendTextMessage(input.to, input.text);
    const sentAt = new Date();
    const evolutionMessageId = readEvolutionMessageId(response);

    await db
      .update(messages)
      .set({
        evolutionMessageId,
        rawMetadata: {
          ...(input.metadata ?? {}),
          evolutionResponse: response,
          attempts: input.attempt,
        },
        status: "sent",
        sentAt,
        updatedAt: sentAt,
      })
      .where(eq(messages.id, input.messageId));

    await db
      .update(conversations)
      .set({
        lastMessageAt: sentAt,
        lastMessageSummary: input.text,
        updatedAt: sentAt,
      })
      .where(eq(conversations.id, input.conversationId));

    return {
      status: "sent" as const,
      attempts: input.attempt,
      evolutionMessageId,
    };
  } catch (error) {
    const maxAttempts = input.maxAttempts ?? 3;
    const failedAt = new Date();
    if (input.attempt >= maxAttempts) {
      await db
        .update(messages)
        .set({
          status: "failed",
          rawMetadata: {
            ...(input.metadata ?? {}),
            errorMessage: errorMessage(error),
            permanentFailure: true,
            attempts: input.attempt,
          },
          updatedAt: failedAt,
        })
        .where(eq(messages.id, input.messageId));
      return { status: "failed_permanent" as const, attempts: input.attempt };
    }

    await db
      .update(messages)
      .set({
        status: "failed",
        rawMetadata: {
          ...(input.metadata ?? {}),
          errorMessage: errorMessage(error),
          attempts: input.attempt,
        },
        updatedAt: failedAt,
      })
      .where(eq(messages.id, input.messageId));
    await queueOutgoingRetry(input, error);
    return { status: "queued_retry" as const, attempts: input.attempt + 1 };
  }
}
