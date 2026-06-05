import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { and, desc, eq } from "drizzle-orm";

import { getEvolutionClient } from "@/server/crm/evolution";
import { formatWhatsAppNumber } from "@/server/crm/whatsapp-display";
import { db } from "@/server/db";
import { aiAgents, aiProviderKeys, aiRuns, contacts, conversations, messages } from "@/server/db/schema";
import { decryptSecret } from "@/server/security/crypto";

async function getOpenAiApiKey() {
  const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY;

  const [storedKey] = await db
    .select({ encryptedApiKey: aiProviderKeys.encryptedApiKey })
    .from(aiProviderKeys)
    .where(and(eq(aiProviderKeys.provider, "openai"), eq(aiProviderKeys.isActive, true)))
    .orderBy(desc(aiProviderKeys.isDefault), desc(aiProviderKeys.updatedAt))
    .limit(1);

  if (storedKey && encryptionKey) return decryptSecret(storedKey.encryptedApiKey, encryptionKey);
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (storedKey && !encryptionKey) throw new Error("SECRETS_ENCRYPTION_KEY is required to read stored OpenAI credentials");
  throw new Error("OpenAI API key is not configured");
}

type AiAgentConfig = {
  id: string;
  maxOutputTokens: number;
  modelId: string;
  systemPrompt: string;
  temperature: string | number;
};

const fallbackAgentDefaults = {
  maxOutputTokens: 800,
  modelId: process.env.OPENAI_MODEL_ID ?? "gpt-4.1-mini",
  systemPrompt:
    process.env.WHATSAPP_AI_SYSTEM_PROMPT ??
    "You are a helpful WhatsApp customer service assistant. Answer clearly, briefly, and politely in the customer's language. Ask one clarifying question when needed.",
  temperature: process.env.WHATSAPP_AI_TEMPERATURE ?? "0.70",
};

async function getDefaultAgent(): Promise<AiAgentConfig> {
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.isActive, true))
    .orderBy(desc(aiAgents.isDefault), desc(aiAgents.updatedAt))
    .limit(1);

  if (agent) return agent;

  const [createdAgent] = await db
    .insert(aiAgents)
    .values({
      name: "Customer Service Agent",
      isActive: true,
      isDefault: true,
      provider: "openai",
      ...fallbackAgentDefaults,
      fallbackTimeoutMessage: "Maaf, sistem AI sedang sibuk. Tim kami akan segera membantu Anda.",
    })
    .returning();

  return createdAgent;
}

async function getConversationContext(conversationId: string) {
  return db
    .select({ direction: messages.direction, text: messages.text, createdAt: messages.createdAt })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(10);
}

function formatHistory(history: Awaited<ReturnType<typeof getConversationContext>>) {
  return history
    .reverse()
    .map((message) => `${message.direction === "outbound" ? "Assistant" : "Customer"}: ${message.text ?? "Unsupported message"}`)
    .join("\n");
}

type TriggerAiWhatsAppReplyInput = {
  contactId: string;
  conversationId: string;
  inboundMessageId: string;
  remoteJid: string;
  text: string;
};

export async function triggerAiWhatsAppReply(input: TriggerAiWhatsAppReplyInput) {
  if (process.env.WHATSAPP_AI_AUTO_REPLY_ENABLED === "false") return { skipped: "disabled" as const };

  const [conversation] = await db
    .select({ aiStatus: conversations.aiStatus, contactAiEnabled: contacts.aiEnabled })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(eq(conversations.id, input.conversationId))
    .limit(1);

  if (!conversation || conversation.aiStatus === "disabled" || conversation.aiStatus === "processing" || !conversation.contactAiEnabled) return { skipped: "ai-disabled" as const };

  const agent = await getDefaultAgent();

  const startedAt = Date.now();
  const [run] = await db
    .insert(aiRuns)
    .values({
      inboundMessageId: input.inboundMessageId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      agentId: agent.id,
      status: "running",
    })
    .returning();

  try {
    await db.update(conversations).set({ aiStatus: "processing", updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));

    const apiKey = await getOpenAiApiKey();
    const openai = createOpenAI({ apiKey });
    const history = await getConversationContext(input.conversationId);
    const result = await generateText({
      model: openai(agent.modelId),
      system: agent.systemPrompt,
      prompt: `You are replying to a WhatsApp customer. Keep the reply concise, helpful, and in the customer's language.\n\nConversation history:\n${formatHistory(history)}\n\nLatest customer message:\n${input.text}`,
      temperature: Number(agent.temperature),
      maxOutputTokens: agent.maxOutputTokens,
    });

    const replyText = result.text.trim();
    if (!replyText) throw new Error("AI generated an empty reply");

    const client = await getEvolutionClient();
    const sentAt = new Date();
    const to = formatWhatsAppNumber(input.remoteJid) ?? input.remoteJid;
    const evolutionResponse = await client.sendTextMessage(to, replyText);

    const [outputMessage] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        direction: "outbound",
        senderType: "ai",
        messageType: "text",
        text: replyText,
        rawMetadata: { aiRunId: run.id, evolutionResponse },
        status: "sent",
        sentAt,
      })
      .returning();

    await db.update(conversations).set({ aiStatus: "enabled", lastMessageAt: sentAt, lastMessageSummary: replyText, updatedAt: sentAt }).where(eq(conversations.id, input.conversationId));
    await db.update(aiRuns).set({ status: "succeeded", latencyMs: Date.now() - startedAt, generatedResponse: replyText, outputMessageId: outputMessage.id, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));

    return { replyText, skipped: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI auto-reply failed";
    await db.update(conversations).set({ aiStatus: "error", updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));
    await db.update(aiRuns).set({ status: "failed", latencyMs: Date.now() - startedAt, errorMessage: message, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
    throw error;
  }
}
