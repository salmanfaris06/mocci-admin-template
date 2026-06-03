# AI Agent Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/ai-agent` into a two-column prompt setup and assistant playground page using shadcn/ui components, with localStorage prompt persistence and a disabled chat preview before save.

**Architecture:** Keep the page as a client component because it needs localStorage and interactive chat state. Split the UI into small local components inside `src/app/crm/ai-agent/page.tsx` for prompt setup, disabled preview, and active mock playground so the active chat can later be replaced with assistant-ui runtime integration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui components, lucide-react icons, browser localStorage.

---

## File Structure

- Modify: `src/app/crm/ai-agent/page.tsx`
  - Replace the single-card textarea page with a two-column client-side prompt lab.
  - Use shadcn/ui components only for page structure.
  - Store prompt in `localStorage`.
  - Show disabled chat preview until prompt is saved.
  - Show an active local/mock playground after prompt is saved.

---

### Task 1: Replace AI Agent Page with Client Prompt Lab

**Files:**
- Modify: `src/app/crm/ai-agent/page.tsx`

- [ ] **Step 1: Replace the entire page with the two-column implementation**

Write this complete content to `src/app/crm/ai-agent/page.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { BotIcon, SendIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const STORAGE_KEY = 'mocci:ai-agent-system-prompt'

type PromptStatus = 'not-saved' | 'saved' | 'unsaved'

type PlaygroundMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const defaultPromptPlaceholder = `You are a CRM assistant for WhatsApp conversations. Help qualify leads, draft follow-ups, and respond in a concise professional tone. Ask clarifying questions when customer intent is unclear.`

const initialMessages: PlaygroundMessage[] = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    content: 'System prompt saved. Send a CRM scenario and I will respond using your instructions.'
  }
]

function getPromptStatus(draft: string, saved: string): PromptStatus {
  if (!saved.trim()) return 'not-saved'
  if (draft !== saved) return 'unsaved'
  return 'saved'
}

function PromptStatusBadge({ status }: { status: PromptStatus }) {
  if (status === 'saved') {
    return <Badge className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>Saved</Badge>
  }

  if (status === 'unsaved') {
    return <Badge className='bg-amber-500/10 text-amber-600 dark:text-amber-400'>Unsaved changes</Badge>
  }

  return <Badge variant='secondary'>Not saved</Badge>
}

function DisabledPlaygroundPreview() {
  return (
    <div className='flex min-h-[520px] flex-col'>
      <ScrollArea className='flex-1 rounded-lg border bg-muted/20 p-4'>
        <div className='space-y-4'>
          <div className='flex justify-start'>
            <div className='max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm'>
              Save your system prompt first. I’ll use it as my behavior guide.
            </div>
          </div>
          <div className='flex justify-end'>
            <div className='max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground text-sm opacity-60'>
              Can you write a WhatsApp follow-up?
            </div>
          </div>
          <div className='flex justify-start'>
            <div className='max-w-[80%] rounded-2xl rounded-tl-sm border border-dashed bg-background px-4 py-3 text-muted-foreground text-sm'>
              Playground is waiting for your saved instructions.
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className='mt-4 flex gap-2'>
        <Textarea
          disabled
          rows={2}
          placeholder='Save system prompt to start testing...'
          className='min-h-11 resize-none'
        />
        <Button disabled size='icon' className='size-11 shrink-0' aria-label='Send message'>
          <SendIcon className='size-4' />
        </Button>
      </div>
    </div>
  )
}

function ActivePlayground({ savedPrompt }: { savedPrompt: string }) {
  const [messages, setMessages] = useState<PlaygroundMessage[]>(initialMessages)
  const [draft, setDraft] = useState('')

  const promptPreview = useMemo(() => {
    const value = savedPrompt.trim()
    return value.length > 140 ? `${value.slice(0, 140)}...` : value
  }, [savedPrompt])

  const sendMessage = () => {
    const value = draft.trim()
    if (!value) return

    const userMessage: PlaygroundMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: value
    }

    const assistantMessage: PlaygroundMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `Using your saved system prompt, I would respond to: “${value}”`
    }

    setMessages((current) => [...current, userMessage, assistantMessage])
    setDraft('')
  }

  return (
    <div className='flex min-h-[520px] flex-col'>
      <Alert className='mb-4'>
        <SparklesIcon className='size-4' />
        <AlertTitle>Saved system prompt in use</AlertTitle>
        <AlertDescription className='line-clamp-2'>{promptPreview}</AlertDescription>
      </Alert>

      <ScrollArea className='flex-1 rounded-lg border bg-muted/20 p-4'>
        <div className='space-y-4'>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-primary-foreground'
                    : 'rounded-tl-sm bg-muted text-foreground'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className='mt-4 flex gap-2'>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              sendMessage()
            }
          }}
          rows={2}
          placeholder='Test a CRM message, objection, or follow-up scenario...'
          className='min-h-11 resize-none'
        />
        <Button size='icon' className='size-11 shrink-0' onClick={sendMessage} disabled={!draft.trim()} aria-label='Send message'>
          <SendIcon className='size-4' />
        </Button>
      </div>
    </div>
  )
}

export default function CrmAiAgentPage() {
  const [draftPrompt, setDraftPrompt] = useState('')
  const [savedPrompt, setSavedPrompt] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? ''
    setDraftPrompt(stored)
    setSavedPrompt(stored)
  }, [])

  const status = getPromptStatus(draftPrompt, savedPrompt)
  const hasSavedPrompt = Boolean(savedPrompt.trim())

  const savePrompt = () => {
    const value = draftPrompt.trim()
    window.localStorage.setItem(STORAGE_KEY, value)
    setDraftPrompt(value)
    setSavedPrompt(value)
  }

  const clearPrompt = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setDraftPrompt('
