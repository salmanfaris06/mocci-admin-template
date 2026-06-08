"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { eq } from "drizzle-orm";

import { getEvolutionClient } from "@/server/crm/evolution";
import { sendValidatedMediaMessage } from "@/server/crm/media-message";
import { sendMessageReaction } from "@/server/crm/message-reactions";
import { sendOutgoingTextMessage } from "@/server/crm/outgoing-messages";
import { db } from "@/server/db";
import { messages } from "@/server/db/schema";

const sendManualWhatsAppMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1),
  to: z.string().trim().min(1),
});

const sendManualWhatsAppReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
  messageId: z.string().uuid(),
});

function mediaTypeFromFile(file: File) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function readReactionKey(rawMetadata: Record<string, unknown>) {
  const key = rawMetadata.key;
  if (!key || typeof key !== "object") return undefined;
  return key as { remoteJid?: string; fromMe?: boolean; id?: string };
}

export async function sendManualWhatsAppMedia(formData: FormData) {
  z.string().uuid().parse(formData.get("conversationId"));
  const to = z.string().trim().min(1).parse(formData.get("to"));
  const captionValue = formData.get("caption");
  const caption =
    typeof captionValue === "string" && captionValue.trim()
      ? captionValue.trim()
      : undefined;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Media file is required");

  const client = await getEvolutionClient();
  await sendValidatedMediaMessage(client, {
    number: to,
    mediatype: mediaTypeFromFile(file),
    media: file,
    caption,
    fileName: file.name,
  });

  revalidatePath("/inbox");
  revalidatePath("/crm/inbox");

  return { sentAt: new Date() };
}

export async function sendManualWhatsAppReaction(
  input: z.infer<typeof sendManualWhatsAppReactionSchema>,
) {
  const values = sendManualWhatsAppReactionSchema.parse(input);
  const [message] = await db
    .select({ rawMetadata: messages.rawMetadata })
    .from(messages)
    .where(eq(messages.id, values.messageId))
    .limit(1);
  if (!message) throw new Error("Message not found");

  const client = await getEvolutionClient();
  await sendMessageReaction(client, {
    reactionKey: readReactionKey(message.rawMetadata) ?? {},
    reactionMessage: values.emoji,
  });

  return { reactedAt: new Date() };
}

export async function sendManualWhatsAppMessage(
  input: z.infer<typeof sendManualWhatsAppMessageSchema>,
) {
  const values = sendManualWhatsAppMessageSchema.parse(input);
  const client = await getEvolutionClient();

  const result = await sendOutgoingTextMessage(client, {
    conversationId: values.conversationId,
    to: values.to,
    text: values.text,
    senderType: "admin",
  });

  revalidatePath("/inbox");

  return { sentAt: result.sentAt };
}
