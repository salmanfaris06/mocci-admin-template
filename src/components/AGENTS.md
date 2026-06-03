# Components

## Package Identity
Shared React components, app shell pieces, shadcn-style primitives, data tables, theming controls, and reusable dashboard blocks. Components are TypeScript-first and styled with Tailwind CSS v4 tokens from `src/app/globals.css`.

## Setup & Run
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Patterns & Conventions
- Prefer existing primitives in `src/components/ui/*` before adding custom markup.
- DO: Follow variant patterns from `src/components/ui/button.tsx` using `class-variance-authority`, `VariantProps`, and `cn`.
- DO: Follow composition patterns from `src/components/ui/card.tsx`, `src/components/ui/dialog.tsx`, and `src/components/ui/sidebar.tsx`.
- DO: Use `data-slot` attributes consistently for primitive subparts, matching `src/components/ui/button.tsx`.
- DO: Use `@/lib/utils` `cn` for conditional classes rather than string concatenation.
- DO: Keep navigation shell behavior in `src/components/app-shell/*`; export shared shell pieces through `src/components/app-shell/index.ts`.
- DO: Use `src/components/data-table/data-table.tsx` for sortable/filterable/paginated tables.
- DO: Use loading skeleton patterns from `src/components/skeletons.tsx` for route-level loading UI.
- DO: Keep theme controls aligned with `src/components/theme-provider.tsx`, `src/components/theme-customizer.tsx`, `src/components/theme-toggle.tsx`, `src/config/theme-presets.ts`, and `src/app/globals.css`.
- DO: Keep command/search behavior in `src/components/command-palette.tsx` and source navigation from `src/config/nav.ts`.
- DON'T: Fork shadcn-style primitives with one-off route copies; extend existing `src/components/ui/*` variants instead.
- DON'T: Put route-specific mock data in shared components; route-local data belongs in `src/app/**/data.ts(x)`.
- DON'T: Add heavy client state to shared primitives; keep client-only logic in higher-level interactive components when possible.

## Design System
- UI primitives: `src/components/ui/**`
- App shell: `src/components/app-shell/**`
- Data table: `src/components/data-table/data-table.tsx`
- Theme tokens: `src/app/globals.css`
- Theme presets: `src/config/theme-presets.ts`
- Component aliases and registry: `components.json`
- Showcase examples: `src/app/components/*/page.tsx`
- Examples:
  - Buttons: `src/components/ui/button.tsx` and `src/app/components/button/page.tsx`
  - Forms: `src/components/ui/form.tsx` and `src/app/auth/login/page.tsx`
  - Tables: `src/components/data-table/data-table.tsx` and `src/app/pages/datatable/page.tsx`
  - Charts: `src/components/ui/chart.tsx` and `src/app/charts/page.tsx`
  - Sidebar: `src/components/ui/sidebar.tsx` and `src/components/app-shell/app-sidebar.tsx`

## Key Files
- Class merge helper: `src/lib/utils.ts`
- Theme provider: `src/components/theme-provider.tsx`
- App shell wrapper: `src/components/app-shell/app-shell.tsx`
- Sidebar nav UI: `src/components/app-shell/app-sidebar.tsx`
- Command palette: `src/components/command-palette.tsx`
- Rich text editor: `src/components/rich-text-editor.tsx`
- Reusable skeletons: `src/components/skeletons.tsx`
- Pro blocks/examples: `src/components/shadcn-studio/blocks/*`

## JIT Index Hints
- Find primitive: `find src/components/ui -name "*.tsx"`
- Find component exports: `rg -n "export (function|const|\{)" src/components`
- Find variant definitions: `rg -n "cva\(" src/components`
- Find `cn` usage: `rg -n "cn\(" src/components`
- Find client components: `rg -n '^"use client"' src/components`
- Find table usage: `rg -n "<DataTable|DataTable" src`
- Find theme usage: `rg -n "theme-preset|themePresets|ThemeProvider" src`
- Find Radix/Base UI imports: `rg -n "from \"radix-ui\"|@base-ui/react" src/components`

## Common Gotchas
- `radix-ui` is imported as a package namespace in existing primitives, e.g. `import { Slot } from "radix-ui"`.
- `components.json` aliases map `ui` to `@/components/ui`; keep imports consistent.
- Tailwind v4 scans source via `@source "../**/*.{ts,tsx}"` in `src/app/globals.css`.
- For client components, keep the `"use client"` directive as the first statement.

## Pre-PR Checks
```bash
npm run lint && npm run build
```
