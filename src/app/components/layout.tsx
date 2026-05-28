'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import { AppHeader, AppShell, AppSidebar, WorkspaceSwitcher } from '@/components/app-shell'
import { dashboardNav } from '@/config/nav'
import { workspaces } from '@/config/workspaces'

export default function ComponentsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <AppShell
      sidebar={
        <AppSidebar
          config={dashboardNav}
          isActive={(url) => url !== '#' && pathname === url}
          header={<WorkspaceSwitcher workspaces={workspaces} />}
        />
      }
      header={
        <AppHeader>
          <span className='text-sm font-medium'>Components</span>
        </AppHeader>
      }
    >
      <div className='space-y-6'>{children}</div>
    </AppShell>
  )
}
