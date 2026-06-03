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
      {...attributes}
      {...listeners}
      onClick={onClick}
      role='button'
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className='flex items-start gap-3'>
        <Avatar className='size-9 shrink-0'>
          <AvatarFallback className='text-xs'>{initials(contact.name)}</AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='min-w-0'>
            <p className='truncate font-medium text-sm'>{contact.name}</p>
            <div className='mt-1 flex items-center gap-1.5 text-muted-foreground text-xs'>
              <PhoneIcon className='size-3' />
              <span className='truncate'>{contact.whatsappNumber}</span>
            </div>
          </div>
          <div className='flex gap-1.5 rounded-lg bg-muted/50 p-2 text-muted-foreground text-xs'>
            <MessageCircleIcon className='mt-0.5 size-3 shrink-0' />
            <p className='line-clamp-2'>{contact.lastMessage}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
