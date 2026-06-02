import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { db } from "../../../src/server/db";
import { aiAgents, aiRuns, aiUsageLogs, contacts, conversations, messages, modelPricing } from "../../../src/server/db/schema";
import { calculateTokenCostUsd } from "../../../src/server/domain/costing";
import { EvolutionClient } from "../evolution/client";
import { createOpenAiProvider } from "./provider";

export type RunAiReplyInput = {
  messageId: string;
  conversationId: string;
  contactId: string;
  evolutionClient: EvolutionClient;
  openAiApiKey: string;
};

export async function runAiReply(input: RunAiReplyInput) {
  const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.isDefault, true), eq(aiAgents.isActive, true))).limit(1);
  const [message] = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, input.contactId)).limit(1);
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, input.conversationId)).limit(1);
  if (!agent || !message || !contact || !conversation) throw new Error("Missing AI reply dependencies");

  const [run] = await db.insert(aiRuns).values({ inboundMessageId: message.id, conversationId: conversation.id, contactId: contact.id, agentId: agent.id, status: "running" }).returning();
  await input.evolutionClient.markMessageAsRead([message.rawMetadata]);
  await input.evolutionClient.setPresence("composing");
  const keepAlive = setInterval(() => { input.evolutionClient.setPresence("composing").catch(() => undefined); }, agent.typingIntervalSeconds * 1000);
  const startedAt = Date.now();

  try {
    const openai = createOpenAiProvider(input.openAiApiKey);
    const prompt = [`Contact: ${contact.displayName ?? contact.phone ?? contact.remoteJid}`, `Message: ${message.text ?? message.caption ?? message.transcript ?? message.visionSummary ?? ""}`].join("\n");
    const result = await generateText({ model: openai(agent.modelId), system: agent.systemPrompt, prompt, temperature: Number(agent.temperature), maxOutputTokens: agent.maxOutputTokens, abortSignal: AbortSignal.timeout(agent.timeoutSeconds * 1000) });
    const [outbound] = await db.insert(messages).values({ conversationId: conversation.id, direction: "outbound", senderType: "ai", messageType: "text", text: result.text, status: "pending", sentAt: new Date() }).returning();
    const [pricing] = await db.select().from(modelPricing).where(and(eq(modelPricing.provider, agent.provider), eq(modelPricing.modelId, agent.modelId), eq(modelPricing.capability, "chat"))).limit(1);
    const inputTokens = result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;
    const inputPrice = pricing?.inputPricePerMillion ?? "0.000000";
    const outputPrice = pricing?.outputPricePerMillion ?? "0.000000";
    await db.insert(aiUsageLogs).values({ aiRunId: run.id, messageId: outbound.id, provider: agent.provider, modelId: agent.modelId, capability: "chat", inputTokens, outputTokens, inputPricePerMillionSnapshot: inputPrice, outputPricePerMillionSnapshot: outputPrice, computedCostUsd: calculateTokenCostUsd({ inputTokens, outputTokens, inputPricePerMillion: inputPrice, outputPricePerMillion: outputPrice }), metadata: { finishReason: result.finishReason } });
    await input.evolutionClient.sendTextMessage(contact.phone ?? contact.remoteJid, result.text);
    await db.update(messages).set({ status: "sent", updatedAt: new Date() }).where(eq(messages.id, outbound.id));
    await db.update(aiRuns).set({ status: "succeeded", outputMessageId: outbound.id, generatedResponse: result.text, latencyMs: Date.now() - startedAt, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
    await db.update(conversations).set({ status: "needs_attention", aiStatus: "error", updatedAt: new Date() }).where(eq(conversations.id, conversation.id));
    await db.update(aiRuns).set({ status: errorMessage.toLowerCase().includes("timeout") ? "timeout" : "failed", errorMessage, latencyMs: Date.now() - startedAt, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
    throw error;
  } finally {
    clearInterval(keepAlive);
    await input.evolutionClient.setPresence("available").catch(() => undefined);
  }
}
