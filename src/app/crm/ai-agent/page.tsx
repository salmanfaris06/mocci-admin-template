'use client'

import { useEffect, useMemo, useState } from 'react'
import { DefaultChatTransport } from 'ai'
import { AuiIf, AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { SendIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import { PageHeader } from '@/components/showcase'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'

const STORAGE_KEY = 'mocci:ai-agent-system-prompt'
const TEMPERATURE_STORAGE_KEY = 'mocci:ai-agent-temperature'
const DEFAULT_TEMPERATURE = 0.7

type PromptStatus = 'not-saved' | 'saved' | 'unsaved'

const defaultPromptPlaceholder = `You are a CRM assistant for WhatsApp conversations. Help qualify leads, draft follow-ups, and respond in a concise professional tone. Ask clarifying questions when customer intent is unclear.`

function getStoredPrompt() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STORAGE_KEY) ?? ''
}

function getStoredTemperature() {
  if (typeof window === 'undefined') return DEFAULT_TEMPERATURE

  const storedTemperature = Number(window.localStorage.getItem(TEMPERATURE_STORAGE_KEY))
  if (!Number.isFinite(storedTemperature)) return DEFAULT_TEMPERATURE

  return clampTemperature(storedTemperature)
}

function clampTemperature(value: number) {
  return Math.min(1, Math.max(0, value))
}

function formatTemperature(value: number) {
  return clampTemperature(value).toFixed(1)
}

function getPromptStatus(draft: string, saved: string, draftTemperature: number, savedTemperature: number): PromptStatus {
  if (!saved.trim()) return 'not-saved'
  if (draft !== saved || formatTemperature(draftTemperature) !== formatTemperature(savedTemperature)) return 'unsaved'
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
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='relative h-[clamp(220px,calc(100svh-34rem),420px)] min-h-0 shrink-0 overflow-y-auto overscroll-contain rounded-lg border bg-muted/20 p-4 [scrollbar-gutter:stable]'>
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
      </div>

      <div className='mt-5 flex shrink-0 gap-3'>
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

function AssistantThread() {
  return (
    <ThreadPrimitive.Root className='flex h-full min-h-0 flex-col overflow-hidden'>
      <ThreadPrimitive.Viewport className='relative h-[clamp(220px,calc(100svh-34rem),420px)] min-h-0 shrink-0 overflow-y-auto overscroll-contain rounded-lg border bg-muted/20 p-4 [scrollbar-gutter:stable]'>
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <div className='flex h-full items-center justify-center text-center text-muted-foreground text-sm'>
            System prompt saved. Send a CRM scenario and I will respond using your instructions.
          </div>
        </AuiIf>

        <div className='space-y-4'>
          <ThreadPrimitive.Messages>
            {({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}
          </ThreadPrimitive.Messages>
        </div>
      </ThreadPrimitive.Viewport>

      <ThreadPrimitive.ViewportFooter className='mt-4 shrink-0'>
        <ComposerPrimitive.Root className='group flex items-end gap-2 rounded-2xl border bg-card/80 p-2 shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20'>
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder='Test a CRM message, objection, or follow-up scenario...'
            className='max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
          />
          <ComposerPrimitive.Send asChild>
            <Button size='icon' className='size-10 shrink-0 rounded-xl' aria-label='Send message'>
              <SendIcon className='size-4' />
            </Button>
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Root>
  )
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className='flex justify-end'>
      <div className='max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground text-sm'>
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className='flex justify-start'>
      <div className='max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-foreground text-sm'>
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  )
}

function ActivePlayground({ savedPrompt, temperature }: { savedPrompt: string; temperature: number }) {
  const promptPreview = useMemo(() => {
    const value = savedPrompt.trim()
    return value.length > 140 ? `${value.slice(0, 140)}...` : value
  }, [savedPrompt])
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai-agent-playground',
        body: { systemPrompt: savedPrompt, temperature }
      }),
    [savedPrompt, temperature]
  )
  const runtime = useChatRuntime({ transport })

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <Alert className='mb-4 shrink-0'>
        <SparklesIcon className='size-4' />
        <AlertTitle>Saved system prompt in use</AlertTitle>
        <AlertDescription className='line-clamp-2'>
          {promptPreview} · Temperature {formatTemperature(temperature)}
        </AlertDescription>
      </Alert>

      <AssistantRuntimeProvider runtime={runtime}>
        <AssistantThread />
      </AssistantRuntimeProvider>
    </div>
  )
}

