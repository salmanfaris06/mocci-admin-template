import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { ContactCard } from './contact-card'
import type { ContactLead, ContactStage } from './data'

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
        <Button
          variant='ghost'
          size='icon'
          className='size-7'
          onClick={onAddContact}
          aria-label={`Add contact to ${stage.title}`}
        >
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
