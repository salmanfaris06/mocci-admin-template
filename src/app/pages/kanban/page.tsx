'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/showcase'
import { Button } from '@/components/ui/button'

import { ColumnContainer } from './column'
import { ContactCard } from './contact-card'
import { type ContactLead, initialContacts, initialStages } from './data'

export default function KanbanPage() {
  const router = useRouter()
  const [stages] = useState(initialStages)
  const [contacts, setContacts] = useState<ContactLead[]>(initialContacts)
  const [activeContact, setActiveContact] = useState<ContactLead | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  )

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'contact') {
      setActiveContact(event.active.data.current.contact as ContactLead)
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveContact(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    setContacts((current) => {
      const activeIndex = current.findIndex((contact) => contact.id === activeId)
      if (activeIndex === -1) return current

      const overStage = stages.find((stage) => stage.id === overId)
      if (overStage) {
        const updated = [...current]
        updated[activeIndex] = { ...updated[activeIndex], stageId: overStage.id }
        return updated
      }

      const overIndex = current.findIndex((contact) => contact.id === overId)
      if (overIndex === -1) return current

      const updated = [...current]
      if (updated[activeIndex].stageId !== updated[overIndex].stageId) {
        updated[activeIndex] = { ...updated[activeIndex], stageId: updated[overIndex].stageId }
      }
      return arrayMove(updated, activeIndex, overIndex)
    })
  }

  const handleContactClick = (contact: ContactLead) => {
    router.push(contact.conversationId ? `/inbox?conversation=${contact.conversationId}` : '/inbox')
  }

  const handleAddContact = (stageId = stages[0].id) => {
    const newContact: ContactLead = {
      id: `contact-${Date.now()}`,
      stageId,
      name: 'New WhatsApp Contact',
      whatsappNumber: '+62 800-0000-0000',
      lastMessage: 'Add the latest message from this contact.'
    }

    setContacts((current) => [newContact, ...current])
    toast.success('Contact added', { description: 'Mock contact created locally.' })
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <PageHeader title='Pipeline' description='Track WhatsApp contacts across your CRM stages.' />
        <Button size='sm' className='h-8' onClick={() => handleAddContact()}>
          <PlusIcon className='size-3.5' /> Add contact
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {stages.map((stage) => (
            <ColumnContainer
              key={stage.id}
              stage={stage}
              contacts={contacts.filter((contact) => contact.stageId === stage.id)}
              onContactClick={handleContactClick}
              onAddContact={() => handleAddContact(stage.id)}
            />
          ))}
        </div>

        <DragOverlay>{activeContact ? <ContactCard contact={activeContact} isOverlay /> : null}</DragOverlay>
      </DndContext>

      <p className='text-muted-foreground text-xs'>
        This pipeline uses mock data. Drag contacts between stages or click a card to open the inbox.
      </p>
    </div>
  )
}
