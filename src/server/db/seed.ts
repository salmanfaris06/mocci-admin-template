import { eq } from "drizzle-orm";
import { db } from "./index";
import { aiAgents, modelPricing, pipelineStages } from "./schema";

const fallbackTimeoutMessage =
  "Maaf, saya butuh waktu lebih lama untuk memproses pesan ini. Tim kami akan meninjau percakapan ini.";

async function seedPipelineStages() {
  const stages = [
    { name: "New Lead", position: 1, color: "blue" },
    { name: "Qualified", position: 2, color: "violet" },
    { name: "Proposal", position: 3, color: "amber" },
    { name: "Customer", position: 4, color: "emerald" },
    { name: "Lost", position: 5, color: "red" },
  ];

  for (const stage of stages) {
    const [existing] = await db.select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.name, stage.name)).limit(1);
    if (!existing) {
      await db.insert(pipelineStages).values(stage);
    }
  }
}

async function seedModelPricing() {
  const pricingRows = [
    {
      provider: "openai",
      modelId: "gpt-4.1-mini",
      capability: "chat" as const,
      inputPricePerMillion: "0.400000",
      outputPricePerMillion: "1.600000",
      isDefault: true,
    },
    {
      provider: "openai",
      modelId: "gpt-4.1-mini",
      capability: "vision" as const,
      inputPricePerMillion: "0.400000",
      outputPricePerMillion: "1.600000",
      isDefault: true,
    },
    {
      provider: "openai",
      modelId: "gpt-4o-mini-transcribe",
      capability: "transcription" as const,
      inputPricePerMillion: "0.000000",
      outputPricePerMillion: "0.000000",
      isDefault: true,
    },
  ];

  for (const row of pricingRows) {
    await db
      .insert(modelPricing)
      .values(row)
      .onConflictDoNothing({
        target: [modelPricing.provider, modelPricing.modelId, modelPricing.capability],
      });
  }
}

async function seedDefaultAgent() {
  const [existing] = await db.select({ id: aiAgents.id }).from(aiAgents).where(eq(aiAgents.isDefault, true)).limit(1);

  if (!existing) {
    await db.insert(aiAgents).values({
      name: "Customer Service Agent",
      isActive: true,
      isDefault: true,
      systemPrompt:
        "You are a helpful WhatsApp customer service assistant. Answer clearly, briefly, and politely in the customer's language.",
      provider: "openai",
      modelId: "gpt-4.1-mini",
      temperature: "0.70",
      maxOutputTokens: 800,
      timeoutSeconds: 45,
      typingIntervalSeconds: 6,
      fallbackTimeoutMessage,
    });
  }
}

async function main() {
  await seedPipelineStages();
  await seedModelPricing();
  await seedDefaultAgent();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
