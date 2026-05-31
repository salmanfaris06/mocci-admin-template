import Link from 'next/link'
import { Github } from 'lucide-react'

import { Logo } from '@/components/pro-blocks/logo'
import { Button } from '@/components/ui/button'

const GITHUB_URL = 'https://github.com/fatmuh/mocci-admin-template'

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <Logo className="text-foreground h-6 w-auto" />

        <div className="flex max-w-xl flex-col items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Moccilabs Admin
          </h1>
          <p className="text-muted-foreground text-base text-pretty sm:text-lg">
            A modern admin dashboard template built with Next.js, React,
            Tailwind CSS, and shadcn-style components.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="w-full rounded-full sm:w-auto">
              Open dashboard
            </Button>
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-full sm:w-auto"
            >
              <Github />
              View on GitHub
            </Button>
          </Link>
        </div>
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-sm">
        © {new Date().getFullYear()} Moccilabs. All rights reserved.
      </footer>
    </div>
  )
}
