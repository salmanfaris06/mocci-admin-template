# Contact Pipeline Implementation Report

## Summary

Implemented the approved Contact Pipeline plan for `/pipeline` by replacing the task-oriented Kanban implementation under `src/app/pages/kanban` with a CRM contact pipeline using mock WhatsApp contact data.

## Changed Files

- Modified: `src/app/pages/kanban/data.ts`
  - Replaced task data model with `ContactStage` and `ContactLead`.
  - Added four stages: `New Lead`, `Contacted`, `Follow Up`, `Converted`.
  - Added mock contacts with name, WhatsApp number, and last message.

- Modified: `src/app/pages/kanban/column.tsx`
  - Replaced task column rendering with contact stage column rendering.
  - Added droppable stage behavior via `useDroppable`.
  - Displays contact count and per-stage add contact action.

- Created: `src/app/pages/kanban/contact-card.tsx`
  - Added draggable contact card using `useSortable`.
  - Displays contact name, WhatsApp number, and last message.
  - Supports keyboard activation and click navigation callback.

- Modified: `src/app/pages/kanban/page.tsx`
  - Replaced task board state with contact pipeline state.
  - Added drag-and-drop between contact stages.
  - Added local mock contact creation.
  - Clicking a contact navigates to `/inbox`.

- Deleted: `src/app/pages/kanban/task-card.tsx`
- Deleted: `src/app/pages/kanban/task-detail-sheet.tsx`

## Verification

- Ran stale task reference check:

```bash
rg -n "task-card|task-detail-sheet|TaskCard|TaskDetailSheet|type Task|initialTasks|initialColumns" src/app/pages/kanban
```

Result: no matches.

- Ran lint:

```bash
npm run lint
```

Result: passed with `0 errors`, `22 warnings`.

Warnings are existing/unrelated, including unused imports in analytics/files/inbox/users-roles, React Compiler warnings for TanStack Table usage, and `<img>` warnings in existing components.

- Ran build:

```bash
npm run build
```

Result: passed successfully.

The build route output includes `/pipeline`.

## Notes

During verification, the first build attempt failed because `@dnd-kit` sortable attributes can include a `role` prop, causing duplicate `role` typing when `role='button'` was specified before spreading attributes. This was fixed by spreading `attributes` and `listeners` before setting the explicit card accessibility props.

## Open Risks

- Data is intentionally mock/local-only per approved scope; drag-and-drop and added contacts are not persisted.
- Clicking any contact currently navigates to `/inbox` without a per-contact deep link, per approved scope.
