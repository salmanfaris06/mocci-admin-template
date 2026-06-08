# Contacts Pipeline CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Contacts and Pipeline from template/mock screens into WhatsApp CRM screens backed by existing contact, conversation, and pipeline data.

**Architecture:** Keep route pages as server components that load CRM data from `src/server/crm/queries.ts`, then pass typed view models into focused client components for tables and drag/drop interactions. Add small API routes for pipeline persistence and contact updates instead of introducing a new state framework.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, existing shadcn-style UI primitives, TanStack DataTable, dnd-kit.

---

## File Structure

- Modify `src/server/crm/queries.ts`: enrich contacts and pipeline board query data.
- Create `src/app/crm/contacts/contacts-table.tsx`: client-side contacts table with CRM columns/actions.
- Modify `src/app/crm/contacts/page.tsx`: server-render contacts page with CRM stats.
- Create `src/app/crm/pipeline/pipeline-board.tsx`: client-side pipeline board using real server-loaded data.
- Create `src/app/crm/pipeline/column.tsx`: CRM pipeline column UI.
- Create `src/app/crm/pipeline/contact-card.tsx`: CRM pipeline card UI.
- Modify `src/app/crm/pipeline/page.tsx`: server-render pipeline page.
- Create `src/app/api/crm/pipeline/items/[itemId]/route.ts`: persist item stage changes.
- Create `src/app/api/crm/contacts/[contactId]/route.ts`: update contact status/tags/notes when needed.

## Tasks

### Task 1: Contacts CRM view

- [x] Replace Contacts route re-export with a WhatsApp Contacts server page.
- [x] Add a focused contacts table client component with WhatsApp/contact/stage columns.
- [x] Use existing `getCrmContacts()` and enrich it with conversation/pipeline fields.
- [x] Verify empty state and table filters.

### Task 2: Pipeline real-data board

- [x] Replace Pipeline route re-export with server-loaded CRM pipeline page.
- [x] Build pipeline board client component with drag/drop and optimistic update.
- [x] Show card metadata: WhatsApp number, last activity, deal value, tags, conversation link.
- [x] Add empty state per stage.

### Task 3: Persistence APIs

- [x] Add pipeline item PATCH route to update stage and position.
- [x] Add contact PATCH route for status/tags/notes expansion.
- [x] Make drag/drop call the pipeline PATCH route and rollback on failure.

### Task 4: Verification

- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Fix issues until both pass.
