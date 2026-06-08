"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEvolutionClient } from "@/server/crm/evolution";
import { sendOutgoingTextMessage } from "@/server/crm/outgoing-messages";

const sendManualWhatsAppMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1),
  to: z.string().trim().min(1),
});

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
