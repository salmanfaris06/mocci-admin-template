# Contact Pipeline Design

## Goal

Replace the current task-oriented `/pipeline` Kanban page with a CRM contact pipeline. The page should track WhatsApp contacts across simple sales/follow-up stages using mock/static data for the first version.

## Route

- URL: `/pipeline`
- The route continues to render through the CRM shell layout, so it keeps the sidebar, header, breadcrumb, and footer.

## User Experience

The page is a simple Kanban board for contact leads.

### Header

- Title: `Pipeline`
- Description: `Track WhatsApp contacts across your CRM stages.`
- Primary action: `Add contact`
  - First version creates a local mock contact in the `New Lead` stage and does not persist it.

### Stages

The pipeline uses four fixed stages:

1. `New Lead`
2. `Contacted`
3. `Follow Up`
4. `Converted`

Each stage column shows the stage title and the current contact count.

### Contact Cards

Each card displays:

- Contact name
- WhatsApp number
- Last message

Cards can be dragged between stages. Clicking a card navigates to `/inbox`.

## Architecture

The implementation will replace the task-specific Kanban domain with a contact-specific domain in `src/app/pages/kanban/`.

### Files

- `src/app/pages/kanban/page.tsx`
  - Owns local state for contacts.
  - Handles drag-and-drop.
  - Handles card click navigation to `/inbox`.

- `src/app/pages/kanban/data.ts`
  - Defines `ContactStage`.
  - Defines `ContactLead`.
  - Exports `initialStages`.
  - Exports `initialContacts`.

- `src/app/pages/kanban/column.tsx`
  - Renders one contact stage column.
  - Receives contacts for that stage.
  - Supports drop targets and add-contact action.

- `src/app/pages/kanban/contact-card.tsx`
  - Renders a draggable contact card.
  - Displays name, WhatsApp number, and last message.
  - Uses accessible button/card semantics for click navigation.

### Cleanup

The old task-specific implementation will be removed or replaced:

- Remove `task-card.tsx` if no longer referenced.
- Remove `task-detail-sheet.tsx` if no longer referenced.
- Replace `Task` naming with `ContactLead` naming.
- Replace UI labels like `Kanban Board`, `Task`, and `Add task` with contact pipeline labels.

## Data Flow

This first version uses mock/static data only.

- Initial data loads from `initialContacts` in `data.ts`.
- Moving a contact between stages updates local React state.
- Adding a contact creates local mock data only.
- Clicking a contact navigates to `/inbox`.

No persistence is included in this version.

## Out of Scope

This design intentionally does not include:

- Database persistence.
- WhatsApp API sends from the pipeline.
- Search/filter controls.
- Per-contact inbox deep links.
- Contact detail sheet.
- Authentication/authorization changes.

## Validation

After implementation:

- Run `npm run lint`.
- Run `npm run build`.
- Confirm `/pipeline` is present in the Next.js route output.
- Confirm no imports reference removed task-specific files.
