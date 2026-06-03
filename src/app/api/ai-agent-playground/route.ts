import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/server/db'
import { aiProviderKeys } from '@/server/db/schema'
import { decryptSecret } from '@/server/security/crypto'

export const maxDuration = 45

const settingsSchema = z.object({
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0).max(1).default(0.7)
})

async function getOpenAiApiKey() {
  const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY

  const [storedKey] = await db
    .select({ encryptedApiKey: aiProviderKeys.encryptedApiKey })
    .from(aiProviderKeys)
    .where(and(eq(aiProviderKeys.provider, 'openai'), eq(aiProviderKeys.isActive, true)))
    .orderBy(desc(aiProviderKeys.isDefault), desc(aiProviderKeys.updatedAt))
    .limit(1)

  if (storedKey) {
    if (!encryptionKey) {
      throw new Error('SECRETS_ENCRYPTION_KEY is required to read stored OpenAI credentials')
    }

    return decryptSecret(storedKey.encryptedApiKey, encryptionKey)
  }

  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY

  throw new Error('OpenAI API key is not configured')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: UIMessage[]; systemPrompt?: string; temperature?: number }
    const settings = settingsSchema.parse({
      systemPrompt: body.systemPrompt,
      temperature: body.temperature
    })

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json({ error: 'At least one message is required' }, { status: 400 })
    }

    const apiKey = await getOpenAiApiKey()
    const openai = createOpenAI({ apiKey })
    const result = streamText({
      model: openai('gpt-4.1-mini'),
      system: settings.systemPrompt,
      messages: await convertToModelMessages(body.messages),
      temperature: settings.temperature,
      maxOutputTokens: 800
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate assistant response'
    return Response.json({ error: message }, { status: 500 })
  }
}
