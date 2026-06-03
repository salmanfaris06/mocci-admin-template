# App Routes

## Package Identity
Next.js 16 App Router routes, layouts, loading states, and page-level demo screens for the Mocci admin template. This area owns URL structure and route composition, while reusable UI should remain in `src/components`.

## Setup & Run
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Patterns & Conventions
- Read `node_modules/next/dist/docs/` for current Next.js 16 guidance before changing routing, metadata, caching, layouts, or server/client boundaries.
- Use App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`.
- DO: Follow route-level loading patterns from `src/app/dashboard/loading.tsx` and `src/app/dashboard-saas/loading.tsx`.
- DO: Use nested layout grouping patterns from `src/app/auth/layout.tsx`, `src/app/components/layout.tsx`, and `src/app/pages/layout.tsx`.
- DO: Keep root metadata, fonts, theme init, providers, and toaster in `src/app/layout.tsx`.
- DO: Keep route-specific mock data near the route, like `src/app/dashboard/data.tsx`, `src/app/pages/billing/data.ts`, and `src/app/pages/kanban/data.ts`.
- DO: Put page-specific helper components beside the page when they are not reused, like `src/app/pages/inbox/components.tsx` and `src/app/pages/ecommerce/products/product-form-sheet.tsx`.
- DO: Use reusable components from `@/components/*` and primitives from `@/components/ui/*` instead of duplicating styles per route.
- DO: Keep CRM page wrappers consistent with existing CRM routes: direct first-child `PageHeader`, `space-y-6` page rhythm, no page-level `p-6`, and action headers using `flex flex-wrap items-center justify-between gap-3`.
- DON'T: Add reusable dashboard shell, table, theme, or primitive components inside route folders; place them in `src/components/`.
- DON'T: Add client-side fetching spinners by default; prefer server-rendered route content plus `loading.tsx` skeletons.
- DON'T: Add decorative icons to CRM page headers unless the existing route pattern explicitly uses them.
- Client components must start with `"use client"` and should be limited to interactive UI such as forms, drag/drop, tabs, panels, and keyboard shortcuts.

## Key Files
- Root app shell: `src/app/layout.tsx`
- Global CSS/tokens: `src/app/globals.css`
- Landing redirect/home: `src/app/page.tsx`
- Global error UI: `src/app/error.tsx`
- Not-found UI: `src/app/not-found.tsx`
- Dashboard examples: `src/app/dashboard/page.tsx`, `src/app/dashboard-saas/page.tsx`
- Auth examples: `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`
- Showcase routes: `src/app/components/*/page.tsx`, `src/app/charts/page.tsx`, `src/app/icons/page.tsx`

## JIT Index Hints
- Find all pages: `find src/app -name "page.tsx"`
- Find route data modules: `find src/app -name "data.ts" -o -name "data.tsx"`
- Find route-local components: `find src/app -name "components.tsx" -o -name "*.tsx" | rg "src/app/.+/.+"`
- Find loading states: `find src/app -name "loading.tsx"`
- Find route layouts: `find src/app -name "layout.tsx"`
- Find page metadata: `rg -n "metadata|generateMetadata" src/app`
- Find interactive routes: `rg -n '^"use client"' src/app`

## Common Gotchas
- `src/app/pages/*` is an application route group named `/pages/*`, not a generic source folder.
- The project uses Tailwind CSS v4 via `src/app/globals.css`; do not add a Tailwind config unless required.
- Theme preset CSS variables in `src/app/globals.css` must stay aligned with `src/config/theme-presets.ts`.
- The root layout injects a small localStorage theme script; avoid moving it without checking hydration behavior.

## Pre-PR Checks
```bash
npm run lint && npm run build
```