export default function CrmAiAgentPage() {
  const [draftPrompt, setDraftPrompt] = useState('')
  const [savedPrompt, setSavedPrompt] = useState('')
  const [draftTemperature, setDraftTemperature] = useState(DEFAULT_TEMPERATURE)
  const [savedTemperature, setSavedTemperature] = useState(DEFAULT_TEMPERATURE)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedPrompt = getStoredPrompt()
      const storedTemperature = getStoredTemperature()
      setDraftPrompt(storedPrompt)
      setSavedPrompt(storedPrompt)
      setDraftTemperature(storedTemperature)
      setSavedTemperature(storedTemperature)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const status = getPromptStatus(draftPrompt, savedPrompt, draftTemperature, savedTemperature)
  const hasSavedPrompt = Boolean(savedPrompt.trim())

  const savePrompt = () => {
    const value = draftPrompt.trim()
    const temperature = clampTemperature(draftTemperature)
    window.localStorage.setItem(STORAGE_KEY, value)
    window.localStorage.setItem(TEMPERATURE_STORAGE_KEY, formatTemperature(temperature))
    setDraftPrompt(value)
    setSavedPrompt(value)
    setDraftTemperature(temperature)
    setSavedTemperature(temperature)
  }

  const clearPrompt = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(TEMPERATURE_STORAGE_KEY)
    setDraftPrompt('')
    setSavedPrompt('')
    setDraftTemperature(DEFAULT_TEMPERATURE)
    setSavedTemperature(DEFAULT_TEMPERATURE)
  }

  return (
    <div className='space-y-6'>
      <PageHeader title='AI Agent Playground' description='Configure the system prompt, then test the assistant.' />

      <Card className='min-h-0 overflow-hidden p-0'>
        <ResizablePanelGroup direction='horizontal' className='h-[calc(100svh-23rem)] min-h-[360px] flex-col md:flex-row'>
          <ResizablePanel defaultSize={34} minSize={30} className='min-w-0'>
            <div className='flex h-full min-h-0 flex-col'>
              <CardHeader className='shrink-0 space-y-3 px-7 pt-7 pb-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <CardTitle>System Prompt</CardTitle>
                    <CardDescription>Define how your CRM assistant should behave before testing it.</CardDescription>
                  </div>
                  <PromptStatusBadge status={status} />
                </div>
              </CardHeader>
              <CardContent className='min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-4'>
                <div className='flex min-h-0 flex-1 flex-col space-y-2'>
                  <Label htmlFor='agent-system-prompt'>Instructions</Label>
                  <Textarea
                    id='agent-system-prompt'
                    value={draftPrompt}
                    onChange={(event) => setDraftPrompt(event.target.value)}
                    placeholder={defaultPromptPlaceholder}
                    rows={12}
                    className='h-[260px] min-h-[220px] resize-none overflow-y-auto'
                  />
                  <p className='text-muted-foreground text-xs'>
                    The playground uses the last saved prompt. Save again after editing to update assistant behavior.
                  </p>
                </div>

                <div className='space-y-3 rounded-lg border bg-muted/20 p-4'>
                  <div className='space-y-1'>
                    <Label htmlFor='agent-temperature'>Temperature</Label>
                    <p className='text-muted-foreground text-xs'>
                      Controls response variation. Use lower values for consistent CRM replies.
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Slider
                      value={[draftTemperature]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={(value) => setDraftTemperature(clampTemperature(value[0] ?? DEFAULT_TEMPERATURE))}
                      aria-label='AI temperature'
                    />
                    <Input
                      id='agent-temperature'
                      type='number'
                      min={0}
                      max={1}
                      step={0.1}
                      value={formatTemperature(draftTemperature)}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        setDraftTemperature(Number.isFinite(value) ? clampTemperature(value) : DEFAULT_TEMPERATURE)
                      }}
                      className='w-20 text-center'
                      aria-label='AI temperature value'
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className='shrink-0 justify-between gap-3 border-t bg-card/95 px-7 py-5'>
                <Button variant='outline' type='button' onClick={clearPrompt} disabled={!draftPrompt && !savedPrompt}>
                  <Trash2Icon className='size-4' /> Clear
                </Button>
                <Button type='button' onClick={savePrompt} disabled={!draftPrompt.trim() || status === 'saved'}>
                  Save Prompt
                </Button>
              </CardFooter>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={66} minSize={42} className='min-w-0'>
            <div className='flex h-full min-h-0 flex-col'>
              <CardHeader className='shrink-0 px-7 pt-7 pb-4'>
                <CardTitle>Assistant Playground</CardTitle>
                <CardDescription>
                  {hasSavedPrompt
                    ? 'Test your assistant with real CRM-style prompts.'
                    : 'Save a system prompt to unlock testing.'}
                </CardDescription>
              </CardHeader>
              <CardContent className='min-h-0 flex-1 overflow-hidden px-7 pt-0 pb-6'>
                {hasSavedPrompt ? (
                  <ActivePlayground savedPrompt={savedPrompt} temperature={savedTemperature} />
                ) : (
                  <DisabledPlaygroundPreview />
                )}
              </CardContent>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </div>
  )
}
