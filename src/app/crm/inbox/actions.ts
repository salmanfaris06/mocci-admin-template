"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getEvolutionClient } from "@/server/crm/evolution";
import { db } from "@/server/db";
import { conversations, messages } from "@/server/db/schema";

const sendManualWhatsAppMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1),
  to: z.string().trim().min(1),
});

function readEvolutionMessageId(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;
  const record = response as Record<string, unknown>;
  const key = record.key;
  if (key && typeof key === "object" && typeof (key as Record<string, unknown>).id === "string") {
    return (key as Record<string, unknown>).id as string;
  }
  if (typeof record.messageId === "string") return record.messageId;
  return undefined;
}

export async function sendManualWhatsAppMessage(input: z.infer<typeof sendManualWhatsAppMessageSchema>) {
  const values = sendManualWhatsAppMessageSchema.parse(input);
  const client = await getEvolutionClient();

  const sentAt = new Date();
  const response = await client.sendTextMessage(values.to, values.text);
  const evolutionMessageId = readEvolutionMessageId(response);

  await db.insert(messages).values({
    conversationId: values.conversationId,
    evolutionMessageId,
    direction: "outbound",
    senderType: "admin",
    messageType: "text",
    text: values.text,
    rawMetadata: { evolutionResponse: response },
    status: "sent",
    sentAt,
  });

  await db
    .update(conversations)
    .set({ lastMessageAt: sentAt, lastMessageSummary: values.text, updatedAt: sentAt })
    .where(eq(conversations.id, values.conversationId));

  revalidatePath("/inbox");

  return { sentAt };
}
