<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses Next.js 16. APIs, conventions, and file structure may differ from older examples. Before changing Next.js behavior, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mocci Admin Template

## Project Snapshot
Single-package Next.js admin dashboard template built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and shadcn-style components. UI primitives live under `src/components/ui`, pages/routes under `src/app`, and shared config under `src/config`. Read the nearest nested `AGENTS.md` before editing within `src/app` or `src/components`.

## Root Setup Commands
```bash
npm install
npm run dev
npm run build
npm run lint
```

## Universal Conventions
- Use TypeScript and keep `strict` assumptions intact.
- Prefer `@/` imports for files under `src`.
- Keep components small, composable, and aligned with existing shadcn-style APIs.
- Reuse existing UI primitives before adding new primitives.
- Prefer server components by default; add `"use client"` only for browser state/effects/events.
- Preserve accessibility attributes and keyboard behavior from Radix/Base UI primitives.

## CRM Page Layout Rules
- CRM pages must share the same page rhythm as `/dashboard`, `/inbox`, `/contacts`, `/pipeline`, and `/analytics`.
- Do not add route-level padding like `p-6` inside CRM page components; the app shell owns page padding.
- Use a direct first child page header. Prefer `PageHeader` from `@/components/showcase` for title + description.
- Use `className='space-y-6'` for standard CRM pages and `className='space-y-4'` only for dense chat/dashboard layouts that already follow existing examples.
- When a page header has actions, use `flex flex-wrap items-center justify-between gap-3` with `PageHeader` as the left side, matching `/pipeline`.
- Keep main content below the header in cards/grids with `gap-4`, `space-y-4`, or `space-y-6`; avoid one-off spacing unless the existing page pattern requires it.
- Keep page headers text-only unless the reference page includes an action; do not add decorative icons to CRM page headers.
- Constrain chat/workspace panels inside their card and make inner lists scrollable instead of letting the page grow horizontally or vertically.

## Security & Secrets
- Never commit secrets, tokens, private keys, or local `.env*` values.
- Only expose browser-safe variables with a `NEXT_PUBLIC_` prefix.
- Do not log PII or credentials in UI, route handlers, or client components.
- Treat dashboard sample data as mock/demo data unless connected to a real backend.

## JIT Index
### Package Structure
- Routes and layouts: `src/app/` -> [see src/app/AGENTS.md](src/app/AGENTS.md)
- Components and UI primitives: `src/components/` -> [see src/components/AGENTS.md](src/components/AGENTS.md)
- Navigation/theme/user config: `src/config/`
- Hooks: `src/hooks/`
- Utilities: `src/lib/`
- Static assets: `public/`, `src/assets/`

### Quick Find Commands
- Find route pages: `find src/app -name "page.tsx"`
- Find layouts/loading/error files: `find src/app -name "layout.tsx" -o -name "loading.tsx" -o -name "error.tsx"`
- Find component exports: `rg -n "export (function|const|\{)" src/components`
- Find UI primitive: `find src/components/ui -name "*.tsx"`
- Find nav entries: `rg -n "title:|href:" src/config/nav.ts`
- Find theme presets: `rg -n "name:|primary" src/config/theme-presets.ts src/app/globals.css`
- Find client components: `rg -n '^"use client"' src`

## Key Files
- Root layout/metadata/theme init: `src/app/layout.tsx`
- Global styles and Tailwind v4 tokens: `src/app/globals.css`
- shadcn aliases/registry config: `components.json`
- ESLint config: `eslint.config.mjs`
- Next config: `next.config.ts`

## Definition of Done
- Run `npm run lint` after code changes.
- Run `npm run build` for route, metadata, or component API changes.
- Verify affected pages manually with `npm run dev` when changing UI behavior.
- Update nested `AGENTS.md` if introducing new patterns or major directories.
