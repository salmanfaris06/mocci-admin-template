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
  conversationId?: string
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
    lastMessage: 'Wanna jump on a call?',
    conversationId: 'c1'
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
    lastMessage: 'Let me know if anything needs clarification.',
    conversationId: 'c3'
  },
  {
    id: 'contact-5',
    stageId: 'contacted',
    name: 'Cameron Williamson',
    whatsappNumber: '+62 811-7399-020',
    lastMessage: 'On it. I will review the proposal today.',
    conversationId: 'c2'
  },
  {
    id: 'contact-6',
    stageId: 'follow-up',
    name: 'Olivia Park',
    whatsappNumber: '+62 811-4000-733',
    lastMessage: 'User interviews scheduled for next week.',
    conversationId: 'c5'
  },
  {
    id: 'contact-7',
    stageId: 'follow-up',
    name: 'Marcus Johnson',
    whatsappNumber: '+62 821-6332-808',
    lastMessage: 'Awesome, thanks for handling this.',
    conversationId: 'c4'
  },
  {
    id: 'contact-8',
    stageId: 'converted',
    name: 'Robert Fox',
    whatsappNumber: '+62 813-7762-020',
    lastMessage: 'CI pipeline upgraded to v3, builds are stable.',
    conversationId: 'c6'
  }
]
