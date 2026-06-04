import {
  BarChart3Icon,
  BotIcon,
  BugIcon,
  GaugeIcon,
  KanbanIcon,
  MessageSquareIcon,
  SettingsIcon,
  UsersIcon
} from 'lucide-react'

import type { NavConfig } from '@/components/app-shell'

const crmItems = [
  { title: 'Dashboard', url: '/dashboard', icon: GaugeIcon },
  { title: 'Inbox', url: '/inbox', icon: MessageSquareIcon },
  { title: 'Contacts', url: '/contacts', icon: UsersIcon },
  { title: 'Pipeline', url: '/pipeline', icon: KanbanIcon },
  { title: 'AI Agent', url: '/ai-agent', icon: BotIcon },
  { title: 'Analytics', url: '/analytics', icon: BarChart3Icon },
  { title: 'API Settings', url: '/api-settings', icon: SettingsIcon },
  { title: 'Debug & Logs', url: '/debug', icon: BugIcon }
]

export const crmNav: NavConfig = {
  groups: [
    {
      items: crmItems
    }
  ]
}

export const dashboardNav: NavConfig = {
  groups: [
    {
      items: crmItems
    }
  ]
}
