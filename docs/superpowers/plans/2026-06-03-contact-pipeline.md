# Contact Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current task Kanban at `/pipeline` with a simple CRM contact pipeline using mock WhatsApp contact data.

**Architecture:** Keep the existing Next.js client-side Kanban pattern and `@dnd-kit` drag-and-drop, but replace task/domain concepts with contact lead concepts. The pipeline page owns local state, stage columns render filtered contacts, and cards navigate to `/inbox` when clicked.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn-style UI primitives, `@dnd-kit/core`, `@dnd-kit/sortable`, `lucide-react`, `sonner`.

---

## File Structure

- Modify: `src/app/pages/kanban/data.ts`
  - Replace task-oriented data with `ContactStage`, `ContactLead`, `initialStages`, and `initialContacts`.
- Modify: `src/app/pages/kanban/column.tsx`
  - Render contact stage columns and accept `ContactLead[]`.
- Create: `src/app/pages/kanban/contact-card.tsx`
  - Render draggable/clickable contact cards with name, WhatsApp number, and last message.
- Modify: `src/app/pages/kanban/page.tsx`
  - Replace task board state and detail sheet behavior with contact board state and `/inbox` navigation.
- Delete: `src/app/pages/kanban/task-card.tsx`
  - Remove old task card component.
- Delete: `src/app/pages/kanban/task-detail-sheet.tsx`
  - Remove unused task detail sheet.

---

### Task 1: Replace Kanban Data Model

**Files:**
- Modify: `src/app/pages/kanban/data.ts`

- [ ] **Step 1: Replace file with contact pipeline data**

Write this complete content to `src/app/pages/kanban/data.ts`:

```ts
export type ContactStage = {
  id: string
  title: string
}

export type ContactLead = {
  id: string
  stageId: string
  name: string
  whatsappNumber: string
  lastMessage: string
}

export const initialStages: ContactStage[] = [
  { id: 'new-lead', title: 'New Lead' },
  { id: 'contacted', title: 'Contacted' },
  { id: 'follow-up', title: 'Follow Up' },
  { id: 'converted', title: 'Converted' }
]

export const initialContacts: ContactLead[] = [
  {
    id: 'contact-1',
    stageId: 'new-lead',
    name: 'Sarah Davis',
    whatsappNumber: '+62 812-4455-901',
    lastMessage: 'Wanna jump on a call?'
  },
  {
    id: 'contact-2',
    stageId: 'new-lead',
    name: 'Budi Santoso',
    whatsappNumber: '+62 857-9981-224',
    lastMessage: 'Saya tertarik dengan paket CRM untuk tim sales.'
  },
  {
    id: 'contact-3',
    stageId: 'new-lead',
    name: 'Nadia Putri',
    whatsappNumber: '+62 813-2209-441',
    lastMessage: 'Bisa kirim detail pricing-nya?'
  },
  {
    id: 'contact-4',
    stageId: 'contacted',
    name: 'Emma Chen',
    whatsappNumber: '+62 878-5510-112',
    lastMessage: 'Let me know if anything needs clarification.'
  },
  {
    id: 'contact-5',
    stageId: 'contacted',
    name: 'Cameron Williamson',
    whatsappNumber: '+62 811-7399-020',
    lastMessage: 'On it. I will review the proposal today.'
  },
  {
    id: 'contact-6',
    stageId: 'follow-up',
    name: 'Olivia Park',
    whatsappNumber: '+62 811-4000-733',
    lastMessage: 'User interviews scheduled for next week.'
  },
  {
    id: 'contact-7',
    stageId: 'follow-up',
    name: 'Marcus Johnson',
    whatsappNumber: '+62 821-6332-808',
    lastMessage: 'Awesome, thanks for handling this.'
  },
  {
    id: 'contact-8',
    stageId: 'converted',
    name: 'Robert Fox',
    whatsappNumber: '+62 813-7762-020',
    lastMessage: 'CI pipeline upgraded to v3, builds are stable.'
  }
]
```

- [ ] **Step 2: Verify no old task exports remain**

Run:

```bash
rg -n "initialColumns|initialTasks|type Task|Task\b" src/app/pages/kanban
```

Expected after later tasks: no matches except possibly in deleted files before cleanup. At this step, matches in `page.tsx`, `column.tsx`, `task-card.tsx`, and `task-detail-sheet.tsx` are expected.

---

### Task 2: Replace Column Component

**Files:**
- Modify: `src/app/pages/kanban/column.tsx`

- [ ] **Step 1: Replace file with contact stage column**

Write this complete content to `src/app/pages/kanban/column.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import type { ContactLead, ContactStage } from './data'
import { ContactCard } from './contact-card'

type ColumnContainerProps = {
  stage: ContactStage
  contacts: ContactLead[]
  onContactClick: (contact: ContactLead) => void
  onAddContact: () => void
}

export function ColumnContainer({
  stage,
  contacts,
  onContactClick,
  onAddContact
}: ColumnContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'stage', stage }
  })

  return (
    <Card
      ref={setNodeRef}
      className={`flex min-h-[520px] flex-col gap-3 rounded-xl border-dashed p-3 transition-colors ${
        isOver ? 'border-primary/60 bg-primary/5' : ''
      }`}
    >
      <div className='flex items-center justify-between gap-2'>
        <div>
          <h2 className='font-medium text-sm'>{stage.title}</h2>
          <p className='text-muted-foreground text-xs'>
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
        <Button variant='ghost' size='icon' className='size-7' onClick={onAddContact} aria-label={`Add contact to ${stage.title}`}>
          <PlusIcon className='size-3.5' />
        </Button>
      </div>

      <SortableContext items={contacts.map((contact) => contact.id)} strategy={verticalListSortingStrategy}>
        <div className='flex flex-1 flex-col gap-3'>
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} onClick={() => onContactClick(contact)} />
          ))}
        </div>
      </SortableContext>
    </Card>
  )
}
```

---

### Task 3: Create Contact Card Component

**Files:**
- Create: `src/app/pages/kanban/contact-card.tsx`

- [ ] **Step 1: Create draggable contact card**

Write this complete content to `src/app/pages/kanban/contact-card.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MessageCircleIcon, PhoneIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'

import type { ContactLead } from './data'

type ContactCardProps = {
  contact: ContactLead
  isOverlay?: boolean
  onClick?: () => void
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export function ContactCard({ contact, isOverlay = false, onClick }: ContactCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
    data: { type: 'contact', contact },
    disabled: isOverlay
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer p-3 shadow-none transition hover:border-primary/40 hover:bg-muted/40 ${
        isDragging ? 'opacity-40' : ''
      } ${isOverlay ? 'rotate-2 border-primary/50 shadow-lg' : ''}`}
      onClick={onClick}
      role='button'
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div className='flex items-start gap-3'>
        <Avatar className='size-9 shrink-0'>
          <AvatarFallback className='text-xs'>{initials(contact.name)}</AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='min-w-0'>
      
