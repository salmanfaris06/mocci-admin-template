'use client'

import type { ReactNode } from 'react'

import { LanguagesIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

import LanguageDropdown from '@/components/shadcn-studio/blocks/dropdown-language'
import ProfileDropdown from '@/components/shadcn-studio/blocks/dropdown-profile'

type AppHeaderProps = {
  /** Content rendered between the sidebar trigger and the action area (e.g. breadcrumbs, page title). */
  children?: ReactNode
  /** Replace the default action area (language + profile). */
  actions?: ReactNode
}

export function AppHeader({ children, actions }: AppHeaderProps) {
  return (
    <>
      <div className='flex min-w-0 items-center gap-3'>
        <SidebarTrigger className='[&_svg]:size-5!' />
        <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />
        <div className='min-w-0 flex-1'>{children}</div>
      </div>
      <div className='flex items-center gap-1.5'>
        {actions ?? (
          <>
            <LanguageDropdown
              trigger={
                <Button variant='ghost' size='icon'>
                  <LanguagesIcon />
                </Button>
              }
            />
            <ProfileDropdown
              trigger={
                <Button variant='ghost' size='icon'>
                  <Avatar className='size-[inherit] rounded-[inherit]'>
                    <AvatarImage
                      src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png'
                      className='rounded-[inherit]'
                    />
                    <AvatarFallback className='rounded-[inherit] text-xs'>JD</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
          </>
        )}
      </div>
    </>
  )
}
