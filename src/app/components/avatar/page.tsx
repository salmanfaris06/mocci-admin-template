import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader, Showcase, ShowcaseGrid } from '@/components/showcase'

export default function AvatarPage() {
  return (
    <div className='space-y-8'>
      <PageHeader title='Avatar' description='An image element with a fallback for representing the user.' />
      <ShowcaseGrid>
        <Showcase title='Sizes'>
          <Avatar size='sm'>
            <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png' />
            <AvatarFallback>MD</AvatarFallback>
          </Avatar>
          <Avatar size='lg'>
            <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png' />
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </Showcase>
        <Showcase title='Fallback'>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback className='bg-primary/10 text-primary'>MA</AvatarFallback>
          </Avatar>
        </Showcase>
      </ShowcaseGrid>
    </div>
  )
}
